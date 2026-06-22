'use client';

import { useState, useEffect } from 'react';
import type { PurchaseOrder, POStatus, PaymentStatus } from '@nextabizz/shared-types';
import { updateOrderStatus, markOrderAsPaid } from '@/lib/api';

// UI types (extended from shared types for display purposes)
interface UIItem {
  id: string;
  poId: string;
  name: string;
  sku?: string;
  qty: number;
  unit: string;
  unitPrice: number;
  total: number;
  receivedQty: number;
  createdAt: Date;
}

interface UISupplier {
  id: string;
  name: string;
  email: string;
  phone: string;
  category: string;
  rating: number;
  verified: boolean;
}

interface PODetailModalProps {
  poId: string | null;
  isOpen: boolean;
  onClose: () => void;
  onStatusUpdate?: () => void;
}

const statusConfig: Record<POStatus, { label: string; bg: string; text: string }> = {
  draft: { label: 'Draft', bg: 'bg-gray-100', text: 'text-gray-700' },
  sent: { label: 'Sent', bg: 'bg-blue-100', text: 'text-blue-700' },
  confirmed: { label: 'Confirmed', bg: 'bg-indigo-100', text: 'text-indigo-700' },
  processing: { label: 'Processing', bg: 'bg-purple-100', text: 'text-purple-700' },
  shipped: { label: 'Shipped', bg: 'bg-amber-100', text: 'text-amber-700' },
  delivered: { label: 'Delivered', bg: 'bg-green-100', text: 'text-green-700' },
  cancelled: { label: 'Cancelled', bg: 'bg-red-100', text: 'text-red-700' },
  closed: { label: 'Closed', bg: 'bg-gray-100', text: 'text-gray-700' },
};

const paymentConfig: Record<PaymentStatus, { label: string; bg: string; text: string }> = {
  pending: { label: 'Pending', bg: 'bg-amber-100', text: 'text-amber-700' },
  partial: { label: 'Partial', bg: 'bg-orange-100', text: 'text-orange-700' },
  paid: { label: 'Paid', bg: 'bg-green-100', text: 'text-green-700' },
};

const statusFlow: POStatus[] = ['sent', 'confirmed', 'processing', 'shipped', 'delivered'];

