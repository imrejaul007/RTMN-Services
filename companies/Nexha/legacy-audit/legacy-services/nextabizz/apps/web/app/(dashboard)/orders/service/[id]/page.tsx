'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useParams } from 'next/navigation';
import {
  ServiceOrderStatus,
  ServiceOrderPriority,
  SERVICE_ORDER_STATUS_LABELS,
  SERVICE_ORDER_STATUS_COLORS,
  SERVICE_ORDER_STATUS_TRANSITIONS,
  SERVICE_ORDER_PRIORITY_LABELS,
  SERVICE_ORDER_PRIORITY_COLORS,
} from '@nextabizz/shared-types';

interface ServiceOrderItem {
  id: string;
  serviceOrderId: string;
  serviceName: string;
  description?: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  total: number;
  createdAt: string;
}

interface ServiceOrderNote {
  id: string;
  serviceOrderId: string;
  authorId: string;
  authorName: string;
  authorType: 'merchant' | 'service_provider' | 'system';
  content: string;
  isInternal: boolean;
  createdAt: string;
  updatedAt: string;
}

interface ServiceOrderHistoryEntry {
  id: string;
  serviceOrderId: string;
  action: string;
  description: string;
  performedBy: string;
  performedByName: string;
  performedByType: string;
  oldValue?: string;
  newValue?: string;
  createdAt: string;
}

interface ServiceOrder {
  id: string;
  orderNumber: string;
  merchantId: string;
  merchantName: string;
  serviceProviderId?: string;
  serviceProviderName?: string;
  status: ServiceOrderStatus;
  priority: ServiceOrderPriority;
  title: string;
  description?: string;
  schedule?: {
    scheduledDate: string;
    startTime: string;
    endTime: string;
    recurring?: {
      frequency: 'daily' | 'weekly' | 'monthly';
      interval: number;
      endDate?: string;
      daysOfWeek?: number[];
      dayOfMonth?: number;
    };
  };
  items: ServiceOrderItem[];
  notes: ServiceOrderNote[];
  history: ServiceOrderHistoryEntry[];
  subtotal: number;
  tax: number;
  discount: number;
  total: number;
  paymentStatus: 'pending' | 'partial' | 'paid';
  paymentMethod?: 'cash' | 'card' | 'upi' | 'bank_transfer' | 'credit';
  scheduledStart?: string;
  scheduledEnd?: string;
  actualStart?: string;
  actualEnd?: string;
  cancellationReason?: string;
  completionNotes?: string;
  createdAt: string;
  updatedAt: string;
}

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
  message?: string;
}

