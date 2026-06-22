'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

// Mock data types
interface Order {
  id: string;
  orderNumber: string;
  merchantName: string;
  itemsCount: number;
  totalValue: number;
  status: 'new' | 'confirmed' | 'processing' | 'shipped' | 'completed';
  createdAt: string;
}

interface RFQ {
  id: string;
  rfqNumber: string;
  title: string;
  merchantName: string;
  quantity: number;
  unit: string;
  targetPrice?: number;
  expiresAt: string;
}

interface SupplierScore {
  overallScore: number;
  onTimeDeliveryRate: number;
  qualityRejectionRate: number;
  responseRate: number;
}

// Mock data
const mockOrders: Order[] = [
  {
    id: '1',
    orderNumber: 'PO-2024-001234',
    merchantName: 'Spice Garden Restaurant',
    itemsCount: 12,
    totalValue: 45680,
    status: 'new',
    createdAt: '2024-01-15T10:30:00Z',
  },
  {
    id: '2',
    orderNumber: 'PO-2024-001233',
    merchantName: 'Hotel Sunrise',
    itemsCount: 8,
    totalValue: 32450,
    status: 'confirmed',
    createdAt: '2024-01-14T14:20:00Z',
  },
  {
    id: '3',
    orderNumber: 'PO-2024-001232',
    merchantName: 'Cafe Mocha',
    itemsCount: 5,
    totalValue: 18750,
    status: 'processing',
    createdAt: '2024-01-13T09:15:00Z',
  },
  {
    id: '4',
    orderNumber: 'PO-2024-001231',
    merchantName: 'Taj Banquet Hall',
    itemsCount: 20,
    totalValue: 89400,
    status: 'shipped',
    createdAt: '2024-01-12T16:45:00Z',
  },
  {
    id: '5',
    orderNumber: 'PO-2024-001230',
    merchantName: 'Urban Kitchen',
    itemsCount: 7,
    totalValue: 28900,
    status: 'completed',
    createdAt: '2024-01-10T11:00:00Z',
  },
];

const mockRFQs: RFQ[] = [
  {
    id: '1',
    rfqNumber: 'RFQ-2024-000089',
    title: 'Organic Basmati Rice - Premium Grade',
    merchantName: 'Spice Garden Restaurant',
    quantity: 500,
    unit: 'kg',
    targetPrice: 85,
    expiresAt: '2024-01-20T23:59:59Z',
  },
  {
    id: '2',
    rfqNumber: 'RFQ-2024-000088',
    title: 'Cold Pressed Mustard Oil',
    merchantName: 'Hotel Sunrise',
    quantity: 100,
    unit: 'liters',
    targetPrice: 180,
    expiresAt: '2024-01-22T23:59:59Z',
  },
  {
    id: '3',
    rfqNumber: 'RFQ-2024-000087',
    title: 'Fresh Green Peas - Frozen',
    merchantName: 'Cafe Mocha',
    quantity: 200,
    unit: 'kg',
    expiresAt: '2024-01-25T23:59:59Z',
  },
];

const mockScore: SupplierScore = {
  overallScore: 4.2,
  onTimeDeliveryRate: 95,
  qualityRejectionRate: 2,
  responseRate: 98,
};

const stats = [
  {
    label: 'Active Orders',
    value: '12',
    change: '+3',
    trend: 'up',
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
      </svg>
    ),
  },
  {
    label: 'Pending RFQs',
    value: '8',
    change: '+2',
    trend: 'up',
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
      </svg>
    ),
  },
  {
    label: 'This Month Revenue',
    value: '₹4.8L',
    change: '+12%',
    trend: 'up',
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
  {
    label: 'Avg Rating',
    value: '4.2',
    change: '+0.3',
    trend: 'up',
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
      </svg>
    ),
  },
];

const quickActions = [
  {
    label: 'View Incoming Orders',
    href: '/dashboard/orders',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
      </svg>
    ),
  },
  {
    label: 'Respond to RFQs',
    href: '/dashboard/rfqs',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
      </svg>
    ),
  },
  {
    label: 'Update Products',
    href: '/dashboard/products',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
      </svg>
    ),
  },
  {
    label: 'View Performance',
    href: '/dashboard/performance',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    ),
  },
];

const statusColors: Record<string, string> = {
  new: 'bg-blue-100 text-blue-800',
  confirmed: 'bg-purple-100 text-purple-800',
  processing: 'bg-yellow-100 text-yellow-800',
  shipped: 'bg-indigo-100 text-indigo-800',
  completed: 'bg-green-100 text-green-800',
};

const statusLabels: Record<string, string> = {
  new: 'New',
  confirmed: 'Confirmed',
  processing: 'Processing',
  shipped: 'Shipped',
  completed: 'Completed',
};

