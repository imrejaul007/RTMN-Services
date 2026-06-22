'use client';

import { useState, useEffect, useCallback } from 'react';
import type { PurchaseOrder, POStatus, PaymentStatus } from '@nextabizz/shared-types';
import CreatePOModal from '@/components/create-po-modal';
import PODetailModal from '@/components/po-detail-modal';

// Tab type matches POStatus enum
type TabType = 'all' | 'draft' | 'sent' | 'confirmed' | 'processing' | 'shipped' | 'delivered';
type PaymentFilter = 'all' | 'pending' | 'partial' | 'paid';

interface OrderStats {
  totalPOs: number;
  totalValue: number;
  pendingPayments: number;
  thisMonth: number;
}

const tabs: { value: TabType; label: string }[] = [
  { value: 'all', label: 'All Orders' },
  { value: 'draft', label: 'Draft' },
  { value: 'sent', label: 'Sent' },
  { value: 'confirmed', label: 'Confirmed' },
  { value: 'processing', label: 'Processing' },
  { value: 'shipped', label: 'Shipped' },
  { value: 'delivered', label: 'Delivered' },
];

// Status config matches DB enum: draft, sent, confirmed, processing, shipped, delivered, cancelled, closed
const statusConfig: Record<POStatus, { label: string; bg: string; text: string }> = {
  draft: { label: 'Draft', bg: 'bg-gray-100', text: 'text-gray-700' },
  sent: { label: 'Sent', bg: 'bg-blue-100', text: 'text-blue-700' },
  confirmed: { label: 'Confirmed', bg: 'bg-indigo-100', text: 'text-indigo-700' },
  processing: { label: 'Processing', bg: 'bg-purple-100', text: 'text-purple-700' },
  shipped: { label: 'Shipped', bg: 'bg-amber-100', text: 'text-amber-700' },
  delivered: { label: 'Delivered', bg: 'bg-green-100', text: 'text-green-700' },
  cancelled: { label: 'Cancelled', bg: 'bg-red-100', text: 'text-red-700' },
  closed: { label: 'Closed', bg: 'bg-gray-200', text: 'text-gray-600' },
};

const paymentConfig: Record<PaymentStatus, { label: string; bg: string; text: string }> = {
  pending: { label: 'Pending', bg: 'bg-amber-100', text: 'text-amber-700' },
  partial: { label: 'Partial', bg: 'bg-orange-100', text: 'text-orange-700' },
  paid: { label: 'Paid', bg: 'bg-green-100', text: 'text-green-700' },
};

// Mock data
const mockOrders: PurchaseOrder[] = [
  {
    id: 'po-1',
    orderNumber: 'PO-2024-0001',
    merchantId: 'merchant-1',
    supplierId: 'sup-1',
    status: 'confirmed',
    subtotal: 15400,
    netAmount: 15400,
    paymentStatus: 'pending',
    paymentMethod: 'net-terms',
    source: 'manual',
    createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
    updatedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
  },
  {
    id: 'po-2',
    orderNumber: 'PO-2024-0002',
    merchantId: 'merchant-1',
    supplierId: 'sup-2',
    status: 'shipped',
    subtotal: 8500,
    netAmount: 8500,
    paymentStatus: 'paid',
    paymentMethod: 'prepaid',
    source: 'reorder',
    createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
    updatedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
  },
  {
    id: 'po-3',
    orderNumber: 'PO-2024-0003',
    merchantId: 'merchant-1',
    supplierId: 'sup-1',
    status: 'draft',
    subtotal: 22000,
    netAmount: 22000,
    paymentStatus: 'pending',
    paymentMethod: 'bnpl',
    source: 'manual',
    createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
    updatedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
  },
  {
    id: 'po-4',
    orderNumber: 'PO-2024-0004',
    merchantId: 'merchant-1',
    supplierId: 'sup-3',
    status: 'delivered',
    subtotal: 12500,
    netAmount: 12500,
    paymentStatus: 'paid',
    paymentMethod: 'prepaid',
    source: 'rfq',
    createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
    updatedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
  },
  {
    id: 'po-5',
    orderNumber: 'PO-2024-0005',
    merchantId: 'merchant-1',
    supplierId: 'sup-2',
    status: 'sent',
    subtotal: 9800,
    netAmount: 9800,
    paymentStatus: 'pending',
    paymentMethod: 'net-terms',
    source: 'manual',
    createdAt: new Date(Date.now() - 12 * 60 * 60 * 1000),
    updatedAt: new Date(Date.now() - 12 * 60 * 60 * 1000),
  },
];

