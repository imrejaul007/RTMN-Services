'use client';

import {
  User,
  Mail,
  Phone,
  Building,
  ShoppingCart,
  CreditCard,
  Ticket,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Heart,
  Star,
  Calendar,
  ChevronRight,
  Sparkles,
} from 'lucide-react';
import clsx from 'clsx';
import type { Customer360 } from '@/lib/types';

const tierConfig = {
  platinum: {
    label: 'Platinum',
    color: 'text-purple-600 bg-purple-50 border-purple-200',
    icon: Star,
  },
  gold: {
    label: 'Gold',
    color: 'text-yellow-600 bg-yellow-50 border-yellow-200',
    icon: Star,
  },
  silver: {
    label: 'Silver',
    color: 'text-gray-600 bg-gray-50 border-gray-200',
    icon: Star,
  },
  bronze: {
    label: 'Bronze',
    color: 'text-orange-600 bg-orange-50 border-orange-200',
    icon: Star,
  },
};

const churnRiskConfig = {
  low: { label: 'Low Risk', color: 'text-green-600 bg-green-50', icon: Heart },
  medium: { label: 'Medium Risk', color: 'text-yellow-600 bg-yellow-50', icon: AlertTriangle },
  high: { label: 'High Risk', color: 'text-red-600 bg-red-50', icon: AlertTriangle },
};

const sentimentConfig = {
  positive: { label: 'Positive', color: 'text-green-600 bg-green-50', icon: TrendingUp },
  neutral: { label: 'Neutral', color: 'text-gray-600 bg-gray-50', icon: AlertTriangle },
  negative: { label: 'Negative', color: 'text-red-600 bg-red-50', icon: TrendingDown },
};

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
}

