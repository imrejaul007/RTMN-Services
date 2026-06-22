'use client';

import { useState } from 'react';

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState('profile');
  const [profile, setProfile] = useState({
    name: 'John Doe',
    email: 'john@example.com',
    phone: '+91 98765 43210',
    company: 'Acme Corp',
    role: 'Legal Manager',
  });

  const [notifications, setNotifications] = useState({
    email: true,
    sms: false,
    contractExpiry: true,
    complianceDeadline: true,
    weeklyReport: true,
  });

  const tabs = [
    { id: 'profile', label: 'Profile', icon: '👤' },
    { id: 'security', label: 'Security', icon: '🔒' },
    { id: 'notifications', label: 'Notifications', icon: '🔔' },
    { id: 'billing', label: 'Billing', icon: '💳' },
    { id: 'api', label: 'API Keys', icon: '🔑' },
  ];

  return (
    <div className="min-h-screen bg-slate-900 text-white">
      {/* Header */}
      <header className="border-b border-slate-800 bg-slate-800/50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <a href="/dashboard" className="text-slate-400 hover:text-white">← Back</a>
            <div className="w-8 h-8 bg-gradient-to-br from-amber-400 to-orange-500 rounded-lg flex items-center justify-center font-bold">
              L
            </div>
            <span className="text-lg font-semibold">Settings</span>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8">
        <div className="flex gap-8">
          {/* Sidebar */}
          <div className="w-64 flex-shrink-0">
            <nav className="space-y-2">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition ${
                    activeTab === tab.id
                      ? 'bg-amber-500/20 text-amber-400'
                      : 'hover:bg-slate-800 text-slate-400'
                  }`}
                >
                  <span>{tab.icon}</span>
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>

          {/* Content */}
          <div className="flex-1">
            {activeTab === 'profile' && (
              <div className="bg-slate-800 rounded-xl border border-slate-700 p-6">
                <h2 className="text-xl font-semibold mb-6">Profile Settings</h2>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">Full Name</label>
                      <input
                        type="text"
                        value={profile.name}
                        onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-amber-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">Email</label>
                      <input
                        type="email"
                        value={profile.email}
                        onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-amber-500"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">Phone</label>
                      <input
                        type="tel"
                        value={profile.phone}
                        onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-amber-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">Company</label>
                      <input
                        type="text"
                        value={profile.company}
                        onChange={(e) => setProfile({ ...profile, company: e.target.value })}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-amber-500"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">Role</label>
                    <input
                      type="text"
                      value={profile.role}
                      onChange={(e) => setProfile({ ...profile, role: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-amber-500"
                    />
                  </div>
                  <div className="flex gap-4 pt-4">
                    <button className="bg-amber-500 hover:bg-amber-600 px-6 py-2 rounded-lg font-medium transition">
                      Save Changes
                    </button>
                    <button className="bg-slate-700 hover:bg-slate-600 px-6 py-2 rounded-lg font-medium transition">
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'security' && (
              <div className="bg-slate-800 rounded-xl border border-slate-700 p-6">
                <h2 className="text-xl font-semibold mb-6">Security Settings</h2>
                <div className="space-y-6">
                  <div className="flex items-center justify-between p-4 bg-slate-900 rounded-lg">
                    <div>
                      <h3 className="font-medium">Password</h3>
                      <p className="text-sm text-slate-400">Last changed 30 days ago</p>
                    </div>
                    <button className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg font-medium transition">
                      Change Password
                    </button>
                  </div>
                  <div className="flex items-center justify-between p-4 bg-slate-900 rounded-lg">
                    <div>
                      <h3 className="font-medium">Two-Factor Authentication</h3>
                      <p className="text-sm text-slate-400">Add an extra layer of security</p>
                    </div>
                    <button className="px-4 py-2 bg-green-500/20 text-green-400 hover:bg-green-500/30 rounded-lg font-medium transition">
                      Enable 2FA
                    </button>
                  </div>
                  <div className="flex items-center justify-between p-4 bg-slate-900 rounded-lg">
                    <div>
                      <h3 className="font-medium">Active Sessions</h3>
                      <p className="text-sm text-slate-400">Manage your logged-in devices</p>
                    </div>
                    <button className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg font-medium transition">
                      View Sessions
                    </button>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'notifications' && (
              <div className="bg-slate-800 rounded-xl border border-slate-700 p-6">
                <h2 className="text-xl font-semibold mb-6">Notification Preferences</h2>
                <div className="space-y-4">
                  {[
                    { key: 'email', label: 'Email Notifications', desc: 'Receive updates via email' },
                    { key: 'sms', label: 'SMS Notifications', desc: 'Receive alerts via SMS' },
                    { key: 'contractExpiry', label: 'Contract Expiry Alerts', desc: 'Get notified before contracts expire' },
                    { key: 'complianceDeadline', label: 'Compliance Deadlines', desc: 'Reminder for compliance requirements' },
                    { key: 'weeklyReport', label: 'Weekly Report', desc: 'Receive weekly summary' },
                  ].map((item) => (
                    <div key={item.key} className="flex items-center justify-between p-4 bg-slate-900 rounded-lg">
                      <div>
                        <h3 className="font-medium">{item.label}</h3>
                        <p className="text-sm text-slate-400">{item.desc}</p>
                      </div>
                      <button
                        onClick={() => setNotifications({ ...notifications, [item.key]: !notifications[item.key as keyof typeof notifications] })}
                        className={`relative w-12 h-6 rounded-full transition ${
                          notifications[item.key as keyof typeof notifications] ? 'bg-amber-500' : 'bg-slate-700'
                        }`}
                      >
                        <div
                          className={`absolute top-1 w-4 h-4 rounded-full bg-white transition ${
                            notifications[item.key as keyof typeof notifications] ? 'left-7' : 'left-1'
                          }`}
                        />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'billing' && (
              <div className="bg-slate-800 rounded-xl border border-slate-700 p-6">
                <h2 className="text-xl font-semibold mb-6">Billing & Subscription</h2>
                <div className="bg-slate-900 rounded-lg p-6 mb-6">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="font-medium">Current Plan: Professional</h3>
                      <p className="text-sm text-slate-400">₹999/month</p>
                    </div>
                    <span className="px-3 py-1 bg-green-500/20 text-green-400 rounded-full text-sm">Active</span>
                  </div>
                  <div className="flex gap-4">
                    <button className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg font-medium transition">
                      Upgrade Plan
                    </button>
                    <button className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg font-medium transition">
                      View Invoices
                    </button>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'api' && (
              <div className="bg-slate-800 rounded-xl border border-slate-700 p-6">
                <h2 className="text-xl font-semibold mb-6">API Keys</h2>
                <div className="bg-slate-900 rounded-lg p-4 mb-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-medium">Production Key</h3>
                      <p className="text-sm text-slate-400 font-mono">lg_prod_••••••••••••••••</p>
                    </div>
                    <div className="flex gap-2">
                      <button className="px-3 py-1 bg-slate-700 hover:bg-slate-600 rounded text-sm font-medium transition">
                        Copy
                      </button>
                      <button className="px-3 py-1 bg-slate-700 hover:bg-slate-600 rounded text-sm font-medium transition">
                        Regenerate
                      </button>
                    </div>
                  </div>
                </div>
                <button className="bg-amber-500 hover:bg-amber-600 px-6 py-2 rounded-lg font-medium transition">
                  Generate New Key
                </button>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
