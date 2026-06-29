import React, { useState } from 'react';
import { Bot, FileText, RefreshCw, Search, BarChart3, Play, Pause } from 'lucide-react';

function Services() {
  const [activeService, setActiveService] = useState('reply');

  const services = [
    {
      id: 'reply',
      name: 'Reply Drafting',
      description: 'AI-powered customer reply generation',
      icon: FileText,
      stats: { used: 1247, avgTime: '1.2s', accuracy: '94%' },
    },
    {
      id: 'refund',
      name: 'Refund Approval',
      description: 'Automated refund processing with fraud detection',
      icon: RefreshCw,
      stats: { used: 234, autoApproved: '78%', avgTime: '0.8s' },
    },
    {
      id: 'rca',
      name: 'Root Cause Analysis',
      description: 'AI incident analysis and recommendations',
      icon: Search,
      stats: { used: 45, accuracy: '89%', avgTime: '3.5s' },
    },
    {
      id: 'roi',
      name: 'ROI Calculator',
      description: 'Calculate AI workforce ROI',
      icon: BarChart3,
      stats: { used: 89, avgSavings: '₹45,000/mo' },
    },
  ];

  const active = services.find(s => s.id === activeService);

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">AI Services</h1>
        <p className="text-gray-500">Configure and monitor AI-powered services</p>
      </div>

      {/* Service Cards */}
      <div className="grid grid-cols-2 gap-6 mb-8">
        {services.map((service) => (
          <div
            key={service.id}
            onClick={() => setActiveService(service.id)}
            className={`bg-white rounded-xl p-6 border cursor-pointer transition-all ${
              activeService === service.id
                ? 'border-purple-500 shadow-lg ring-2 ring-purple-100'
                : 'hover:border-gray-300'
            }`}
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-purple-100 rounded-lg">
                  <service.icon className="w-6 h-6 text-purple-600" />
                </div>
                <div>
                  <h3 className="font-semibold">{service.name}</h3>
                  <p className="text-sm text-gray-500">{service.description}</p>
                </div>
              </div>
              <div className="flex gap-2">
                <button className="p-2 hover:bg-gray-100 rounded-lg">
                  <Play className="w-4 h-4 text-green-500" />
                </button>
                <button className="p-2 hover:bg-gray-100 rounded-lg">
                  <Pause className="w-4 h-4 text-gray-400" />
                </button>
              </div>
            </div>
            <div className="flex gap-4 text-sm">
              {Object.entries(service.stats).map(([key, value]) => (
                <div key={key}>
                  <span className="text-gray-500">{key}:</span>{' '}
                  <span className="font-medium">{value}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Service Detail */}
      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-2 bg-white rounded-xl p-6 border">
          <h3 className="font-semibold mb-4">Service Configuration</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Model</label>
              <select className="w-full px-4 py-2 border rounded-lg">
                <option>GPT-4o (Recommended)</option>
                <option>Claude 3.5 Sonnet</option>
                <option>GPT-4 Turbo</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Temperature</label>
              <input type="range" min="0" max="2" step="0.1" defaultValue="0.5" className="w-full" />
              <div className="flex justify-between text-xs text-gray-400">
                <span>Precise</span>
                <span>Creative</span>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Max Tokens</label>
              <input type="number" defaultValue="1000" className="w-full px-4 py-2 border rounded-lg" />
            </div>
          </div>
          <button className="w-full mt-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700">
            Save Settings
          </button>
        </div>

        <div className="bg-white rounded-xl p-6 border">
          <h3 className="font-semibold mb-4">Usage This Month</h3>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span>Requests</span>
                <span className="font-medium">{active?.stats.used || 0}</span>
              </div>
              <div className="h-2 bg-gray-100 rounded-full">
                <div className="h-full bg-purple-500 rounded-full" style={{ width: '65%' }} />
              </div>
            </div>
            <div className="pt-4 border-t">
              <p className="text-sm text-gray-500">Plan Limit</p>
              <p className="text-2xl font-bold">10,000</p>
              <p className="text-xs text-gray-400">requests/month</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Services;
