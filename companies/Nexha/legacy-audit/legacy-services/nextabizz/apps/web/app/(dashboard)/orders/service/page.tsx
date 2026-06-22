'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ServiceOrderStatus,
  ServiceOrderPriority,
  SERVICE_ORDER_STATUS_LABELS,
  SERVICE_ORDER_STATUS_COLORS,
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

interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
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
  pagination?: PaginationMeta;
}

export default function ServiceOrdersPage() {
  const router = useRouter();
  const [orders, setOrders] = useState<ServiceOrder[]>([]);
  const [pagination, setPagination] = useState<PaginationMeta | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [statusFilter, setStatusFilter] = useState<ServiceOrderStatus | ''>('');
  const [priorityFilter, setPriorityFilter] = useState<ServiceOrderPriority | ''>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  // Modal state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Create form state
  const [createForm, setCreateForm] = useState({
    title: '',
    description: '',
    priority: 'medium' as ServiceOrderPriority,
    scheduledDate: '',
    startTime: '',
    endTime: '',
    items: [{ serviceName: '', description: '', quantity: 1, unit: 'service', unitPrice: 0 }],
    notes: '',
  });

  const fetchOrders = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: '20',
      });

      if (statusFilter) params.append('status', statusFilter);
      if (priorityFilter) params.append('priority', priorityFilter);
      if (searchQuery) params.append('search', searchQuery);

      const response = await fetch(`/api/service-orders?${params.toString()}`);

      if (!response.ok) {
        throw new Error('Failed to fetch orders');
      }

      const result: ApiResponse<ServiceOrder[]> = await response.json();

      if (!result.success) {
        throw new Error(result.error?.message || 'Failed to fetch orders');
      }

      setOrders(result.data || []);
      setPagination(result.pagination || null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  }, [currentPage, statusFilter, priorityFilter, searchQuery]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const handleCreateOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const response = await fetch('/api/service-orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          merchantId: '00000000-0000-0000-0000-000000000000', // Would come from auth
          title: createForm.title,
          description: createForm.description || undefined,
          priority: createForm.priority,
          schedule: createForm.scheduledDate
            ? {
                scheduledDate: new Date(createForm.scheduledDate).toISOString(),
                startTime: createForm.startTime || '09:00',
                endTime: createForm.endTime || '18:00',
              }
            : undefined,
          items: createForm.items.filter((item) => item.serviceName),
          notes: createForm.notes
            ? [{ content: createForm.notes, isInternal: false }]
            : [],
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create order');
      }

      const result: ApiResponse<ServiceOrder> = await response.json();

      if (!result.success) {
        throw new Error(result.error?.message || 'Failed to create order');
      }

      setShowCreateModal(false);
      setCreateForm({
        title: '',
        description: '',
        priority: 'medium',
        scheduledDate: '',
        startTime: '',
        endTime: '',
        items: [{ serviceName: '', description: '', quantity: 1, unit: 'service', unitPrice: 0 }],
        notes: '',
      });
      fetchOrders();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to create order');
    } finally {
      setIsSubmitting(false);
    }
  };

  const addServiceItem = () => {
    setCreateForm((prev) => ({
      ...prev,
      items: [...prev.items, { serviceName: '', description: '', quantity: 1, unit: 'service', unitPrice: 0 }],
    }));
  };

  const removeServiceItem = (index: number) => {
    setCreateForm((prev) => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index),
    }));
  };

  const updateServiceItem = (index: number, field: string, value: string | number) => {
    setCreateForm((prev) => ({
      ...prev,
      items: prev.items.map((item, i) =>
        i === index ? { ...item, [field]: value } : item
      ),
    }));
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

  const getStatusBadge = (status: ServiceOrderStatus) => {
    const colors = SERVICE_ORDER_STATUS_COLORS[status];
    const label = SERVICE_ORDER_STATUS_LABELS[status];
    return (
      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${colors.bg} ${colors.text}`}>
        <span className={`w-1.5 h-1.5 rounded-full ${colors.dot}`} />
        {label}
      </span>
    );
  };

  const getPriorityBadge = (priority: ServiceOrderPriority) => {
    const colors = SERVICE_ORDER_PRIORITY_COLORS[priority];
    const label = SERVICE_ORDER_PRIORITY_LABELS[priority];
    return (
      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${colors.bg} ${colors.text}`}>
        {label}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Service Orders</h1>
          <p className="text-sm text-gray-500 mt-1">
            Manage your service requests and track their progress
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="inline-flex items-center gap-2 px-4 py-2 bg-[#7C3AED] text-white rounded-lg hover:bg-[#6D28D9] transition-colors font-medium text-sm"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          New Service Order
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Search */}
          <div className="flex-1">
            <div className="relative">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                placeholder="Search by order number, title..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#7C3AED] focus:border-transparent text-sm"
              />
            </div>
          </div>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value as ServiceOrderStatus | '');
              setCurrentPage(1);
            }}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#7C3AED] focus:border-transparent text-sm"
          >
            <option value="">All Statuses</option>
            <option value="pending">Pending</option>
            <option value="confirmed">Confirmed</option>
            <option value="in_progress">In Progress</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>

          {/* Priority Filter */}
          <select
            value={priorityFilter}
            onChange={(e) => {
              setPriorityFilter(e.target.value as ServiceOrderPriority | '');
              setCurrentPage(1);
            }}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#7C3AED] focus:border-transparent text-sm"
          >
            <option value="">All Priorities</option>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
            <option value="urgent">Urgent</option>
          </select>
        </div>
      </div>

      {/* Error State */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {error}
          </div>
        </div>
      )}

      {/* Orders Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[#7C3AED]" />
            <p className="text-gray-500 mt-2">Loading orders...</p>
          </div>
        ) : orders.length === 0 ? (
          <div className="p-8 text-center">
            <svg className="w-12 h-12 mx-auto text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900">No orders found</h3>
            <p className="mt-1 text-sm text-gray-500">
              {searchQuery || statusFilter || priorityFilter
                ? 'Try adjusting your filters'
                : 'Get started by creating your first service order'}
            </p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Order Details
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Priority
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Schedule
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Total
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Created
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {orders.map((order) => (
                    <tr key={order.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <span className="text-xs text-gray-500">{order.orderNumber}</span>
                          <span className="text-sm font-medium text-gray-900 truncate max-w-[200px]">
                            {order.title}
                          </span>
                          {order.serviceProviderName && (
                            <span className="text-xs text-gray-500 mt-0.5">
                              Provider: {order.serviceProviderName}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {getStatusBadge(order.status)}
                      </td>
                      <td className="px-6 py-4">
                        {getPriorityBadge(order.priority)}
                      </td>
                      <td className="px-6 py-4">
                        {order.schedule ? (
                          <div className="text-sm">
                            <span className="text-gray-900">
                              {formatDate(order.schedule.scheduledDate)}
                            </span>
                            <span className="text-gray-500 ml-1">
                              {order.schedule.startTime} - {order.schedule.endTime}
                            </span>
                          </div>
                        ) : (
                          <span className="text-sm text-gray-400">Not scheduled</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm">
                          <span className="font-medium text-gray-900">
                            {formatCurrency(order.total)}
                          </span>
                          <span className={`ml-2 text-xs ${
                            order.paymentStatus === 'paid' ? 'text-green-600' :
                            order.paymentStatus === 'partial' ? 'text-amber-600' :
                            'text-gray-400'
                          }`}>
                            {order.paymentStatus}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm text-gray-500">
                          {formatDate(order.createdAt)}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <Link
                          href={`/orders/service/${order.id}`}
                          className="text-[#7C3AED] hover:text-[#6D28D9] text-sm font-medium"
                        >
                          View Details
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {pagination && pagination.totalPages > 1 && (
              <div className="px-6 py-4 flex items-center justify-between border-t border-gray-200">
                <div className="text-sm text-gray-500">
                  Showing {(pagination.page - 1) * pagination.limit + 1} to{' '}
                  {Math.min(pagination.page * pagination.limit, pagination.total)} of{' '}
                  {pagination.total} orders
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={!pagination.hasPrevPage}
                    className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                  >
                    Previous
                  </button>
                  <button
                    onClick={() => setCurrentPage((p) => p + 1)}
                    disabled={!pagination.hasNextPage}
                    className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Create Order Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
            <div
              className="fixed inset-0 bg-gray-900/50 transition-opacity"
              onClick={() => setShowCreateModal(false)}
            />
            <div className="relative transform overflow-hidden rounded-xl bg-white text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-2xl">
              <form onSubmit={handleCreateOrder}>
                <div className="bg-white px-4 pb-4 pt-5 sm:p-6 sm:pb-4">
                  <div className="mb-4">
                    <h3 className="text-lg font-semibold text-gray-900">Create New Service Order</h3>
                    <p className="text-sm text-gray-500 mt-1">
                      Fill in the details to create a new service request
                    </p>
                  </div>

                  <div className="space-y-4">
                    {/* Title */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Title <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={createForm.title}
                        onChange={(e) => setCreateForm((f) => ({ ...f, title: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#7C3AED] focus:border-transparent text-sm"
                        placeholder="e.g., Kitchen Equipment Maintenance"
                      />
                    </div>

                    {/* Description */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Description
                      </label>
                      <textarea
                        rows={3}
                        value={createForm.description}
                        onChange={(e) => setCreateForm((f) => ({ ...f, description: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#7C3AED] focus:border-transparent text-sm"
                        placeholder="Describe the service requirements..."
                      />
                    </div>

                    {/* Priority */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Priority
                      </label>
                      <select
                        value={createForm.priority}
                        onChange={(e) => setCreateForm((f) => ({ ...f, priority: e.target.value as ServiceOrderPriority }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#7C3AED] focus:border-transparent text-sm"
                      >
                        <option value="low">Low</option>
                        <option value="medium">Medium</option>
                        <option value="high">High</option>
                        <option value="urgent">Urgent</option>
                      </select>
                    </div>

                    {/* Schedule */}
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Scheduled Date
                        </label>
                        <input
                          type="date"
                          value={createForm.scheduledDate}
                          onChange={(e) => setCreateForm((f) => ({ ...f, scheduledDate: e.target.value }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#7C3AED] focus:border-transparent text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Start Time
                        </label>
                        <input
                          type="time"
                          value={createForm.startTime}
                          onChange={(e) => setCreateForm((f) => ({ ...f, startTime: e.target.value }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#7C3AED] focus:border-transparent text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          End Time
                        </label>
                        <input
                          type="time"
                          value={createForm.endTime}
                          onChange={(e) => setCreateForm((f) => ({ ...f, endTime: e.target.value }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#7C3AED] focus:border-transparent text-sm"
                        />
                      </div>
                    </div>

                    {/* Service Items */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <label className="block text-sm font-medium text-gray-700">
                          Service Items
                        </label>
                        <button
                          type="button"
                          onClick={addServiceItem}
                          className="text-sm text-[#7C3AED] hover:text-[#6D28D9] font-medium"
                        >
                          + Add Item
                        </button>
                      </div>
                      <div className="space-y-3">
                        {createForm.items.map((item, index) => (
                          <div key={index} className="flex gap-2 items-start p-3 bg-gray-50 rounded-lg">
                            <div className="flex-1 space-y-2">
                              <input
                                type="text"
                                placeholder="Service name"
                                value={item.serviceName}
                                onChange={(e) => updateServiceItem(index, 'serviceName', e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#7C3AED] focus:border-transparent text-sm"
                              />
                              <div className="grid grid-cols-3 gap-2">
                                <input
                                  type="number"
                                  placeholder="Qty"
                                  min="1"
                                  value={item.quantity}
                                  onChange={(e) => updateServiceItem(index, 'quantity', parseInt(e.target.value) || 1)}
                                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#7C3AED] focus:border-transparent text-sm"
                                />
                                <input
                                  type="text"
                                  placeholder="Unit"
                                  value={item.unit}
                                  onChange={(e) => updateServiceItem(index, 'unit', e.target.value)}
                                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#7C3AED] focus:border-transparent text-sm"
                                />
                                <input
                                  type="number"
                                  placeholder="Price"
                                  min="0"
                                  step="0.01"
                                  value={item.unitPrice}
                                  onChange={(e) => updateServiceItem(index, 'unitPrice', parseFloat(e.target.value) || 0)}
                                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#7C3AED] focus:border-transparent text-sm"
                                />
                              </div>
                            </div>
                            {createForm.items.length > 1 && (
                              <button
                                type="button"
                                onClick={() => removeServiceItem(index)}
                                className="p-2 text-gray-400 hover:text-red-500"
                              >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Notes */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Initial Notes
                      </label>
                      <textarea
                        rows={2}
                        value={createForm.notes}
                        onChange={(e) => setCreateForm((f) => ({ ...f, notes: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#7C3AED] focus:border-transparent text-sm"
                        placeholder="Any additional notes for the service provider..."
                      />
                    </div>
                  </div>
                </div>

                <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse gap-3">
                  <button
                    type="submit"
                    disabled={isSubmitting || !createForm.title || createForm.items.every((i) => !i.serviceName)}
                    className="w-full sm:w-auto inline-flex justify-center rounded-lg border border-transparent bg-[#7C3AED] px-4 py-2 text-sm font-medium text-white hover:bg-[#6D28D9] focus:outline-none focus:ring-2 focus:ring-[#7C3AED] focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed sm:ml-3"
                  >
                    {isSubmitting ? 'Creating...' : 'Create Order'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="mt-3 sm:mt-0 w-full sm:w-auto inline-flex justify-center rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-[#7C3AED] focus:ring-offset-2"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