function formatDate(date: Date | string | undefined): string {
  if (!date) return '-';
  return new Date(date).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function formatDateTime(date: Date | string | undefined): string {
  if (!date) return '-';
  return new Date(date).toLocaleString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export default function PODetailModal({ poId, isOpen, onClose, onStatusUpdate }: PODetailModalProps) {
  const [order, setOrder] = useState<PurchaseOrder | null>(null);
  const [items, setItems] = useState<UIItem[]>([]);
  const [supplier, setSupplier] = useState<UISupplier | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    if (isOpen && poId) {
      loadOrderDetails();
    }
  }, [isOpen, poId]);

  const loadOrderDetails = async () => {
    if (!poId) return;

    setIsLoading(true);
    setError(null);

    try {
      // For demo, we'll use mock data since we need merchantId
      // In production, this would call fetchOrderById
      // const data = await fetchOrderById(merchantId, poId);

      // Mock data for demonstration
      const mockOrder: PurchaseOrder = {
        id: poId,
        orderNumber: `PO-2024-${poId.slice(0, 4).toUpperCase()}`,
        merchantId: 'merchant-1',
        supplierId: 'supplier-1',
        status: 'confirmed',
        subtotal: 15400,
        netAmount: 15400,
        paymentStatus: 'pending',
        paymentMethod: 'net-terms',
        deliveryAddress: {
          line1: '123 Main Street',
          city: 'Mumbai',
          state: 'Maharashtra',
          pincode: '400001',
        },
        expectedDelivery: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
        notes: 'Please handle with care',
        source: 'manual',
        createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
        updatedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
      };

      const mockItems: UIItem[] = [
        {
          id: 'item-1',
          poId: poId,
          name: 'Basmati Rice - Premium',
          sku: 'RICE-001',
          qty: 50,
          unit: 'kg',
          unitPrice: 120,
          total: 6000,
          receivedQty: 0,
          createdAt: new Date(),
        },
        {
          id: 'item-2',
          poId: poId,
          name: 'Refined Oil',
          sku: 'OIL-002',
          qty: 20,
          unit: 'liters',
          unitPrice: 180,
          total: 3600,
          receivedQty: 0,
          createdAt: new Date(),
        },
        {
          id: 'item-3',
          poId: poId,
          name: 'Tur Dal',
          sku: 'DAL-003',
          qty: 25,
          unit: 'kg',
          unitPrice: 220,
          total: 5500,
          receivedQty: 0,
          createdAt: new Date(),
        },
      ];

      const mockSupplier: UISupplier = {
        id: 'supplier-1',
        name: 'Fresh Foods Distributors',
        email: 'orders@freshfoods.in',
        phone: '+91 98765 43210',
        category: 'Groceries & Provisions',
        rating: 4.5,
        verified: true,
      };

      setOrder(mockOrder);
      setItems(mockItems);
      setSupplier(mockSupplier);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load order details');
    } finally {
      setIsLoading(false);
    }
  };

  const handleMarkAsPaid = async () => {
    if (!order) return;

    setActionLoading(true);
    try {
      // await markOrderAsPaid(merchantId, order.id);
      setOrder({ ...order, paymentStatus: 'paid' });
      onStatusUpdate?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update payment status');
    } finally {
      setActionLoading(false);
    }
  };

  const handleUpdateStatus = async (newStatus: POStatus) => {
    if (!order) return;

    setActionLoading(true);
    try {
      // await updateOrderStatus(merchantId, order.id, newStatus);
      setOrder({ ...order, status: newStatus });
      onStatusUpdate?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update status');
    } finally {
      setActionLoading(false);
    }
  };

  if (!isOpen) return null;

  const currentStatusIndex = order ? statusFlow.indexOf(order.status) : -1;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-full items-center justify-center p-4">
        {/* Backdrop */}
        <div className="fixed inset-0 bg-black/50" onClick={onClose} />

        {/* Modal */}
        <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col">
          {isLoading ? (
            <div className="flex items-center justify-center h-96">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#7C3AED]" />
            </div>
          ) : error ? (
            <div className="p-8 text-center">
              <p className="text-red-600">{error}</p>
              <button onClick={onClose} className="mt-4 px-4 py-2 bg-gray-100 rounded-lg">
                Close
              </button>
            </div>
          ) : order ? (
            <>
              {/* Header */}
              <div className="flex items-start justify-between p-6 border-b border-gray-100">
                <div>
                  <div className="flex items-center gap-3">
                    <h2 className="text-xl font-semibold text-gray-900">{order.orderNumber}</h2>
                    <span className={`
                      inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
                      ${statusConfig[order.status].bg} ${statusConfig[order.status].text}
                    `}>
                      {statusConfig[order.status].label}
                    </span>
                  </div>
                  <p className="text-sm text-gray-500 mt-1">
                    Created {formatDateTime(order.createdAt)}
                  </p>
                </div>
                <button
                  onClick={onClose}
                  className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Status Timeline */}
              {currentStatusIndex >= 0 && (
                <div className="px-6 py-4 bg-gray-50 border-b border-gray-100">
                  <div className="flex items-center justify-between">
                    {statusFlow.map((status, index) => {
                      const isPast = index < currentStatusIndex;
                      const isCurrent = index === currentStatusIndex;
                      return (
                        <div key={status} className="flex items-center">
                          <div className="flex flex-col items-center">
                            <div className={`
                              w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium
                              ${isPast
                                ? 'bg-green-500 text-white'
                                : isCurrent
                                ? 'bg-[#7C3AED] text-white'
                                : 'bg-gray-200 text-gray-500'}
                            `}>
                              {isPast ? (
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                              ) : (
                                index + 1
                              )}
                            </div>
                            <span className={`text-xs mt-1 ${isCurrent ? 'text-[#7C3AED] font-medium' : 'text-gray-500'}`}>
                              {statusConfig[status].label}
                            </span>
                          </div>
                          {index < statusFlow.length - 1 && (
                            <div className={`w-12 h-0.5 mx-1 ${isPast ? 'bg-green-500' : 'bg-gray-200'}`} />
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Content */}
              <div className="flex-1 overflow-y-auto p-6">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Main Content */}
                  <div className="lg:col-span-2 space-y-6">
                    {/* Supplier Info */}
                    {supplier && (
                      <div className="bg-gray-50 rounded-xl p-4">
                        <h3 className="text-sm font-medium text-gray-700 mb-3">Supplier</h3>
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="font-medium text-gray-900">{supplier.name}</p>
                            <p className="text-sm text-gray-500">{supplier.email}</p>
                            <p className="text-sm text-gray-500">{supplier.phone}</p>
                          </div>
                          {supplier.verified && (
                            <span className="inline-flex items-center px-2 py-1 rounded-full bg-green-100 text-green-700 text-xs font-medium">
                              <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                              </svg>
                              Verified
                            </span>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Items Table */}
                    <div>
                      <h3 className="text-sm font-medium text-gray-700 mb-3">Items</h3>
                      <div className="border border-gray-200 rounded-xl overflow-hidden">
                        <table className="w-full">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Product
                              </th>
                              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Qty
                              </th>
                              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Unit Price
                              </th>
                              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Total
                              </th>
                              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Received
                              </th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-200">
                            {items.map((item) => {
                              const hasVariance = item.receivedQty !== item.qty && item.receivedQty > 0;
                              return (
                                <tr key={item.id} className="hover:bg-gray-50">
                                  <td className="px-4 py-3">
                                    <p className="font-medium text-gray-900">{item.name}</p>
                                    {item.sku && (
                                      <p className="text-xs text-gray-500">SKU: {item.sku}</p>
                                    )}
                                  </td>
                                  <td className="px-4 py-3 text-right text-gray-600">
                                    {item.qty} {item.unit}
                                  </td>
                                  <td className="px-4 py-3 text-right text-gray-600">
                                    ₹{item.unitPrice.toLocaleString('en-IN')}
                                  </td>
                                  <td className="px-4 py-3 text-right font-medium text-gray-900">
                                    ₹{item.total.toLocaleString('en-IN')}
                                  </td>
                                  <td className="px-4 py-3 text-right">
                                    <span className={hasVariance ? 'text-orange-600' : 'text-gray-600'}>
                                      {item.receivedQty} {item.unit}
                                    </span>
                                    {hasVariance && (
                                      <span className="ml-1 text-xs text-orange-500">
                                        ({item.qty - item.receivedQty} short)
                                      </span>
                                    )}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* Notes */}
                    {order.notes && (
                      <div>
                        <h3 className="text-sm font-medium text-gray-700 mb-2">Notes</h3>
                        <p className="text-sm text-gray-600 bg-gray-50 rounded-lg p-3">
                          {order.notes}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Sidebar */}
                  <div className="space-y-6">
                    {/* Payment Status */}
                    <div className="bg-gray-50 rounded-xl p-4">
                      <h3 className="text-sm font-medium text-gray-700 mb-3">Payment</h3>
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-500">Status</span>
                          <span className={`
                            inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
                            ${paymentConfig[order.paymentStatus].bg} ${paymentConfig[order.paymentStatus].text}
                          `}>
                            {paymentConfig[order.paymentStatus].label}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-500">Method</span>
                          <span className="text-sm font-medium text-gray-900 capitalize">
                            {order.paymentMethod?.replace('-', ' ') || 'Prepaid'}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-500">Amount</span>
                          <span className="text-lg font-bold text-gray-900">
                            ₹{order.netAmount.toLocaleString('en-IN')}
                          </span>
                        </div>
                        {order.paymentStatus !== 'paid' && (
                          <button
                            onClick={handleMarkAsPaid}
                            disabled={actionLoading}
                            className="w-full mt-2 px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
                          >
                            {actionLoading ? 'Processing...' : 'Mark as Paid'}
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Delivery Info */}
                    <div className="bg-gray-50 rounded-xl p-4">
                      <h3 className="text-sm font-medium text-gray-700 mb-3">Delivery</h3>
                      <div className="space-y-3">
                        {order.deliveryAddress && (
                          <div>
                            <p className="text-xs text-gray-500 mb-1">Address</p>
                            <p className="text-sm text-gray-900">
                              {order.deliveryAddress.line1}
                              {order.deliveryAddress.line2 && <>, {order.deliveryAddress.line2}</>}
                              <br />
                              {order.deliveryAddress.city}, {order.deliveryAddress.state}
                              <br />
                              {order.deliveryAddress.pincode}
                            </p>
                          </div>
                        )}
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-gray-500">Expected</span>
                          <span className="text-sm font-medium text-gray-900">
                            {formatDate(order.expectedDelivery)}
                          </span>
                        </div>
                        {order.actualDelivery && (
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-gray-500">Delivered</span>
                            <span className="text-sm font-medium text-green-600">
                              {formatDate(order.actualDelivery)}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Variance Alert */}
                    {items.some(i => i.receivedQty !== i.qty && i.receivedQty > 0) && (
                      <div className="bg-orange-50 border border-orange-200 rounded-xl p-4">
                        <div className="flex items-start">
                          <svg className="w-5 h-5 text-orange-500 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                          </svg>
                          <div className="ml-3">
                            <p className="text-sm font-medium text-orange-800">Quantity Variance</p>
                            <p className="text-xs text-orange-600 mt-1">
                              Some items were received with different quantities than ordered.
                            </p>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Track Delivery Button */}
                    {(order.status === 'shipped') && (
                      <button className="w-full px-4 py-2 border border-[#7C3AED] text-[#7C3AED] text-sm font-medium rounded-lg hover:bg-[#7C3AED]/5 transition-colors">
                        Track Delivery
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Footer Actions */}
              <div className="flex items-center justify-between p-6 border-t border-gray-100 bg-gray-50 rounded-b-2xl">
                <div className="flex gap-2">
                  {(order.status === 'draft' || order.status === 'sent') && (
                    <button
                      onClick={() => handleUpdateStatus('cancelled')}
                      disabled={actionLoading}
                      className="px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                    >
                      Cancel Order
                    </button>
                  )}
                </div>

                <div className="flex gap-2">
                  {order.status === 'confirmed' && (
                    <button
                      onClick={() => handleUpdateStatus('processing')}
                      disabled={actionLoading}
                      className="px-4 py-2 text-sm font-medium text-white bg-[#7C3AED] hover:bg-[#6D28D9] rounded-lg transition-colors disabled:opacity-50"
                    >
                      Start Processing
                    </button>
                  )}
                  {order.status === 'processing' && (
                    <button
                      onClick={() => handleUpdateStatus('shipped')}
                      disabled={actionLoading}
                      className="px-4 py-2 text-sm font-medium text-white bg-[#7C3AED] hover:bg-[#6D28D9] rounded-lg transition-colors disabled:opacity-50"
                    >
                      Mark as Shipped
                    </button>
                  )}
                  {order.status === 'shipped' && (
                    <button
                      onClick={() => handleUpdateStatus('delivered')}
                      disabled={actionLoading}
                      className="px-4 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-lg transition-colors disabled:opacity-50"
                    >
                      Mark as Received
                    </button>
                  )}
                </div>
              </div>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}
