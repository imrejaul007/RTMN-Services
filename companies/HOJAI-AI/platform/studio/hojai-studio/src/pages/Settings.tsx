/**
 * HOJAI Studio - Settings Page
 */

import React, { useState } from 'react';
import { User, Key, Bell, CreditCard, Globe, Shield } from 'lucide-react';

const tabs = [
  { id: 'profile', label: 'Profile', icon: User },
  { id: 'api', label: 'API Keys', icon: Key },
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'billing', label: 'Billing', icon: CreditCard },
  { id: 'integrations', label: 'Integrations', icon: Globe },
  { id: 'security', label: 'Security', icon: Shield },
];

export function Settings() {
  const [activeTab, setActiveTab] = useState('profile');

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-8">Settings</h1>

      <div className="flex gap-8">
        {/* Sidebar */}
        <div className="w-64 shrink-0">
          <nav className="space-y-1">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-colors ${
                  activeTab === tab.id
                    ? 'bg-purple-50 text-purple-700'
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                <tab.icon className="w-5 h-5" />
                <span className="font-medium">{tab.label}</span>
              </button>
            ))}
          </nav>
        </div>

        {/* Content */}
        <div className="flex-1 bg-white rounded-xl border shadow-sm p-6">
          {activeTab === 'profile' && (
            <div>
              <h2 className="text-lg font-semibold mb-6">Profile Settings</h2>
              <div className="space-y-6">
                <div className="flex items-center gap-6">
                  <div className="w-20 h-20 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center text-white text-2xl font-bold">
                    RK
                  </div>
                  <div>
                    <button className="px-4 py-2 bg-gray-900 text-white rounded-lg text-sm">
                      Change Photo
                    </button>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">First Name</label>
                    <input type="text" defaultValue="Rejaul" className="w-full px-3 py-2 border rounded-lg" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Last Name</label>
                    <input type="text" defaultValue="Karim" className="w-full px-3 py-2 border rounded-lg" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                    <input type="email" defaultValue="rejaul@hojai.ai" className="w-full px-3 py-2 border rounded-lg" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Company</label>
                    <input type="text" defaultValue="HOJAI AI" className="w-full px-3 py-2 border rounded-lg" />
                  </div>
                </div>
                <button className="px-6 py-2 bg-purple-600 text-white rounded-lg">Save Changes</button>
              </div>
            </div>
          )}

          {activeTab === 'api' && (
            <div>
              <h2 className="text-lg font-semibold mb-6">API Keys</h2>
              <div className="space-y-4">
                {['Production Key', 'Development Key', 'Test Key'].map((key) => (
                  <div key={key} className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <p className="font-medium">{key}</p>
                      <p className="text-sm text-gray-500">sk_live_••••••••••••</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button className="px-3 py-1 text-sm border rounded hover:bg-gray-50">Copy</button>
                      <button className="px-3 py-1 text-sm text-red-600 border border-red-200 rounded hover:bg-red-50">Revoke</button>
                    </div>
                  </div>
                ))}
                <button className="px-4 py-2 border border-dashed rounded-lg w-full text-gray-500 hover:border-purple-300 hover:text-purple-600">
                  + Create New Key
                </button>
              </div>
            </div>
          )}

          {activeTab === 'billing' && (
            <div>
              <h2 className="text-lg font-semibold mb-6">Billing</h2>
              <div className="bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl p-6 text-white mb-6">
                <p className="text-sm opacity-80">Current Plan</p>
                <p className="text-3xl font-bold">Enterprise</p>
                <p className="mt-2">₹2,00,000/month • 25 agents • Unlimited workflows</p>
              </div>
              <button className="px-4 py-2 border rounded-lg">Manage Subscription</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
