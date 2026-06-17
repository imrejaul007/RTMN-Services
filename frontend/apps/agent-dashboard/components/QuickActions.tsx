'use client';

import {
  Reply,
  ArrowUpRight,
  RefreshCw,
  Phone,
  Clock,
  UserPlus,
  FileText,
  Tag,
  Bookmark,
  DollarSign,
} from 'lucide-react';
import clsx from 'clsx';

interface QuickAction {
  id: string;
  label: string;
  icon: React.ElementType;
  variant: 'primary' | 'secondary' | 'danger' | 'success';
  disabled?: boolean;
}

const quickActions: QuickAction[] = [
  { id: 'reply', label: 'Reply', icon: Reply, variant: 'primary' },
  { id: 'reply-internal', label: 'Internal Note', icon: FileText, variant: 'secondary' },
  { id: 'escalate', label: 'Escalate', icon: ArrowUpRight, variant: 'danger' },
  { id: 'refund', label: 'Issue Refund', icon: DollarSign, variant: 'success' },
];

const secondaryActions = [
  { id: 'call', label: 'Log Call', icon: Phone },
  { id: 'schedule', label: 'Schedule', icon: Clock },
  { id: 'merge', label: 'Merge Ticket', icon: UserPlus },
  { id: 'tags', label: 'Add Tags', icon: Tag },
  { id: 'sla', label: 'SLA Options', icon: Bookmark },
];

interface QuickActionsProps {
  onAction: (actionId: string) => void;
  disabled?: boolean;
}

export function QuickActions({ onAction, disabled }: QuickActionsProps) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-slate-100">
        <h3 className="font-semibold text-slate-900">Quick Actions</h3>
        <p className="text-xs text-slate-500 mt-0.5">Common actions for this ticket</p>
      </div>

      {/* Primary Actions */}
      <div className="p-4 space-y-2">
        <div className="grid grid-cols-2 gap-2">
          {quickActions.map((action) => {
            const Icon = action.icon;
            return (
              <button
                key={action.id}
                onClick={() => onAction(action.id)}
                disabled={disabled}
                className={clsx(
                  'flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-medium text-sm transition-all',
                  action.variant === 'primary' && 'bg-primary-600 text-white hover:bg-primary-700',
                  action.variant === 'secondary' && 'bg-slate-100 text-slate-700 hover:bg-slate-200',
                  action.variant === 'danger' && 'bg-red-600 text-white hover:bg-red-700',
                  action.variant === 'success' && 'bg-green-600 text-white hover:bg-green-700',
                  disabled && 'opacity-50 cursor-not-allowed',
                  !disabled && 'active:scale-95'
                )}
              >
                <Icon className="w-4 h-4" />
                {action.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Secondary Actions */}
      <div className="px-4 pb-4">
        <div className="grid grid-cols-5 gap-2">
          {secondaryActions.map((action) => {
            const Icon = action.icon;
            return (
              <button
                key={action.id}
                onClick={() => onAction(action.id)}
                disabled={disabled}
                className={clsx(
                  'flex flex-col items-center gap-1 p-3 rounded-lg bg-slate-50 hover:bg-slate-100 transition-colors',
                  disabled && 'opacity-50 cursor-not-allowed'
                )}
              >
                <Icon className="w-5 h-5 text-slate-600" />
                <span className="text-xs text-slate-600 text-center">{action.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Keyboard Shortcuts */}
      <div className="px-6 py-3 bg-slate-50 border-t border-slate-100">
        <p className="text-xs text-slate-500">
          <kbd className="px-1.5 py-0.5 bg-white rounded border border-slate-200 font-mono text-slate-600">R</kbd>
          {' '}Reply{' '}
          <kbd className="px-1.5 py-0.5 bg-white rounded border border-slate-200 font-mono text-slate-600 ml-2">E</kbd>
          {' '}Escalate{' '}
          <kbd className="px-1.5 py-0.5 bg-white rounded border border-slate-200 font-mono text-slate-600 ml-2">Tab</kbd>
          {' '}Next
        </p>
      </div>
    </div>
  );
}
