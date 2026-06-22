'use client';

import { Conversation } from '@/lib/api';
import { formatDistanceToNow } from 'date-fns';
import { MessageSquare, Phone, Mail, Instagram, AlertCircle } from 'lucide-react';

interface Props {
  conversations: Conversation[];
  selectedId?: string;
  onSelect: (id: string) => void;
  loading: boolean;
}

const channelIcons = {
  whatsapp: MessageSquare,
  email: Mail,
  instagram: Instagram,
  web: Phone,
  chat: MessageSquare,
};

const priorityColors = {
  low: 'border-l-gray-400',
  medium: 'border-l-blue-500',
  high: 'border-l-orange-500',
  urgent: 'border-l-red-500',
};

const statusColors = {
  open: 'bg-gray-100',
  in_progress: 'bg-blue-50',
  pending: 'bg-yellow-50',
  resolved: 'bg-green-50',
  closed: 'bg-gray-50',
};

export function ConversationList({ conversations, selectedId, onSelect, loading }: Props) {
  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
      </div>
    );
  }

  if (conversations.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center p-4">
        <p className="text-gray-500 text-sm">No conversations found</p>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto">
      {conversations.map((conv) => {
        const Icon = channelIcons[conv.channel];
        const lastMessage = conv.messages[conv.messages.length - 1];
        const unreadCount = conv.messages.filter((m) => !m.read && m.sender === 'customer').length;

        return (
          <button
            key={conv.id}
            onClick={() => onSelect(conv.id)}
            className={`w-full text-left p-4 border-b hover:bg-gray-50 transition border-l-4 ${
              priorityColors[conv.priority]
            } ${selectedId === conv.id ? 'bg-blue-50' : ''}`}
          >
            <div className="flex items-start gap-3">
              <div className={`p-2 rounded-full ${statusColors[conv.status]}`}>
                <Icon className="w-4 h-4 text-gray-600" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-gray-900 truncate">{conv.customerName}</span>
                  {unreadCount > 0 && (
                    <span className="bg-blue-500 text-white text-xs px-2 py-0.5 rounded-full">
                      {unreadCount}
                    </span>
                  )}
                </div>
                {conv.subject && <p className="text-sm text-gray-600 truncate">{conv.subject}</p>}
                {lastMessage && (
                  <p className="text-sm text-gray-500 truncate mt-1">
                    {lastMessage.sender === 'agent' ? 'You: ' : ''}
                    {lastMessage.content}
                  </p>
                )}
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs text-gray-400">
                    {formatDistanceToNow(new Date(conv.updatedAt), { addSuffix: true })}
                  </span>
                  {conv.priority === 'urgent' && (
                    <span className="flex items-center gap-1 text-xs text-red-500">
                      <AlertCircle className="w-3 h-3" />
                      Urgent
                    </span>
                  )}
                  {conv.assignedAgentName && (
                    <span className="text-xs text-gray-400">• {conv.assignedAgentName}</span>
                  )}
                </div>
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}
