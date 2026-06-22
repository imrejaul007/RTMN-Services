import { logger } from '../../shared/logger';
'use client';

import { useState } from 'react';
import Link from 'next/link';

interface OrderItem {
  id: string;
  name: string;
  sku?: string;
  qty: number;
  unit: string;
  unitPrice: number;
  total: number;
  receivedQty: number;
}

interface Order {
  id: string;
  orderNumber: string;
  merchantId: string;
  merchantName: string;
  merchantAddress: string;
  items: OrderItem[];
  status: 'new' | 'confirmed' | 'processing' | 'shipped' | 'received' | 'completed';
  paymentStatus: 'pending' | 'partial' | 'paid';
  subtotal: number;
  netAmount: number;
  expectedDelivery?: string;
  actualDelivery?: string;
  notes?: string;
  createdAt: string;
}

const mockOrders: Order[] = [
  {
    id: '1',
    orderNumber: 'PO-2024-001234',
    merchantId: 'm1',
    merchantName: 'Spice Garden Restaurant',
    merchantAddress: '123 MG Road, Bangalore, Karnataka 560001',
    items: [
      { id: 'i1', name: 'Organic Basmati Rice - Premium', sku: 'RICE-ORG-001', qty: 200, unit: 'kg', unitPrice: 85, total: 17000, receivedQty: 0 },
      { id: 'i2', name: 'Cold Pressed Mustard Oil', sku: 'OIL-MUS-001', qty: 50, unit: 'liters', unitPrice: 180, total: 9000, receivedQty: 0 },
    ],
    status: 'new',
    paymentStatus: 'pending',
    subtotal: 26000,
    netAmount: 26000,
    expectedDelivery: '2024-01-25',
    createdAt: '2024-01-15T10:30:00Z',
  },
  {
    id: '2',
    orderNumber: 'PO-2024-001233',
    merchantId: 'm2',
    merchantName: 'Hotel Sunrise',
    merchantAddress: '456 Brigade Road, Bangalore, Karnataka 560025',
    items: [
      { id: 'i3', name: 'Fresh Green Peas - Frozen', sku: 'VEG-PEA-001', qty: 100, unit: 'kg', unitPrice: 120, total: 12000, receivedQty: 100 },
      { id: 'i4', name: 'Organic Turmeric Powder', sku: 'SPICE-TUR-001', qty: 20, unit: 'kg', unitPrice: 350, total: 7000, receivedQty: 20 },
      { id: 'i5', name: 'Whole Wheat Atta', sku: 'FLOUR-WHT-001', qty: 200, unit: 'kg', unitPrice: 45, total: 9000, receivedQty: 200 },
    ],
    status: 'processing',
    paymentStatus: 'partial',
    subtotal: 28000,
    netAmount: 28000,
    expectedDelivery: '2024-01-20',
    createdAt: '2024-01-14T14:20:00Z',
  },
  {
    id: '3',
    orderNumber: 'PO-2024-001232',
    merchantId: 'm3',
    merchantName: 'Cafe Mocha',
    merchantAddress: '789 Indiranagar, Bangalore, Karnataka 560038',
    items: [
      { id: 'i6', name: 'Organic Honey - Raw', sku: 'SWE-HON-001', qty: 15, unit: 'kg', unitPrice: 450, total: 6750, receivedQty: 15 },
    ],
    status: 'shipped',
    paymentStatus: 'paid',
    subtotal: 6750,
    netAmount: 6750,
    expectedDelivery: '2024-01-18',
    actualDelivery: '2024-01-17',
    createdAt: '2024-01-13T09:15:00Z',
  },
  {
    id: '4',
    orderNumber: 'PO-2024-001231',
    merchantId: 'm4',
    merchantName: 'Taj Banquet Hall',
    merchantAddress: '321 Palace Road, Bangalore, Karnataka 560052',
    items: [
      { id: 'i7', name: 'Organic Basmati Rice - Premium', sku: 'RICE-ORG-001', qty: 500, unit: 'kg', unitPrice: 85, total: 42500, receivedQty: 500 },
      { id: 'i8', name: 'Cold Pressed Mustard Oil', sku: 'OIL-MUS-001', qty: 100, unit: 'liters', unitPrice: 180, total: 18000, receivedQty: 100 },
      { id: 'i9', name: 'Fresh Paneer', sku: 'DAIRY-PAN-001', qty: 50, unit: 'kg', unitPrice: 280, total: 14000, receivedQty: 48 },
    ],
    status: 'received',
    paymentStatus: 'paid',
    subtotal: 74500,
    netAmount: 74260,
    notes: 'Received 2kg less paneer - merchant acknowledged',
    expectedDelivery: '2024-01-15',
    actualDelivery: '2024-01-15',
    createdAt: '2024-01-12T16:45:00Z',
  },
  {
    id: '5',
    orderNumber: 'PO-2024-001230',
    merchantId: 'm5',
    merchantName: 'Urban Kitchen',
    merchantAddress: '567 Koramangala, Bangalore, Karnataka 560034',
    items: [
      { id: 'i10', name: 'Whole Wheat Atta', sku: 'FLOUR-WHT-001', qty: 300, unit: 'kg', unitPrice: 45, total: 13500, receivedQty: 300 },
      { id: 'i11', name: 'Fresh Green Peas', sku: 'VEG-PEA-001', qty: 50, unit: 'kg', unitPrice: 120, total: 6000, receivedQty: 50 },
    ],
    status: 'completed',
    paymentStatus: 'paid',
    subtotal: 19500,
    netAmount: 19500,
    expectedDelivery: '2024-01-12',
    actualDelivery: '2024-01-12',
    createdAt: '2024-01-10T11:00:00Z',
  },
];

