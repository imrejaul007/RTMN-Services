/**
 * REZ Unified Admin Dashboard
 *
 * Single dashboard for entire ecosystem:
 * - Service Health
 * - Customer 360
 * - Revenue Analytics
 * - Cross-company metrics
 */

import React, { useState, useEffect } from 'react';
import { Line, Bar, Doughnut } from 'react-chartjs-2';
import axios from 'axios';

// API base URL
const API = process.env.NEXT_PUBLIC_API || 'https://REZ-unified-admin.onrender.com';

// ============================================
// TYPES
// ============================================

interface ServiceHealth {
  name: string;
  status: 'healthy' | 'degraded' | 'down';
  latency: number;
  uptime: number;
}

interface Customer360 {
  id: string;
  name: string;
  companies: string[];
  karma_points: number;
  lifetime_value: number;
  churn_risk: 'low' | 'medium' | 'high';
  segments: string[];
}

interface Metric {
  label: string;
  value: number;
  change: number;
  trend: 'up' | 'down' | 'neutral';
}

// ============================================
// COMPONENTS
// ============================================

const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
  const colors = {
    healthy: 'bg-green-100 text-green-800',
    degraded: 'bg-yellow-100 text-yellow-800',
    down: 'bg-red-100 text-red-800',
    low: 'bg-green-100 text-green-800',
    medium: 'bg-yellow-100 text-yellow-800',
    high: 'bg-red-100 text-red-800'
  };

  return (
    <span className={`px-2 py-1 rounded text-sm ${colors[status as keyof typeof colors] || 'bg-gray-100'}`}>
      {status}
    </span>
  );
};

const MetricCard: React.FC<{ metric: Metric }> = ({ metric }) => (
  <div className="bg-white p-6 rounded-lg shadow">
    <p className="text-gray-500 text-sm">{metric.label}</p>
    <p className="text-3xl font-bold">{metric.value.toLocaleString()}</p>
    <p className={`text-sm ${metric.trend === 'up' ? 'text-green-600' : metric.trend === 'down' ? 'text-red-600' : 'text-gray-600'}`}>
      {metric.change > 0 ? '+' : ''}{metric.change}%
    </p>
  </div>
);

const ServiceRow: React.FC<{ service: ServiceHealth }> = ({ service }) => (
  <tr className="border-b">
    <td className="p-3">{service.name}</td>
    <td className="p-3"><StatusBadge status={service.status} /></td>
    <td className="p-3">{service.latency}ms</td>
    <td className="p-3">{service.uptime}%</td>
  </tr>
);

const CustomerCard: React.FC<{ customer: Customer360 }> = ({ customer }) => (
  <div className="bg-white p-4 rounded-lg shadow">
    <div className="flex justify-between items-start">
      <div>
        <p className="font-semibold">{customer.name}</p>
        <p className="text-sm text-gray-500">ID: {customer.id}</p>
        <p className="text-sm text-gray-500">{customer.companies.join(', ')}</p>
      </div>
      <StatusBadge status={customer.churn_risk} />
    </div>
    <div className="mt-4 flex justify-between">
      <div>
        <p className="text-sm text-gray-500">Karma Points</p>
        <p className="font-semibold">{customer.karma_points.toLocaleString()}</p>
      </div>
      <div>
        <p className="text-sm text-gray-500">LTV</p>
        <p className="font-semibold">₹{customer.lifetime_value.toLocaleString()}</p>
      </div>
    </div>
  </div>
);

// ============================================
// MAIN COMPONENT
// ============================================

