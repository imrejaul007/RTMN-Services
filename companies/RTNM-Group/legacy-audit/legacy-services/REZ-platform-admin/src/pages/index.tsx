/**
 * REZ Admin - Complete Control Dashboard
 */

import React, { useState } from 'react';

const API = process.env.NEXT_PUBLIC_API || 'http://localhost:4000';

export default function AdminDashboard() {
  const [user, setUser] = useState<any>(null);

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Top Bar */}
      <header className="bg-gray-900 text-white">
        <div className="max-w-7xl mx-auto px-4 py-3 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <span className="text-xl font-bold">REZ Platform Admin</span>
            <span className="px-2 py-1 bg-green-600 rounded text-xs">v2.0</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-400">Super Admin</span>
            <div className="w-8 h-8 bg-gray-700 rounded-full" />
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Authority Overview */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Platform Authority</h1>
          <p className="text-gray-500">Complete control over entire REZ ecosystem</p>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-5 gap-4 mb-8">
          <StatCard title="Companies" value="6" icon="🏢" />
          <StatCard title="Services" value="169" icon="⚙️" />
          <StatCard title="Users" value="182K" icon="👥" />
          <StatCard title="AI Models" value="12" icon="🤖" />
          <StatCard title="Revenue" value="₹4.58Cr" icon="💰" />
        </div>

        {/* Control Panels */}
        <div className="grid grid-cols-3 gap-6 mb-8">
          <ControlPanel title="Companies" icon="🏢" items={[
            { label: 'RABTUL Technologies', status: 'active', type: 'Infrastructure' },
            { label: 'REZ-Consumer', status: 'active', type: 'Consumer' },
            { label: 'REZ-Merchant', status: 'active', type: 'Merchant' },
            { label: 'REZ-Media', status: 'active', type: 'Media' },
            { label: 'StayOwn-Hospitality', status: 'active', type: 'Hospitality' },
            { label: 'CorpPerks', status: 'active', type: 'Enterprise' }
          ]} />

          <ControlPanel title="Core Services" icon="⚙️" items={[
            { label: 'Auth Service', status: 'healthy' },
            { label: 'Payment Service', status: 'healthy' },
            { label: 'Wallet Service', status: 'healthy' },
            { label: 'Order Service', status: 'healthy' },
            { label: 'CDP Service', status: 'healthy' },
            { label: 'Fraud Agent', status: 'healthy' }
          ]} />

          <ControlPanel title="AI Services" icon="🤖" items={[
            { label: 'Intent Predictor', status: 'deployed' },
            { label: 'Churn Predictor', status: 'deployed' },
            { label: 'Fraud Detector', status: 'deployed' },
            { label: 'Recommender', status: 'deployed' },
            { label: 'Sentiment Analyzer', status: 'deployed' },
            { label: 'Personalization', status: 'deployed' }
          ]} />
        </div>

        {/* Administration */}
        <div className="grid grid-cols-4 gap-6 mb-8">
          <AdminCard title="Users" count="456" icon="👥" description="Manage all platform users" href="/users" />
          <AdminCard title="API Keys" count="24" icon="🔑" description="API access & permissions" href="/apikeys" />
          <AdminCard title="Audit Logs" count="1.2K" icon="📋" description="Track all admin actions" href="/audit" />
          <AdminCard title="Settings" count="48" icon="⚙️" description="Platform configuration" href="/settings" />
        </div>

        {/* Role Dashboards */}
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <h2 className="text-lg font-semibold mb-4">C-Suite Dashboards</h2>
          <div className="grid grid-cols-6 gap-4">
            <RoleCard role="CFO" email="cfo@rez.money" access="Finance" />
            <RoleCard role="CTO" email="cto@rez.money" access="Technology" />
            <RoleCard role="CMO" email="cmo@rez.money" access="Marketing" />
            <RoleCard role="COO" email="coo@rez.money" access="Operations" />
            <RoleCard role="CHRO" email="chro@rez.money" access="HR" />
            <RoleCard role="CAIO" email="caio@rez.money" access="AI/ML" />
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-4">Quick Actions</h2>
          <div className="grid grid-cols-4 gap-4">
            <ActionButton icon="👤" label="Create User" />
            <ActionButton icon="🏢" label="Add Company" />
            <ActionButton icon="🚀" label="Deploy Service" />
            <ActionButton icon="⚡" label="Restart Service" />
            <ActionButton icon="📊" label="View Reports" />
            <ActionButton icon="🔑" label="Create API Key" />
            <ActionButton icon="📢" label="Broadcast" />
            <ActionButton icon="⚙️" label="Settings" />
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ title, value, icon }: any) {
  return (
    <div className="bg-white rounded-lg shadow p-4">
      <div className="flex items-center gap-3">
        <span className="text-2xl">{icon}</span>
        <div>
          <p className="text-2xl font-bold">{value}</p>
          <p className="text-sm text-gray-500">{title}</p>
        </div>
      </div>
    </div>
  );
}

function ControlPanel({ title, icon, items }: any) {
  return (
    <div className="bg-white rounded-lg shadow">
      <div className="p-4 border-b flex items-center gap-2">
        <span className="text-lg">{icon}</span>
        <h3 className="font-semibold">{title}</h3>
      </div>
      <div className="p-2">
        {items.map((item: any, i: number) => (
          <div key={i} className="p-2 flex justify-between items-center border-b last:border-0">
            <div>
              <p className="text-sm font-medium">{item.label}</p>
              <p className="text-xs text-gray-500">{item.type || ''}</p>
            </div>
            <span className={`px-2 py-1 rounded text-xs ${
              item.status === 'active' || item.status === 'healthy' || item.status === 'deployed'
                ? 'bg-green-100 text-green-800'
                : 'bg-yellow-100 text-yellow-800'
            }`}>
              {item.status}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function AdminCard({ title, count, icon, description, href }: any) {
  return (
    <a href={href} className="bg-white rounded-lg shadow p-4 hover:shadow-lg transition cursor-pointer block">
      <div className="flex items-center gap-3 mb-2">
        <span className="text-xl">{icon}</span>
        <span className="text-2xl font-bold">{count}</span>
      </div>
      <p className="font-medium">{title}</p>
      <p className="text-sm text-gray-500">{description}</p>
    </a>
  );
}

function RoleCard({ role, email, access }: any) {
  return (
    <div className="text-center p-4 bg-gray-50 rounded-lg">
      <div className="w-12 h-12 bg-blue-100 rounded-full mx-auto mb-2 flex items-center justify-center">
        <span className="text-lg font-bold text-blue-600">{role[0]}</span>
      </div>
      <p className="font-semibold">{role}</p>
      <p className="text-xs text-gray-500">{access}</p>
    </div>
  );
}

function ActionButton({ icon, label }: any) {
  return (
    <button className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition w-full">
      <span className="text-lg">{icon}</span>
      <span className="text-sm">{label}</span>
    </button>
  );
}
