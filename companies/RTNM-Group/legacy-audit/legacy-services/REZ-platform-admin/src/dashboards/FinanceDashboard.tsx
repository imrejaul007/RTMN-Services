/**
 * REZ Platform Admin - Dashboard Components
 *
 * Role-specific dashboards for each C-Suite role
 */

import React from 'react';
import { Line, Bar, Doughnut } from 'recharts';

// ============================================
// CFO DASHBOARD - Finance
// ============================================

export const CFODashboard = () => (
  <div className="space-y-6">
    {/* Revenue Overview */}
    <div className="grid grid-cols-4 gap-6">
      <MetricCard title="Total Revenue" value="₹4.58 Cr" change={15.3} trend="up" />
      <MetricCard title="This Month" value="₹48.5 L" change={12.1} trend="up" />
      <MetricCard title="Target" value="₹50 L" change={-3} trend="down" />
      <MetricCard title="Run Rate" value="₹58 Cr" change={22} trend="up" />
    </div>

    {/* Revenue Trend */}
    <div className="bg-white p-6 rounded-lg shadow">
      <h2 className="text-lg font-semibold mb-4">Revenue Trend (12 months)</h2>
      <Line data={revenueTrendData} />
    </div>

    {/* By Company */}
    <div className="grid grid-cols-2 gap-6">
      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-lg font-semibold mb-4">Revenue by Company</h2>
        <Bar data={companyRevenueData} />
      </div>
      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-lg font-semibold mb-4">Revenue Mix</h2>
        <Doughnut data={revenueMixData} />
      </div>
    </div>

    {/* Financial KPIs */}
    <div className="bg-white p-6 rounded-lg shadow">
      <h2 className="text-lg font-semibold mb-4">Key Financial Metrics</h2>
      <table className="w-full">
        <thead className="bg-gray-50">
          <tr>
            <th>Metric</th>
            <th>Value</th>
            <th>Target</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          <tr><td>Gross Margin</td><td>42%</td><td>40%</td><td className="text-green-600">On Track</td></tr>
          <tr><td>Net Margin</td><td>18%</td><td>20%</td><td className="text-yellow-600">Watch</td></tr>
          <tr><td>Burn Rate</td><td>₹15 L/mo</td><td>₹14 L</td><td className="text-red-600">Over Budget</td></tr>
          <tr><td>Cash Runway</td><td>24 months</td><td>18 months</td><td className="text-green-600">Healthy</td></tr>
        </tbody>
      </table>
    </div>
  </div>
);

// ============================================
// CTO DASHBOARD - Technology
// ============================================

export const CTODashboard = () => (
  <div className="space-y-6">
    {/* System Health */}
    <div className="grid grid-cols-4 gap-6">
      <MetricCard title="Services Online" value="169" change={2} trend="up" />
      <MetricCard title="Avg Latency" value="45ms" change={-12} trend="up" />
      <MetricCard title="Uptime" value="99.95%" change={0.02} trend="up" />
      <MetricCard title="Open Incidents" value="3" change={-2} trend="up" />
    </div>

    {/* Service Health Grid */}
    <div className="grid grid-cols-3 gap-4">
      {services.map((svc, i) => (
        <ServiceCard key={i} service={svc} />
      ))}
    </div>

    {/* Deployment Pipeline */}
    <div className="bg-white p-6 rounded-lg shadow">
      <h2 className="text-lg font-semibold mb-4">Recent Deployments</h2>
      <table className="w-full">
        <thead className="bg-gray-50">
          <tr><th>Service</th><th>Version</th><th>Status</th><th>Deployed</th></tr>
        </thead>
        <tbody>
          <tr><td>verify-qr</td><td>v2.0.5</td><td className="text-green-600">Success</td><td>2h ago</td></tr>
          <tr><td>auth-service</td><td>v1.8.2</td><td className="text-green-600">Success</td><td>5h ago</td></tr>
          <tr><td>cdp-service</td><td>v3.1.0</td><td className="text-yellow-600">Rolling</td><td>In progress</td></tr>
        </tbody>
      </table>
    </div>

    {/* Tech Metrics */}
    <div className="grid grid-cols-2 gap-6">
      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-lg font-semibold mb-4">Error Rate Trend</h2>
        <Line data={errorRateData} />
      </div>
      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-lg font-semibold mb-4">API Calls by Service</h2>
        <Bar data={apiCallsData} />
      </div>
    </div>
  </div>
);

