// ── AI Chat Hook ──────────────────────────────────────────────────────────────────
// AI-powered chat hook for all ReZ ecosystem apps
// Works with hotel, restaurant, retail, support, and general queries

import { useCallback, useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';

export type AIAppType = 'hotel' | 'restaurant' | 'retail' | 'support' | 'general' | 'room-qr' | 'web-menu';

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

export interface UseAIChatOptions {
  /** User ID */
  userId: string;
  /** Conversation ID (for continuing chats) */
  conversationId?: string;
  /** App type for routing */
  appType: AIAppType;
  /** Industry category (hotel, restaurant, pharmacy, etc.) */
  industryCategory?: string;
  /** Merchant/hotel/restaurant ID */
  merchantId?: string;
  /** Customer context for personalization */
  customerContext?: CustomerContext;
  /** Socket server URL */
  socketUrl: string;
  /** Auth token */
  token?: string;
  /** Auto connect on mount */
  autoConnect?: boolean;
  /** Enable AI suggestions */
  enableSuggestions?: boolean;
  /** Callback when escalation needed */
  onEscalate?: (data: { reason: string; department?: string }) => void;
  /** Callback when action is triggered */
  onAction?: (action: { type: string; data: Record<string, unknown> }) => void;
}

export interface UseAIChatReturn {
  // State
  messages: AIMessage[];
  isTyping: boolean;
  isConnected: boolean;
  isConnecting: boolean;
  conversationId: string | null;
  suggestions: string[];
  error: string | null;

  // Actions
  sendMessage: (content: string) => Promise<void>;
  selectSuggestion: (suggestion: string) => Promise<void>;
  transferToStaff: (reason?: string, department?: string) => void;
  endChat: (rating?: number) => void;
  clearMessages: () => void;

  // Connection
  connect: () => void;
  disconnect: () => void;

  // Refs
  socketRef: React.MutableRefObject<Socket | null>;
}

// ── AI Socket Events ───────────────────────────────────────────────────────────

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
} as const;

// ── Hook Implementation ─────────────────────────────────────────────────────────

