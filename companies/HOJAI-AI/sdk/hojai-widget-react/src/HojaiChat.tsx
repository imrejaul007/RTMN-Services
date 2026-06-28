/**
 * HojaiChat — Full React Chat Widget
 *
 * Features:
 * - Chat bubble with minimize/maximize
 * - Voice input/output
 * - Product cards
 * - Quick actions
 * - Typing indicator
 * - Multi-language support
 */

import React, { useState, useEffect, useRef } from 'react';

// Types
export interface HojaiMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  attachments?: HojaiAttachment[];
  actions?: HojaiAction[];
  type?: 'text' | 'product' | 'order' | 'recommendation';
}

export interface HojaiAttachment {
  type: 'product' | 'image' | 'video';
  data: any;
}

export interface HojaiAction {
  label: string;
  action: string;
  payload?: any;
}

export interface HojaiChatProps {
  apiKey: string;
  companyId: string;
  name?: string;
  greeting?: string;
  color?: string;
  position?: 'bottom-right' | 'bottom-left';
  locale?: string;
  onMessage?: (msg: string) => void;
  onResponse?: (msg: HojaiMessage) => void;
  showVoice?: boolean;
  showProducts?: boolean;
}

// Components
const ProductCard: React.FC<{ product: any; onAction: (a: string, p: any) => void }> = ({ product, onAction }) => (
  <div style={{
    background: '#fff',
    border: '1px solid #e5e7eb',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
  }}>
    <div style={{ display: 'flex', gap: 12 }}>
      {product.image && (
        <img src={product.image} alt={product.name} style={{ width: 80, height: 80, objectFit: 'cover', borderRadius: 8 }} />
      )}
      <div style={{ flex: 1 }}>
        <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 4 }}>{product.name}</div>
        <div style={{ fontSize: 18, fontWeight: 700, color: '#059669' }}>
          ₹{product.price?.toLocaleString('en-IN')}
          {product.originalPrice && (
            <span style={{ fontSize: 12, color: '#9ca3af', textDecoration: 'line-through', marginLeft: 8 }}>
              ₹{product.originalPrice.toLocaleString('en-IN')}
            </span>
          )}
        </div>
        {product.rating && (
          <div style={{ fontSize: 12, color: '#f59e0b', marginTop: 4 }}>
            {'★'.repeat(Math.round(product.rating))} {product.rating}
          </div>
        )}
      </div>
    </div>
    <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
      <button
        onClick={() => onAction('view', product)}
        style={{ flex: 1, padding: '8px 12px', background: '#f3f4f6', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 13 }}
      >View</button>
      <button
        onClick={() => onAction('buy', product)}
        style={{ flex: 1, padding: '8px 12px', background: '#059669', color: 'white', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 13 }}
      >Add to Cart</button>
    </div>
  </div>
);

const QuickActions: React.FC<{ actions: HojaiAction[]; onAction: (a: string) => void }> = ({ actions, onAction }) => (
  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
    {actions.map((action, i) => (
      <button
        key={i}
        onClick={() => onAction(action.action)}
        style={{
          padding: '8px 16px',
          background: '#f0fdf4',
          border: '1px solid #86efac',
          borderRadius: 20,
          fontSize: 13,
          color: '#166534',
          cursor: 'pointer'
        }}
      >
        {action.label}
      </button>
    ))}
  </div>
);