// ============================================
// CMO DASHBOARD - Marketing
// ============================================

export const CMODashboard = () => (
  <div className="space-y-6">
    {/* Marketing KPIs */}
    <div className="grid grid-cols-4 gap-6">
      <MetricCard title="Active Campaigns" value="12" change={3} trend="up" />
      <MetricCard title="Total Reach" value="45L" change={22} trend="up" />
      <MetricCard title="Conversions" value="8.5K" change={18} trend="up" />
      <MetricCard title="ROI" value="312%" change={45} trend="up" />
    </div>

    {/* Karma Program */}
    <div className="bg-white p-6 rounded-lg shadow">
      <h2 className="text-lg font-semibold mb-4">Karma Program Stats</h2>
      <div className="grid grid-cols-4 gap-4">
        <div className="text-center p-4 bg-gray-50 rounded">
          <p className="text-3xl font-bold text-blue-600">25L</p>
          <p className="text-sm text-gray-500">Total Points Issued</p>
        </div>
        <div className="text-center p-4 bg-gray-50 rounded">
          <p className="text-3xl font-bold text-green-600">45K</p>
          <p className="text-sm text-gray-500">Active Users</p>
        </div>
        <div className="text-center p-4 bg-gray-50 rounded">
          <p className="text-3xl font-bold text-purple-600">₹12L</p>
          <p className="text-sm text-gray-500">Rewards Redeemed</p>
        </div>
        <div className="text-center p-4 bg-gray-50 rounded">
          <p className="text-3xl font-bold text-orange-600">68%</p>
          <p className="text-sm text-gray-500">Redemption Rate</p>
        </div>
      </div>
    </div>

    {/* Campaigns */}
    <div className="bg-white p-6 rounded-lg shadow">
      <h2 className="text-lg font-semibold mb-4">Active Campaigns</h2>
      <div className="space-y-4">
        {campaigns.map((camp, i) => (
          <CampaignCard key={i} campaign={camp} />
        ))}
      </div>
    </div>

    {/* Funnel */}
    <div className="grid grid-cols-2 gap-6">
      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-lg font-semibold mb-4">Marketing Funnel</h2>
        <FunnelChart data={funnelData} />
      </div>
      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-lg font-semibold mb-4">Channel Performance</h2>
        <Bar data={channelData} />
      </div>
    </div>
  </div>
);

// ============================================
// COO DASHBOARD - Operations
// ============================================

export const COODashboard = () => (
  <div className="space-y-6">
    {/* Operations KPIs */}
    <div className="grid grid-cols-4 gap-6">
      <MetricCard title="Orders Today" value="4.5K" change={12} trend="up" />
      <MetricCard title="Fulfillment Rate" value="94.5%" change={2.3} trend="up" />
      <MetricCard title="Avg Delivery" value="2.3 hrs" change={-15} trend="up" />
      <MetricCard title="Pending" value="234" change={-8} trend="up" />
    </div>

    {/* Order Status */}
    <div className="bg-white p-6 rounded-lg shadow">
      <h2 className="text-lg font-semibold mb-4">Order Status</h2>
      <div className="grid grid-cols-5 gap-4">
        <StatusCard status="Pending" count={234} color="yellow" />
        <StatusCard status="Processing" count={567} color="blue" />
        <StatusCard status="Shipped" count={1234} color="purple" />
        <StatusCard status="Delivered" count={2456} color="green" />
        <StatusCard status="Returned" count={45} color="red" />
      </div>
    </div>

    {/* Logistics Map Placeholder */}
    <div className="bg-white p-6 rounded-lg shadow h-96">
      <h2 className="text-lg font-semibold mb-4">Live Logistics Map</h2>
      <div className="h-full bg-gray-100 rounded flex items-center justify-center">
        <p className="text-gray-500">Map visualization component</p>
      </div>
    </div>
  </div>
);

