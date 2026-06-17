'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  Clock,
  User,
  Mail,
  Phone,
  Tag,
  Send,
  FileText,
  MoreHorizontal,
  Paperclip,
  AlertCircle,
  CheckCircle,
  Circle,
  MessageCircle,
  RefreshCw,
} from 'lucide-react';
import { api } from '@/lib/api';
import { Customer360 } from '@/components/Customer360';
import { AISuggestions } from '@/components/AISuggestions';
import { QuickActions } from '@/components/QuickActions';
import clsx from 'clsx';

const statusConfig = {
  open: { label: 'Open', color: 'text-blue-600 bg-blue-50', icon: Circle },
  pending: { label: 'Pending', color: 'text-yellow-600 bg-yellow-50', icon: Clock },
  resolved: { label: 'Resolved', color: 'text-green-600 bg-green-50', icon: CheckCircle },
  closed: { label: 'Closed', color: 'text-slate-600 bg-slate-100', icon: CheckCircle },
};

const priorityConfig = {
  low: { label: 'Low', color: 'text-slate-600 bg-slate-100' },
  medium: { label: 'Medium', color: 'text-blue-600 bg-blue-50' },
  high: { label: 'High', color: 'text-orange-600 bg-orange-50' },
  urgent: { label: 'Urgent', color: 'text-red-600 bg-red-50' },
};

