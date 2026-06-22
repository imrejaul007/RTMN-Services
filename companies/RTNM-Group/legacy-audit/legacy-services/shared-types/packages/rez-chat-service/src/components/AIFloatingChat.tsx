// ── AI Floating Chat Component ────────────────────────────────────────────────────
// Universal AI chat widget for all ReZ ecosystem apps

import React, { useState, useRef, useEffect } from 'react';
import { useAIChat, AIAppType, CustomerContext } from '../hooks/useAIChat';

export interface AIFloatingChatProps {
  /** App type for routing */
  appType: AIAppType;
  /** Industry category (hotel, restaurant, pharmacy, etc.) */
  industryCategory?: string;
  /** User ID */
  userId: string;
  /** Merchant/hotel/restaurant ID */
  merchantId?: string;
  /** Customer context for personalization */
  customerContext?: CustomerContext;
  /** Socket server URL */
  socketUrl: string;
  /** Auth token */
  token?: string;
  /** Chat button position */
  position?: 'bottom-right' | 'bottom-left';
  /** Custom theme color */
  themeColor?: string;
  /** Show/hide suggestions */
  showSuggestions?: boolean;
  /** Enable transfer to staff */
  enableTransfer?: boolean;
  /** On escalation callback */
  onEscalate?: (data: { reason: string; department?: string }) => void;
  /** On action callback */
  onAction?: (action: { type: string; data: Record<string, unknown> }) => void;
}

export function AIFloatingChat({
  appType,
  industryCategory,
  userId,
  merchantId,
  customerContext,
  socketUrl,
  token,
  position = 'bottom-right',
  themeColor = '#6366f1',
  showSuggestions = true,
  enableTransfer = true,
  onEscalate,
  onAction,
}: AIFloatingChatProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const {
    messages,
    isTyping,
    isConnected,
    suggestions,
    sendMessage,
    selectSuggestion,
    transferToStaff,
    endChat,
    clearMessages,
  } = useAIChat({
    userId,
    appType,
    industryCategory,
    merchantId,
    customerContext,
    socketUrl,
    token,
    autoConnect: true,
    onEscalate,
    onAction,
  });

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Open chat on mount
  useEffect(() => {
    if (isConnected) {
      setIsOpen(true);
    }
  }, [isConnected]);

  const handleSend = async () => {
    if (!inputValue.trim()) return;
    await sendMessage(inputValue);
    setInputValue('');
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        [position]: '20px',
        zIndex: 9999,
        fontFamily: 'system-ui, sans-serif',
      }}
    >
      {/* Chat Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          style={{
            width: '60px',
            height: '60px',
            borderRadius: '50%',
            backgroundColor: themeColor,
            border: 'none',
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            fontSize: '24px',
          }}
        >
          💬
        </button>
      )}

      {/* Chat Window */}
      {isOpen && (
        <div
          style={{
            width: '380px',
            height: '520px',
            backgroundColor: 'white',
            borderRadius: '16px',
            boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
          }}
        >
          {/* Header */}
          <div
            style={{
              backgroundColor: themeColor,
              color: 'white',
              padding: '16px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <div>
              <div style={{ fontWeight: 600, fontSize: '16px' }}>AI Assistant</div>
              <div style={{ fontSize: '12px', opacity: 0.9 }}>
                {isConnected ? 'Online' : 'Connecting...'}
              </div>
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              {enableTransfer && (
                <button
                  onClick={() => transferToStaff('User requested human help')}
                  style={{
                    backgroundColor: 'rgba(255,255,255,0.2)',
                    border: 'none',
                    borderRadius: '8px',
                    padding: '8px 12px',
                    color: 'white',
                    cursor: 'pointer',
                    fontSize: '12px',
                  }}
                >
                  Transfer
                </button>
              )}
              <button
                onClick={() => {
                  setIsOpen(false);
                  endChat();
                }}
                style={{
                  backgroundColor: 'rgba(255,255,255,0.2)',
                  border: 'none',
                  borderRadius: '8px',
                  width: '32px',
                  height: '32px',
                  color: 'white',
                  cursor: 'pointer',
                }}
              >
                ✕
              </button>
            </div>
          </div>

          {/* Messages */}
          <div
            style={{
              flex: 1,
              overflowY: 'auto',
              padding: '16px',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
            }}
          >
            {messages.map((message) => (
              <div
                key={message.id}
                style={{
                  display: 'flex',
                  justifyContent: message.sender === 'user' ? 'flex-end' : 'flex-start',
                }}
              >
                <div
                  style={{
                    maxWidth: '80%',
                    padding: '12px 16px',
                    borderRadius: '16px',
                    backgroundColor:
                      message.sender === 'user' ? themeColor : message.sender === 'ai' ? '#f3f4f6' : '#e0e7ff',
                    color: message.sender === 'user' ? 'white' : '#1f2937',
                    fontSize: '14px',
                    lineHeight: 1.5,
                  }}
                >
                  {message.content}
                </div>
              </div>
            ))}

            {isTyping && (
              <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
                <div
                  style={{
                    padding: '12px 16px',
                    borderRadius: '16px',
                    backgroundColor: '#f3f4f6',
                    color: '#6b7280',
                    fontSize: '14px',
                  }}
                >
                  Typing...
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Suggestions */}
          {showSuggestions && suggestions.length > 0 && (
            <div
              style={{
                padding: '8px 16px',
                display: 'flex',
                flexWrap: 'wrap',
                gap: '8px',
                borderTop: '1px solid #e5e7eb',
              }}
            >
              {suggestions.map((suggestion, i) => (
                <button
                  key={i}
                  onClick={() => selectSuggestion(suggestion)}
                  style={{
                    padding: '6px 12px',
                    borderRadius: '16px',
                    border: `1px solid ${themeColor}`,
                    backgroundColor: 'transparent',
                    color: themeColor,
                    fontSize: '12px',
                    cursor: 'pointer',
                  }}
                >
                  {suggestion}
                </button>
              ))}
            </div>
          )}

          {/* Input */}
          <div
            style={{
              padding: '12px 16px',
              borderTop: '1px solid #e5e7eb',
              display: 'flex',
              gap: '8px',
            }}
          >
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Type your message..."
              style={{
                flex: 1,
                padding: '10px 16px',
                borderRadius: '24px',
                border: '1px solid #e5e7eb',
                fontSize: '14px',
                outline: 'none',
              }}
            />
            <button
              onClick={handleSend}
              disabled={!inputValue.trim()}
              style={{
                width: '44px',
                height: '44px',
                borderRadius: '50%',
                backgroundColor: inputValue.trim() ? themeColor : '#e5e7eb',
                border: 'none',
                color: 'white',
                cursor: inputValue.trim() ? 'pointer' : 'default',
                fontSize: '18px',
              }}
            >
              ➤
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Hook Export ─────────────────────────────────────────────────────────────────

export { useAIChat } from '../hooks/useAIChat';
export type { UseAIChatOptions, UseAIChatReturn, AIAppType, AIMessage, CustomerContext } from '../hooks/useAIChat';