export function useAIChat(options: UseAIChatOptions): UseAIChatReturn {
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
  } = options;

  // ── State ─────────────────────────────────────────────────────────────────

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

  // ── Get Namespace ────────────────────────────────────────────────────────

  const getNamespace = useCallback((type: AIAppType): string => {
    const namespaces: Record<AIAppType, string> = {
      hotel: '/ai/hotel',
      'room-qr': '/ai/room-qr',
      'web-menu': '/ai/web-menu',
      restaurant: '/ai/restaurant',
      retail: '/ai/retail',
      support: '/ai/support',
      general: '/ai/general',
    };
    return namespaces[type] || '/ai/general';
  }, []);

  // ── Connect ──────────────────────────────────────────────────────────────

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
      logger.info('[useAIChat] Connected to', namespace);
    });

    socket.on('disconnect', () => {
      setIsConnected(false);
      logger.info('[useAIChat] Disconnected');
    });

    socket.on('connect_error', (err) => {
      setError(`Connection failed: ${err.message}`);
      setIsConnecting(false);
    });

    // ── Joined ──────────────────────────────────────────────────────────

    socket.on(AI_EVENTS.JOINED, (data: { conversationId: string; status: string }) => {
      conversationIdRef.current = data.conversationId;
      setConversationId(data.conversationId);
      hasJoined.current = true;
    });

    // ── AI Typing ──────────────────────────────────────────────────────

    socket.on(AI_EVENTS.AI_TYPING, (data: { isTyping: boolean }) => {
      setIsTyping(data.isTyping);
    });

    // ── AI Message ─────────────────────────────────────────────────────

    socket.on(AI_EVENTS.AI_MESSAGE, (message: AIMessage) => {
      setMessages((prev) => [...prev, message]);

      if (message.metadata?.suggestions) {
        setSuggestions(message.metadata.suggestions);
      }
    });

    // ── Action Result ─────────────────────────────────────────────────

    socket.on(AI_EVENTS.ACTION_RESULT, (data: {
      actionType: string;
      status: string;
      message: string;
    }) => {
      onAction?.({ type: data.actionType, data: { status: data.status, message: data.message } });
    });

    // ── Escalate ──────────────────────────────────────────────────────

    socket.on('ai:escalate', (data: { reason: string; department?: string }) => {
      onEscalate?.(data);
    });

    // ── Error ─────────────────────────────────────────────────────────

    socket.on(AI_EVENTS.ERROR, (data: { message: string }) => {
      setError(data.message);
    });

    // ── End ───────────────────────────────────────────────────────────

    socket.on(AI_EVENTS.ENDED, () => {
      // Chat session ended
    });

    socketRef.current = socket;
  }, [appType, socketUrl, token, getNamespace, onEscalate, onAction]);

  // ── Disconnect ─────────────────────────────────────────────────────────

  const disconnect = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
      setIsConnected(false);
      hasJoined.current = false;
    }
  }, []);

  // ── Join Conversation ───────────────────────────────────────────────────

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

  // ── Send Message ───────────────────────────────────────────────────────

  const sendMessage = useCallback(async (content: string) => {
    if (!socketRef.current?.connected) {
      // Queue message for when connected
      return;
    }

    const convId = conversationIdRef.current || `conv_${userId}_${Date.now()}`;

    // Add user message to UI immediately
    const userMessage: AIMessage = {
      id: `user_${Date.now()}`,
      content,
      sender: 'user',
      timestamp: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMessage]);

    // Send to server
    socketRef.current.emit(AI_EVENTS.MESSAGE, {
      conversationId: convId,
      userId,
      content,
      customerContext,
      appType,
      industryCategory,
      merchantId,
    });
  }, [userId, customerContext, appType, industryCategory, merchantId]);

  // ── Select Suggestion ─────────────────────────────────────────────────

  const selectSuggestion = useCallback(async (suggestion: string) => {
    if (!socketRef.current?.connected) return;

    socketRef.current.emit(AI_EVENTS.SUGGESTION, {
      conversationId: conversationIdRef.current,
      suggestion,
      customerContext,
    });
  }, [customerContext]);

  // ── Transfer to Staff ─────────────────────────────────────────────────

  const transferToStaff = useCallback((reason?: string, department?: string) => {
    if (!socketRef.current?.connected) return;

    socketRef.current.emit(AI_EVENTS.TRANSFER, {
      conversationId: conversationIdRef.current,
      reason: reason || 'User requested human assistance',
      department,
    });
  }, []);

  // ── End Chat ─────────────────────────────────────────────────────────

  const endChat = useCallback((rating?: number) => {
    if (!socketRef.current?.connected) return;

    socketRef.current.emit(AI_EVENTS.END, {
      conversationId: conversationIdRef.current,
      rating,
    });

    disconnect();
  }, [disconnect]);

  // ── Clear Messages ────────────────────────────────────────────────────

  const clearMessages = useCallback(() => {
    setMessages([]);
    setSuggestions([]);
  }, []);

  // ── Effects ───────────────────────────────────────────────────────────

  // Auto connect
  useEffect(() => {
    if (autoConnect) {
      connect();
    }

    return () => {
      disconnect();
    };
  }, [autoConnect, connect, disconnect]);

  // Auto join when connected
  useEffect(() => {
    if (isConnected && !hasJoined.current) {
      joinConversation();
    }
  }, [isConnected, joinConversation]);

  // ── Return ────────────────────────────────────────────────────────────

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
    socketRef,
  };
}

// ── Logger (for development) ─────────────────────────────────────────────────

const logger = {
  info: (...args: unknown[]) => {
    if (process.env.NODE_ENV === 'development') {
      console.log('[useAIChat]', ...args);
    }
  },
  error: (...args: unknown[]) => {
    console.error('[useAIChat]', ...args);
  },
};