function formatTimeAgo(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins} min ago`;
  if (diffHours < 24) return `${diffHours} hours ago`;
  if (diffDays < 7) return `${diffDays} days ago`;
  return date.toLocaleDateString();
}

export default function TicketDetailPage() {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const ticketId = params.id as string;

  const [replyContent, setReplyContent] = useState('');
  const [activeTab, setActiveTab] = useState<'customer' | 'ai' | 'actions'>('customer');

  const { data: ticket, isLoading: ticketLoading } = useQuery({
    queryKey: ['ticket', ticketId],
    queryFn: () => api.getTicket(ticketId),
    enabled: !!ticketId,
    refetchInterval: 30000,
  });

  const { data: customer360 } = useQuery({
    queryKey: ['customer360', ticket?.customerId],
    queryFn: () => api.getCustomer360(ticket!.customerId),
    enabled: !!ticket?.customerId,
  });

  const { data: suggestions } = useQuery({
    queryKey: ['suggestions', { ticketId }],
    queryFn: () => api.getSuggestions({ ticketId }),
  });

  const addMessageMutation = useMutation({
    mutationFn: ({ ticketId, content }: { ticketId: string; content: string }) =>
      api.addMessage(ticketId, content),
    onSuccess: () => {
      setReplyContent('');
      queryClient.invalidateQueries({ queryKey: ['ticket', ticketId] });
    },
  });

  const updateTicketMutation = useMutation({
    mutationFn: (data: Partial<typeof ticket>) => api.updateTicket(ticketId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ticket', ticketId] });
    },
  });

  const handleSendReply = () => {
    if (!replyContent.trim()) return;
    addMessageMutation.mutate({ ticketId, content: replyContent });
  };

  const handleAction = (actionId: string) => {
    switch (actionId) {
      case 'reply':
        document.getElementById('reply-input')?.focus();
        break;
      case 'escalate':
        updateTicketMutation.mutate({ priority: 'urgent' });
        break;
      case 'refund':
        alert('Refund flow would be triggered here');
        break;
      default:
        console.log('Action:', actionId);
    }
  };

  if (ticketLoading) {
    return (
      <div className="p-8">
        <div className="animate-pulse">
          <div className="h-8 bg-slate-200 rounded w-1/4 mb-6" />
          <div className="grid grid-cols-3 gap-6">
            <div className="col-span-2 space-y-4">
              <div className="h-64 bg-slate-200 rounded-xl" />
              <div className="h-32 bg-slate-200 rounded-xl" />
            </div>
            <div className="h-96 bg-slate-200 rounded-xl" />
          </div>
        </div>
      </div>
    );
  }

  if (!ticket) {
    return (
      <div className="p-8 text-center">
        <h2 className="text-xl font-semibold text-slate-900">Ticket not found</h2>
        <button onClick={() => router.back()} className="mt-4 text-primary-600 hover:text-primary-700">
          Go back
        </button>
      </div>
    );
  }

  const status = statusConfig[ticket.status];
  const priority = priorityConfig[ticket.priority];
  const StatusIcon = status.icon;

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div className="flex items-start gap-4">
          <button
            onClick={() => router.back()}
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-slate-600" />
          </button>
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-xl font-bold text-slate-900">{ticket.id}</h1>
              <span className={clsx('px-2.5 py-1 rounded-lg text-xs font-semibold', priority.color)}>
                {priority.label}
              </span>
              <span className={clsx('px-2.5 py-1 rounded-lg text-xs font-medium', status.color)}>
                <StatusIcon className="w-3 h-3 inline mr-1" />
                {status.label}
              </span>
            </div>
            <h2 className="text-lg text-slate-700">{ticket.subject}</h2>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button className="p-2 hover:bg-slate-100 rounded-lg">
            <MoreHorizontal className="w-5 h-5 text-slate-600" />
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Conversation */}
        <div className="lg:col-span-2 space-y-6">
          {/* Conversation */}
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-slate-200 rounded-full flex items-center justify-center">
                    <User className="w-5 h-5 text-slate-500" />
                  </div>
                  <div>
                    <p className="font-medium text-slate-900">{ticket.customerName}</p>
                    <p className="text-xs text-slate-500">{ticket.customerEmail}</p>
                  </div>
                </div>
                <span className="text-sm text-slate-500">{formatTimeAgo(ticket.createdAt)}</span>
              </div>
            </div>

            {/* Messages */}
            <div className="p-6 space-y-6 max-h-96 overflow-y-auto">
              {/* Original Message */}
              <div className="flex gap-3">
                <div className="w-10 h-10 bg-slate-200 rounded-full flex-shrink-0 flex items-center justify-center">
                  <User className="w-5 h-5 text-slate-500" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-slate-900">{ticket.customerName}</span>
                    <span className="text-xs text-slate-400">Customer</span>
                    <span className="text-xs text-slate-400">{formatTimeAgo(ticket.createdAt)}</span>
                  </div>
                  <div className="p-4 bg-slate-50 rounded-lg rounded-tl-none">
                    <p className="text-slate-700 whitespace-pre-wrap">{ticket.description}</p>
                  </div>
                </div>
              </div>

              {/* Thread Messages */}
              {ticket.messages.map((message) => (
                <div
                  key={message.id}
                  className={clsx(
                    'flex gap-3',
                    message.senderType === 'agent' && 'flex-row-reverse'
                  )}
                >
                  <div
                    className={clsx(
                      'w-10 h-10 rounded-full flex-shrink-0 flex items-center justify-center',
                      message.senderType === 'agent' ? 'bg-primary-100' : 'bg-slate-200'
                    )}
                  >
                    {message.senderType === 'agent' ? (
                      <MessageCircle className="w-5 h-5 text-primary-600" />
                    ) : (
                      <User className="w-5 h-5 text-slate-500" />
                    )}
                  </div>
                  <div className="flex-1">
                    <div className={clsx('flex items-center gap-2 mb-1', message.senderType === 'agent' && 'flex-row-reverse')}>
                      <span className="font-medium text-slate-900">{message.senderName}</span>
                      <span className="text-xs text-slate-400 capitalize">{message.senderType}</span>
                      <span className="text-xs text-slate-400">{formatTimeAgo(message.createdAt)}</span>
                    </div>
                    <div
                      className={clsx(
                        'p-4 rounded-lg',
                        message.senderType === 'agent'
                          ? 'bg-primary-50 rounded-tr-none'
                          : 'bg-slate-50 rounded-tl-none'
                      )}
                    >
                      <p className="text-slate-700 whitespace-pre-wrap">{message.content}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Reply Input */}
            <div className="p-4 border-t border-slate-100 bg-slate-50">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 bg-primary-100 rounded-full flex-shrink-0 flex items-center justify-center">
                  <MessageCircle className="w-5 h-5 text-primary-600" />
                </div>
                <div className="flex-1">
                  <textarea
                    id="reply-input"
                    value={replyContent}
                    onChange={(e) => setReplyContent(e.target.value)}
                    placeholder="Type your reply..."
                    rows={4}
                    className="w-full p-3 border border-slate-200 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                  <div className="flex items-center justify-between mt-3">
                    <div className="flex items-center gap-2">
                      <button className="p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-200 rounded-lg transition-colors">
                        <Paperclip className="w-4 h-4" />
                      </button>
                      <button className="p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-200 rounded-lg transition-colors">
                        <FileText className="w-4 h-4" />
                      </button>
                    </div>
                    <button
                      onClick={handleSendReply}
                      disabled={!replyContent.trim() || addMessageMutation.isPending}
                      className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      <Send className="w-4 h-4" />
                      {addMessageMutation.isPending ? 'Sending...' : 'Send Reply'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Ticket Info */}
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <h3 className="font-semibold text-slate-900 mb-4">Ticket Details</h3>
            <div className="grid grid-cols-2 gap-6">
              <div>
                <p className="text-xs text-slate-500 mb-1">Channel</p>
                <p className="font-medium text-slate-900 capitalize">{ticket.channel}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500 mb-1">Created</p>
                <p className="font-medium text-slate-900">{new Date(ticket.createdAt).toLocaleString()}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500 mb-1">Assigned To</p>
                <p className="font-medium text-slate-900">{ticket.assignedAgentName || 'Unassigned'}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500 mb-1">Last Updated</p>
                <p className="font-medium text-slate-900">{formatTimeAgo(ticket.updatedAt)}</p>
              </div>
              {ticket.slaDeadline && (
                <div>
                  <p className="text-xs text-slate-500 mb-1">SLA Deadline</p>
                  <p className="font-medium text-slate-900">{new Date(ticket.slaDeadline).toLocaleString()}</p>
                </div>
              )}
              <div>
                <p className="text-xs text-slate-500 mb-1">Tags</p>
                <div className="flex flex-wrap gap-1">
                  {ticket.tags.map((tag) => (
                    <span key={tag} className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded text-xs">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column - Sidebar */}
        <div className="space-y-6">
          {/* Quick Actions */}
          <QuickActions onAction={handleAction} />

          {/* Tab Navigation */}
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="flex border-b border-slate-200">
              {[
                { id: 'customer', label: 'Customer' },
                { id: 'ai', label: 'AI Insights' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as typeof activeTab)}
                  className={clsx(
                    'flex-1 px-4 py-3 text-sm font-medium transition-colors',
                    activeTab === tab.id
                      ? 'text-primary-600 border-b-2 border-primary-600'
                      : 'text-slate-600 hover:text-slate-900'
                  )}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="p-4">
              {activeTab === 'customer' && customer360 && (
                <Customer360 data={customer360} />
              )}
              {activeTab === 'ai' && (
                <AISuggestions
                  suggestions={suggestions || []}
                  onAction={(suggestion) => console.log('Suggestion action:', suggestion)}
                />
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
