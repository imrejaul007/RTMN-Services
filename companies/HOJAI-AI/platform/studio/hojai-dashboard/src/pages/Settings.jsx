import React from 'react';
import { Save, Key, Bell, Shield } from 'lucide-react';

function Settings() {
  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-500">Configure your HOJAI platform</p>
      </div>

      <div className="max-w-2xl space-y-6">
        {/* API Keys */}
        <div className="bg-white rounded-xl p-6 border">
          <div className="flex items-center gap-3 mb-4">
            <Key className="w-5 h-5 text-purple-600" />
            <h3 className="font-semibold">API Keys</h3>
          </div>
          <div className="space-y-4">
            {[
              { label: 'OpenAI API Key', key: 'OPENAI_API_KEY' },
              { label: 'Anthropic API Key', key: 'ANTHROPIC_API_KEY' },
              { label: 'Twilio Account SID', key: 'TWILIO_ACCOUNT_SID' },
              { label: 'WhatsApp Access Token', key: 'WA_ACCESS_TOKEN' },
            ].map((field) => (
              <div key={field.key}>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {field.label}
                </label>
                <input
                  type="password"
                  placeholder="••••••••••••••••"
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500"
                />
              </div>
            ))}
          </div>
          <button className="w-full mt-6 flex items-center justify-center gap-2 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700">
            <Save className="w-4 h-4" />
            Save API Keys
          </button>
        </div>

        {/* Notifications */}
        <div className="bg-white rounded-xl p-6 border">
          <div className="flex items-center gap-3 mb-4">
            <Bell className="w-5 h-5 text-purple-600" />
            <h3 className="font-semibold">Notifications</h3>
          </div>
          <div className="space-y-3">
            {[
              { label: 'Email on errors', enabled: true },
              { label: 'Slack on critical', enabled: false },
              { label: 'Weekly reports', enabled: true },
            ].map((setting) => (
              <label key={setting.label} className="flex items-center justify-between p-3 rounded-lg border">
                <span>{setting.label}</span>
                <input type="checkbox" defaultChecked={setting.enabled} className="w-5 h-5" />
              </label>
            ))}
          </div>
        </div>

        {/* Security */}
        <div className="bg-white rounded-xl p-6 border">
          <div className="flex items-center gap-3 mb-4">
            <Shield className="w-5 h-5 text-purple-600" />
            <h3 className="font-semibold">Security</h3>
          </div>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span>Two-factor authentication</span>
              <span className="text-green-600 text-sm">Enabled</span>
            </div>
            <div className="flex items-center justify-between">
              <span>API rate limiting</span>
              <span className="text-gray-600 text-sm">100 req/min</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Settings;
