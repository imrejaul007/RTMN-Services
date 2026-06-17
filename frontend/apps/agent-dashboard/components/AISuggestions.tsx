'use client';

import {
  Lightbulb,
  MessageSquare,
  RefreshCw,
  ArrowUpRight,
  ShoppingBag,
  Heart,
  Zap,
  CheckCircle2,
  Sparkles,
} from 'lucide-react';
import clsx from 'clsx';
import type { AISuggestion } from '@/lib/types';

const suggestionTypeConfig = {
  reply: {
    label: 'Reply Suggestion',
    color: 'bg-blue-50 border-blue-200 text-blue-700',
    icon: MessageSquare,
    bgIcon: 'bg-blue-100',
  },
  refund: {
    label: 'Refund Recommendation',
    color: 'bg-green-50 border-green-200 text-green-700',
    icon: RefreshCw,
    bgIcon: 'bg-green-100',
  },
  escalate: {
    label: 'Escalation',
    color: 'bg-red-50 border-red-200 text-red-700',
    icon: ArrowUpRight,
    bgIcon: 'bg-red-100',
  },
  'cross-sell': {
    label: 'Cross-sell Opportunity',
    color: 'bg-purple-50 border-purple-200 text-purple-700',
    icon: ShoppingBag,
    bgIcon: 'bg-purple-100',
  },
  retention: {
    label: 'Retention Offer',
    color: 'bg-pink-50 border-pink-200 text-pink-700',
    icon: Heart,
    bgIcon: 'bg-pink-100',
  },
};

interface AISuggestionsProps {
  suggestions: AISuggestion[];
  onAction?: (suggestion: AISuggestion) => void;
  loading?: boolean;
}

export function AISuggestions({ suggestions, onAction, loading }: AISuggestionsProps) {
  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-5 h-5 bg-slate-200 rounded animate-pulse" />
          <div className="w-24 h-4 bg-slate-200 rounded animate-pulse" />
        </div>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="p-4 bg-slate-50 rounded-lg animate-pulse">
              <div className="w-3/4 h-4 bg-slate-200 rounded mb-2" />
              <div className="w-full h-3 bg-slate-200 rounded mb-2" />
              <div className="w-1/2 h-3 bg-slate-200 rounded" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (suggestions.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <div className="flex items-center gap-2 mb-4">
          <Sparkles className="w-5 h-5 text-purple-500" />
          <h3 className="font-semibold text-slate-900">AI Suggestions</h3>
        </div>
        <div className="text-center py-8">
          <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-3">
            <Lightbulb className="w-6 h-6 text-slate-400" />
          </div>
          <p className="text-sm text-slate-600">No suggestions available</p>
          <p className="text-xs text-slate-400 mt-1">
            AI suggestions will appear based on context
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-slate-100 bg-gradient-to-r from-purple-50 to-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-purple-500" />
            <h3 className="font-semibold text-slate-900">AI Suggestions</h3>
            <span className="px-2 py-0.5 bg-purple-100 text-purple-700 rounded-full text-xs font-medium">
              {suggestions.length}
            </span>
          </div>
          <button className="text-xs text-purple-600 hover:text-purple-700 font-medium flex items-center gap-1">
            <Zap className="w-3 h-3" />
            Refresh
          </button>
        </div>
      </div>

      {/* Suggestions List */}
      <div className="divide-y divide-slate-100">
        {suggestions.map((suggestion) => {
          const config = suggestionTypeConfig[suggestion.type];
          const Icon = config.icon;
          const confidencePercent = Math.round(suggestion.confidence * 100);

          return (
            <div
              key={suggestion.id}
              className={clsx('p-4 transition-colors', config.color)}
            >
              <div className="flex items-start gap-3">
                <div className={clsx('w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0', config.bgIcon)}>
                  <Icon className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-medium opacity-75">{config.label}</span>
                    <span className="px-1.5 py-0.5 bg-white/50 rounded text-xs font-medium">
                      {confidencePercent}% match
                    </span>
                  </div>
                  <h4 className="font-semibold text-sm mb-1">{suggestion.title}</h4>
                  <p className="text-xs opacity-80 mb-3">{suggestion.description}</p>

                  {suggestion.action && (
                    <button
                      onClick={() => onAction?.(suggestion)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white rounded-lg text-xs font-medium shadow-sm hover:shadow transition-shadow"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      {suggestion.action.label}
                    </button>
                  )}
                </div>
              </div>

              {/* Confidence Bar */}
              <div className="mt-3 ml-13">
                <div className="h-1.5 bg-white/30 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-current opacity-50 rounded-full transition-all"
                    style={{ width: `${confidencePercent}%` }}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer */}
      <div className="px-6 py-3 bg-slate-50 border-t border-slate-100">
        <p className="text-xs text-slate-500 text-center">
          AI suggestions powered by RTMN Intelligence
        </p>
      </div>
    </div>
  );
}