export default function UnifiedDashboard() {
  const [activeTab, setActiveTab] = useState('overview');
  const [services, setServices] = useState<ServiceHealth[]>([]);
  const [customers, setCustomers] = useState<Customer360[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    setLoading(true);
    try {
      // Fetch dashboard data
      const [servicesRes, customersRes] = await Promise.all([
        axios.get(`${API}/api/services/health`),
        axios.get(`${API}/api/customers/top`)
      ]);

      setServices(servicesRes.data.services || []);
      setCustomers(customersRes.data.customers || []);
    } catch (error) {
      console.error('Failed to fetch data:', error);
    }
    setLoading(false);
  }

  // Mock metrics
  const metrics: Metric[] = [
    { label: 'Total Users', value: 125000, change: 12.5, trend: 'up' },
    { label: 'Active Today', value: 15234, change: 8.2, trend: 'up' },
    { label: 'Revenue (₹)', value: 4580000, change: 15.3, trend: 'up' },
    { label: 'Karma Points', value: 25000000, change: 22.1, trend: 'up' }
  ];

  // Mock chart data
  const revenueChart = {
    labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
    datasets: [{
      label: 'Revenue',
      data: [65000, 72000, 68000, 85000, 92000, 78000, 95000],
      borderColor: 'rgb(59, 130, 246)',
      backgroundColor: 'rgba(59, 130, 246, 0.1)'
    }]
  };

  const userChart = {
    labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
    datasets: [{
      label: 'Active Users',
      data: [12000, 13500, 12800, 14200, 15100, 16200, 15234],
      borderColor: 'rgb(34, 197, 94)',
      backgroundColor: 'rgba(34, 197, 94, 0.1)'
    }]
  };

  const segmentsChart = {
    labels: ['VIP', 'Gold', 'Silver', 'Bronze', 'New'],
    datasets: [{
      data: [2500, 8500, 15000, 45000, 52000],
      backgroundColor: ['#FFD700', '#C0C0C0', '#CD7F32', '#8B4513', '#4169E1']
    }]
  };

  const tabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'services', label: 'Services' },
    { id: 'customers', label: 'Customers' },
    { id: 'analytics', label: 'Analytics' }
  ];

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <h1 className="text-2xl font-bold">REZ Unified Admin</h1>
        </div>
      </header>

      {/* Navigation */}
      <nav className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex space-x-8">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-4 px-1 border-b-2 ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </nav>

      {/* Content */}
      <main className="max-w-7xl mx-auto px-4 py-8">
        {loading ? (
          <div className="text-center py-20">Loading...</div>
        ) : (
          <>
            {/* Overview Tab */}
            {activeTab === 'overview' && (
              <div className="space-y-8">
                {/* Metrics */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                  {metrics.map((metric, i) => (
                    <MetricCard key={i} metric={metric} />
                  ))}
                </div>

                {/* Charts */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-white p-6 rounded-lg shadow">
                    <h2 className="text-lg font-semibold mb-4">Revenue (7 days)</h2>
                    <Line data={revenueChart} />
                  </div>
                  <div className="bg-white p-6 rounded-lg shadow">
                    <h2 className="text-lg font-semibold mb-4">Active Users (7 days)</h2>
                    <Line data={userChart} />
                  </div>
                </div>

                {/* Customer Segments */}
                <div className="bg-white p-6 rounded-lg shadow">
                  <h2 className="text-lg font-semibold mb-4">Customer Segments</h2>
                  <div className="w-64 mx-auto">
                    <Doughnut data={segmentsChart} />
                  </div>
                </div>
              </div>
            )}

            {/* Services Tab */}
            {activeTab === 'services' && (
              <div className="bg-white rounded-lg shadow">
                <div className="p-4 border-b">
                  <h2 className="text-lg font-semibold">Service Health</h2>
                </div>
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="p-3 text-left">Service</th>
                      <th className="p-3 text-left">Status</th>
                      <th className="p-3 text-left">Latency</th>
                      <th className="p-3 text-left">Uptime</th>
                    </tr>
                  </thead>
                  <tbody>
                    {services.map((service, i) => (
                      <ServiceRow key={i} service={service} />
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Customers Tab */}
            {activeTab === 'customers' && (
              <div>
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-lg font-semibold">Top Customers</h2>
                  <button className="bg-blue-600 text-white px-4 py-2 rounded">
                    Export
                  </button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {customers.map((customer, i) => (
                    <CustomerCard key={i} customer={customer} />
                  ))}
                </div>
              </div>
            )}

            {/* Analytics Tab */}
            {activeTab === 'analytics' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white p-6 rounded-lg shadow">
                  <h2 className="text-lg font-semibold mb-4">Company Performance</h2>
                  <Bar
                    data={{
                      labels: ['Consumer', 'Merchant', 'Media', 'Hotels', 'CorpPerks'],
                      datasets: [{
                        label: 'Revenue',
                        data: [1800000, 2200000, 950000, 650000, 420000]
                      }]
                    }}
                  />
                </div>
                <div className="bg-white p-6 rounded-lg shadow">
                  <h2 className="text-lg font-semibold mb-4">Service Usage</h2>
                  <Bar
                    data={{
                      labels: ['Verify QR', 'Safe QR', 'Creator QR', 'Ads QR', 'Room QR'],
                      datasets: [{
                        label: 'Scans',
                        data: [45000, 32000, 18000, 25000, 12000]
                      }]
                    }}
                  />
                </div>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
