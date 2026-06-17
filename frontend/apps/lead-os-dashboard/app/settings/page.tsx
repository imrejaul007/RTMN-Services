'use client';

import { useState } from 'react';
import { Key, Eye, EyeOff, Check, AlertCircle, ExternalLink, RefreshCw } from 'lucide-react';
import clsx from 'clsx';

const apiKeys = [
  { name: 'Google Places API', key: 'GOOGLE_PLACES_API_KEY', description: 'For lead discovery from Google Maps and Places', placeholder: 'AIza...', verified: true },
  { name: 'Clearbit API', key: 'CLEARBIT_API_KEY', description: 'Company and contact enrichment', placeholder: 'sk_...', verified: false },
  { name: 'ZoomInfo API', key: 'ZOOMINFO_API_KEY', description: 'B2B contact data and company intelligence', placeholder: 'API Key...', verified: false },
  { name: 'Apollo API', key: 'APOLLO_API_KEY', description: 'Prospecting and email finding', placeholder: 'API Key...', verified: true },
  { name: 'LinkedIn API', key: 'LINKEDIN_API_KEY', description: 'Professional network integration', placeholder: 'API Key...', verified: false },
  { name: 'Hunter.io API', key: 'HUNTER_API_KEY', description: 'Email finder and domain search', placeholder: 'API Key...', verified: true },
];

const settings = [
  { name: 'Default Lead Score Threshold', value: '80', type: 'number' },
  { name: 'Auto-enrich on Lead Create', value: 'true', type: 'toggle' },
  { name: 'Daily Discovery Limit', value: '500', type: 'number' },
  { name: 'Auto-follow-up Days', value: '3', type: 'number' },
  { name: 'Email Sequence Days', value: '7', type: 'number' },
];