// ============================================
// CHRO DASHBOARD - Human Resources
// ============================================

export const CHRODashboard = () => (
  <div className="space-y-6">
    {/* HR KPIs */}
    <div className="grid grid-cols-4 gap-6">
      <MetricCard title="Total Employees" value="456" change={5} trend="up" />
      <MetricCard title="Open Positions" value="23" change={-3} trend="up" />
      <MetricCard title="Turnover" value="8.5%" change={-2} trend="up" />
      <MetricCard title="Satisfaction" value="94%" change={3} trend="up" />
    </div>

    {/* Headcount by Department */}
    <div className="grid grid-cols-2 gap-6">
      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-lg font-semibold mb-4">Headcount by Department</h2>
        <Bar data={departmentData} />
      </div>
      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-lg font-semibold mb-4">Hiring Pipeline</h2>
        <div className="space-y-4">
          <HiringStage stage="Applied" count={1234} color="gray" />
          <HiringStage stage="Screening" count={456} color="blue" />
          <HiringStage stage="Interview" count={123} color="yellow" />
          <HiringStage stage="Offer" count={45} color="green" />
          <HiringStage stage="Joined" count={23} color="green" />
        </div>
      </div>
    </div>
  </div>
);

// ============================================
// CAIO DASHBOARD - Chief AI Officer
// ============================================

export const CAIODashboard = () => (
  <div className="space-y-6">
    {/* AI KPIs */}
    <div className="grid grid-cols-4 gap-6">
      <MetricCard title="Active Models" value="12" change={2} trend="up" />
      <MetricCard title="Avg Accuracy" value="94.5%" change={1.2} trend="up" />
      <MetricCard title="Predictions/Day" value="2.5M" change={35} trend="up" />
      <MetricCard title="Active Experiments" value="8" change={3} trend="up" />
    </div>

    {/* Model Performance */}
    <div className="bg-white p-6 rounded-lg shadow">
      <h2 className="text-lg font-semibold mb-4">Model Performance</h2>
      <table className="w-full">
        <thead className="bg-gray-50">
          <tr><th>Model</th><th>Status</th><th>Accuracy</th><th>Last Updated</th></tr>
        </thead>
        <tbody>
          <tr><td>Intent Predictor</td><td className="text-green-600">Deployed</td><td>94.2%</td><td>2h ago</td></tr>
          <tr><td>Fraud Detector</td><td className="text-green-600">Deployed</td><td>97.1%</td><td>1d ago</td></tr>
          <tr><td>Churn Predictor</td><td className="text-blue-600">Training</td><td>91.8%</td><td>In progress</td></tr>
          <tr><td>Recommender</td><td className="text-green-600">Deployed</td><td>89.5%</td><td>3d ago</td></tr>
        </tbody>
      </table>
    </div>

    {/* A/B Experiments */}
    <div className="bg-white p-6 rounded-lg shadow">
      <h2 className="text-lg font-semibold mb-4">Active Experiments</h2>
      <div className="space-y-4">
        <ExperimentCard
          name="Pricing Model v2"
          status="Running"
          lift="+12%"
          confidence="95%"
        />
        <ExperimentCard
          name="Recommend Algorithm"
          status="Running"
          lift="+8.5%"
          confidence="89%"
        />
        <ExperimentCard
          name="Fraud Threshold"
          status="Draft"
          lift="TBD"
          confidence="N/A"
        />
      </div>
    </div>
  </div>
);

// ============================================
// SHARED COMPONENTS
// ============================================

const MetricCard = ({ title, value, change, trend }: any) => (
  <div className="bg-white p-6 rounded-lg shadow">
    <p className="text-gray-500 text-sm">{title}</p>
    <p className="text-3xl font-bold">{value}</p>
    <p className={`text-sm ${trend === 'up' ? 'text-green-600' : 'text-red-600'}`}>
      {change > 0 ? '+' : ''}{change}%
    </p>
  </div>
);

