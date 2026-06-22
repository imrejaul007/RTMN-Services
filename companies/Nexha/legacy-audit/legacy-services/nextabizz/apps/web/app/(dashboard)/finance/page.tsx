'use client';

import { useState, useEffect, useCallback } from 'react';
import type { PurchaseOrder, PaymentStatus } from '@nextabizz/shared-types';

interface CreditLine {
  creditLimit: number;
  utilized: number;
  available: number;
  tenorDays: number;
  bnplEnabled: boolean;
}

interface OutstandingPayment {
  orderId: string;
  orderNumber: string;
  supplierName: string;
  amount: number;
  dueDate: Date;
  status: PaymentStatus;
  paymentMethod: string;
}

interface PaymentHistoryItem {
  id: string;
  orderNumber: string;
  supplierName: string;
  amount: number;
  paidAt: Date;
  method: string;
}

// Mock data
const mockCreditLine: CreditLine = {
  creditLimit: 500000,
  utilized: 125000,
  available: 375000,
  tenorDays: 30,
  bnplEnabled: true,
};

const mockOutstandingPayments: OutstandingPayment[] = [
  {
    orderId: 'po-1',
    orderNumber: 'PO-2024-0001',
    supplierName: 'Fresh Foods Distributors',
    amount: 15400,
    dueDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000),
    status: 'pending',
    paymentMethod: 'net-terms',
  },
  {
    orderId: 'po-2',
    orderNumber: 'PO-2024-0006',
    supplierName: 'Premium Spices Co.',
    amount: 28000,
    dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    status: 'pending',
    paymentMethod: 'net-terms',
  },
  {
    orderId: 'po-3',
    orderNumber: 'PO-2024-0007',
    supplierName: 'Quality Provisions Ltd.',
    amount: 15000,
    dueDate: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
    status: 'pending',
    paymentMethod: 'bnpl',
  },
];

const mockPaymentHistory: PaymentHistoryItem[] = [
  {
    id: 'pay-1',
    orderNumber: 'PO-2024-0002',
    supplierName: 'Premium Spices Co.',
    amount: 8500,
    paidAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
    method: 'UPI',
  },
  {
    id: 'pay-2',
    orderNumber: 'PO-2024-0003',
    supplierName: 'Fresh Foods Distributors',
    amount: 22000,
    paidAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
    method: 'Net Banking',
  },
  {
    id: 'pay-3',
    orderNumber: 'PO-2024-0004',
    supplierName: 'Quality Provisions Ltd.',
    amount: 12500,
    paidAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000),
    method: 'UPI',
  },
  {
    id: 'pay-4',
    orderNumber: 'PO-2024-0005',
    supplierName: 'Fresh Foods Distributors',
    amount: 5600,
    paidAt: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000),
    method: 'BNPL',
  },
];

