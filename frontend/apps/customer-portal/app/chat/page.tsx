'use client';

import { useState, useRef, useEffect } from 'react';
import { Send, MessageCircle, User, Clock, X, Minimize2, Maximize2 } from 'lucide-react';
import type { ChatSession, ChatMessage } from '@/lib/types';
import api from '@/lib/api';

export default function ChatPage() {
  const [session, setSession] = useState<ChatSession | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isMinimized, setIsMinimized] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const pollingRef = useRef<NodeJS.Timeout | null>(null);

  // Start a new chat session
  const startChat = async () => {
    setLoading(true);
    setError(null);

    const response = await api.createChatSession();

    if (response.success && response.data) {
      setSession(response.data);
      setMessages([
        {
          id: '1',
          sessionId: response.data.id,
          senderType: 'system',
          senderName: 'System',
          content: 'Welcome to RTMN Support! You are now connected with a support agent. How can we help you today?',
          createdAt: new Date().toISOString(),
        },
      ]);
    } else {
      setError(response.error || 'Failed to start chat');
    }

    setLoading(false);
  };

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
      pollMessages();
      pollingRef.current = setInterval(pollMessages, 5000);
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

  // Send a message
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || sending || !session) return;

    setSending(true);

    // Optimistically add user message
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
      // Replace temp message with real one
      setMessages((prev) =>
        prev.map((m) => (m.id === tempMessage.id ? response.data! : m))
      );
    } else {
      // Remove temp message on error
      setMessages((prev) => prev.filter((m) => m.id !== tempMessage.id));
      setError(response.error || 'Failed to send message');
    }

    setSending(false);
  };

  // End chat session
  const endChat = async () => {
    if (!session) return;

    const response = await api.endChatSession(session.id);
    if (response.success) {
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
          content: 'This chat session has ended. Thank you for contacting us!',
          createdAt: new Date().toISOString(),
        },
      ]);
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Live Chat</h1>
        <p className="text-gray-600">
          Chat with our support team in real-time
        </p>
      </div>

      {/* Chat interface */}
      <div className="card overflow-hidden">
        {/* Chat header */}
        <div className="bg-primary-600 text-white p-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <MessageCircle className="w-6 h-6" />
            <div>
              <h2 className="font-semibold">
                {session
                  ? session.status === 'active'
                    ? `Chat with ${session.agentName || 'Support Agent'}`
                    : session.status === 'waiting'
                    ? 'Waiting for agent...'
                    : 'Chat Ended'
                  : 'RTMN Support'}
              </h2>
              {session && (
                <p className="text-sm text-primary-100 flex items-center">
                  <span
                    className={`w-2 h-2 rounded-full mr-2 ${
                      session.status === 'active'
                        ? 'bg-green-400'
                        : session.status === 'waiting'
                        ? 'bg-yellow-400'
                        : 'bg-gray-400'
                    }`}
                  ></span>
                  {session.status === 'active'
                    ? 'Online'
                    : session.status === 'waiting'
                    ? 'Finding an agent...'
                    : 'Offline'}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {session && session.status !== 'ended' && (
              <button
                onClick={() => setIsMinimized(!isMinimized)}
                className="p-2 hover:bg-primary-700 rounded-lg transition-colors"
                title={isMinimized ? 'Maximize' : 'Minimize'}
              >
                {isMinimized ? <Maximize2 className="w-5 h-5" /> : <Minimize2 className="w-5 h-5" />}
              </button>
            )}
            {session && session.status !== 'ended' && (
              <button
                onClick={endChat}
                className="p-2 hover:bg-primary-700 rounded-lg transition-colors"
                title="End chat"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>

        {/* Chat body */}
        <div className={`${isMinimized ? 'h-0' : 'h-[500px]'} transition-all duration-300 flex flex-col`}>
          {!isMinimized && (
            <>
              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {!session && !loading && (
                  <div className="text-center py-12">
                    <MessageCircle className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500 mb-6">
                      Start a conversation with our support team
                    </p>
                    <button
                      onClick={startChat}
                      disabled={loading}
                      className="btn-primary"
                    >
                      {loading ? 'Starting...' : 'Start Chat'}
                    </button>
                  </div>
                )}

                {loading && (
                  <div className="flex items-center justify-center h-32">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
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
                      <div className="bg-gray-100 text-gray-500 text-sm px-4 py-2 rounded-full">
                        {message.content}
                      </div>
                    ) : (
                      <div
                        className={`max-w-[70%] rounded-lg p-3 ${
                          message.senderType === 'customer'
                            ? 'bg-primary-600 text-white'
                            : 'bg-gray-100 text-gray-900'
                        }`}
                      >
                        <div className="flex items-center mb-1 text-xs opacity-70">
                          <User className="w-3 h-3 mr-1" />
                          {message.senderName}
                        </div>
                        <p className="whitespace-pre-wrap">{message.content}</p>
                        <div className="text-xs opacity-70 mt-1 text-right">
                          {new Date(message.createdAt).toLocaleTimeString()}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>

              {/* Input */}
              {session && session.status !== 'ended' && (
                <div className="border-t border-gray-200 p-4">
                  <form onSubmit={handleSendMessage} className="flex items-center space-x-2">
                    <input
                      type="text"
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      placeholder="Type your message..."
                      className="input-field flex-1"
                      disabled={sending || session.status === 'waiting'}
                    />
                    <button
                      type="submit"
                      className="btn-primary flex items-center"
                      disabled={!newMessage.trim() || sending || session.status === 'waiting'}
                    >
                      <Send className="w-4 h-4" />
                    </button>
                  </form>
                  {session.status === 'waiting' && (
                    <p className="text-sm text-gray-500 mt-2 text-center">
                      <Clock className="w-4 h-4 inline mr-1" />
                      Please wait, an agent will be with you shortly...
                    </p>
                  )}
                </div>
              )}

              {session && session.status === 'ended' && (
                <div className="border-t border-gray-200 p-4 bg-gray-50 text-center">
                  <p className="text-gray-600 mb-4">This chat session has ended.</p>
                  <button onClick={startChat} className="btn-primary">
                    Start New Chat
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Info */}
      <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="card p-4 text-center">
          <Clock className="w-8 h-8 text-primary-600 mx-auto mb-2" />
          <h3 className="font-semibold text-gray-900">24/7 Support</h3>
          <p className="text-sm text-gray-600">Available anytime</p>
        </div>
        <div className="card p-4 text-center">
          <User className="w-8 h-8 text-primary-600 mx-auto mb-2" />
          <h3 className="font-semibold text-gray-900">Expert Agents</h3>
          <p className="text-sm text-gray-600">Real people, real help</p>
        </div>
        <div className="card p-4 text-center">
          <MessageCircle className="w-8 h-8 text-primary-600 mx-auto mb-2" />
          <h3 className="font-semibold text-gray-900">Quick Response</h3>
          <p className="text-sm text-gray-600">Usually within minutes</p>
        </div>
      </div>

      {error && (
        <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-600">
          {error}
        </div>
      )}
    </div>
  );
}