const statusTabs = [
  { key: 'all', label: 'All' },
  { key: 'new', label: 'New' },
  { key: 'confirmed', label: 'Confirmed' },
  { key: 'processing', label: 'Processing' },
  { key: 'shipped', label: 'Shipped' },
  { key: 'completed', label: 'Completed' },
];

const statusColors: Record<string, string> = {
  new: 'bg-blue-100 text-blue-800',
  confirmed: 'bg-purple-100 text-purple-800',
  processing: 'bg-yellow-100 text-yellow-800',
  shipped: 'bg-indigo-100 text-indigo-800',
  received: 'bg-teal-100 text-teal-800',
  completed: 'bg-green-100 text-green-800',
};

const paymentStatusColors: Record<string, string> = {
  pending: 'bg-red-100 text-red-800',
  partial: 'bg-yellow-100 text-yellow-800',
  paid: 'bg-green-100 text-green-800',
};

const statusActions: Record<string, { label: string; nextStatus: string; color: string }[]> = {
  new: [{ label: 'Accept Order', nextStatus: 'confirmed', color: 'bg-green-600 hover:bg-green-700' }],
  confirmed: [{ label: 'Start Processing', nextStatus: 'processing', color: 'bg-blue-600 hover:bg-blue-700' }],
  processing: [{ label: 'Mark as Shipped', nextStatus: 'shipped', color: 'bg-indigo-600 hover:bg-indigo-700' }],
  shipped: [{ label: 'Mark as Delivered', nextStatus: 'received', color: 'bg-teal-600 hover:bg-teal-700' }],
  received: [],
  completed: [],
};

