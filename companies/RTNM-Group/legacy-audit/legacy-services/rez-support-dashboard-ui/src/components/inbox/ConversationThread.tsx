'use client';

import { useState, useRef, useEffect } from 'react';
import { Conversation } from '@/lib/api';
import { useInboxStore } from '@/stores/inboxStore';
import { formatDistanceToNow, format } from 'date-fns';
import {
  Send,
  User,
  Bot,
  Phone,
  Mail,
  MessageSquare,
  Instagram,
  Clock,
  Tag,
  UserCheck,
} from 'lucide-react';

interface Props {
  conversation: Conversation;
}

const channelIcons = {
  whatsapp: MessageSquare,
  email: Mail,
  instagram: Instagram,
  web: Phone,
  chat: MessageSquare,
};

export function ConversationThread({ conversation }: Props) {
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const { sendReply } = useInboxStore();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const Icon = channelIcons[conversation.channel];

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [conversation.messages]);

  const handleSend = async () => {
    if (!message.trim() || sending) return;
    setSending(true);
    try {
      await sendReply(message);
      setMessage('');
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b bg-white">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-gray-100 rounded-full">
            <Icon className="w-5 h-5 text-gray-600" />
          </div>
          <div className="flex-1">
            <h2 className="font-semibold text-gray-900">{conversation.customerName}</h2>
            <div className="flex items-center gap-4 text-sm text-gray-500">
              {conversation.customerEmail && (
                <span className="flex items-center gap-1">
                  <Mail className="w-3 h-3" />
                  {conversation.customerEmail}
                </span>
              )}
              {conversation.customerPhone && (
                <span className="flex items-center gap-1">
                  <Phone className="w-3 h-3" />
                  {conversation.customerPhone}
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {conversation.assignedAgentName ? (
              <span className="flex items-center gap-1 px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm">
                <UserCheck className="w-4 h-4" />
                {conversation.assignedAgentName}
              </span>
            ) : (
              <span className="px-3 py-1 bg-gray-100 text-gray-600 rounded-full text-sm">Unassigned</span>
            )}
          </div>
        </div>
        {conversation.subject && (
          <p className="mt-2 text-sm text-gray-600">
            <strong>Subject:</strong> {conversation.subject}
          </p>
        )}
        {conversation.tags.length > 0 && (
          <div className="flex items-center gap-2 mt-2">
            <Tag className="w-4 h-4 text-gray-400" />
            {conversation.tags.map((tag) => (
              <span key={tag} className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded">
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
        {conversation.messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.sender === 'agent' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[70%] rounded-lg p-3 ${
                msg.sender === 'agent'
                  ? 'bg-blue-500 text-white'
                  : msg.sender === 'system' || msg.sender === 'bot'
                  ? 'bg-gray-200 text-gray-700'
                  : 'bg-white border shadow-sm'
              }`}
            >
              <div className="flex items-center gap-2 mb-1 text-xs opacity-75">
                {msg.sender === 'customer' && <User className="w-3 h-3" />}
                {msg.sender === 'agent' && <UserCheck className="w-3 h-3" />}
                {msg.sender === 'bot' && <Bot className="w-3 h-3" />}
                <span>{msg.senderName || msg.sender}</span>
                <span>•</span>
                <span>{format(new Date(msg.timestamp), 'HH:mm')}</span>
              </div>
              <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Reply Box */}
      <div className="p-4 border-t bg-white">
        <div className="flex gap-3">
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type your reply..."
            className="flex-1 resize-none rounded-lg border p-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
            rows={2}
          />
          <button
            onClick={handleSend}
            disabled={!message.trim() || sending}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            <Send className="w-4 h-4" />
            Send
          </button>
        </div>
        {conversation.slaDeadline && (
          <div className="flex items-center gap-1 mt-2 text-xs text-gray-500">
            <Clock className="w-3 h-3" />
            SLA: {format(new Date(conversation.slaDeadline), 'PPp')}
          </div>
        )}
      </div>
    </div>
  );
}
