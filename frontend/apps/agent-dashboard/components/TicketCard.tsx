'use client';

import Link from 'next/link';
import {
  Clock,
  MessageSquare,
  User,
  AlertCircle,
  CheckCircle,
  Circle,
  Mail,
  MessageCircle,
  Phone,
  Globe,
  Monitor,
} from 'lucide-react';
import clsx from 'clsx';
import type { Ticket } from '@/lib/types';

const priorityConfig = {
  low: { label: 'Low', color: 'text-slate-600 bg-slate-100', icon: Circle },
  medium: { label: 'Medium', color: 'text-blue-600 bg-blue-50', icon: Circle },
  high: { label: 'High', color: 'text-orange-600 bg-orange-50', icon: AlertCircle },
  urgent: { label: 'Urgent', color: 'text-red-600 bg-red-50 animate-pulse', icon: AlertCircle },
};

const statusConfig = {
  open: { label: 'Open', color: 'text-blue-600 bg-blue-50', icon: Circle },
  pending: { label: 'Pending', color: 'text-yellow-600 bg-yellow-50', icon: Clock },
  resolved: { label: 'Resolved', color: 'text-green-600 bg-green-50', icon: CheckCircle },
  closed: { label: 'Closed', color: 'text-slate-600 bg-slate-100', icon: CheckCircle },
};

const channelConfig = {
  email: { label: 'Email', icon: Mail },
  chat: { label: 'Chat', icon: MessageCircle },
  phone: { label: 'Phone', icon: Phone },
  social: { label: 'Social', icon: Globe },
  portal: { label: 'Portal', icon: Monitor },
};

function formatTimeAgo(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

function isSlaAtRisk(deadline?: string): boolean {
  if (!deadline) return false;
  const deadlineDate = new Date(deadline);
  const now = new Date();
  const hoursRemaining = (deadlineDate.getTime() - now.getTime()) / 3600000;
  return hoursRemaining <= 2 && hoursRemaining > 0;
}

function isSlaBreached(deadline?: string): boolean {
  if (!deadline) return false;
  const deadlineDate = new Date(deadline);
  return new Date() > deadlineDate;
}

interface TicketCardProps {
  ticket: Ticket;
  showCustomer?: boolean;
  compact?: boolean;
}

export function TicketCard({ ticket, showCustomer = true, compact = false }: TicketCardProps) {
  const priority = priorityConfig[ticket.priority];
  const status = statusConfig[ticket.status];
  const ChannelIcon = channelConfig[ticket.channel].icon;
  const PriorityIcon = priority.icon;

  const slaAtRisk = isSlaAtRisk(ticket.slaDeadline);
  const slaBreached = isSlaBreached(ticket.slaDeadline);

  if (compact) {
    return (
      <Link
        href={`/tickets/${ticket.id}`}
        className={clsx(
          'block p-4 border rounded-lg hover:shadow-md transition-all',
          'bg-white border-slate-200 hover:border-primary-300',
          slaBreached && 'border-l-4 border-l-red-500',
          slaAtRisk && 'border-l-4 border-l-orange-500'
        )}
      >
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <span className={clsx('px-2 py-0.5 rounded text-xs font-medium', priority.color)}>
              {priority.label}
            </span>
            <span className={clsx('px-2 py-0.5 rounded text-xs font-medium', status.color)}>
              {status.label}
            </span>
          </div>
          <span className="text-xs text-slate-500">{formatTimeAgo(ticket.updatedAt)}</span>
        </div>
        <h3 className="font-medium text-slate-900 mb-1 line-clamp-1">{ticket.subject}</h3>
        <div className="flex items-center gap-3 text-xs text-slate-500">
          <span className="flex items-center gap-1">
            <ChannelIcon className="w-3 h-3" />
            {channelConfig[ticket.channel].label}
          </span>
          <span className="flex items-center gap-1">
            <MessageSquare className="w-3 h-3" />
            {ticket.messages.length}
          </span>
        </div>
      </Link>
    );
  }

  return (
    <Link
      href={`/tickets/${ticket.id}`}
      className={clsx(
        'block p-5 border rounded-xl hover:shadow-lg transition-all',
        'bg-white border-slate-200 hover:border-primary-300',
        slaBreached && 'border-l-4 border-l-red-500',
        slaAtRisk && !slaBreached && 'border-l-4 border-l-orange-500'
      )}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <PriorityIcon className={clsx('w-4 h-4', ticket.priority === 'urgent' && 'text-red-500')} />
          <span className={clsx('px-2.5 py-1 rounded-lg text-xs font-semibold', priority.color)}>
            {priority.label}
          </span>
          <span className={clsx('px-2.5 py-1 rounded-lg text-xs font-medium', status.color)}>
            {status.label}
          </span>
        </div>
        <div className="flex items-center gap-1 text-xs text-slate-500">
          <ChannelIcon className="w-3.5 h-3.5" />
          {channelConfig[ticket.channel].label}
        </div>
      </div>

      {/* Subject */}
      <h3 className="font-semibold text-slate-900 mb-2 line-clamp-2">{ticket.subject}</h3>
      <p className="text-sm text-slate-600 mb-4 line-clamp-2">{ticket.description}</p>

      {/* Customer */}
      {showCustomer && (
        <div className="flex items-center gap-2 mb-4 pb-4 border-b border-slate-100">
          <div className="w-8 h-8 bg-slate-200 rounded-full flex items-center justify-center">
            <User className="w-4 h-4 text-slate-500" />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-900">{ticket.customerName}</p>
            <p className="text-xs text-slate-500">{ticket.customerEmail}</p>
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4 text-xs text-slate-500">
          <span className="flex items-center gap-1">
            <MessageSquare className="w-3.5 h-3.5" />
            {ticket.messages.length} messages
          </span>
          <span className="flex items-center gap-1">
            <Clock className="w-3.5 h-3.5" />
            {formatTimeAgo(ticket.updatedAt)}
          </span>
        </div>

        {/* Tags */}
        {ticket.tags.length > 0 && (
          <div className="flex items-center gap-1">
            {ticket.tags.slice(0, 2).map((tag) => (
              <span
                key={tag}
                className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded text-xs"
              >
                {tag}
              </span>
            ))}
            {ticket.tags.length > 2 && (
              <span className="text-xs text-slate-400">+{ticket.tags.length - 2}</span>
            )}
          </div>
        )}
      </div>

      {/* SLA Warning */}
      {slaAtRisk && !slaBreached && (
        <div className="mt-3 p-2 bg-orange-50 border border-orange-200 rounded-lg">
          <p className="text-xs text-orange-700 flex items-center gap-1">
            <AlertCircle className="w-3.5 h-3.5" />
            SLA at risk - response needed soon
          </p>
        </div>
      )}

      {slaBreached && (
        <div className="mt-3 p-2 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-xs text-red-700 flex items-center gap-1">
            <AlertCircle className="w-3.5 h-3.5" />
            SLA breached - immediate action required
          </p>
        </div>
      )}
    </Link>
  );
}