export default function OrdersPage() {
  const [orders] = useState<Order[]>(mockOrders);
  const [activeTab, setActiveTab] = useState('all');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [actionNotes, setActionNotes] = useState('');

  const filteredOrders = activeTab === 'all'
    ? orders
    : orders.filter(order => order.status === activeTab);

  const handleStatusUpdate = (orderId: string, newStatus: string) => {
    logger.info(`Updating order ${orderId} to status: ${newStatus}`);
    logger.info(`Notes: ${actionNotes}`);
    setShowUpdateModal(false);
    setSelectedOrder(null);
    setActionNotes('');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <Link href="/dashboard" className="text-gray-500 hover:text-gray-700">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </Link>
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-purple-600 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-sm">NB</span>
                </div>
                <span className="text-xl font-bold text-gray-900">NextaBizz</span>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="w-8 h-8 bg-purple-600 rounded-full flex items-center justify-center">
                <span className="text-white font-semibold text-sm">FS</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Navigation */}
      <nav className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex space-x-8">
            <Link href="/dashboard" className="border-b-2 border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 py-4 px-1 text-sm font-medium">
              Dashboard
            </Link>
            <Link href="/dashboard/orders" className="border-b-2 border-purple-600 text-purple-600 py-4 px-1 text-sm font-medium">
              Orders
            </Link>
            <Link href="/dashboard/products" className="border-b-2 border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 py-4 px-1 text-sm font-medium">
              Products
            </Link>
            <Link href="/dashboard/rfqs" className="border-b-2 border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 py-4 px-1 text-sm font-medium">
              RFQs
            </Link>
            <Link href="/dashboard/performance" className="border-b-2 border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 py-4 px-1 text-sm font-medium">
              Performance
            </Link>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Order Fulfillment</h1>
          <p className="mt-1 text-sm text-gray-600">Manage incoming purchase orders from merchants</p>
        </div>

        {/* Status Tabs */}
        <div className="bg-white rounded-xl border border-gray-200 mb-6">
          <div className="border-b border-gray-200">
            <nav className="flex -mb-px">
              {statusTabs.map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`py-4 px-6 text-sm font-medium border-b-2 ${
                    activeTab === tab.key
                      ? 'border-purple-600 text-purple-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  {tab.label}
                  <span className="ml-2 px-2 py-0.5 text-xs font-medium bg-gray-100 text-gray-600 rounded-full">
                    {tab.key === 'all' ? orders.length : orders.filter(o => o.status === tab.key).length}
                  </span>
                </button>
              ))}
            </nav>
          </div>
        </div>

        {/* Orders List */}
        <div className="space-y-4">
          {filteredOrders.map((order) => (
            <div key={order.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden hover:border-purple-200 transition-colors">
              {/* Order Header */}
              <div className="p-6 border-b border-gray-100">
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3">
                      <span className="text-lg font-semibold text-purple-600">{order.orderNumber}</span>
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${statusColors[order.status]}`}>
                        {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                      </span>
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${paymentStatusColors[order.paymentStatus]}`}>
                        {order.paymentStatus.charAt(0).toUpperCase() + order.paymentStatus.slice(1)} Payment
                      </span>
                    </div>
                    <div className="mt-2 flex items-center space-x-4 text-sm text-gray-600">
                      <span className="font-medium text-gray-900">{order.merchantName}</span>
                      <span>{order.items.length} item(s)</span>
                      <span className="font-medium text-gray-900">₹{(order.netAmount / 1000).toFixed(1)}K</span>
                    </div>
                    <p className="mt-1 text-xs text-gray-500">{order.merchantAddress}</p>
                  </div>
                  <div className="flex items-center space-x-4">
                    <div className="text-right">
                      <p className="text-xs text-gray-500">Expected Delivery</p>
                      <p className="text-sm font-medium text-gray-900">
                        {order.expectedDelivery ? new Date(order.expectedDelivery).toLocaleDateString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric'
                        }) : 'Not set'}
                      </p>
                    </div>
                    {statusActions[order.status]?.length > 0 && (
                      <button
                        onClick={() => {
                          setSelectedOrder(order);
                          setShowUpdateModal(true);
                        }}
                        className={`px-4 py-2 text-white text-sm font-medium rounded-lg transition-colors ${statusActions[order.status][0].color}`}
                      >
                        {statusActions[order.status][0].label}
                      </button>
                    )}
                    <button
                      onClick={() => setSelectedOrder(selectedOrder?.id === order.id ? null : order)}
                      className="px-4 py-2 border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      {selectedOrder?.id === order.id ? 'Hide' : 'View'} Details
                    </button>
                  </div>
                </div>
              </div>

              {/* Order Details (Expandable) */}
              {selectedOrder?.id === order.id && (
                <div className="p-6 bg-gray-50 border-t border-gray-100">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Items Table */}
                    <div>
                      <h3 className="text-sm font-semibold text-gray-900 mb-3">Order Items</h3>
                      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                        <table className="min-w-full divide-y divide-gray-200">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Item</th>
                              <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">Qty</th>
                              <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">Price</th>
                              <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">Total</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-200">
                            {order.items.map((item) => (
                              <tr key={item.id}>
                                <td className="px-4 py-2">
                                  <div className="text-sm font-medium text-gray-900">{item.name}</div>
                                  {item.sku && <div className="text-xs text-gray-500">{item.sku}</div>}
                                </td>
                                <td className="px-4 py-2 text-right text-sm text-gray-900">
                                  {item.qty} {item.unit}
                                </td>
                                <td className="px-4 py-2 text-right text-sm text-gray-900">
                                  ₹{item.unitPrice}
                                </td>
                                <td className="px-4 py-2 text-right text-sm font-medium text-gray-900">
                                  ₹{item.total.toLocaleString()}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                          <tfoot className="bg-gray-50">
                            <tr>
                              <td colSpan={3} className="px-4 py-2 text-right text-sm font-medium text-gray-900">Net Amount:</td>
                              <td className="px-4 py-2 text-right text-sm font-bold text-gray-900">
                                ₹{order.netAmount.toLocaleString()}
                              </td>
                            </tr>
                          </tfoot>
                        </table>
                      </div>
                    </div>

                    {/* Order Timeline */}
                    <div>
                      <h3 className="text-sm font-semibold text-gray-900 mb-3">Order Timeline</h3>
                      <div className="bg-white rounded-lg border border-gray-200 p-4">
                        <div className="space-y-4">
                          <div className="flex items-start space-x-3">
                            <div className="w-2 h-2 bg-green-500 rounded-full mt-2"></div>
                            <div>
                              <p className="text-sm font-medium text-gray-900">Order Created</p>
                              <p className="text-xs text-gray-500">
                                {new Date(order.createdAt).toLocaleString('en-IN', {
                                  day: 'numeric',
                                  month: 'short',
                                  year: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })}
                              </p>
                            </div>
                          </div>
                          {order.status !== 'new' && (
                            <div className="flex items-start space-x-3">
                              <div className="w-2 h-2 bg-purple-500 rounded-full mt-2"></div>
                              <div>
                                <p className="text-sm font-medium text-gray-900">Order Confirmed</p>
                                <p className="text-xs text-gray-500">Order accepted and processing started</p>
                              </div>
                            </div>
                          )}
                          {(order.status === 'processing' || order.status === 'shipped' || order.status === 'received' || order.status === 'completed') && (
                            <div className="flex items-start space-x-3">
                              <div className="w-2 h-2 bg-yellow-500 rounded-full mt-2"></div>
                              <div>
                                <p className="text-sm font-medium text-gray-900">Processing</p>
                                <p className="text-xs text-gray-500">Order is being prepared</p>
                              </div>
                            </div>
                          )}
                          {(order.status === 'shipped' || order.status === 'received' || order.status === 'completed') && (
                            <div className="flex items-start space-x-3">
                              <div className="w-2 h-2 bg-indigo-500 rounded-full mt-2"></div>
                              <div>
                                <p className="text-sm font-medium text-gray-900">Shipped</p>
                                <p className="text-xs text-gray-500">Order dispatched for delivery</p>
                              </div>
                            </div>
                          )}
                          {(order.status === 'received' || order.status === 'completed') && order.actualDelivery && (
                            <div className="flex items-start space-x-3">
                              <div className="w-2 h-2 bg-teal-500 rounded-full mt-2"></div>
                              <div>
                                <p className="text-sm font-medium text-gray-900">Delivered</p>
                                <p className="text-xs text-gray-500">
                                  {new Date(order.actualDelivery).toLocaleDateString('en-IN', {
                                    day: 'numeric',
                                    month: 'short',
                                    year: 'numeric'
                                  })}
                                </p>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Variance Notes */}
                      {order.notes && (
                        <div className="mt-4 p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                          <div className="flex items-start space-x-2">
                            <svg className="w-5 h-5 text-yellow-600 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                            </svg>
                            <div>
                              <p className="text-sm font-medium text-yellow-800">Variance Note</p>
                              <p className="text-sm text-yellow-700 mt-1">{order.notes}</p>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}

          {filteredOrders.length === 0 && (
            <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
              <svg className="w-16 h-16 text-gray-300 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              <h3 className="mt-4 text-lg font-medium text-gray-900">No orders found</h3>
              <p className="mt-2 text-sm text-gray-500">There are no orders matching your filter criteria.</p>
            </div>
          )}
        </div>
      </main>

      {/* Status Update Modal */}
      {showUpdateModal && selectedOrder && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-screen items-center justify-center p-4">
            <div className="fixed inset-0 bg-black/50 transition-opacity" onClick={() => setShowUpdateModal(false)}></div>
            <div className="relative bg-white rounded-xl shadow-xl max-w-md w-full p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-gray-900">
                  Update Order Status
                </h2>
                <button onClick={() => setShowUpdateModal(false)} className="text-gray-400 hover:text-gray-600">
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="mb-6">
                <p className="text-sm text-gray-600 mb-4">
                  Order <span className="font-semibold text-purple-600">{selectedOrder.orderNumber}</span> will be updated to{' '}
                  <span className="font-semibold text-gray-900">
                    {statusActions[selectedOrder.status]?.[0]?.label.replace('Accept ', '').replace('Start ', '').replace('Mark as ', '')}
                  </span>.
                </p>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Notes (optional)
                </label>
                <textarea
                  rows={3}
                  value={actionNotes}
                  onChange={(e) => setActionNotes(e.target.value)}
                  placeholder="Add any notes or comments..."
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none"
                />
              </div>

              <div className="flex space-x-3">
                <button
                  onClick={() => setShowUpdateModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleStatusUpdate(selectedOrder.id, statusActions[selectedOrder.status]?.[0]?.nextStatus || '')}
                  className={`flex-1 px-4 py-2 text-white rounded-lg font-medium transition-colors ${statusActions[selectedOrder.status]?.[0]?.color || 'bg-purple-600 hover:bg-purple-700'}`}
                >
                  Confirm
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