const ServiceCard = ({ service }: any) => (
  <div className="bg-white p-4 rounded-lg shadow">
    <div className="flex justify-between items-center">
      <div>
        <p className="font-semibold">{service.name}</p>
        <p className="text-sm text-gray-500">{service.company}</p>
      </div>
      <StatusBadge status={service.status} />
    </div>
    <div className="mt-4 flex justify-between text-sm text-gray-500">
      <span>Latency: {service.latency}ms</span>
      <span>Uptime: {service.uptime}%</span>
    </div>
  </div>
);

const StatusBadge = ({ status }: { status: string }) => {
  const colors: Record<string, string> = {
    healthy: 'bg-green-100 text-green-800',
    running: 'bg-green-100 text-green-800',
    deployed: 'bg-green-100 text-green-800',
    warning: 'bg-yellow-100 text-yellow-800',
    error: 'bg-red-100 text-red-800',
    training: 'bg-blue-100 text-blue-800',
    draft: 'bg-gray-100 text-gray-800'
  };
  return (
    <span className={`px-2 py-1 rounded text-xs ${colors[status] || 'bg-gray-100'}`}>
      {status}
    </span>
  );
};

const CampaignCard = ({ campaign }: any) => (
  <div className="border rounded-lg p-4">
    <div className="flex justify-between">
      <div>
        <p className="font-semibold">{campaign.name}</p>
        <p className="text-sm text-gray-500">{campaign.type}</p>
      </div>
      <StatusBadge status={campaign.status} />
    </div>
    <div className="mt-4">
      <div className="flex justify-between text-sm mb-1">
        <span>Budget: ₹{campaign.budget?.toLocaleString()}</span>
        <span>{Math.round(campaign.spent / campaign.budget * 100)}%</span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-2">
        <div
          className="bg-blue-600 h-2 rounded-full"
          style={{ width: `${(campaign.spent / campaign.budget * 100) + '%' }}
        />
      </div>
    </div>
  </div>
);

// Sample data
const revenueTrendData = {
  labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
  datasets: [{ data: [38, 42, 40, 45, 44, 48] }]
};

const companyRevenueData = {
  labels: ['RABTUL', 'Consumer', 'Merchant', 'Media'],
  datasets: [{ data: [15, 18, 12, 8.5] }]
};

const revenueMixData = {
  labels: ['Services', 'Subscriptions', 'Ads', 'Enterprise'],
  datasets: [{ data: [35, 25, 20, 20] }]
};

const services = [
  { name: 'verify-qr', company: 'REZ-Consumer', status: 'healthy', latency: 45, uptime: 99.9 },
  { name: 'auth-service', company: 'RABTUL', status: 'healthy', latency: 32, uptime: 99.95 },
  { name: 'cdp-service', company: 'REZ-Intelligence', status: 'warning', latency: 120, uptime: 98.5 }
];

const campaigns = [
  { name: 'Summer Sale', type: 'Promotional', status: 'running', budget: 500000, spent: 320000 },
  { name: 'New User Acquisition', type: 'Growth', status: 'running', budget: 250000, spent: 180000 }
];

const funnelData = { /* funnel chart data */ };
const channelData = { /* channel performance data */ };
const departmentData = { /* department headcount data */ };

const ExperimentCard = ({ name, status, lift, confidence }: any) => (
  <div className="border rounded-lg p-4">
    <div className="flex justify-between">
      <p className="font-semibold">{name}</p>
      <StatusBadge status={status.toLowerCase()} />
    </div>
    <div className="flex gap-4 mt-2 text-sm text-gray-500">
      <span>Lift: {lift}</span>
      <span>Confidence: {confidence}</span>
    </div>
  </div>
);

export {
  MetricCard,
  ServiceCard,
  StatusBadge,
  CampaignCard,
  ExperimentCard
};