function formatDate(dateString?: string): string {
  if (!dateString) return 'N/A';
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

interface Customer360Props {
  data: Customer360;
  onAction?: (action: string, data?: unknown) => void;
}

export function Customer360({ data, onAction }: Customer360Props) {
  const { customer, orders, payments, tickets, predictions } = data;
  const tier = tierConfig[customer.tier];
  const churnRisk = churnRiskConfig[customer.churnRisk];
  const sentiment = sentimentConfig[predictions.sentiment];
  const TierIcon = tier.icon;
  const ChurnIcon = churnRisk.icon;
  const SentimentIcon = sentiment.icon;

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
      {/* Customer Header */}
      <div className="p-6 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white">
        <div className="flex items-start gap-4">
          <div className="w-16 h-16 bg-slate-200 rounded-full flex items-center justify-center overflow-hidden">
            {customer.avatar ? (
              <img src={customer.avatar} alt={customer.name} className="w-full h-full object-cover" />
            ) : (
              <User className="w-8 h-8 text-slate-400" />
            )}
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <h2 className="text-xl font-semibold text-slate-900">{customer.name}</h2>
              <span className={clsx('px-2 py-0.5 rounded-full text-xs font-medium border', tier.color)}>
                <TierIcon className="w-3 h-3 inline mr-1" />
                {tier.label}
              </span>
            </div>
            <div className="flex items-center gap-4 text-sm text-slate-600">
              <span className="flex items-center gap-1">
                <Mail className="w-4 h-4" />
                {customer.email}
              </span>
              {customer.phone && (
                <span className="flex items-center gap-1">
                  <Phone className="w-4 h-4" />
                  {customer.phone}
                </span>
              )}
              {customer.company && (
                <span className="flex items-center gap-1">
                  <Building className="w-4 h-4" />
                  {customer.company}
                </span>
              )}
            </div>
          </div>
          <div className="flex flex-col items-end gap-2">
            <span className={clsx('px-3 py-1 rounded-full text-sm font-medium', churnRisk.color)}>
              <ChurnIcon className="w-4 h-4 inline mr-1" />
              {churnRisk.label}
            </span>
            <span className="text-xs text-slate-500">
              CSAT: {customer.satisfaction}/5
            </span>
          </div>
        </div>

        {/* Customer Stats */}
        <div className="grid grid-cols-4 gap-4 mt-6">
          <div className="p-4 bg-white rounded-lg border border-slate-200">
            <p className="text-xs text-slate-500 mb-1">Total Orders</p>
            <p className="text-2xl font-bold text-slate-900">{customer.totalOrders}</p>
          </div>
          <div className="p-4 bg-white rounded-lg border border-slate-200">
            <p className="text-xs text-slate-500 mb-1">Total Spent</p>
            <p className="text-2xl font-bold text-slate-900">{formatCurrency(customer.totalSpent)}</p>
          </div>
          <div className="p-4 bg-white rounded-lg border border-slate-200">
            <p className="text-xs text-slate-500 mb-1">Lifetime Value</p>
            <p className="text-2xl font-bold text-green-600">{formatCurrency(customer.lifetimeValue)}</p>
          </div>
          <div className="p-4 bg-white rounded-lg border border-slate-200">
            <p className="text-xs text-slate-500 mb-1">Churn Risk</p>
            <p className="text-2xl font-bold text-slate-900">{predictions.churnRisk}%</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-slate-200">
        <div className="flex px-6">
          {[
            { id: 'orders', label: 'Orders', count: orders.length },
            { id: 'payments', label: 'Payments', count: payments.length },
            { id: 'tickets', label: 'Tickets', count: tickets.length },
            { id: 'ai', label: 'AI Insights', count: null },
          ].map((tab) => (
            <button
              key={tab.id}
              className="px-4 py-3 text-sm font-medium text-slate-600 hover:text-slate-900 border-b-2 border-transparent data-[active]:text-primary-600 data-[active]:border-primary-600"
              data-tab={tab.id}
            >
              {tab.label}
              {tab.count !== null && (
                <span className="ml-2 px-2 py-0.5 bg-slate-100 rounded-full text-xs">
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      <div className="p-6 max-h-80 overflow-y-auto">
        {/* Orders Tab */}
        <div data-tab-content="orders">
          <div className="space-y-3">
            {orders.map((order) => (
              <div
                key={order.id}
                className="flex items-center justify-between p-3 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center">
                    <ShoppingCart className="w-5 h-5 text-primary-600" />
                  </div>
                  <div>
                    <p className="font-medium text-slate-900">{order.id}</p>
                    <p className="text-xs text-slate-500">
                      {order.items} items • {formatDate(order.createdAt)}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-slate-900">{formatCurrency(order.total)}</p>
                  <span
                    className={clsx(
                      'px-2 py-0.5 rounded text-xs font-medium',
                      order.status === 'delivered' && 'bg-green-100 text-green-700',
                      order.status === 'processing' && 'bg-blue-100 text-blue-700',
                      order.status === 'pending' && 'bg-yellow-100 text-yellow-700',
                      order.status === 'shipped' && 'bg-purple-100 text-purple-700',
                      order.status === 'cancelled' && 'bg-red-100 text-red-700'
                    )}
                  >
                    {order.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Payments Tab */}
        <div data-tab-content="payments" className="hidden">
          <div className="space-y-3">
            {payments.map((payment) => (
              <div
                key={payment.id}
                className="flex items-center justify-between p-3 bg-slate-50 rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                    <CreditCard className="w-5 h-5 text-green-600" />
                  </div>
                  <div>
                    <p className="font-medium text-slate-900">{payment.method}</p>
                    <p className="text-xs text-slate-500">{formatDate(payment.createdAt)}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-slate-900">{formatCurrency(payment.amount)}</p>
                  <span
                    className={clsx(
                      'px-2 py-0.5 rounded text-xs font-medium',
                      payment.status === 'completed' && 'bg-green-100 text-green-700',
                      payment.status === 'pending' && 'bg-yellow-100 text-yellow-700',
                      payment.status === 'failed' && 'bg-red-100 text-red-700',
                      payment.status === 'refunded' && 'bg-purple-100 text-purple-700'
                    )}
                  >
                    {payment.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Tickets Tab */}
        <div data-tab-content="tickets" className="hidden">
          <div className="space-y-3">
            {tickets.map((ticket) => (
              <a
                key={ticket.id}
                href={`/tickets/${ticket.id}`}
                className="flex items-center justify-between p-3 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                    <Ticket className="w-5 h-5 text-orange-600" />
                  </div>
                  <div>
                    <p className="font-medium text-slate-900">{ticket.subject}</p>
                    <p className="text-xs text-slate-500">{formatDate(ticket.createdAt)}</p>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-slate-400" />
              </a>
            ))}
          </div>
        </div>

        {/* AI Insights Tab */}
        <div data-tab-content="ai" className="hidden">
          <div className="space-y-4">
            {/* Sentiment & Engagement */}
            <div className="grid grid-cols-2 gap-3">
              <div className="p-4 bg-slate-50 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <SentimentIcon className="w-4 h-4 text-slate-500" />
                  <span className="text-xs text-slate-500">Sentiment</span>
                </div>
                <span className={clsx('px-2 py-1 rounded text-sm font-medium', sentiment.color)}>
                  {sentiment.label}
                </span>
              </div>
              <div className="p-4 bg-slate-50 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp className="w-4 h-4 text-slate-500" />
                  <span className="text-xs text-slate-500">Engagement</span>
                </div>
                <p className="text-lg font-bold text-slate-900">{predictions.engagementScore}%</p>
              </div>
            </div>

            {/* Next Purchase Prediction */}
            {predictions.nextPurchaseDate && (
              <div className="p-4 bg-gradient-to-r from-primary-50 to-blue-50 rounded-lg border border-primary-100">
                <div className="flex items-center gap-2 mb-1">
                  <Calendar className="w-4 h-4 text-primary-600" />
                  <span className="text-sm font-medium text-primary-700">Next Purchase Predicted</span>
                </div>
                <p className="text-lg font-bold text-primary-900">{formatDate(predictions.nextPurchaseDate)}</p>
              </div>
            )}

            {/* Recommended Actions */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Sparkles className="w-4 h-4 text-purple-500" />
                <span className="text-sm font-medium text-slate-900">AI Recommended Actions</span>
              </div>
              <div className="space-y-2">
                {predictions.recommendedActions.map((action, index) => (
                  <div
                    key={index}
                    className="flex items-start gap-2 p-3 bg-slate-50 rounded-lg"
                  >
                    <span className="w-5 h-5 bg-purple-100 text-purple-600 rounded-full text-xs flex items-center justify-center font-medium">
                      {index + 1}
                    </span>
                    <p className="text-sm text-slate-700">{action}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Customer Notes */}
      {customer.notes && (
        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50">
          <p className="text-xs text-slate-500 mb-1">Agent Notes</p>
          <p className="text-sm text-slate-700">{customer.notes}</p>
        </div>
      )}
    </div>
  );
}
