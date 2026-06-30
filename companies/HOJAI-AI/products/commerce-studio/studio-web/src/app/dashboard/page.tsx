/**
 * Dashboard Page
 * Post-deployment management for deployed Nexhas
 */

'use client';

import { useEffect, useState } from 'react';
import { ArrowUp, ArrowDown, TrendingUp, Users, DollarSign, Package, Zap } from 'lucide-react';
import { StudioAPI } from '@/lib/api';

export default function DashboardPage() {
  const [nexhaId, setNexhaId] = useState('demo-nexha-001');
  const [dashboard, setDashboard] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboard();
  }, []);

  async function fetchDashboard() {
    setLoading(true);
    try {
      const response = await StudioAPI.getDashboard(nexhaId);
      setDashboard(response.data);
    } catch {
      setDashboard(getMockDashboard());
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="container py-16 text-center text-muted">
        Loading dashboard...
      </div>
    );
  }

  const stats = dashboard?.stats || {};

  return (
    <div className="container py-8">
      <div className="flex-between mb-8">
        <div>
          <h1 className="text-3xl font-bold mb-2">Dashboard</h1>
          <p className="text-muted">Nexha ID: {nexhaId}</p>
        </div>
        <button className="btn btn-outline" onClick={fetchDashboard}>
          🔄 Refresh
        </button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-3 mb-8">
        <StatCard
          icon={<Package size={24} color="#6366f1" />}
          label="Orders"
          value={stats.orders || 0}
          change="+12%"
          trend="up"
        />
        <StatCard
          icon={<DollarSign size={24} color="#10b981" />}
          label="Revenue"
          value={`₹${(stats.revenue || 0).toLocaleString()}`}
          change="+24%"
          trend="up"
        />
        <StatCard
          icon={<Users size={24} color="#f59e0b" />}
          label="Customers"
          value={stats.customers || 0}
          change="+8%"
          trend="up"
        />
        <StatCard
          icon={<Package size={24} color="#8b5cf6" />}
          label="Products"
          value={stats.products || 0}
        />
        <StatCard
          icon={<Users size={24} color="#ef4444" />}
          label="Vendors"
          value={stats.vendors || 0}
        />
        <StatCard
          icon={<DollarSign size={24} color="#06b6d4" />}
          label="Avg Order Value"
          value={`₹${stats.averageOrderValue || 0}`}
        />
      </div>

      {/* Workers Status */}
      <div className="card mb-8">
        <h2 className="text-xl font-bold mb-4">AI Workers Status</h2>
        <div className="grid grid-3">
          {(dashboard?.workers || []).map((w: any) => (
            <div key={w.id} className="card" style={{ background: '#f9fafb' }}>
              <div className="flex-between mb-2">
                <span className="font-semibold">{w.id}</span>
                <span className="badge badge-success">{w.status}</span>
              </div>
              <div className="text-sm text-muted">Tasks today: {w.tasksToday}</div>
              <div className="text-sm text-muted">Uptime: {w.uptime}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Recent Orders */}
      <div className="card mb-8">
        <h2 className="text-xl font-bold mb-4">Recent Orders</h2>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid #e5e7eb' }}>
              <th style={{ textAlign: 'left', padding: '0.75rem' }}>Order ID</th>
              <th style={{ textAlign: 'left', padding: '0.75rem' }}>Customer</th>
              <th style={{ textAlign: 'left', padding: '0.75rem' }}>Amount</th>
              <th style={{ textAlign: 'left', padding: '0.75rem' }}>Status</th>
              <th style={{ textAlign: 'left', padding: '0.75rem' }}>Date</th>
            </tr>
          </thead>
          <tbody>
            {(dashboard?.recentOrders || []).slice(0, 10).map((order: any) => (
              <tr key={order.orderId} style={{ borderBottom: '1px solid #f3f4f6' }}>
                <td style={{ padding: '0.75rem' }}>{order.orderId}</td>
                <td style={{ padding: '0.75rem' }}>{order.customerId}</td>
                <td style={{ padding: '0.75rem' }}>₹{order.amount}</td>
                <td style={{ padding: '0.75rem' }}>
                  <span className="badge badge-accent">{order.status}</span>
                </td>
                <td style={{ padding: '0.75rem' }} className="text-sm text-muted">
                  {new Date(order.placedAt).toLocaleDateString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function StatCard({ icon, label, value, change, trend }: any) {
  return (
    <div className="card">
      <div className="flex-between mb-2">
        <div>{icon}</div>
        {change && (
          <span style={{ color: trend === 'up' ? '#10b981' : '#ef4444', fontSize: '0.875rem', fontWeight: 600 }}>
            {trend === 'up' ? <ArrowUp size={12} /> : <ArrowDown size={12} />}
            {change}
          </span>
        )}
      </div>
      <div className="text-2xl font-bold">{value}</div>
      <div className="text-sm text-muted">{label}</div>
    </div>
  );
}

function getMockDashboard() {
  return {
    stats: {
      orders: 245,
      revenue: 425000,
      customers: 89,
      products: 1240,
      vendors: 32,
      averageOrderValue: 1734,
      conversionRate: '3.4',
    },
    workers: [
      { id: 'chef-worker', status: 'active', tasksToday: 42, uptime: '99.9%' },
      { id: 'procurement-worker', status: 'active', tasksToday: 18, uptime: '99.8%' },
      { id: 'finance-worker', status: 'active', tasksToday: 67, uptime: '100%' },
    ],
    recentOrders: [
      { orderId: 'ORD-001', customerId: 'CUST-1234', amount: 1250, status: 'delivered', placedAt: new Date().toISOString() },
      { orderId: 'ORD-002', customerId: 'CUST-1235', amount: 890, status: 'shipped', placedAt: new Date().toISOString() },
      { orderId: 'ORD-003', customerId: 'CUST-1236', amount: 2340, status: 'processing', placedAt: new Date().toISOString() },
    ],
  };
}