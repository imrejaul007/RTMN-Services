'use client';

import { useState } from 'react';
import type { InventorySignal, SignalSeverity, ReorderUrgency } from '@nextabizz/shared-types';

interface SignalCardProps {
  signal: InventorySignal;
  onClick?: (signal: InventorySignal) => void;
  onCreatePO?: (signal: InventorySignal) => void;
}

const sourceLabels: Record<string, string> = {
  restopapa: 'RestoPapa',
  'rez-merchant': 'ReZ Merchant',
  'hotel-pms': 'Hotel PMS',
};

const sourceColors: Record<string, string> = {
  restopapa: 'bg-blue-100 text-blue-700',
  'rez-merchant': 'bg-purple-100 text-purple-700',
  'hotel-pms': 'bg-amber-100 text-amber-700',
};

const severityConfig: Record<SignalSeverity, { label: string; bg: string; text: string; border: string }> = {
  critical: { label: 'Critical', bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200' },
  high: { label: 'High', bg: 'bg-orange-100', text: 'text-orange-700', border: 'border-orange-200' },
  medium: { label: 'Medium', bg: 'bg-yellow-50', text: 'text-yellow-700', border: 'border-yellow-200' },
  low: { label: 'Low Stock', bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' },
};

const urgencyConfig: Record<ReorderUrgency, { label: string; color: string; bg: string }> = {
  high: { label: 'High', color: 'text-red-600', bg: 'bg-red-100' },
  medium: { label: 'Medium', color: 'text-amber-600', bg: 'bg-amber-100' },
  low: { label: 'Low', color: 'text-green-600', bg: 'bg-green-100' },
  urgent: { label: 'Urgent', color: 'text-red-700', bg: 'bg-red-200' },
};

function formatTimeAgo(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - new Date(date).getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;

  return new Date(date).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
  });
}

function getStockPercentage(current: number, threshold: number): number {
  if (threshold === 0) return current > 0 ? 100 : 0;
  return Math.round((current / threshold) * 100);
}

