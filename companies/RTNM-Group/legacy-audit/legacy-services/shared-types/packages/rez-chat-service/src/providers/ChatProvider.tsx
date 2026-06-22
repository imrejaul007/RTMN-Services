// Chat Context Provider
// React context that provides chat functionality throughout the app

import React, { createContext, useContext, useMemo } from 'react';
import { useChat, UseChatOptions, UseChatReturn } from '../hooks/useChat';

export interface ChatProviderConfig {
  socketUrl: string;
  namespace?: string;
  enableOfflineQueue?: boolean;
  enableOptimistic?: boolean;
  typingTimeout?: number;
}

export interface ChatContextValue extends Omit<UseChatReturn, 'config'> {
  config: ChatProviderConfig;
}

const ChatContext = createContext<ChatContextValue | null>(null);

export interface ChatProviderProps {
  children: React.ReactNode;
  userId: string;
  userName: string;
  userAvatar?: string;
  token?: string;
  config: ChatProviderConfig;
  conversationId?: string;
}

export function ChatProvider({
  children,
  userId,
  userName,
  userAvatar,
  token,
  config,
  conversationId,
}: ChatProviderProps) {
  const chat = useChat({
    conversationId,
    userId,
    userName,
    userAvatar,
    apiBaseUrl: config.socketUrl,
    token,
    namespace: config.namespace,
    enableOfflineQueue: config.enableOfflineQueue,
    enableOptimistic: config.enableOptimistic,
    typingTimeout: config.typingTimeout,
    autoConnect: true,
  });

  const value = useMemo(
    () => ({
      ...chat,
      config,
    }),
    [chat, config]
  );

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
}

export function useChatContext(): ChatContextValue {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error('useChatContext must be used within a ChatProvider');
  }
  return context;
}

// Convenience hooks for specific use cases
export function useSupportChat(options: {
  userId: string;
  userName: string;
  userAvatar?: string;
  token?: string;
  apiBaseUrl: string;
  conversationId?: string;
}) {
  return useChat({
    ...options,
    namespace: 'support',
    enableOptimistic: true,
    enableOfflineQueue: true,
    typingTimeout: 3000,
  });
}

export function useAIMessage(options: {
  userId: string;
  userName: string;
  userAvatar?: string;
  apiBaseUrl: string;
  conversationId?: string;
}) {
  return useChat({
    ...options,
    namespace: 'ai',
    enableOptimistic: true,
    enableOfflineQueue: false,
    typingTimeout: 5000,
  });
}