export default function SupplierDashboard() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

  useEffect(() => {
    // Check auth state from session/token
    const checkAuth = async () => {
      // Check for valid auth token in localStorage
      const token = localStorage.getItem('supplier_token');
      if (token) {
        // In production, validate token with auth service
        setIsAuthenticated(true);
      } else {
        setIsAuthenticated(false);
      }
    };
    checkAuth();
  }, []);

  if (isAuthenticated === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    if (typeof window !== 'undefined') {
      window.location.href = '/';
    }
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <p className="text-gray-600">Redirecting to login...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Dashboard Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-purple-600 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-sm">NB</span>
                </div>
                <span className="text-xl font-bold text-gray-900">NextaBizz</span>
                <span className="px-2 py-0.5 text-xs font-medium bg-purple-100 text-purple-700 rounded">
                  Supplier
                </span>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <button className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
              </button>
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-purple-600 rounded-full flex items-center justify-center">
                  <span className="text-white font-semibold text-sm">FS</span>
                </div>
                <div className="hidden sm:block">
                  <div className="text-sm font-medium text-gray-900">FreshFarm Supplies</div>
                  <div className="text-xs text-gray-500">Verified Supplier</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Navigation */}
      <nav className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex space-x-8">
            <Link href="/dashboard" className="border-b-2 border-purple-600 text-purple-600 py-4 px-1 text-sm font-medium">
              Dashboard
            </Link>
            <Link href="/dashboard/orders" className="border-b-2 border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 py-4 px-1 text-sm font-medium">
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
          <h1 className="text-2xl font-bold text-gray-900">Supplier Dashboard</h1>
          <p className="mt-1 text-sm text-gray-600">Welcome back! Here&apos;s an overview of your business.</p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {stats.map((stat, index) => (
            <div key={index} className="bg-white rounded-xl border border-gray-200 p-6">
              <div className="flex items-center justify-between">
                <div className="p-2 bg-purple-100 rounded-lg text-purple-600">
                  {stat.icon}
                </div>
                <div className={`flex items-center text-sm font-medium ${stat.trend === 'up' ? 'text-green-600' : 'text-red-600'}`}>
                  {stat.trend === 'up' ? (
                    <svg className="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
                    </svg>
                  ) : (
                    <svg className="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                    </svg>
                  )}
                  {stat.change}
                </div>
              </div>
              <div className="mt-4">
                <div className="text-3xl font-bold text-gray-900">{stat.value}</div>
                <div className="text-sm text-gray-500 mt-1">{stat.label}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Quick Actions */}
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {quickActions.map((action, index) => (
              <Link
                key={index}
                href={action.href}
                className="flex flex-col items-center p-4 bg-white rounded-xl border border-gray-200 hover:border-purple-200 hover:shadow-md transition-all"
              >
                <div className="p-3 bg-purple-50 rounded-lg text-purple-600 mb-3">
                  {action.icon}
                </div>
                <span className="text-sm font-medium text-gray-900 text-center">{action.label}</span>
              </Link>
            ))}
          </div>
        </div>

        {/* Recent Orders */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Recent Orders</h2>
            <Link href="/dashboard/orders" className="text-sm font-medium text-purple-600 hover:text-purple-700">
              View all
            </Link>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Order</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Merchant</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Items</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Value</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {mockOrders.slice(0, 5).map((order) => (
                  <tr key={order.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-purple-600">
                      {order.orderNumber}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {order.merchantName}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {order.itemsCount} items
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-medium">
                      ₹{(order.totalValue / 100000).toFixed(2)}L
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${statusColors[order.status]}`}>
                        {statusLabels[order.status]}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(order.createdAt).toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric'
                      })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Open RFQs */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Open RFQs</h2>
              <Link href="/dashboard/rfqs" className="text-sm font-medium text-purple-600 hover:text-purple-700">
                View all
              </Link>
            </div>
            <div className="space-y-4">
              {mockRFQs.map((rfq) => (
                <div key={rfq.id} className="bg-white rounded-xl border border-gray-200 p-4 hover:border-purple-200 transition-colors">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2">
                        <span className="text-xs font-medium text-purple-600">{rfq.rfqNumber}</span>
                        <span className="px-2 py-0.5 bg-blue-100 text-blue-800 text-xs rounded-full">
                          Open
                        </span>
                      </div>
                      <h3 className="mt-1 text-sm font-medium text-gray-900">{rfq.title}</h3>
                      <p className="mt-1 text-xs text-gray-500">by {rfq.merchantName}</p>
                      <div className="mt-2 flex items-center space-x-4 text-xs text-gray-600">
                        <span>{rfq.quantity} {rfq.unit}</span>
                        {rfq.targetPrice && <span>Target: ₹{rfq.targetPrice}/{rfq.unit}</span>}
                      </div>
                    </div>
                    <Link
                      href={`/dashboard/rfqs?quote=${rfq.id}`}
                      className="px-3 py-1.5 bg-purple-600 text-white text-xs font-medium rounded-lg hover:bg-purple-700 transition-colors"
                    >
                      Quote
                    </Link>
                  </div>
                  <div className="mt-3 pt-3 border-t border-gray-100">
                    <p className="text-xs text-gray-500">
                      Expires: {new Date(rfq.expiresAt).toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric'
                      })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Performance Score Card */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Performance Score</h2>
              <Link href="/dashboard/performance" className="text-sm font-medium text-purple-600 hover:text-purple-700">
                Details
              </Link>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <div className="text-4xl font-bold text-gray-900">{mockScore.overallScore.toFixed(1)}</div>
                  <div className="text-sm text-gray-500 mt-1">out of 5.0</div>
                </div>
                <div className="px-3 py-1 bg-yellow-100 text-yellow-800 text-sm font-medium rounded-full">
                  Gold Tier
                </div>
              </div>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-600">On-Time Delivery</span>
                    <span className="font-medium text-gray-900">{mockScore.onTimeDeliveryRate}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-green-500 h-2 rounded-full"
                      style={{ width: `${mockScore.onTimeDeliveryRate}%` }}
                    ></div>
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-600">Quality (Rejection Rate)</span>
                    <span className="font-medium text-gray-900">{mockScore.qualityRejectionRate}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-green-500 h-2 rounded-full"
                      style={{ width: `${100 - mockScore.qualityRejectionRate}%` }}
                    ></div>
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-600">Response Rate</span>
                    <span className="font-medium text-gray-900">{mockScore.responseRate}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-green-500 h-2 rounded-full"
                      style={{ width: `${mockScore.responseRate}%` }}
                    ></div>
                  </div>
                </div>
              </div>
              <div className="mt-6 pt-6 border-t border-gray-100">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Credit Boost</span>
                  <span className="text-sm font-medium text-green-600">+0.5 points</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
