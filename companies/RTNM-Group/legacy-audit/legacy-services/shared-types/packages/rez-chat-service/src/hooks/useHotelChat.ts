// Hotel Chat Hook - for Room QR / Hotel PMS
// Provides guest-to-staff and staff-to-guest real-time chat

import { useCallback, useEffect, useRef, useState } from 'react';
import type {
  HotelConversation,
  HotelMessage,
  HotelGuest,
  HotelStaff,
  HotelServiceRequest,
  HotelDepartment,
  HotelConversationType,
  HotelQuickReply,
  StaffAvailability,
} from '../types/hotel';
import { HOTEL_CHAT_EVENTS } from '../types/hotel';
import type { ChatParticipant } from '../types';

export interface UseHotelChatOptions {
  guestId: string;
  guestName: string;
  roomNumber?: string;
  bookingId?: string;
  apiBaseUrl: string;
  token?: string;
  namespace?: string;
  enableNotifications?: boolean;
  autoConnect?: boolean;
}

export interface UseHotelChatReturn {
  // State
  conversations: HotelConversation[];
  currentConversation: HotelConversation | null;
  messages: HotelMessage[];
  messagesLoading: boolean;
  connected: boolean;
  connecting: boolean;
  assignedStaff: HotelStaff | null;
  isStaffTyping: boolean;
  queueInfo: { position: number; estimatedWait: number } | null;
  unreadCount: number;
  staffAvailability: StaffAvailability[];

  // Actions
  startConversation: (type: HotelConversationType, department?: HotelDepartment) => Promise<HotelConversation | null>;
  sendMessage: (content: string, quickReply?: HotelQuickReply) => Promise<boolean>;
  startTyping: () => void;
  stopTyping: () => void;
  markAsRead: (messageIds: string[]) => void;
  createServiceRequest: (request: Partial<HotelServiceRequest>) => Promise<HotelServiceRequest | null>;
  rateConversation: (rating: number, comment?: string) => Promise<boolean>;
  resolveConversation: () => Promise<boolean>;

  // Staff actions
  assignStaff: (staffId: string) => Promise<boolean>;
  transferToDepartment: (department: HotelDepartment) => Promise<boolean>;

  // Connection
  connect: () => void;
  disconnect: () => void;
}

