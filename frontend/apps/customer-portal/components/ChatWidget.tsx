'use client';

import { useState, useRef, useEffect } from 'react';
import { MessageCircle, X, Send, Minimize2, Maximize2, User, Loader2 } from 'lucide-react';
import type { ChatSession, ChatMessage } from '@/lib/types';
import api from '@/lib/api';

interface ChatWidgetProps {
  position?: 'bottom-right' | 'bottom-left';
}

export default function ChatWidget({ position = 'bottom-right' }: ChatWidgetProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [session, setSession] = useState<ChatSession | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const pollingRef = useRef<NodeJS.Timeout | null>(null);

  // Poll for new messages
  const pollMessages = async () => {
    if (!session) return;

    const response = await api.getChatMessages(session.id);
    if (response.success && response.data) {
      const newMessages = response.data.filter(
        (m) => !messages.find((existing) => existing.id === m.id)
      );
      if (newMessages.length > 0) {
        setMessages((prev) => [...prev, ...newMessages]);
      }
    }
  };

  // Start polling when session is active
  useEffect(() => {
    if (session?.status === 'active') {
      pollingRef.current = setInterval(pollMessages, 3000);
    }

    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
      }
    };
  }, [session?.status, session?.id]);

  // Auto-scroll to new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const startChat = async () => {
    setLoading(true);
    const response = await api.createChatSession();

    if (response.success && response.data) {
      setSession(response.data);
      setMessages([
        {
          id: '1',
          sessionId: response.data.id,
          senderType: 'system',
          senderName: 'System',
          content: 'Welcome! How can we help you today?',
          createdAt: new Date().toISOString(),
        },
      ]);
    }

    setLoading(false);
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || sending || !session) return;

    setSending(true);

    const tempMessage: ChatMessage = {
      id: `temp-${Date.now()}`,
      sessionId: session.id,
      senderType: 'customer',
      senderName: 'You',
      content: newMessage.trim(),
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, tempMessage]);
    setNewMessage('');

    const response = await api.sendChatMessage(session.id, tempMessage.content);

    if (response.success && response.data) {
      setMessages((prev) =>
        prev.map((m) => (m.id === tempMessage.id ? response.data! : m))
      );
    }

    setSending(false);
  };

  const endChat = async () => {
    if (!session) return;

    await api.endChatSession(session.id);
    setSession((prev) =>
      prev ? { ...prev, status: 'ended', endedAt: new Date().toISOString() } : null
    );
    setMessages((prev) => [
      ...prev,
      {
        id: `system-${Date.now()}`,
        sessionId: session.id,
        senderType: 'system',
        senderName: 'System',
        content: 'Chat ended. Thank you!',
        createdAt: new Date().toISOString(),
      },
    ]);
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className={`fixed bottom-6 ${position === 'bottom-right' ? 'right-6' : 'left-6'} w-14 h-14 bg-primary-600 text-white rounded-full shadow-lg hover:bg-primary-700 transition-colors flex items-center justify-center z-50`}
        aria-label="Open chat"
      >
        <MessageCircle className="w-6 h-6" />
      </button>
    );
  }

  return (
    <div
      className={`fixed ${position === 'bottom-right' ? 'right-6' : 'left-6'} bottom-6 w-80 md:w-96 bg-white rounded-xl shadow-2xl overflow-hidden z-50 flex flex-col transition-all duration-300 ${
        isMinimized ? 'h-14' : 'h-[500px]'
      }`}
    >
      {/* Header */}
      <div className="bg-primary-600 text-white p-4 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-primary-500 rounded-full flex items-center justify-center">
            <MessageCircle className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-semibold">RTMN Support</h3>
            {session && (
              <p className="text-xs text-primary-100">
                {session.status === 'active'
                  ? `Chatting with ${session.agentName || 'Agent'}`
                  : session.status === 'waiting'
                  ? 'Finding agent...'
                  : 'Chat ended'}
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center space-x-1">
          <button
            onClick={() => setIsMinimized(!isMinimized)}
            className="p-1.5 hover:bg-primary-700 rounded-lg transition-colors"
            aria-label={isMinimized ? 'Maximize' : 'Minimize'}
          >
            {isMinimized ? <Maximize2 className="w-4 h-4" /> : <Minimize2 className="w-4 h-4" />}
          </button>
          <button
            onClick={() => setIsOpen(false)}
            className="p-1.5 hover:bg-primary-700 rounded-lg transition-colors"
            aria-label="Close chat"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Body */}
      {!isMinimized && (
        <>
          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {!session && !loading && (
              <div className="text-center py-8">
                <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <MessageCircle className="w-8 h-8 text-primary-600" />
                </div>
                <h4 className="font-semibold text-gray-900 mb-2">Chat with Support</h4>
                <p className="text-sm text-gray-500 mb-4">
                  Start a conversation with our team
                </p>
                <button
                  onClick={startChat}
                  className="btn-primary"
                >
                  Start Chat
                </button>
              </div>
            )}

            {loading && (
              <div className="flex items-center justify-center h-32">
                <Loader2 className="w-8 h-8 text-primary-600 animate-spin" />
              </div>
            )}

            {session && messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${
                  message.senderType === 'customer'
                    ? 'justify-end'
                    : message.senderType === 'system'
                    ? 'justify-center'
                    : 'justify-start'
                }`}
              >
                {message.senderType === 'system' ? (
                  <span className="text-xs text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
                    {message.content}
                  </span>
                ) : (
                  <div
                    className={`max-w-[80%] rounded-lg p-3 ${
                      message.senderType === 'customer'
                        ? 'bg-primary-600 text-white'
                        : 'bg-gray-100 text-gray-900'
                    }`}
                  >
                    <div className="flex items-center mb-1 text-xs opacity-70">
                      <User className="w-3 h-3 mr-1" />
                      {message.senderName}
                    </div>
                    <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                  </div>
                )}
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          {session && session.status !== 'ended' && (
            <div className="border-t border-gray-200 p-3">
              <form onSubmit={handleSendMessage} className="flex items-center space-x-2">
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Type a message..."
                  className="input-field flex-1 py-2"
                  disabled={sending}
                />
                <button
                  type="submit"
                  className="p-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50"
                  disabled={!newMessage.trim() || sending}
                >
                  <Send className="w-5 h-5" />
                </button>
              </form>
            </div>
          )}

          {session && session.status === 'ended' && (
            <div className="border-t border-gray-200 p-4 text-center">
              <button
                onClick={() => {
                  setSession(null);
                  setMessages([]);
                }}
                className="btn-secondary text-sm"
              >
                Start New Chat
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
