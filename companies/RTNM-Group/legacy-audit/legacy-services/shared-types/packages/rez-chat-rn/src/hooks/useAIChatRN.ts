// ── React Native AI Chat Hook ───────────────────────────────────────────────────
// Socket.IO-based AI chat hook optimized for React Native

import { useCallback, useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';

export type AIAppType = 'hotel' | 'restaurant' | 'retail' | 'support' | 'general' | 'room-qr' | 'web-menu' | 'merchant';

export interface CustomerContext {
  customerId: string;
  name?: string;
  email?: string;
  phone?: string;
  tier?: string;
  preferences?: Record<string, unknown>;
  recentOrders?: Array<{
    orderId: string;
    type: string;
    status: string;
    total: number;
    date: Date;
  }>;
  bookings?: Array<{
    bookingId: string;
    type: string;
    status: string;
    date: Date;
  }>;
  totalSpent?: number;
  visitCount?: number;
}

export interface AIMessage {
  id: string;
  content: string;
  sender: 'user' | 'ai' | 'staff';
  timestamp: string;
  metadata?: {
    confidence?: number;
    suggestions?: string[];
    actions?: Array<{
      type: string;
      data: Record<string, unknown>;
      reason: string;
    }>;
    knowledgeUsed?: string[];
  };
}

export interface UseAIChatRNOptions {
  userId: string;
  conversationId?: string;
  appType: AIAppType;
  industryCategory?: string;
  merchantId?: string;
  customerContext?: CustomerContext;
  socketUrl: string;
  token?: string;
  autoConnect?: boolean;
  enableSuggestions?: boolean;
  onEscalate?: (data: { reason: string; department?: string }) => void;
  onAction?: (action: { type: string; data: Record<string, unknown> }) => void;
  onMessage?: (message: AIMessage) => void;
}

export interface UseAIChatRNReturn {
  messages: AIMessage[];
  isTyping: boolean;
  isConnected: boolean;
  isConnecting: boolean;
  conversationId: string | null;
  suggestions: string[];
  error: string | null;
  sendMessage: (content: string) => Promise<void>;
  selectSuggestion: (suggestion: string) => Promise<void>;
  transferToStaff: (reason?: string, department?: string) => void;
  endChat: () => void;
  clearMessages: () => void;
  connect: () => void;
  disconnect: () => void;
}

// Socket events
const AI_EVENTS = {
  JOIN: 'ai:join',
  MESSAGE: 'ai:message',
  SUGGESTION: 'ai:suggestion',
  TRANSFER: 'ai:transfer',
  END: 'ai:end',
  TYPING: 'ai:typing',
  JOINED: 'ai:joined',
  AI_TYPING: 'ai:typing',
  AI_MESSAGE: 'ai:message',
  ACTION_RESULT: 'ai:action-result',
  ENDED: 'ai:ended',
  ERROR: 'error',
};

const NAMESPACE_MAP: Record<AIAppType, string> = {
  hotel: '/ai/hotel',
  'room-qr': '/ai/room-qr',
  'web-menu': '/ai/web-menu',
  restaurant: '/ai/restaurant',
  retail: '/ai/retail',
  support: '/ai/support',
  general: '/ai/general',
  merchant: '/ai/merchant',
};

export function useAIChatRN(options: UseAIChatRNOptions): UseAIChatRNReturn {
  const {
    userId,
    conversationId: initialConversationId,
    appType,
    industryCategory,
    merchantId,
    customerContext,
    socketUrl,
    token,
    autoConnect = true,
    enableSuggestions = true,
    onEscalate,
    onAction,
    onMessage,
  } = options;

  const [messages, setMessages] = useState<AIMessage[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(initialConversationId || null);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  const socketRef = useRef<Socket | null>(null);
  const conversationIdRef = useRef<string | null>(initialConversationId || null);
  const hasJoined = useRef(false);

  const getNamespace = useCallback((type: AIAppType): string => {
    return NAMESPACE_MAP[type] || '/ai/general';
  }, []);

  const connect = useCallback(() => {
    if (socketRef.current?.connected) return;

    setIsConnecting(true);
    setError(null);

    const namespace = getNamespace(appType);
    const url = `${socketUrl}${namespace}`;

    const socket = io(url, {
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      transports: ['websocket', 'polling'],
      auth: token ? { token } : {},
    });

    socket.on('connect', () => {
      setIsConnected(true);
      setIsConnecting(false);
    });

    socket.on('disconnect', () => {
      setIsConnected(false);
    });

    socket.on('connect_error', (err) => {
      setError(`Connection failed: ${err.message}`);
      setIsConnecting(false);
    });

    socket.on(AI_EVENTS.JOINED, (data: { conversationId: string }) => {
      conversationIdRef.current = data.conversationId;
      setConversationId(data.conversationId);
      hasJoined.current = true;
    });

    socket.on(AI_EVENTS.AI_TYPING, (data: { isTyping: boolean }) => {
      setIsTyping(data.isTyping);
    });

    socket.on(AI_EVENTS.AI_MESSAGE, (message: AIMessage) => {
      setMessages((prev) => [...prev, message]);
      onMessage?.(message);

      if (message.metadata?.suggestions) {
        setSuggestions(message.metadata.suggestions);
      }
    });

    socket.on(AI_EVENTS.ACTION_RESULT, (data: {
      actionType: string;
      status: string;
      message: string;
    }) => {
      onAction?.({ type: data.actionType, data: { status: data.status, message: data.message } });
    });

    socket.on('ai:escalate', (data: { reason: string; department?: string }) => {
      onEscalate?.(data);
    });

    socket.on(AI_EVENTS.ERROR, (data: { message: string }) => {
      setError(data.message);
    });

    socketRef.current = socket;
  }, [appType, socketUrl, token, getNamespace, onEscalate, onAction, onMessage]);

  const disconnect = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
      setIsConnected(false);
      hasJoined.current = false;
    }
  }, []);

  const joinConversation = useCallback((convId?: string) => {
    if (!socketRef.current?.connected) return;

    const convIdToUse = convId || conversationIdRef.current || `conv_${userId}_${Date.now()}`;

    socketRef.current.emit(AI_EVENTS.JOIN, {
      appType,
      industryCategory,
      merchantId,
      conversationId: convIdToUse,
      userId,
      customerContext,
    });
  }, [appType, industryCategory, merchantId, userId, customerContext]);

  const sendMessage = useCallback(async (content: string) => {
    if (!socketRef.current?.connected) {
      return;
    }

    const convId = conversationIdRef.current || `conv_${userId}_${Date.now()}`;

    const userMessage: AIMessage = {
      id: `user_${Date.now()}`,
      content,
      sender: 'user',
      timestamp: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMessage]);
    onMessage?.(userMessage);

    socketRef.current.emit(AI_EVENTS.MESSAGE, {
      conversationId: convId,
      userId,
      content,
      customerContext,
      appType,
      industryCategory,
      merchantId,
    });
  }, [userId, customerContext, appType, industryCategory, merchantId, onMessage]);

  const selectSuggestion = useCallback(async (suggestion: string) => {
    if (!socketRef.current?.connected) return;

    socketRef.current.emit(AI_EVENTS.SUGGESTION, {
      conversationId: conversationIdRef.current,
      suggestion,
      customerContext,
    });
  }, [customerContext]);

  const transferToStaff = useCallback((reason?: string, department?: string) => {
    if (!socketRef.current?.connected) return;

    socketRef.current.emit(AI_EVENTS.TRANSFER, {
      conversationId: conversationIdRef.current,
      reason: reason || 'User requested human assistance',
      department,
    });
  }, []);

  const endChat = useCallback(() => {
    if (!socketRef.current?.connected) return;

    socketRef.current.emit(AI_EVENTS.END, {
      conversationId: conversationIdRef.current,
    });

    disconnect();
  }, [disconnect]);

  const clearMessages = useCallback(() => {
    setMessages([]);
    setSuggestions([]);
  }, []);

  useEffect(() => {
    if (autoConnect) {
      connect();
    }

    return () => {
      disconnect();
    };
  }, [autoConnect, connect, disconnect]);

  useEffect(() => {
    if (isConnected && !hasJoined.current) {
      joinConversation();
    }
  }, [isConnected, joinConversation]);

  return {
    messages,
    isTyping,
    isConnected,
    isConnecting,
    conversationId,
    suggestions,
    error,
    sendMessage,
    selectSuggestion,
    transferToStaff,
    endChat,
    clearMessages,
    connect,
    disconnect,
  };
}