export function useHotelChat(options: UseHotelChatOptions): UseHotelChatReturn {
  const {
    guestId,
    guestName,
    roomNumber,
    bookingId,
    apiBaseUrl,
    token,
    namespace = 'hotel',
    autoConnect = true,
  } = options;

  // ── State ─────────────────────────────────────────────────────────────────

  const [conversations, setConversations] = useState<HotelConversation[]>([]);
  const [currentConversation, setCurrentConversation] = useState<HotelConversation | null>(null);
  const [messages, setMessages] = useState<HotelMessage[]>([]);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [connected, setConnected] = useState(false);
  const [connecting, setConnecting] = useState(autoConnect);
  const [assignedStaff, setAssignedStaff] = useState<HotelStaff | null>(null);
  const [isStaffTyping, setIsStaffTyping] = useState(false);
  const [queueInfo, setQueueInfo] = useState<{ position: number; estimatedWait: number } | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [staffAvailability, setStaffAvailability] = useState<StaffAvailability[]>([]);

  // ── Refs ─────────────────────────────────────────────────────────────────

  const socketRef = useRef<{
    emit: (event: string, data?: unknown) => void;
    on: (event: string, handler: (...args: unknown[]) => void) => void;
    off: (event: string, handler: (...args: unknown[]) => void) => void;
    disconnect: () => void;
    connected: boolean;
  } | null>(null);

  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Socket Connection ───────────────────────────────────────────────────

  useEffect(() => {
    if (!autoConnect || typeof window === 'undefined') return;

    let mounted = true;

    const initSocket = async () => {
      try {
        const { io } = await import('socket.io-client');
        const socket = io(`${apiBaseUrl}/${namespace}`, {
          autoConnect: true,
          reconnection: true,
          reconnectionAttempts: 5,
          reconnectionDelay: 1000,
          transports: ['websocket', 'polling'],
          auth: { token },
        });

        socket.on('connect', () => {
          if (mounted) {
            setConnected(true);
            setConnecting(false);
            // Register guest
            socket.emit(HOTEL_CHAT_EVENTS.GUEST_JOIN, {
              guestId,
              guestName,
              roomNumber,
              bookingId,
            });
          }
        });

        socket.on('disconnect', () => {
          if (mounted) setConnected(false);
        });

        socketRef.current = socket as typeof socketRef.current;
      } catch (err) {
        console.error('[useHotelChat] Failed to initialize socket:', err);
        if (mounted) setConnecting(false);
      }
    };

    initSocket();

    return () => {
      mounted = false;
      socketRef.current?.emit(HOTEL_CHAT_EVENTS.GUEST_LEFT, { guestId });
      socketRef.current?.disconnect?.();
      socketRef.current = null;
    };
  }, [apiBaseUrl, namespace, token, guestId, guestName, roomNumber, bookingId, autoConnect]);

  // ── Socket Event Listeners ───────────────────────────────────────────────

  useEffect(() => {
    const socket = socketRef.current;
    if (!socket) return;

    const handleNewMessage = (data: unknown) => {
      const payload = data as { conversationId?: string; message?: Partial<HotelMessage> };
      const message = payload.message || {};

      const newMessage: HotelMessage = {
        id: message.id || `msg_${Date.now()}`,
        conversationId: payload.conversationId || currentConversation?.id || '',
        content: message.content || '',
        sender: (message.sender as HotelMessage['sender']) || 'staff',
        senderId: message.senderId || '',
        senderName: message.senderName || 'Hotel Staff',
        type: (message.type as HotelMessage['type']) || 'text',
        status: 'delivered',
        timestamp: message.timestamp || new Date().toISOString(),
        department: message.department,
        metadata: message.metadata,
      };

      setMessages((prev) => [...prev, newMessage]);

      // Auto-mark as read if this is for current conversation
      if (payload.conversationId === currentConversation?.id) {
        markAsRead([newMessage.id]);
      } else {
        setUnreadCount((prev) => prev + 1);
      }
    };

    const handleStaffTyping = (data: unknown) => {
      const payload = data as { conversationId?: string; isTyping?: boolean };
      if (payload.conversationId === currentConversation?.id) {
        setIsStaffTyping(payload.isTyping ?? false);
        if (payload.isTyping) {
          if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
          typingTimeoutRef.current = setTimeout(() => setIsStaffTyping(false), 5000);
        }
      }
    };

    const handleStaffAssigned = (data: unknown) => {
      const payload = data as { conversationId?: string; staff?: Partial<HotelStaff> };
      if (payload.conversationId === currentConversation?.id && payload.staff) {
        const staff: HotelStaff = {
          id: payload.staff.id || '',
          name: payload.staff.name || 'Hotel Staff',
          email: payload.staff.email,
          avatar: payload.staff.avatar,
          role: 'staff',
          department: (payload.staff.department as HotelDepartment) || 'front_desk',
          employeeId: payload.staff.employeeId || '',
          isOnDuty: payload.staff.isOnDuty ?? true,
        };
        setAssignedStaff(staff);
        setQueueInfo(null);
      }
    };

    const handleQueueUpdate = (data: unknown) => {
      const payload = data as { position?: number; estimatedWait?: number };
      setQueueInfo({
        position: payload.position || 0,
        estimatedWait: payload.estimatedWait || 0,
      });
    };

    const handleConversationCreated = (data: unknown) => {
      const conv = data as Partial<HotelConversation>;
      if (conv && conv.id) {
        setConversations((prev) => {
          const exists = prev.some((c) => c.id === conv.id);
          if (exists) return prev;
          return [conv as HotelConversation, ...prev];
        });
      }
    };

    // Register listeners
    socket.on(HOTEL_CHAT_EVENTS.NEW_GUEST_MESSAGE, handleNewMessage);
    socket.on(HOTEL_CHAT_EVENTS.STAFF_TYPING, handleStaffTyping);
    socket.on(HOTEL_CHAT_EVENTS.STAFF_ASSIGNED, handleStaffAssigned);
    socket.on(HOTEL_CHAT_EVENTS.REQUEST_ASSIGNED, handleQueueUpdate);
    socket.on(HOTEL_CHAT_EVENTS.CONVERSATION_CREATED || 'conversation:created', handleConversationCreated);

    return () => {
      socket.off(HOTEL_CHAT_EVENTS.NEW_GUEST_MESSAGE, handleNewMessage);
      socket.off(HOTEL_CHAT_EVENTS.STAFF_TYPING, handleStaffTyping);
      socket.off(HOTEL_CHAT_EVENTS.STAFF_ASSIGNED, handleStaffAssigned);
      socket.off(HOTEL_CHAT_EVENTS.REQUEST_ASSIGNED, handleQueueUpdate);
      socket.off(HOTEL_CHAT_EVENTS.CONVERSATION_CREATED || 'conversation:created', handleConversationCreated);
    };
  }, [currentConversation?.id]);

  // ── Actions ─────────────────────────────────────────────────────────────

  const startConversation = useCallback(async (
    type: HotelConversationType,
    department?: HotelDepartment
  ): Promise<HotelConversation | null> => {
    try {
      const response = await fetch(`${apiBaseUrl}/api/hotel/chat/conversations`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          guestId,
          guestName,
          roomNumber,
          bookingId,
          type,
          department: department || 'front_desk',
        }),
      });

      if (!response.ok) throw new Error('Failed to start conversation');

      const data = await response.json();
      const conversation = data.conversation as HotelConversation;

      setConversations((prev) => [conversation, ...prev]);
      setCurrentConversation(conversation);

      if (data.queueInfo) {
        setQueueInfo(data.queueInfo);
      }

      // Join socket room
      socketRef.current?.emit(HOTEL_CHAT_EVENTS.GUEST_JOIN, {
        conversationId: conversation.id,
        guestId,
      });

      return conversation;
    } catch (error) {
      console.error('[useHotelChat] Failed to start conversation:', error);
      return null;
    }
  }, [apiBaseUrl, token, guestId, guestName, roomNumber, bookingId]);

  const sendMessage = useCallback(async (
    content: string,
    quickReply?: HotelQuickReply
  ): Promise<boolean> => {
    if (!currentConversation) return false;

    const messagePayload = {
      conversationId: currentConversation.id,
      content: content.trim(),
      quickReply,
      metadata: quickReply?.payload ? { action: quickReply.payload } : undefined,
    };

    // Emit via socket
    socketRef.current?.emit(HOTEL_CHAT_EVENTS.GUEST_MESSAGE, messagePayload);

    // Optimistic update
    const optimisticMessage: HotelMessage = {
      id: `temp_${Date.now()}`,
      conversationId: currentConversation.id,
      content: content.trim(),
      sender: 'user',
      senderId: guestId,
      senderName: guestName,
      type: 'text',
      status: 'sent',
      timestamp: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, optimisticMessage]);

    // Also send via REST as backup
    try {
      const response = await fetch(`${apiBaseUrl}/api/hotel/chat/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(messagePayload),
      });

      if (!response.ok) throw new Error('Failed to send message');
      return true;
    } catch {
      return false;
    }
  }, [currentConversation, guestId, guestName, apiBaseUrl, token]);

  const startTyping = useCallback(() => {
    if (!currentConversation) return;
    socketRef.current?.emit(HOTEL_CHAT_EVENTS.GUEST_TYPING, {
      conversationId: currentConversation.id,
      isTyping: true,
    });
  }, [currentConversation]);

  const stopTyping = useCallback(() => {
    if (!currentConversation) return;
    socketRef.current?.emit(HOTEL_CHAT_EVENTS.GUEST_TYPING, {
      conversationId: currentConversation.id,
      isTyping: false,
    });
  }, [currentConversation]);

  const markAsRead = useCallback((messageIds: string[]) => {
    if (!currentConversation || messageIds.length === 0) return;

    socketRef.current?.emit(HOTEL_CHAT_EVENTS.GUEST_READ, {
      conversationId: currentConversation.id,
      messageIds,
      readerId: guestId,
    });

    setMessages((prev) =>
      prev.map((m) =>
        messageIds.includes(m.id) ? { ...m, read: true, readAt: new Date().toISOString() } : m
      )
    );

    setUnreadCount((prev) => Math.max(0, prev - messageIds.length));
  }, [currentConversation, guestId]);

  const createServiceRequest = useCallback(async (
    request: Partial<HotelServiceRequest>
  ): Promise<HotelServiceRequest | null> => {
    try {
      const response = await fetch(`${apiBaseUrl}/api/hotel/chat/requests`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          guestId,
          guestName,
          roomNumber,
          bookingId,
          ...request,
        }),
      });

      if (!response.ok) throw new Error('Failed to create service request');

      const data = await response.json();
      return data.request as HotelServiceRequest;
    } catch (error) {
      console.error('[useHotelChat] Failed to create service request:', error);
      return null;
    }
  }, [apiBaseUrl, token, guestId, guestName, roomNumber, bookingId]);

  const rateConversation = useCallback(async (
    rating: number,
    comment?: string
  ): Promise<boolean> => {
    if (!currentConversation) return false;

    try {
      const response = await fetch(`${apiBaseUrl}/api/hotel/chat/conversations/${currentConversation.id}/rate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ rating, comment }),
      });

      return response.ok;
    } catch {
      return false;
    }
  }, [currentConversation, apiBaseUrl, token]);

  const resolveConversation = useCallback(async (): Promise<boolean> => {
    if (!currentConversation) return false;

    try {
      const response = await fetch(`${apiBaseUrl}/api/hotel/chat/conversations/${currentConversation.id}/resolve`, {
        method: 'POST',
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });

      if (response.ok) {
        setConversations((prev) =>
          prev.map((c) =>
            c.id === currentConversation.id ? { ...c, status: 'resolved' as const } : c
          )
        );
        setCurrentConversation(null);
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }, [currentConversation, apiBaseUrl, token]);

  const assignStaff = useCallback(async (staffId: string): Promise<boolean> => {
    if (!currentConversation) return false;

    try {
      const response = await fetch(`${apiBaseUrl}/api/hotel/chat/conversations/${currentConversation.id}/assign`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ staffId }),
      });

      return response.ok;
    } catch {
      return false;
    }
  }, [currentConversation, apiBaseUrl, token]);

  const transferToDepartment = useCallback(async (
    department: HotelDepartment
  ): Promise<boolean> => {
    if (!currentConversation) return false;

    try {
      const response = await fetch(`${apiBaseUrl}/api/hotel/chat/conversations/${currentConversation.id}/transfer`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ department }),
      });

      return response.ok;
    } catch {
      return false;
    }
  }, [currentConversation, apiBaseUrl, token]);

  const connect = useCallback(() => {
    setConnecting(true);
  }, []);

  const disconnect = useCallback(() => {
    socketRef.current?.disconnect?.();
    socketRef.current = null;
    setConnected(false);
    setConnecting(false);
  }, []);

  return {
    conversations,
    currentConversation,
    messages,
    messagesLoading,
    connected,
    connecting,
    assignedStaff,
    isStaffTyping,
    queueInfo,
    unreadCount,
    staffAvailability,
    startConversation,
    sendMessage,
    startTyping,
    stopTyping,
    markAsRead,
    createServiceRequest,
    rateConversation,
    resolveConversation,
    assignStaff,
    transferToDepartment,
    connect,
    disconnect,
  };
}