export default function SignalCard({ signal, onClick, onCreatePO }: SignalCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const severity = severityConfig[signal.severity];
  const sourceClass = String(sourceColors[signal.source] || 'bg-gray-100 text-gray-700');
  const stockPercentage = getStockPercentage(signal.currentStock, signal.threshold);

  const handleCardClick = () => {
    if (onClick) {
      onClick(signal);
    } else {
      setIsExpanded(!isExpanded);
    }
  };

  const handleCreatePO = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onCreatePO) {
      onCreatePO(signal);
    }
  };

  const severityBadge = severity.label;
  const sourceLabel = String(sourceLabels[signal.source] || signal.source);
  const categoryBadge = signal.category;

  const progressColor = signal.severity === 'critical'
    ? 'bg-red-500'
    : signal.severity === 'low'
      ? 'bg-orange-500'
      : 'bg-gray-400';

  const urgency = signal.metadata?.urgency as ReorderUrgency | undefined;
  const urgencyBadge = urgency ? urgencyConfig[urgency] : null;

  return (
    <div
      onClick={handleCardClick}
      className={[
        'relative bg-white rounded-xl border transition-all duration-200 cursor-pointer hover:shadow-md hover:border-gray-300',
        severity.border,
        isExpanded ? 'ring-2 ring-[#7C3AED] ring-opacity-50' : ''
      ].filter(Boolean).join(' ')}
    >
      <div className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1 min-w-0">
            <h3 className="text-base font-semibold text-gray-900 truncate pr-2">
              {signal.productName}
            </h3>
            {signal.sku && (
              <p className="text-xs text-gray-500 mt-0.5">SKU: {signal.sku}</p>
            )}
          </div>
          <span className={['inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium', severity.bg, severity.text].join(' ')}>
            {severityBadge}
          </span>
        </div>

        <div className="flex flex-wrap gap-2 mb-3">
          <span className={['inline-flex items-center px-2 py-0.5 rounded text-xs font-medium', sourceClass].join(' ')}>
            {sourceLabel}
          </span>
          {categoryBadge ? (
            <span className="inline-flex items-center px-2 py-0.5 rounded bg-gray-100 text-xs font-medium text-gray-600">
              {categoryBadge}
            </span>
          ) : null}
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-500">Current Stock</span>
            <span className="font-semibold text-gray-900">
              {signal.currentStock} {signal.unit}
            </span>
          </div>

          <div className="relative h-2 bg-gray-100 rounded-full overflow-hidden">
            <div
              className={['absolute left-0 top-0 h-full rounded-full transition-all duration-500', progressColor].join(' ')}
              style={{ width: `${Math.min(stockPercentage, 100)}%` }}
            />
          </div>

          <div className="flex items-center justify-between text-xs text-gray-500">
            <span>Threshold: {signal.threshold} {signal.unit}</span>
            <span>{stockPercentage}%</span>
          </div>
        </div>

        {urgencyBadge ? (
          <div className="mt-3 pt-3 border-t border-gray-100">
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-500">Urgency</span>
              <span className={['inline-flex items-center px-2 py-0.5 rounded text-xs font-medium', urgencyBadge.bg, urgencyBadge.color].join(' ')}>
                {urgencyBadge.label}
              </span>
            </div>
          </div>
        ) : null}

        <div className="mt-3 pt-3 border-t border-gray-100">
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-400">
              {formatTimeAgo(signal.createdAt)}
            </span>
            {onCreatePO ? (
              <button
                onClick={handleCreatePO}
                className="inline-flex items-center px-3 py-1.5 rounded-lg bg-[#7C3AED] text-white text-xs font-medium hover:bg-[#6D28D9] transition-colors"
              >
                <svg className="w-3.5 h-3.5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Create PO
              </button>
            ) : null}
          </div>
        </div>
      </div>

      {isExpanded && !onClick ? (
        <div className="px-4 pb-4 border-t border-gray-100 bg-gray-50 -mx-4 -mb-4 mt-4 p-4 rounded-b-xl">
          <h4 className="text-sm font-medium text-gray-700 mb-2">Details</h4>
          <dl className="grid grid-cols-2 gap-2 text-xs">
            <div>
              <dt className="text-gray-500">Source ID</dt>
              <dd className="font-medium text-gray-900 truncate">{signal.sourceProductId}</dd>
            </div>
            <div>
              <dt className="text-gray-500">Signal Type</dt>
              <dd className="font-medium text-gray-900 capitalize">{signal.signalType.replace('_', ' ')}</dd>
            </div>
          </dl>

          {signal.metadata && Object.keys(signal.metadata).length > 0 ? (
            <div className="mt-3 pt-3 border-t border-gray-200">
              <h4 className="text-xs font-medium text-gray-600 mb-1">Additional Info</h4>
              <pre className="text-xs text-gray-500 overflow-x-auto">
                {JSON.stringify(signal.metadata, null, 2)}
              </pre>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

interface SignalDetailModalProps {
  signal: InventorySignal | null;
  isOpen: boolean;
  onClose: () => void;
  onCreatePO?: (signal: InventorySignal) => void;
}

export function SignalDetailModal({ signal, isOpen, onClose, onCreatePO }: SignalDetailModalProps) {
  if (!isOpen || !signal) return null;

  const severity = severityConfig[signal.severity];
  const sourceLabel = String(sourceLabels[signal.source] || signal.source);
  const categoryBadge = signal.category;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="fixed inset-0 bg-black/50 transition-opacity" onClick={onClose} />
        <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-lg transform transition-all">
          <div className="flex items-start justify-between p-6 border-b border-gray-100">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">{signal.productName}</h2>
              {signal.sku && (
                <p className="text-sm text-gray-500 mt-1">SKU: {signal.sku}</p>
              )}
            </div>
            <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100 transition-colors">
              <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="p-6 space-y-6">
            <div className="flex flex-wrap gap-2">
              <span className={['inline-flex items-center px-3 py-1 rounded-full text-sm font-medium', severity.bg, severity.text].join(' ')}>
                {severity.label}
              </span>
              <span className={['inline-flex items-center px-3 py-1 rounded-full text-sm font-medium', sourceColors[signal.source] || 'bg-gray-100 text-gray-700'].join(' ')}>
                {sourceLabel}
              </span>
              {categoryBadge ? (
                <span className="inline-flex items-center px-3 py-1 rounded-full bg-gray-100 text-sm font-medium text-gray-600">
                  {categoryBadge}
                </span>
              ) : null}
            </div>

            <div className="bg-gray-50 rounded-xl p-4">
              <h3 className="text-sm font-medium text-gray-700 mb-4">Stock Information</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-gray-500">Current Stock</p>
                  <p className="text-lg font-semibold text-gray-900">
                    {signal.currentStock} {signal.unit}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Threshold</p>
                  <p className="text-lg font-semibold text-gray-900">
                    {signal.threshold} {signal.unit}
                  </p>
                </div>
              </div>
            </div>

            {signal.metadata && Object.keys(signal.metadata).length > 0 ? (
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-2">Additional Details</h3>
                <dl className="bg-gray-50 rounded-xl p-4 space-y-2">
                  {Object.entries(signal.metadata).map(([key, value]) => (
                    <div key={key} className="flex justify-between text-sm">
                      <dt className="text-gray-500 capitalize">{key.replace('_', ' ')}</dt>
                      <dd className="font-medium text-gray-900">{String(value)}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            ) : null}
          </div>

          <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-100 bg-gray-50 rounded-b-2xl">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            >
              Close
            </button>
            {onCreatePO ? (
              <button
                onClick={() => { onCreatePO(signal); onClose(); }}
                className="px-4 py-2 text-sm font-medium text-white bg-[#7C3AED] hover:bg-[#6D28D9] rounded-lg transition-colors"
              >
                Create Purchase Order
              </button>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
