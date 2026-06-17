'use client';

import { useState } from 'react';
import {
  User,
  Bell,
  Shield,
  Palette,
  Globe,
  Key,
  Mail,
  MessageCircle,
  Phone,
  Check,
  ChevronRight,
} from 'lucide-react';
import clsx from 'clsx';

const settingsSections = [
  { id: 'profile', label: 'Profile', icon: User },
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'security', label: 'Security', icon: Shield },
  { id: 'appearance', label: 'Appearance', icon: Palette },
  { id: 'integrations', label: 'Integrations', icon: Globe },
];

const agent = {
  name: 'Sarah Chen',
  email: 'sarah.chen@rtmn.com',
  avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Sarah',
  status: 'online' as const,
  role: 'Support Agent',
  department: 'Customer Success',
  timezone: 'America/New_York',
  language: 'English (US)',
};

const statusOptions = [
  { value: 'online', label: 'Online', color: 'bg-green-500' },
  { value: 'away', label: 'Away', color: 'bg-yellow-500' },
  { value: 'busy', label: 'Busy', color: 'bg-red-500' },
  { value: 'offline', label: 'Offline', color: 'bg-slate-400' },
];

export default function SettingsPage() {
  const [activeSection, setActiveSection] = useState('profile');
  const [status, setStatus] = useState('online');
  const [notifications, setNotifications] = useState({
    email: true,
    desktop: true,
    sound: false,
    sms: false,
  });

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Settings</h1>
        <p className="text-slate-500 mt-1">Manage your account and preferences</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Sidebar */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <nav className="space-y-1">
              {settingsSections.map((section) => {
                const Icon = section.icon;
                return (
                  <button
                    key={section.id}
                    onClick={() => setActiveSection(section.id)}
                    className={clsx(
                      'w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors',
                      activeSection === section.id
                        ? 'bg-primary-50 text-primary-700'
                        : 'text-slate-600 hover:bg-slate-50'
                    )}
                  >
                    <Icon className="w-5 h-5" />
                    {section.label}
                  </button>
                );
              })}
            </nav>
          </div>
        </div>

        {/* Content */}
        <div className="lg:col-span-3">
          {/* Profile Section */}
          {activeSection === 'profile' && (
            <div className="space-y-6">
              <div className="bg-white rounded-xl border border-slate-200 p-6">
                <h2 className="text-lg font-semibold text-slate-900 mb-6">Profile Information</h2>
                <div className="flex items-start gap-6 mb-6">
                  <div className="relative">
                    <img
                      src={agent.avatar}
                      alt={agent.name}
                      className="w-24 h-24 rounded-full"
                    />
                    <button className="absolute bottom-0 right-0 w-8 h-8 bg-primary-600 text-white rounded-full flex items-center justify-center hover:bg-primary-700 transition-colors">
                      <User className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-slate-900">{agent.name}</h3>
                    <p className="text-sm text-slate-500">{agent.role}</p>
                    <p className="text-sm text-slate-500">{agent.department}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Full Name</label>
                    <input
                      type="text"
                      defaultValue={agent.name}
                      className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Email</label>
                    <input
                      type="email"
                      defaultValue={agent.email}
                      className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Department</label>
                    <input
                      type="text"
                      defaultValue={agent.department}
                      className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Timezone</label>
                    <select
                      defaultValue={agent.timezone}
                      className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                    >
                      <option value="America/New_York">Eastern Time (ET)</option>
                      <option value="America/Chicago">Central Time (CT)</option>
                      <option value="America/Denver">Mountain Time (MT)</option>
                      <option value="America/Los_Angeles">Pacific Time (PT)</option>
                    </select>
                  </div>
                </div>

                <div className="mt-6 pt-6 border-t border-slate-100">
                  <button className="px-6 py-2.5 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700 transition-colors">
                    Save Changes
                  </button>
                </div>
              </div>

              {/* Status Settings */}
              <div className="bg-white rounded-xl border border-slate-200 p-6">
                <h2 className="text-lg font-semibold text-slate-900 mb-4">Availability Status</h2>
                <p className="text-sm text-slate-500 mb-4">Set your current status to let your team know your availability</p>
                <div className="grid grid-cols-4 gap-3">
                  {statusOptions.map((option) => (
                    <button
                      key={option.value}
                      onClick={() => setStatus(option.value)}
                      className={clsx(
                        'flex items-center gap-2 p-3 rounded-lg border-2 transition-colors',
                        status === option.value
                          ? 'border-primary-500 bg-primary-50'
                          : 'border-slate-200 hover:border-slate-300'
                      )}
                    >
                      <span className={clsx('w-3 h-3 rounded-full', option.color)} />
                      <span className="text-sm font-medium">{option.label}</span>
                      {status === option.value && (
                        <Check className="w-4 h-4 text-primary-600 ml-auto" />
                      )}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Notifications Section */}
          {activeSection === 'notifications' && (
            <div className="bg-white rounded-xl border border-slate-200 p-6">
              <h2 className="text-lg font-semibold text-slate-900 mb-6">Notification Preferences</h2>
              <div className="space-y-6">
                {[
                  {
                    id: 'email',
                    label: 'Email Notifications',
                    description: 'Receive ticket updates via email',
                    icon: Mail,
                  },
                  {
                    id: 'desktop',
                    label: 'Desktop Notifications',
                    description: 'Show desktop alerts for new tickets',
                    icon: Bell,
                  },
                  {
                    id: 'sound',
                    label: 'Sound Alerts',
                    description: 'Play sound for urgent tickets',
                    icon: MessageCircle,
                  },
                  {
                    id: 'sms',
                    label: 'SMS Notifications',
                    description: 'Receive critical alerts via SMS',
                    icon: Phone,
                  },
                ].map((item) => {
                  const Icon = item.icon;
                  const isEnabled = notifications[item.id as keyof typeof notifications];
                  return (
                    <div key={item.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center">
                          <Icon className="w-5 h-5 text-slate-600" />
                        </div>
                        <div>
                          <p className="font-medium text-slate-900">{item.label}</p>
                          <p className="text-sm text-slate-500">{item.description}</p>
                        </div>
                      </div>
                      <button
                        onClick={() => setNotifications((prev) => ({ ...prev, [item.id]: !prev[item.id as keyof typeof notifications] }))}
                        className={clsx(
                          'relative w-12 h-6 rounded-full transition-colors',
                          isEnabled ? 'bg-primary-600' : 'bg-slate-300'
                        )}
                      >
                        <span
                          className={clsx(
                            'absolute top-1 w-4 h-4 bg-white rounded-full transition-transform',
                            isEnabled ? 'left-7' : 'left-1'
                          )}
                        />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Security Section */}
          {activeSection === 'security' && (
            <div className="space-y-6">
              <div className="bg-white rounded-xl border border-slate-200 p-6">
                <h2 className="text-lg font-semibold text-slate-900 mb-6">Change Password</h2>
                <div className="space-y-4 max-w-md">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Current Password</label>
                    <input
                      type="password"
                      placeholder="Enter current password"
                      className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">New Password</label>
                    <input
                      type="password"
                      placeholder="Enter new password"
                      className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Confirm New Password</label>
                    <input
                      type="password"
                      placeholder="Confirm new password"
                      className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                  <button className="px-6 py-2.5 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700 transition-colors">
                    Update Password
                  </button>
                </div>
              </div>

              <div className="bg-white rounded-xl border border-slate-200 p-6">
                <h2 className="text-lg font-semibold text-slate-900 mb-4">Two-Factor Authentication</h2>
                <p className="text-sm text-slate-500 mb-4">Add an extra layer of security to your account</p>
                <button className="flex items-center gap-2 px-4 py-2 border border-primary-600 text-primary-600 rounded-lg font-medium hover:bg-primary-50 transition-colors">
                  <Key className="w-4 h-4" />
                  Enable 2FA
                </button>
              </div>

              <div className="bg-white rounded-xl border border-slate-200 p-6">
                <h2 className="text-lg font-semibold text-slate-900 mb-4">Active Sessions</h2>
                <div className="space-y-3">
                  {[
                    { device: 'Chrome on MacOS', location: 'New York, US', current: true },
                    { device: 'Safari on iPhone', location: 'New York, US', current: false },
                  ].map((session, i) => (
                    <div key={i} className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                      <div>
                        <p className="font-medium text-slate-900">{session.device}</p>
                        <p className="text-sm text-slate-500">{session.location}</p>
                      </div>
                      {session.current && (
                        <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">
                          Current
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Appearance Section */}
          {activeSection === 'appearance' && (
            <div className="bg-white rounded-xl border border-slate-200 p-6">
              <h2 className="text-lg font-semibold text-slate-900 mb-6">Appearance</h2>
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-3">Theme</label>
                  <div className="grid grid-cols-3 gap-4">
                    {['Light', 'Dark', 'System'].map((theme) => (
                      <button
                        key={theme}
                        className={clsx(
                          'p-4 rounded-xl border-2 transition-colors',
                          theme === 'Light' ? 'border-primary-500 bg-primary-50' : 'border-slate-200 hover:border-slate-300'
                        )}
                      >
                        <p className="font-medium text-slate-900">{theme}</p>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-3">Accent Color</label>
                  <div className="flex gap-3">
                    {['#0ea5e9', '#8b5cf6', '#ec4899', '#10b981', '#f59e0b'].map((color) => (
                      <button
                        key={color}
                        style={{ backgroundColor: color }}
                        className="w-10 h-10 rounded-full border-2 border-white shadow-md hover:scale-110 transition-transform"
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Integrations Section */}
          {activeSection === 'integrations' && (
            <div className="bg-white rounded-xl border border-slate-200 p-6">
              <h2 className="text-lg font-semibold text-slate-900 mb-6">Connected Apps</h2>
              <div className="space-y-4">
                {[
                  { name: 'Slack', description: 'Receive ticket notifications in Slack', connected: true },
                  { name: 'Salesforce', description: 'Sync customer data with Salesforce', connected: true },
                  { name: 'Zapier', description: 'Automate workflows with Zapier', connected: false },
                  { name: 'Intercom', description: 'Import conversations from Intercom', connected: false },
                ].map((app, i) => (
                  <div key={i} className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-white rounded-lg flex items-center justify-center border border-slate-200">
                        <Globe className="w-6 h-6 text-slate-400" />
                      </div>
                      <div>
                        <p className="font-medium text-slate-900">{app.name}</p>
                        <p className="text-sm text-slate-500">{app.description}</p>
                      </div>
                    </div>
                    <button
                      className={clsx(
                        'px-4 py-2 rounded-lg font-medium text-sm transition-colors',
                        app.connected
                          ? 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                          : 'bg-primary-600 text-white hover:bg-primary-700'
                      )}
                    >
                      {app.connected ? 'Disconnect' : 'Connect'}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
