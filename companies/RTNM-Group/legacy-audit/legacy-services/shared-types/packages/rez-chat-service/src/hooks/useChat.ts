// Unified Chat Hook for ReZ Ecosystem
// Platform-agnostic React hook for real-time chat functionality

import { useState, useEffect, useCallback, useRef } from 'react';
import type {
  ChatMessage,
  Conversation,
  MessageAttachment,
  TypingIndicator,
  QueueInfo,
  SendMessageRequest,
  CreateConversationRequest,
  ConversationRating,
  ChatEventName,
} from '../types';

// ── Event Constants ──────────────────────────────────────────────────────────

const EVENTS = {
  JOIN_CONVERSATION: 'join_conversation',
  LEAVE_CONVERSATION: 'leave_conversation',
  MESSAGE_SENT: 'message:sent',
  MESSAGE_RECEIVED: 'message:received',
  MESSAGE_DELIVERED: 'message:delivered',
  MESSAGE_READ: 'message:read',
  TYPING_START: 'typing:start',
  TYPING_STOP: 'typing:stop',
  // Support-specific aliases
  SUPPORT_AGENT_TYPING_START: 'support_agent_typing_start',
  SUPPORT_AGENT_TYPING_STOP: 'support_agent_typing_stop',
  SUPPORT_USER_TYPING_START: 'support_user_typing_start',
  SUPPORT_USER_TYPING_STOP: 'support_user_typing_stop',
  SUPPORT_MESSAGES_READ: 'support_messages_read',
} as const;

// ── Options ────────────────────────────────────────────────────────────────

export interface UseChatOptions {
  conversationId?: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  apiBaseUrl: string;
  token?: string;
  namespace?: string;
  enableOfflineQueue?: boolean;
  enableOptimistic?: boolean;
  typingTimeout?: number;
  autoConnect?: boolean;
}

// ── Return Type ────────────────────────────────────────────────────────────

export interface UseChatReturn {
  messages: ChatMessage[];
  messagesLoading: boolean;
  messagesError: string | null;
  conversation: Conversation | null;
  conversations: Conversation[];
  connected: boolean;
  connecting: boolean;
  isTyping: boolean;
  otherTyping: boolean;
  typingUser?: { id: string; name: string };
  queueInfo: QueueInfo | null;

  sendMessage: (content: string, attachments?: MessageAttachment[]) => Promise<boolean>;
  sendTyping: (isTyping: boolean) => void;
  markAsRead: (messageIds: string[]) => void;
  createConversation: (request: CreateConversationRequest) => Promise<Conversation | null>;
  joinConversation: (conversationId: string) => void;
  leaveConversation: () => void;
  loadMessages: (before?: string, limit?: number) => Promise<void>;
  loadConversations: (page?: number, limit?: number) => Promise<void>;
  rateConversation: (rating: ConversationRating, comment?: string) => Promise<boolean>;
  closeConversation: (reason?: string) => Promise<boolean>;
  connect: () => void;
  disconnect: () => void;
}

// ── Hook ─────────────────────────────────────────────────────────────────

