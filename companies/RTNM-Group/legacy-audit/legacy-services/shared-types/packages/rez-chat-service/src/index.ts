// @rez/chat - Unified Real-time Chat Service for ReZ Ecosystem
//
// This package provides a unified chat solution for all ReZ apps:
// - rez-app-consumer (customer support)
// - rez-app-admin (support dashboard)
// - rez-now (AI ordering assistant)
// - rez-web-menu (web ordering)
// - Hotel PMS (guest-to-staff messaging)
//
// Features:
// - Unified WebSocket client with reconnection
// - Optimistic message updates
// - Offline message queue
// - Typing indicators
// - Read receipts
// - Multi-app support (different namespaces for support, AI, hotel, etc.)

// ── Types ──────────────────────────────────────────────────────────────────────

export * from './types';
export * from './types/hotel';
export * from './types/store';

// ── Core ───────────────────────────────────────────────────────────────────────

export { ChatSocketClient, getChatSocket, destroyChatSocket } from './core/ChatSocketClient';
export type { ChatSocketConfig, ChatSocketOptions } from './core/ChatSocketClient';

// ── Hooks ─────────────────────────────────────────────────────────────────────

export { useChat } from './hooks/useChat';
export type { UseChatOptions, UseChatReturn } from './hooks/useChat';

export { useHotelChat } from './hooks/useHotelChat';
export type { UseHotelChatOptions, UseHotelChatReturn } from './hooks/useHotelChat';

export { useAIChat } from './hooks/useAIChat';
export type { UseAIChatOptions, UseAIChatReturn, AIAppType, AIMessage, CustomerContext } from './hooks/useAIChat';

// ── Providers ──────────────────────────────────────────────────────────────────

export { ChatProvider, useChatContext, useSupportChat, useAIMessage } from './providers/ChatProvider';
export type { ChatProviderConfig, ChatProviderProps, ChatContextValue } from './providers/ChatProvider';

// ── Constants ──────────────────────────────────────────────────────────────────

export { CHAT_EVENTS } from './types';
export { HOTEL_CHAT_EVENTS, HOTEL_CHAT_ENDPOINTS } from './types/hotel';
export { STORE_CHAT_EVENTS, STORE_CHAT_ENDPOINTS } from './types/store';

// ── Components ─────────────────────────────────────────────────────────────────

export { AIFloatingChat } from './components/AIFloatingChat';