const mockSuppliers: Record<string, string> = {
  'sup-1': 'Fresh Foods Distributors',
  'sup-2': 'Premium Spices Co.',
  'sup-3': 'Quality Provisions Ltd.',
};

function formatDate(date: Date | string): string {
  return new Date(date).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export default function OrdersPage() {
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [activeTab, setActiveTab] = useState<TabType>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [paymentFilter, setPaymentFilter] = useState<PaymentFilter>('all');
  const [supplierFilter, setSupplierFilter] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Modals
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  // Stats
  const [stats, setStats] = useState<OrderStats>({
    totalPOs: 0,
    totalValue: 0,
    pendingPayments: 0,
    thisMonth: 0,
  });

  const fetchOrders = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      // In production, this would call the API
      await new Promise(resolve => setTimeout(resolve, 500));

      let filtered = [...mockOrders];

      // Apply tab filter
      if (activeTab !== 'all') {
        filtered = filtered.filter(o => o.status === activeTab);
      }

      // Apply status filter
      if (statusFilter !== 'all') {
        filtered = filtered.filter(o => o.status === statusFilter);
      }

      // Apply payment filter
      if (paymentFilter !== 'all') {
        filtered = filtered.filter(o => o.paymentStatus === paymentFilter);
      }

      // Apply date filter
      if (startDate) {
        filtered = filtered.filter(o => new Date(o.createdAt) >= new Date(startDate));
      }
      if (endDate) {
        filtered = filtered.filter(o => new Date(o.createdAt) <= new Date(endDate));
      }

      setOrders(filtered);

      // Calculate stats
      const thisMonthStart = new Date();
      thisMonthStart.setDate(1);
      thisMonthStart.setHours(0, 0, 0, 0);

      setStats({
        totalPOs: mockOrders.length,
        totalValue: mockOrders.reduce((sum, o) => sum + o.netAmount, 0),
        pendingPayments: mockOrders.filter(o => o.paymentStatus !== 'paid').reduce((sum, o) => sum + o.netAmount, 0),
        thisMonth: mockOrders.filter(o => new Date(o.createdAt) >= thisMonthStart).length,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load orders');
    } finally {
      setIsLoading(false);
    }
  }, [activeTab, statusFilter, paymentFilter, startDate, endDate]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const handleViewOrder = (orderId: string) => {
    setSelectedOrderId(orderId);
    setIsDetailModalOpen(true);
  };

  const handleCreateSuccess = () => {
    fetchOrders();
  };

  const resetFilters = () => {
    setStatusFilter('all');
    setPaymentFilter('all');
    setSupplierFilter('');
    setStartDate('');
    setEndDate('');
  };

  const hasActiveFilters = statusFilter !== 'all' || paymentFilter !== 'all' || supplierFilter || startDate || endDate;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Purchase Orders</h1>
          <p className="text-sm text-gray-500 mt-1">
            Manage your purchase orders and track deliveries
          </p>
        </div>
        <button
          onClick={() => setIsCreateModalOpen(true)}
          className="inline-flex items-center px-4 py-2.5 bg-[#7C3AED] text-white font-medium rounded-lg hover:bg-[#6D28D9] transition-colors"
        >
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Create PO
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Total POs</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{stats.totalPOs}</p>
            </div>
            <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Total Value</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                ₹{stats.totalValue.toLocaleString('en-IN')}
              </p>
            </div>
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-amber-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Pending Payments</p>
              <p className="text-2xl font-bold text-amber-600 mt-1">
                ₹{stats.pendingPayments.toLocaleString('en-IN')}
              </p>
            </div>
            <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">This Month</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{stats.thisMonth}</p>
            </div>
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex -mb-px overflow-x-auto">
          {tabs.map(tab => (
            <button
              key={tab.value}
              onClick={() => setActiveTab(tab.value)}
              className={`
                px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors
                ${activeTab === tab.value
                  ? 'border-[#7C3AED] text-[#7C3AED]'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}
              `}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="flex flex-wrap items-center gap-4">
          {/* Status Filter */}
          <div className="w-40">
            <label className="block text-xs font-medium text-gray-500 mb-1">Status</label>
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#7C3AED] focus:border-transparent"
            >
              <option value="all">All Status</option>
              <option value="draft">Draft</option>
              <option value="sent">Sent</option>
              <option value="confirmed">Confirmed</option>
              <option value="processing">Processing</option>
              <option value="shipped">Shipped</option>
              <option value="received">Received</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>

          {/* Payment Filter */}
          <div className="w-40">
            <label className="block text-xs font-medium text-gray-500 mb-1">Payment</label>
            <select
              value={paymentFilter}
              onChange={e => setPaymentFilter(e.target.value as PaymentFilter)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#7C3AED] focus:border-transparent"
            >
              <option value="all">All</option>
              <option value="pending">Pending</option>
              <option value="partial">Partial</option>
              <option value="paid">Paid</option>
            </select>
          </div>

          {/* Date Range */}
          <div className="w-36">
            <label className="block text-xs font-medium text-gray-500 mb-1">From</label>
            <input
              type="date"
              value={startDate}
              onChange={e => setStartDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#7C3AED] focus:border-transparent"
            />
          </div>

          <div className="w-36">
            <label className="block text-xs font-medium text-gray-500 mb-1">To</label>
            <input
              type="date"
              value={endDate}
              onChange={e => setEndDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#7C3AED] focus:border-transparent"
            />
          </div>

          {hasActiveFilters && (
            <div className="flex items-end">
              <button
                onClick={resetFilters}
                className="px-3 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
              >
                Reset Filters
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Orders Table */}
      {isLoading ? (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="animate-pulse p-4 space-y-4">
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className="h-16 bg-gray-100 rounded" />
            ))}
          </div>
        </div>
      ) : error ? (
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
          <p className="text-red-700 font-medium">{error}</p>
          <button
            onClick={fetchOrders}
            className="mt-3 px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700"
          >
            Try Again
          </button>
        </div>
      ) : orders.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No orders found</h3>
          <p className="text-gray-500 mb-6">
            {hasActiveFilters
              ? 'Try adjusting your filters to see more results.'
              : 'Create your first purchase order to get started.'}
          </p>
          {!hasActiveFilters && (
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="px-6 py-2.5 bg-[#7C3AED] text-white font-medium rounded-lg hover:bg-[#6D28D9] transition-colors"
            >
              Create PO
            </button>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Order #
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Supplier
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Total
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Payment
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {orders.map(order => (
                  <tr key={order.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <span className="font-medium text-[#7C3AED] cursor-pointer hover:text-[#6D28D9]">
                        {order.orderNumber}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900">
                      {mockSuppliers[order.supplierId] || 'Unknown Supplier'}
                    </td>
                    <td className="px-4 py-3 text-right text-sm font-medium text-gray-900">
                      ₹{order.netAmount.toLocaleString('en-IN')}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`
                        inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
                        ${statusConfig[order.status].bg} ${statusConfig[order.status].text}
                      `}>
                        {statusConfig[order.status].label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`
                        inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
                        ${paymentConfig[order.paymentStatus].bg} ${paymentConfig[order.paymentStatus].text}
                      `}>
                        {paymentConfig[order.paymentStatus].label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">
                      {formatDate(order.createdAt)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleViewOrder(order.id)}
                          className="p-1.5 text-gray-500 hover:text-[#7C3AED] hover:bg-gray-100 rounded transition-colors"
                          title="View"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                        </button>
                        {(order.status === 'draft' || order.status === 'sent') && (
                          <button
                            className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                            title="Edit"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modals */}
      <CreatePOModal
        open={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        source="manual"
        onSuccess={handleCreateSuccess}
      />

      <PODetailModal
        poId={selectedOrderId}
        isOpen={isDetailModalOpen}
        onClose={() => {
          setIsDetailModalOpen(false);
          setSelectedOrderId(null);
        }}
        onStatusUpdate={fetchOrders}
      />
    </div>
  );
}