export default function SettingsPage() {
  const [keys, setKeys] = useState(apiKeys);
  const [showKey, setShowKey] = useState<Record<string, boolean>>({});
  const [saved, setSaved] = useState(false);
  const [generalSettings, setGeneralSettings] = useState(settings);

  const toggleShowKey = (key: string) => {
    setShowKey((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const updateKeyValue = (keyName: string, value: string) => {
    setKeys((prev) =>
      prev.map((k) => (k.key === keyName ? { ...k, value } : k))
    );
  };

  const updateSetting = (name: string, value: string) => {
    setGeneralSettings((prev) =>
      prev.map((s) => (s.name === name ? { ...s, value } : s))
    );
  };

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-500 mt-1">Configure your LeadOS Gateway and API integrations</p>
      </div>

      {/* API Keys Section */}
      <div className="bg-white rounded-xl border">
        <div className="px-6 py-4 border-b flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold">API Keys</h2>
            <p className="text-sm text-gray-500">Configure your data source integrations</p>
          </div>
          <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
            {keys.filter((k) => k.verified).length} / {keys.length} configured
          </span>
        </div>
        <div className="p-6 space-y-6">
          {keys.map((key) => (
            <div key={key.key} className="flex flex-col md:flex-row md:items-center gap-4 p-4 bg-gray-50 rounded-lg">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-medium text-gray-900">{key.name}</span>
                  {key.verified && (
                    <span className="flex items-center gap-1 text-xs text-green-600 bg-green-100 px-2 py-0.5 rounded-full">
                      <Check className="w-3 h-3" /> Verified
                    </span>
                  )}
                </div>
                <p className="text-sm text-gray-500">{key.description}</p>
              </div>
              <div className="flex gap-2">
                <div className="relative">
                  <input
                    type={showKey[key.key] ? 'text' : 'password'}
                    placeholder={key.placeholder}
                    className="input-field pr-10 w-64"
                    value={key.value || ''}
                    onChange={(e) => updateKeyValue(key.key, e.target.value)}
                  />
                  <button
                    type="button"
                    onClick={() => toggleShowKey(key.key)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600"
                  >
                    {showKey[key.key] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {!key.verified && (
                  <button className="px-3 py-2 text-sm text-blue-600 hover:bg-blue-50 rounded-lg">
                    Verify
                  </button>
                )}
                <button className="px-3 py-2 text-sm text-gray-600 hover:bg-gray-200 rounded-lg">
                  <RefreshCw className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* General Settings */}
      <div className="bg-white rounded-xl border">
        <div className="px-6 py-4 border-b">
          <h2 className="text-lg font-semibold">General Settings</h2>
          <p className="text-sm text-gray-500">Configure default behaviors and thresholds</p>
        </div>
        <div className="p-6 space-y-4">
          {generalSettings.map((setting) => (
            <div key={setting.name} className="flex items-center justify-between py-3 border-b last:border-0">
              <div>
                <span className="font-medium text-gray-900">{setting.name}</span>
              </div>
              <div>
                {setting.type === 'toggle' ? (
                  <button
                    onClick={() => updateSetting(setting.name, setting.value === 'true' ? 'false' : 'true')}
                    className={clsx(
                      'relative w-12 h-6 rounded-full transition-colors',
                      setting.value === 'true' ? 'bg-blue-600' : 'bg-gray-300'
                    )}
                  >
                    <span
                      className={clsx(
                        'absolute top-1 w-4 h-4 bg-white rounded-full transition-transform',
                        setting.value === 'true' ? 'translate-x-7' : 'translate-x-1'
                      )}
                    />
                  </button>
                ) : (
                  <input
                    type={setting.type}
                    className="input-field w-32 text-right"
                    value={setting.value}
                    onChange={(e) => updateSetting(setting.name, e.target.value)}
                  />
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Gateway Configuration */}
      <div className="bg-white rounded-xl border">
        <div className="px-6 py-4 border-b">
          <h2 className="text-lg font-semibold">Gateway Configuration</h2>
          <p className="text-sm text-gray-500">LeadOS Gateway connection settings</p>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Gateway URL</label>
              <input
                type="text"
                className="input-field"
                defaultValue="http://localhost:5175"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">API Version</label>
              <select className="input-field">
                <option value="v1">v1.0 (Current)</option>
                <option value="v2">v2.0 (Beta)</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Request Timeout (ms)</label>
              <input
                type="number"
                className="input-field"
                defaultValue="30000"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Retry Attempts</label>
              <input
                type="number"
                className="input-field"
                defaultValue="3"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Notifications */}
      <div className="bg-white rounded-xl border">
        <div className="px-6 py-4 border-b">
          <h2 className="text-lg font-semibold">Notifications</h2>
          <p className="text-sm text-gray-500">Configure email and webhook notifications</p>
        </div>
        <div className="p-6 space-y-4">
          <div className="flex items-center justify-between py-3 border-b">
            <div>
              <span className="font-medium text-gray-900">Daily Summary</span>
              <p className="text-sm text-gray-500">Receive daily lead activity summary</p>
            </div>
            <button className="relative w-12 h-6 rounded-full bg-blue-600">
              <span className="absolute top-1 translate-x-7 w-4 h-4 bg-white rounded-full" />
            </button>
          </div>
          <div className="flex items-center justify-between py-3 border-b">
            <div>
              <span className="font-medium text-gray-900">New Lead Alerts</span>
              <p className="text-sm text-gray-500">Get notified when new hot leads are discovered</p>
            </div>
            <button className="relative w-12 h-6 rounded-full bg-blue-600">
              <span className="absolute top-1 translate-x-7 w-4 h-4 bg-white rounded-full" />
            </button>
          </div>
          <div className="flex items-center justify-between py-3">
            <div>
              <span className="font-medium text-gray-900">Campaign Updates</span>
              <p className="text-sm text-gray-500">Receive campaign performance updates</p>
            </div>
            <button className="relative w-12 h-6 rounded-full bg-gray-300">
              <span className="absolute top-1 translate-x-1 w-4 h-4 bg-white rounded-full" />
            </button>
          </div>
        </div>
      </div>

      {/* Save Button */}
      <div className="flex items-center justify-end gap-4">
        {saved && (
          <span className="flex items-center gap-2 text-green-600">
            <Check className="w-4 h-4" />
            Settings saved successfully
          </span>
        )}
        <button
          onClick={handleSave}
          className="btn-primary"
        >
          Save All Settings
        </button>
      </div>
    </div>
  );
}