const MessageBubble: React.FC<{ msg: HojaiMessage; onAction: (a: string, p: any) => void }> = ({ msg, onAction }) => (
  <div style={{
    display: 'flex',
    justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start',
    marginBottom: 12
  }}>
    <div style={{
      maxWidth: '80%',
      background: msg.role === 'user' ? '#059669' : '#fff',
      color: msg.role === 'user' ? 'white' : '#1f2937',
      padding: '12px 16px',
      borderRadius: msg.role === 'user' ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
      boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
      fontSize: 14,
      lineHeight: 1.5
    }}>
      {msg.content}

      {/* Product cards */}
      {msg.type === 'product' && msg.attachments?.map((att, i) => (
        att.type === 'product' && <ProductCard key={i} product={att.data} onAction={onAction} />
      ))}

      {/* Quick actions */}
      {msg.actions && msg.actions.length > 0 && (
        <QuickActions actions={msg.actions} onAction={(a) => onAction(a, null)} />
      )}

      {/* Timestamp */}
      <div style={{ fontSize: 10, opacity: 0.6, marginTop: 4, textAlign: 'right' }}>
        {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
      </div>
    </div>
  </div>
);

const TypingIndicator: React.FC = () => (
  <div style={{ display: 'flex', justifyContent: 'flex-start', marginBottom: 12 }}>
    <div style={{
      background: '#fff',
      padding: '12px 16px',
      borderRadius: '18px 18px 18px 4px',
      boxShadow: '0 1px 2px rgba(0,0,0,0.1)'
    }}>
      <div style={{ display: 'flex', gap: 4 }}>
        {[0, 1, 2].map(i => (
          <div key={i} style={{
            width: 8, height: 8, borderRadius: '50%',
            background: '#9ca3af',
            animation: 'bounce 1.4s infinite',
            animationDelay: `${i * 0.2}s`
          }} />
        ))}
      </div>
    </div>
    <style>{`
      @keyframes bounce {
        0%, 60%, 100% { transform: translateY(0); }
        30% { transform: translateY(-6px); }
      }
    `}</style>
  </div>
);

// Main Component
const HojaiChat: React.FC<HojaiChatProps> = ({
  apiKey,
  companyId,
  name = 'Assistant',
  greeting = 'Hi! How can I help you today?',
  color = '#3B82F6',
  position = 'bottom-right',
  locale = 'en',
  onMessage,
  onResponse,
  showVoice = true,
  showProducts = true
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<HojaiMessage[]>([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Initialize with greeting
  useEffect(() => {
    if (!messages.length) {
      setMessages([{
        id: '1',
        role: 'assistant',
        content: greeting,
        timestamp: new Date()
      }]);
    }
  }, [greeting]);

  // Scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) inputRef.current?.focus();
  }, [isOpen]);

  const sendMessage = async (text: string) => {
    if (!text.trim()) return;

    const userMsg: HojaiMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: text,
      timestamp: new Date()
    };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsTyping(true);
    onMessage?.(text);

    // Simulate AI response (replace with real API call)
    setTimeout(() => {
      const responses = [
        { content: 'I can help you find that. Let me search...', type: 'text' },
        { content: 'Here are some products you might like:', type: 'product', attachments: showProducts ? [{ type: 'product', data: { name: 'Premium Headphones', price: 2999, originalPrice: 4999, rating: 4.5, image: 'https://picsum.photos/200' } }] : undefined },
        { content: 'I found what you\'re looking for!', type: 'text', actions: [{ label: 'Add to Cart', action: 'add_to_cart' }, { label: 'View Details', action: 'view_product' }] }
      ];
      const response = responses[Math.floor(Math.random() * responses.length)];

      const aiMsg: HojaiMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: response.content,
        timestamp: new Date(),
        type: response.type as any,
        attachments: response.attachments,
        actions: response.actions
      };

      setMessages(prev => [...prev, aiMsg]);
      setIsTyping(false);
      onResponse?.(aiMsg);
    }, 1500);
  };

  const handleAction = (action: string, payload: any) => {
    console.log('Action:', action, payload);
    sendMessage(`User clicked: ${action}`);
  };

  const toggleVoice = () => {
    if (isRecording) {
      setIsRecording(false);
      // Stop recording and process
    } else {
      setIsRecording(true);
      // Start recording
      setTimeout(() => {
        setIsRecording(false);
        sendMessage('Voice message processed');
      }, 3000);
    }
  };

  return (
    <>
      {/* Chat Widget Container */}
      <div style={{
        position: 'fixed',
        [position]: 20,
        bottom: 0,
        zIndex: 999999
      }}>
        {/* Chat Window */}
        {isOpen && (
          <div style={{
            width: 380,
            height: 520,
            background: 'white',
            borderRadius: 16,
            boxShadow: '0 10px 40px rgba(0,0,0,0.2)',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            marginBottom: 16
          }}>
            {/* Header */}
            <div style={{
              background: color,
              color: 'white',
              padding: '16px 20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{
                  width: 40, height: 40, borderRadius: '50%',
                  background: 'rgba(255,255,255,0.2)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 20
                }}>
                  🤖
                </div>
                <div>
                  <div style={{ fontWeight: 600 }}>{name}</div>
                  <div style={{ fontSize: 12, opacity: 0.8 }}>Powered by HOJAI</div>
                </div>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                style={{
                  background: 'rgba(255,255,255,0.2)',
                  border: 'none',
                  color: 'white',
                  width: 32, height: 32,
                  borderRadius: '50%',
                  cursor: 'pointer',
                  fontSize: 18
                }}
              >
                ×
              </button>
            </div>

            {/* Messages */}
            <div style={{ flex: 1, overflowY: 'auto', padding: 16 }}>
              {messages.map(msg => (
                <MessageBubble key={msg.id} msg={msg} onAction={handleAction} />
              ))}
              {isTyping && <TypingIndicator />}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div style={{
              padding: 12,
              borderTop: '1px solid #e5e7eb',
              display: 'flex',
              gap: 8,
              alignItems: 'center'
            }}>
              {showVoice && (
                <button
                  onClick={toggleVoice}
                  style={{
                    width: 40, height: 40,
                    borderRadius: '50%',
                    border: isRecording ? '2px solid #ef4444' : '1px solid #e5e7eb',
                    background: isRecording ? '#fef2f2' : 'white',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'all 0.2s'
                  }}
                >
                  {isRecording ? '🔴' : '🎤'}
                </button>
              )}
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && sendMessage(input)}
                placeholder="Type a message..."
                style={{
                  flex: 1,
                  padding: '10px 16px',
                  border: '1px solid #e5e7eb',
                  borderRadius: 24,
                  fontSize: 14,
                  outline: 'none'
                }}
              />
              <button
                onClick={() => sendMessage(input)}
                disabled={!input.trim()}
                style={{
                  width: 40, height: 40,
                  borderRadius: '50%',
                  background: input.trim() ? color : '#e5e7eb',
                  border: 'none',
                  color: 'white',
                  cursor: input.trim() ? 'pointer' : 'not-allowed',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 0.2s'
                }}
              >
                ➤
              </button>
            </div>
          </div>
        )}

        {/* Floating Button */}
        <button
          onClick={() => setIsOpen(!isOpen)}
          style={{
            width: isOpen ? 48 : 60,
            height: isOpen ? 48 : 60,
            borderRadius: '50%',
            background: color,
            border: 'none',
            color: 'white',
            cursor: 'pointer',
            boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: isOpen ? 20 : 24,
            transition: 'all 0.3s',
            marginLeft: 'auto',
            marginRight: isOpen ? 'auto' : 0
          }}
        >
          {isOpen ? '×' : '💬'}
        </button>
      </div>
    </>
  );
};

export default HojaiChat;