function OrderDetailContent() {
  const router = useRouter();
  const params = useParams();
  const orderId = params.id as string;

  const [order, setOrder] = useState<ServiceOrder | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'details' | 'notes' | 'history'>('details');

  // Form states
  const [newNote, setNewNote] = useState('');
  const [isInternalNote, setIsInternalNote] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statusUpdateNotes, setStatusUpdateNotes] = useState('');
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<ServiceOrderStatus | null>(null);

  const fetchOrder = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/service-orders/${orderId}`);

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('Order not found');
        }
        throw new Error('Failed to fetch order');
      }

      const result: ApiResponse<ServiceOrder> = await response.json();

      if (!result.success) {
        throw new Error(result.error?.message || 'Failed to fetch order');
      }

      setOrder(result.data || null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  }, [orderId]);

  useEffect(() => {
    fetchOrder();
  }, [fetchOrder]);

  const handleStatusUpdate = async () => {
    if (!selectedStatus || !order) return;

    setIsSubmitting(true);

    try {
      const response = await fetch(`/api/service-orders/${orderId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: selectedStatus,
          notes: statusUpdateNotes || undefined,
          performedBy: '00000000-0000-0000-0000-000000000000',
          performedByName: 'Merchant',
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update status');
      }

      const result: ApiResponse<ServiceOrder> = await response.json();

      if (!result.success) {
        throw new Error(result.error?.message || 'Failed to update status');
      }

      setOrder(result.data || null);
      setShowStatusModal(false);
      setSelectedStatus(null);
      setStatusUpdateNotes('');
      setActiveTab('history');
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to update status');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddNote = async () => {
    if (!newNote.trim() || !order) return;

    setIsSubmitting(true);

    try {
      const response = await fetch(`/api/service-orders/${orderId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: newNote,
          isInternal: isInternalNote,
          authorId: '00000000-0000-0000-0000-000000000000',
          authorName: 'Merchant',
          authorType: 'merchant',
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to add note');
      }

      const result: ApiResponse<ServiceOrder> = await response.json();

      if (!result.success) {
        throw new Error(result.error?.message || 'Failed to add note');
      }

      setOrder(result.data || null);
      setNewNote('');
      setIsInternalNote(false);
      setActiveTab('notes');
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to add note');
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
    }).format(amount);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  const formatDateTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusBadge = (status: ServiceOrderStatus) => {
    const colors = SERVICE_ORDER_STATUS_COLORS[status];
    const label = SERVICE_ORDER_STATUS_LABELS[status];
    return (
      <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium ${colors.bg} ${colors.text}`}>
        <span className={`w-2 h-2 rounded-full ${colors.dot}`} />
        {label}
      </span>
    );
  };

  const getPriorityBadge = (priority: ServiceOrderPriority) => {
    const colors = SERVICE_ORDER_PRIORITY_COLORS[priority];
    const label = SERVICE_ORDER_PRIORITY_LABELS[priority];
    return (
      <span className={`inline-flex items-center px-2.5 py-1 rounded text-xs font-medium ${colors.bg} ${colors.text}`}>
        {label}
      </span>
    );
  };

  const getAvailableStatusTransitions = () => {
    if (!order) return [];
    return SERVICE_ORDER_STATUS_TRANSITIONS[order.status];
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-10 w-10 border-b-2 border-[#7C3AED]" />
          <p className="text-gray-500 mt-4">Loading order details...</p>
        </div>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="space-y-4">
        <Link href="/orders/service" className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700">
          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Orders
        </Link>
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error || 'Order not found'}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
        <div>
          <Link href="/orders/service" className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700 mb-3">
            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Orders
          </Link>
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-bold text-gray-900">{order.title}</h1>
            {getStatusBadge(order.status)}
            {getPriorityBadge(order.priority)}
          </div>
          <p className="text-sm text-gray-500 mt-1">
            Order {order.orderNumber} • Created {formatDate(order.createdAt)}
          </p>
        </div>

        {/* Actions */}
        {order.status !== 'completed' && order.status !== 'cancelled' && (
          <div className="flex gap-2">
            <button
              onClick={() => {
                setSelectedStatus(null);
                setShowStatusModal(true);
              }}
              className="inline-flex items-center gap-2 px-4 py-2 bg-[#7C3AED] text-white rounded-lg hover:bg-[#6D28D9] transition-colors text-sm font-medium"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Update Status
            </button>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex gap-6">
          {(['details', 'notes', 'history'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`py-3 px-1 border-b-2 text-sm font-medium transition-colors ${
                activeTab === tab
                  ? 'border-[#7C3AED] text-[#7C3AED]'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
              {tab === 'notes' && order.notes.length > 0 && (
                <span className="ml-2 px-2 py-0.5 bg-gray-100 rounded-full text-xs">
                  {order.notes.length}
                </span>
              )}
              {tab === 'history' && order.history.length > 0 && (
                <span className="ml-2 px-2 py-0.5 bg-gray-100 rounded-full text-xs">
                  {order.history.length}
                </span>
              )}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {activeTab === 'details' && (
            <>
              {/* Description */}
              {order.description && (
                <div className="bg-white rounded-xl border border-gray-200 p-6">
                  <h2 className="text-sm font-medium text-gray-500 mb-2">Description</h2>
                  <p className="text-gray-900 whitespace-pre-wrap">{order.description}</p>
                </div>
              )}

              {/* Service Items */}
              <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h2 className="text-lg font-semibold text-gray-900">Service Items</h2>
                </div>
                <div className="divide-y divide-gray-200">
                  {order.items.map((item) => (
                    <div key={item.id} className="p-6">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h3 className="text-sm font-medium text-gray-900">{item.serviceName}</h3>
                          {item.description && (
                            <p className="text-sm text-gray-500 mt-1">{item.description}</p>
                          )}
                          <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                            <span>Qty: {item.quantity} {item.unit}</span>
                            <span>Rate: {formatCurrency(item.unitPrice)}</span>
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="text-lg font-semibold text-gray-900">
                            {formatCurrency(item.total)}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                {/* Totals */}
                <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-500">Subtotal</span>
                      <span className="text-gray-900">{formatCurrency(order.subtotal)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Tax (18% GST)</span>
                      <span className="text-gray-900">{formatCurrency(order.tax)}</span>
                    </div>
                    {order.discount > 0 && (
                      <div className="flex justify-between text-green-600">
                        <span>Discount</span>
                        <span>-{formatCurrency(order.discount)}</span>
                      </div>
                    )}
                    <div className="flex justify-between pt-2 border-t border-gray-200">
                      <span className="text-base font-medium text-gray-900">Total</span>
                      <span className="text-lg font-bold text-gray-900">{formatCurrency(order.total)}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Payment Info */}
              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Payment Information</h2>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-500">Payment Status</p>
                    <p className={`text-sm font-medium mt-1 ${
                      order.paymentStatus === 'paid' ? 'text-green-600' :
                      order.paymentStatus === 'partial' ? 'text-amber-600' :
                      'text-gray-900'
                    }`}>
                      {order.paymentStatus.charAt(0).toUpperCase() + order.paymentStatus.slice(1)}
                    </p>
                  </div>
                  {order.paymentMethod && (
                    <div>
                      <p className="text-sm text-gray-500">Payment Method</p>
                      <p className="text-sm font-medium text-gray-900 mt-1 capitalize">
                        {order.paymentMethod.replace('_', ' ')}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}

          {activeTab === 'notes' && (
            <div className="bg-white rounded-xl border border-gray-200">
              {/* Add Note Form */}
              <div className="p-6 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Add Note</h2>
                <div className="space-y-3">
                  <textarea
                    rows={3}
                    value={newNote}
                    onChange={(e) => setNewNote(e.target.value)}
                    placeholder="Add a note or comment..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#7C3AED] focus:border-transparent text-sm"
                  />
                  <div className="flex items-center justify-between">
                    <label className="flex items-center gap-2 text-sm text-gray-600">
                      <input
                        type="checkbox"
                        checked={isInternalNote}
                        onChange={(e) => setIsInternalNote(e.target.checked)}
                        className="w-4 h-4 text-[#7C3AED] border-gray-300 rounded focus:ring-[#7C3AED]"
                      />
                      Internal note (only visible to staff)
                    </label>
                    <button
                      onClick={handleAddNote}
                      disabled={!newNote.trim() || isSubmitting}
                      className="px-4 py-2 bg-[#7C3AED] text-white rounded-lg hover:bg-[#6D28D9] transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isSubmitting ? 'Adding...' : 'Add Note'}
                    </button>
                  </div>
                </div>
              </div>

              {/* Notes List */}
              <div className="divide-y divide-gray-200 max-h-[500px] overflow-y-auto">
                {order.notes.length === 0 ? (
                  <div className="p-6 text-center text-gray-500">
                    No notes yet
                  </div>
                ) : (
                  order.notes.map((note) => (
                    <div key={note.id} className="p-6">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                            <span className="text-xs font-medium text-gray-600">
                              {note.authorName.charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-900">{note.authorName}</p>
                            <p className="text-xs text-gray-500">{formatDateTime(note.createdAt)}</p>
                          </div>
                        </div>
                        {note.isInternal && (
                          <span className="px-2 py-1 bg-amber-100 text-amber-700 text-xs rounded">
                            Internal
                          </span>
                        )}
                      </div>
                      <p className="mt-3 text-sm text-gray-700 whitespace-pre-wrap">{note.content}</p>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {activeTab === 'history' && (
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900">Order History</h2>
              </div>
              <div className="divide-y divide-gray-200 max-h-[600px] overflow-y-auto">
                {order.history.length === 0 ? (
                  <div className="p-6 text-center text-gray-500">
                    No history yet
                  </div>
                ) : (
                  [...order.history].reverse().map((entry) => (
                    <div key={entry.id} className="p-6">
                      <div className="flex items-start gap-4">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                          entry.action === 'status_changed' ? 'bg-blue-100' :
                          entry.action === 'created' ? 'bg-green-100' :
                          entry.action === 'note_added' ? 'bg-purple-100' :
                          'bg-gray-100'
                        }`}>
                          <svg className={`w-5 h-5 ${
                            entry.action === 'status_changed' ? 'text-blue-600' :
                            entry.action === 'created' ? 'text-green-600' :
                            entry.action === 'note_added' ? 'text-purple-600' :
                            'text-gray-600'
                          }`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            {entry.action === 'created' && (
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                            )}
                            {entry.action === 'status_changed' && (
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                            )}
                            {entry.action === 'note_added' && (
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                            )}
                            {(entry.action === 'updated' || entry.action === 'scheduled' || entry.action === 'assigned') && (
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            )}
                          </svg>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-medium text-gray-900">{entry.description}</p>
                          </div>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-xs text-gray-500">by {entry.performedByName}</span>
                            <span className="text-xs text-gray-400">•</span>
                            <span className="text-xs text-gray-500">{formatDateTime(entry.createdAt)}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Schedule */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h2 className="text-sm font-medium text-gray-500 mb-4">Schedule</h2>
            {order.schedule ? (
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <span className="text-sm text-gray-900">
                    {formatDate(order.schedule.scheduledDate)}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="text-sm text-gray-900">
                    {order.schedule.startTime} - {order.schedule.endTime}
                  </span>
                </div>
                {order.schedule.recurring && (
                  <div className="flex items-center gap-3 pt-2 border-t border-gray-100">
                    <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    <span className="text-sm text-gray-600 capitalize">
                      {order.schedule.recurring.frequency} (every {order.schedule.recurring.interval})
                    </span>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-sm text-gray-400">Not scheduled</p>
            )}
          </div>

          {/* Service Provider */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h2 className="text-sm font-medium text-gray-500 mb-4">Service Provider</h2>
            {order.serviceProviderName ? (
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                  <span className="text-sm font-medium text-purple-600">
                    {order.serviceProviderName.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">{order.serviceProviderName}</p>
                  <p className="text-xs text-gray-500">Service Provider</p>
                </div>
              </div>
            ) : (
              <p className="text-sm text-gray-400">Not assigned</p>
            )}
          </div>

          {/* Timeline */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h2 className="text-sm font-medium text-gray-500 mb-4">Timeline</h2>
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-green-500" />
                <div>
                  <p className="text-xs text-gray-500">Created</p>
                  <p className="text-sm text-gray-900">{formatDateTime(order.createdAt)}</p>
                </div>
              </div>
              {order.actualStart && (
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-purple-500" />
                  <div>
                    <p className="text-xs text-gray-500">Started</p>
                    <p className="text-sm text-gray-900">{formatDateTime(order.actualStart)}</p>
                  </div>
                </div>
              )}
              {order.actualEnd && (
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-blue-500" />
                  <div>
                    <p className="text-xs text-gray-500">Completed</p>
                    <p className="text-sm text-gray-900">{formatDateTime(order.actualEnd)}</p>
                  </div>
                </div>
              )}
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-gray-400" />
                <div>
                  <p className="text-xs text-gray-500">Last Updated</p>
                  <p className="text-sm text-gray-900">{formatDateTime(order.updatedAt)}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Additional Info */}
          {(order.cancellationReason || order.completionNotes) && (
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h2 className="text-sm font-medium text-gray-500 mb-4">
                {order.status === 'cancelled' ? 'Cancellation Reason' : 'Completion Notes'}
              </h2>
              <p className="text-sm text-gray-700">
                {order.cancellationReason || order.completionNotes}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Status Update Modal */}
      {showStatusModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
            <div
              className="fixed inset-0 bg-gray-900/50 transition-opacity"
              onClick={() => setShowStatusModal(false)}
            />
            <div className="relative transform overflow-hidden rounded-xl bg-white text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-md">
              <div className="bg-white px-4 pb-4 pt-5 sm:p-6 sm:pb-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Update Order Status</h3>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Select New Status
                    </label>
                    <div className="space-y-2">
                      {getAvailableStatusTransitions().map((status) => (
                        <label
                          key={status}
                          className={`flex items-center p-3 rounded-lg border cursor-pointer transition-colors ${
                            selectedStatus === status
                              ? 'border-[#7C3AED] bg-purple-50'
                              : 'border-gray-200 hover:bg-gray-50'
                          }`}
                        >
                          <input
                            type="radio"
                            name="status"
                            value={status}
                            checked={selectedStatus === status}
                            onChange={() => setSelectedStatus(status)}
                            className="sr-only"
                          />
                          {getStatusBadge(status)}
                        </label>
                      ))}
                    </div>
                  </div>

                  {(selectedStatus === 'cancelled' || selectedStatus === 'completed') && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        {selectedStatus === 'cancelled' ? 'Cancellation Reason' : 'Completion Notes'}
                      </label>
                      <textarea
                        rows={3}
                        value={statusUpdateNotes}
                        onChange={(e) => setStatusUpdateNotes(e.target.value)}
                        placeholder={
                          selectedStatus === 'cancelled'
                            ? 'Why is this order being cancelled?'
                            : 'Any notes about the completed service?'
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#7C3AED] focus:border-transparent text-sm"
                      />
                    </div>
                  )}
                </div>
              </div>

              <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse gap-3">
                <button
                  onClick={handleStatusUpdate}
                  disabled={!selectedStatus || isSubmitting}
                  className="w-full sm:w-auto inline-flex justify-center rounded-lg border border-transparent bg-[#7C3AED] px-4 py-2 text-sm font-medium text-white hover:bg-[#6D28D9] focus:outline-none focus:ring-2 focus:ring-[#7C3AED] focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed sm:ml-3"
                >
                  {isSubmitting ? 'Updating...' : 'Update Status'}
                </button>
                <button
                  onClick={() => setShowStatusModal(false)}
                  className="mt-3 sm:mt-0 w-full sm:w-auto inline-flex justify-center rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-[#7C3AED] focus:ring-offset-2"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function ServiceOrderDetailPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-10 w-10 border-b-2 border-[#7C3AED]" />
            <p className="text-gray-500 mt-4">Loading...</p>
          </div>
        </div>
      }
    >
      <OrderDetailContent />
    </Suspense>
  );
}