export function useChat(options: UseChatOptions): UseChatReturn {
  const {
    conversationId,
    userId,
    userName,
    userAvatar,
    apiBaseUrl,
    token,
    enableOfflineQueue = true,
    enableOptimistic = true,
    typingTimeout = 3000,
    autoConnect = true,
  } = options;

  // ── State ────────────────────────────────────────────────────────────

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [messagesError, setMessagesError] = useState<string | null>(null);

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [conversation, setConversation] = useState<Conversation | null>(null);

  const [connected, setConnected] = useState(false);
  const [connecting, setConnecting] = useState(autoConnect);
  const [otherTyping, setOtherTyping] = useState(false);
  const [typingUser, setTypingUser] = useState<{ id: string; name: string } | undefined>();
  const [queueInfo, setQueueInfo] = useState<QueueInfo | null>(null);

  // ── Refs ────────────────────────────────────────────────────────────

  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const offlineQueueRef = useRef<SendMessageRequest[]>([]);
  const currentConversationIdRef = useRef<string | undefined>(conversationId);
  const socketRef = useRef<{
    emit: (event: string, data?: unknown) => void;
    on: (event: string, handler: (...args: unknown[]) => void) => void;
    off: (event: string, handler: (...args: unknown[]) => void) => void;
    disconnect: () => void;
    connected: boolean;
  } | null>(null);

  // ── Socket Initialization ─────────────────────────────────────────────

  useEffect(() => {
    if (!autoConnect || typeof window === 'undefined') return;

    let mounted = true;

    const initSocket = async () => {
      try {
        const { io } = await import('socket.io-client');
        const socket = io(apiBaseUrl, {
          autoConnect: true,
          reconnection: true,
          transports: ['websocket', 'polling'],
        });

        socket.on('connect', () => {
          if (mounted) setConnected(true);
        });

        socket.on('disconnect', () => {
          if (mounted) setConnected(false);
        });

        socketRef.current = socket as typeof socketRef.current;
      } catch (err) {
        console.error('[useChat] Failed to initialize socket:', err);
      }
    };

    initSocket();

    return () => {
      mounted = false;
      socketRef.current?.disconnect?.();
      socketRef.current = null;
    };
  }, [apiBaseUrl, autoConnect]);

  // ── Conversation Management ───────────────────────────────────────────

  useEffect(() => {
    if (conversationId) {
      currentConversationIdRef.current = conversationId;
      joinConversation(conversationId);
    }

    return () => {
      if (conversationId) {
        leaveConversation();
      }
    };
  }, [conversationId]);

  const joinConversation = useCallback((convId: string) => {
    socketRef.current?.emit(EVENTS.JOIN_CONVERSATION, {
      conversationId: convId,
      userId,
      userName,
    });
  }, [userId, userName]);

  const leaveConversation = useCallback(() => {
    const convId = currentConversationIdRef.current;
    if (convId) {
      socketRef.current?.emit(EVENTS.LEAVE_CONVERSATION, { conversationId: convId });
      currentConversationIdRef.current = undefined;
    }
  }, []);

  // ── Socket Event Listeners ────────────────────────────────────────────

  useEffect(() => {
    const socket = socketRef.current;
    if (!socket) return;

    const handleMessageReceived = (data: unknown) => {
      const payload = data as { conversationId?: string; message?: Partial<ChatMessage> };
      if (payload.conversationId !== currentConversationIdRef.current) return;

      const msg = payload.message || {};
      const message: ChatMessage = {
        id: msg.id || `msg_${Date.now()}_${Math.random().toString(36).slice(2)}`,
        conversationId: currentConversationIdRef.current || '',
        content: msg.content || '',
        sender: msg.sender || (msg.senderId === userId ? 'user' : 'agent'),
        senderId: msg.senderId || userId,
        senderName: msg.senderName || userName,
        senderAvatar: msg.senderAvatar,
        type: (msg.type as ChatMessage['type']) || 'text',
        status: 'delivered',
        timestamp: msg.timestamp || new Date().toISOString(),
        deliveredAt: new Date().toISOString(),
        attachments: msg.attachments,
      };

      setMessages((prev) => {
        if (prev.some((m) => m.id === message.id)) return prev;
        return [...prev, message];
      });

      if (message.senderId !== userId) {
        markAsRead([message.id]);
      }
    };

    const handleTypingStart = (data: unknown) => {
      const payload = data as TypingIndicator;
      if (payload.conversationId !== currentConversationIdRef.current) return;
      if (payload.participantId === userId) return;

      setOtherTyping(true);
      setTypingUser({ id: payload.participantId, name: payload.participantName });

      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => {
        setOtherTyping(false);
        setTypingUser(undefined);
      }, typingTimeout);
    };

    const handleTypingStop = (data: unknown) => {
      const payload = data as TypingIndicator;
      if (payload.conversationId !== currentConversationIdRef.current) return;
      setOtherTyping(false);
      setTypingUser(undefined);
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = null;
      }
    };

    // Register listeners
    const events: [string, (...args: unknown[]) => void][] = [
      [EVENTS.MESSAGE_RECEIVED, handleMessageReceived],
      [EVENTS.SUPPORT_AGENT_TYPING_START, handleTypingStart],
      [EVENTS.SUPPORT_AGENT_TYPING_STOP, handleTypingStop],
      [EVENTS.SUPPORT_USER_TYPING_START, handleTypingStart],
      [EVENTS.SUPPORT_USER_TYPING_STOP, handleTypingStop],
    ];

    events.forEach(([event, handler]) => {
      socket.on(event, handler);
    });

    return () => {
      events.forEach(([event, handler]) => {
        socket.off(event, handler);
      });
    };
  }, [userId, userName, typingTimeout]);

  // ── Actions ───────────────────────────────────────────────────────────

  const sendMessage = useCallback(async (
    content: string,
    attachments?: MessageAttachment[]
  ): Promise<boolean> => {
    const convId = currentConversationIdRef.current;
    if (!convId || !content.trim()) return false;

    const request: SendMessageRequest = {
      conversationId: convId,
      content: content.trim(),
      type: attachments?.length ? 'image' : 'text',
      attachments,
    };

    if (!connected && enableOfflineQueue) {
      offlineQueueRef.current.push(request);
      return true;
    }

    const optimisticMessage: ChatMessage = {
      id: `temp_${Date.now()}_${Math.random().toString(36).slice(2)}`,
      conversationId: convId,
      content: request.content,
      sender: 'user',
      senderId: userId,
      senderName: userName,
      senderAvatar: userAvatar,
      type: request.type || 'text',
      status: 'sending',
      timestamp: new Date().toISOString(),
      attachments: request.attachments,
    };

    if (enableOptimistic) {
      setMessages((prev) => [...prev, optimisticMessage]);
    }

    try {
      socketRef.current?.emit(EVENTS.MESSAGE_SENT, request);
      return true;
    } catch {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === optimisticMessage.id ? { ...m, status: 'failed' } : m
        )
      );
      return false;
    }
  }, [userId, userName, userAvatar, connected, enableOfflineQueue, enableOptimistic]);

  const sendTyping = useCallback((isTyping: boolean) => {
    const convId = currentConversationIdRef.current;
    if (!convId) return;

    socketRef.current?.emit(isTyping ? EVENTS.TYPING_START : EVENTS.TYPING_STOP, {
      conversationId: convId,
      participantId: userId,
      participantName: userName,
      isTyping,
    });
  }, [userId, userName]);

  const markAsRead = useCallback((messageIds: string[]) => {
    const convId = currentConversationIdRef.current;
    if (!convId || messageIds.length === 0) return;

    socketRef.current?.emit(EVENTS.MESSAGE_READ, {
      conversationId: convId,
      messageIds,
      readerId: userId,
    });

    setMessages((prev) =>
      prev.map((m) =>
        messageIds.includes(m.id) ? { ...m, read: true, readAt: new Date().toISOString() } : m
      )
    );
  }, [userId]);

  const createConversation = useCallback(async (
    request: CreateConversationRequest
  ): Promise<Conversation | null> => {
    try {
      const response = await fetch(`${apiBaseUrl}/conversations`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(request),
      });

      if (!response.ok) throw new Error('Failed to create conversation');

      const data = await response.json();
      const newConversation = data.conversation as Conversation;

      setConversation(newConversation);
      setConversations((prev) => [newConversation, ...prev]);

      if (data.queueInfo) {
        setQueueInfo(data.queueInfo as QueueInfo);
      }

      return newConversation;
    } catch (error) {
      console.error('Error creating conversation:', error);
      return null;
    }
  }, [apiBaseUrl, token]);

  const loadMessages = useCallback(async (before?: string, limit = 50) => {
    const convId = currentConversationIdRef.current;
    if (!convId) return;

    setMessagesLoading(true);
    setMessagesError(null);

    try {
      const params = new URLSearchParams({ conversationId: convId, limit: String(limit) });
      if (before) params.append('before', before);

      const response = await fetch(`${apiBaseUrl}/messages?${params}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });

      if (!response.ok) throw new Error('Failed to load messages');

      const data = await response.json();
      const newMessages = data.messages as ChatMessage[];

      if (before) {
        setMessages((prev) => [...newMessages, ...prev]);
      } else {
        setMessages(newMessages);
      }
    } catch (error) {
      setMessagesError('Failed to load messages');
    } finally {
      setMessagesLoading(false);
    }
  }, [apiBaseUrl, token]);

  const loadConversations = useCallback(async (page = 1, limit = 20) => {
    try {
      const params = new URLSearchParams({ page: String(page), limit: String(limit) });

      const response = await fetch(`${apiBaseUrl}/conversations?${params}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });

      if (!response.ok) throw new Error('Failed to load conversations');

      const data = await response.json();
      setConversations(data.conversations as Conversation[]);
    } catch (error) {
      console.error('Error loading conversations:', error);
    }
  }, [apiBaseUrl, token]);

  const rateConversation = useCallback(async (
    rating: ConversationRating,
    comment?: string
  ): Promise<boolean> => {
    const convId = currentConversationIdRef.current;
    if (!convId) return false;

    try {
      const response = await fetch(`${apiBaseUrl}/conversations/${convId}/rate`, {
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
  }, [apiBaseUrl, token]);

  const closeConversation = useCallback(async (reason?: string): Promise<boolean> => {
    const convId = currentConversationIdRef.current;
    if (!convId) return false;

    try {
      const response = await fetch(`${apiBaseUrl}/conversations/${convId}/close`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ reason }),
      });

      if (response.ok) {
        setConversation((prev) => prev ? { ...prev, status: 'closed' } : prev);
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }, [apiBaseUrl, token]);

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
    messages,
    messagesLoading,
    messagesError,
    conversation,
    conversations,
    connected,
    connecting,
    isTyping: otherTyping,
    otherTyping,
    typingUser,
    queueInfo,
    sendMessage,
    sendTyping,
    markAsRead,
    createConversation,
    joinConversation,
    leaveConversation,
    loadMessages,
    loadConversations,
    rateConversation,
    closeConversation,
    connect,
    disconnect,
  };
}
