/**
 * CTO Dashboard - Technology
 */

import React from 'react';

export default function TechnologyDashboard() {
  const services = [
    { name: 'verify-qr', company: 'REZ-Consumer', status: 'healthy', latency: 45, uptime: 99.9, deployments: 'v2.0.5' },
    { name: 'auth-service', company: 'RABTUL', status: 'healthy', latency: 32, uptime: 99.95, deployments: 'v1.8.2' },
    { name: 'cdp-service', company: 'Intelligence', status: 'warning', latency: 120, uptime: 98.5, deployments: 'v3.1.0' },
    { name: 'payment-service', company: 'RABTUL', status: 'healthy', latency: 28, uptime: 99.99, deployments: 'v2.2.1' },
    { name: 'karma-service', company: 'REZ-Media', status: 'healthy', latency: 35, uptime: 99.8, deployments: 'v1.5.3' },
    { name: 'ai-agent', company: 'Intelligence', status: 'healthy', latency: 180, uptime: 99.2, deployments: 'v4.0.1' }
  ];

  const incidents = [
    { id: 'INC-001', service: 'cdp-service', type: 'High Latency', status: 'investigating', time: '2h ago' },
    { id: 'INC-002', service: 'verify-qr', type: 'Error Spike', status: 'resolved', time: '5h ago' }
  ];

  return (
    <div className="space-y-6">
      {/* Overview */}
      <div className="grid grid-cols-4 gap-6">
        <Metric title="Services" value="169" sub="All operational" trend="+12" />
        <Metric title="Avg Latency" value="45ms" sub="P99" trend="-15%" />
        <Metric title="Uptime" value="99.95%" sub="SLO target: 99.9%" trend="+0.02" />
        <Metric title="Incidents" value="2" sub="1 critical" trend="-2" />
      </div>

      {/* Services Grid */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-4 border-b flex justify-between items-center">
          <h2 className="font-semibold">Services Health</h2>
          <button className="text-blue-600 text-sm">View All</button>
        </div>
        <div className="grid grid-cols-3 gap-4 p-4">
          {services.map((svc) => (
            <div key={svc.name} className="border rounded-lg p-4">
              <div className="flex justify-between items-start">
                <div>
                  <p className="font-medium">{svc.name}</p>
                  <p className="text-sm text-gray-500">{svc.company}</p>
                </div>
                <span className={`px-2 py-1 rounded text-xs ${
                  svc.status === 'healthy' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                }`}>
                  {svc.status}
                </span>
              </div>
              <div className="mt-4 grid grid-cols-3 gap-2 text-sm">
                <div>
                  <p className="text-gray-500">Latency</p>
                  <p className="font-medium">{svc.latency}ms</p>
                </div>
                <div>
                  <p className="text-gray-500">Uptime</p>
                  <p className="font-medium">{svc.uptime}%</p>
                </div>
                <div>
                  <p className="text-gray-500">Version</p>
                  <p className="font-medium">{svc.deployments}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Incidents */}
      <div className="grid grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow p-4">
          <h2 className="font-semibold mb-4">Active Incidents</h2>
          {incidents.map((inc) => (
            <div key={inc.id} className="border-b py-3">
              <div className="flex justify-between">
                <div>
                  <p className="font-medium">{inc.service}</p>
                  <p className="text-sm text-gray-500">{inc.type} • {inc.time}</p>
                </div>
                <span className={`px-2 py-1 rounded text-xs ${
                  inc.status === 'resolved' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                }`}>
                  {inc.status}
                </span>
              </div>
            </div>
          ))}
        </div>

        <div className="bg-white rounded-lg shadow p-4">
          <h2 className="font-semibold mb-4">Quick Actions</h2>
          <div className="space-y-2">
            <Action label="Deploy Service" icon="🚀" />
            <Action label="View Logs" icon="📋" />
            <Action label="Scale Service" icon="📈" />
            <Action label="Restart Service" icon="🔄" />
            <Action label="View Metrics" icon="📊" />
          </div>
        </div>
      </div>

      {/* Deployments */}
      <div className="bg-white rounded-lg shadow p-4">
        <h2 className="font-semibold mb-4">Recent Deployments</h2>
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left">
            <tr>
              <th className="p-2">Service</th>
              <th className="p-2">Version</th>
              <th className="p-2">Status</th>
              <th className="p-2">Deployed</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-t">
              <td className="p-2">verify-qr</td>
              <td className="p-2">v2.0.5</td>
              <td className="p-2 text-green-600">Success</td>
              <td className="p-2">2h ago</td>
            </tr>
            <tr className="border-t">
              <td className="p-2">auth-service</td>
              <td className="p-2">v1.8.2</td>
              <td className="p-2 text-green-600">Success</td>
              <td className="p-2">5h ago</td>
            </tr>
            <tr className="border-t">
              <td className="p-2">cdp-service</td>
              <td className="p-2">v3.1.0</td>
              <td className="p-2 text-yellow-600">Rolling</td>
              <td className="p-2">In progress</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Metric({ title, value, sub, trend }: { title: string; value: string; sub: string; trend: string }) {
  return (
    <div className="bg-white p-6 rounded-lg shadow">
      <p className="text-gray-500 text-sm">{title}</p>
      <p className="text-2xl font-bold mt-1">{value}</p>
      <div className="flex justify-between mt-1">
        <p className="text-gray-500 text-xs">{sub}</p>
        <p className="text-xs text-green-600">{trend}</p>
      </div>
    </div>
  );
}

function Action({ label, icon }: { label: string; icon: string }) {
  return (
    <button className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-gray-100 text-left">
      <span className="text-xl">{icon}</span>
      <span className="text-sm">{label}</span>
    </button>
  );
}