function formatDate(date: Date | string): string {
  return new Date(date).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function getDaysUntilDue(dueDate: Date): { days: number; isOverdue: boolean } {
  const now = new Date();
  const diff = new Date(dueDate).getTime() - now.getTime();
  const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
  return { days, isOverdue: days < 0 };
}

export default function FinancePage() {
  const [creditLine, setCreditLine] = useState<CreditLine | null>(null);
  const [outstandingPayments, setOutstandingPayments] = useState<OutstandingPayment[]>([]);
  const [paymentHistory, setPaymentHistory] = useState<PaymentHistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState<'outstanding' | 'history'>('outstanding');

  const fetchFinanceData = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      await new Promise(resolve => setTimeout(resolve, 500));

      setCreditLine(mockCreditLine);
      setOutstandingPayments(mockOutstandingPayments);
      setPaymentHistory(mockPaymentHistory);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load finance data');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchFinanceData();
  }, [fetchFinanceData]);

  const handlePayNow = (orderId: string) => {
    // Future: Integrate with Razorpay/UPI
    alert('Payment integration coming soon!');
  };

  const utilizationPercentage = creditLine
    ? Math.round((creditLine.utilized / creditLine.creditLimit) * 100)
    : 0;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-8 bg-gray-200 rounded w-1/4 animate-pulse" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1 h-64 bg-gray-200 rounded-xl animate-pulse" />
          <div className="lg:col-span-2 h-64 bg-gray-200 rounded-xl animate-pulse" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
        <p className="text-red-700 font-medium">{error}</p>
        <button
          onClick={fetchFinanceData}
          className="mt-3 px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700"
        >
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Finance</h1>
        <p className="text-sm text-gray-500 mt-1">
          Manage your credit line and track payments
        </p>
      </div>

      {/* Credit Line Card */}
      {creditLine && (
        <div className="bg-gradient-to-br from-[#7C3AED] to-[#6D28D9] rounded-2xl p-6 text-white">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-lg font-semibold opacity-90">Credit Line</h2>
              <p className="text-sm opacity-75 mt-1">Available for purchases</p>
            </div>
            {creditLine.bnplEnabled && (
              <span className="inline-flex items-center px-3 py-1 rounded-full bg-white/20 text-xs font-medium">
                BNPL Enabled
              </span>
            )}
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
            <div>
              <p className="text-sm opacity-75">Available Credit</p>
              <p className="text-3xl font-bold mt-1">
                ₹{creditLine.available.toLocaleString('en-IN')}
              </p>
            </div>
            <div>
              <p className="text-sm opacity-75">Credit Limit</p>
              <p className="text-2xl font-semibold mt-1">
                ₹{creditLine.creditLimit.toLocaleString('en-IN')}
              </p>
            </div>
            <div>
              <p className="text-sm opacity-75">Utilized</p>
              <p className="text-2xl font-semibold mt-1">
                ₹{creditLine.utilized.toLocaleString('en-IN')}
              </p>
            </div>
            <div>
              <p className="text-sm opacity-75">Tenor Days</p>
              <p className="text-2xl font-semibold mt-1">
                {creditLine.tenorDays} days
              </p>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="mt-6">
            <div className="flex items-center justify-between text-sm mb-2">
              <span>Credit Utilization</span>
              <span>{utilizationPercentage}%</span>
            </div>
            <div className="h-3 bg-white/20 rounded-full overflow-hidden">
              <div
                className="h-full bg-white rounded-full transition-all duration-500"
                style={{ width: `${utilizationPercentage}%` }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-sm text-gray-500">Outstanding</p>
          <p className="text-xl font-bold text-gray-900 mt-1">
            ₹{outstandingPayments.reduce((sum, p) => sum + p.amount, 0).toLocaleString('en-IN')}
          </p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-sm text-gray-500">Due This Week</p>
          <p className="text-xl font-bold text-amber-600 mt-1">
            ₹{outstandingPayments
              .filter(p => {
                const { days } = getDaysUntilDue(p.dueDate);
                return days <= 7 && days >= 0;
              })
              .reduce((sum, p) => sum + p.amount, 0)
              .toLocaleString('en-IN')}
          </p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-sm text-gray-500">Overdue</p>
          <p className="text-xl font-bold text-red-600 mt-1">
            ₹{outstandingPayments
              .filter(p => getDaysUntilDue(p.dueDate).isOverdue)
              .reduce((sum, p) => sum + p.amount, 0)
              .toLocaleString('en-IN')}
          </p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-sm text-gray-500">Paid (This Month)</p>
          <p className="text-xl font-bold text-green-600 mt-1">
            ₹{paymentHistory
              .filter(p => {
                const paidDate = new Date(p.paidAt);
                const now = new Date();
                return paidDate.getMonth() === now.getMonth() && paidDate.getFullYear() === now.getFullYear();
              })
              .reduce((sum, p) => sum + p.amount, 0)
              .toLocaleString('en-IN')}
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex gap-8">
          <button
            onClick={() => setActiveSection('outstanding')}
            className={`
              pb-3 text-sm font-medium border-b-2 transition-colors
              ${activeSection === 'outstanding'
                ? 'border-[#7C3AED] text-[#7C3AED]'
                : 'border-transparent text-gray-500 hover:text-gray-700'}
            `}
          >
            Outstanding Payments ({outstandingPayments.length})
          </button>
          <button
            onClick={() => setActiveSection('history')}
            className={`
              pb-3 text-sm font-medium border-b-2 transition-colors
              ${activeSection === 'history'
                ? 'border-[#7C3AED] text-[#7C3AED]'
                : 'border-transparent text-gray-500 hover:text-gray-700'}
            `}
          >
            Payment History
          </button>
        </nav>
      </div>

      {/* Outstanding Payments Table */}
      {activeSection === 'outstanding' && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          {outstandingPayments.length === 0 ? (
            <div className="p-12 text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">All caught up!</h3>
              <p className="text-gray-500">No outstanding payments at the moment.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Order
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Supplier
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Amount
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Due Date
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Method
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {outstandingPayments.map(payment => {
                    const { days, isOverdue } = getDaysUntilDue(payment.dueDate);
                    return (
                      <tr key={payment.orderId} className="hover:bg-gray-50">
                        <td className="px-4 py-3">
                          <span className="font-medium text-[#7C3AED]">{payment.orderNumber}</span>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900">
                          {payment.supplierName}
                        </td>
                        <td className="px-4 py-3 text-right text-sm font-medium text-gray-900">
                          ₹{payment.amount.toLocaleString('en-IN')}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-gray-900">{formatDate(payment.dueDate)}</span>
                            {isOverdue ? (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">
                                {Math.abs(days)} days overdue
                              </span>
                            ) : days <= 7 ? (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700">
                                Due in {days} days
                              </span>
                            ) : null}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700 capitalize">
                            {payment.paymentMethod}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button
                            onClick={() => handlePayNow(payment.orderId)}
                            className="px-4 py-1.5 bg-[#7C3AED] text-white text-sm font-medium rounded-lg hover:bg-[#6D28D9] transition-colors"
                          >
                            Pay Now
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Payment History Table */}
      {activeSection === 'history' && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          {paymentHistory.length === 0 ? (
            <div className="p-12 text-center">
              <p className="text-gray-500">No payment history yet.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Order
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Supplier
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Amount
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Paid On
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Method
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {paymentHistory.map(payment => (
                    <tr key={payment.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <span className="font-medium text-gray-900">{payment.orderNumber}</span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900">
                        {payment.supplierName}
                      </td>
                      <td className="px-4 py-3 text-right text-sm font-medium text-green-600">
                        ₹{payment.amount.toLocaleString('en-IN')}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500">
                        {formatDate(payment.paidAt)}
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
                          {payment.method}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Payment Methods Info */}
      <div className="bg-gray-50 rounded-xl p-6">
        <h3 className="font-medium text-gray-900 mb-4">Accepted Payment Methods</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg p-4 text-center">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mx-auto mb-2">
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <p className="text-sm font-medium text-gray-900">UPI</p>
          </div>
          <div className="bg-white rounded-lg p-4 text-center">
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mx-auto mb-2">
              <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
              </svg>
            </div>
            <p className="text-sm font-medium text-gray-900">Net Banking</p>
          </div>
          <div className="bg-white rounded-lg p-4 text-center">
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mx-auto mb-2">
              <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <p className="text-sm font-medium text-gray-900">BNPL</p>
          </div>
          <div className="bg-white rounded-lg p-4 text-center">
            <div className="w-12 h-12 bg-amber-100 rounded-lg flex items-center justify-center mx-auto mb-2">
              <svg className="w-6 h-6 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
              </svg>
            </div>
            <p className="text-sm font-medium text-gray-900">Cards</p>
          </div>
        </div>
      </div>
    </div>
  );
}
