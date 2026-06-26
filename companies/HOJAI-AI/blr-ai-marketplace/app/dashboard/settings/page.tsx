'use client';

import { useState } from 'react';

export default function SettingsPage() {
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const [settings, setSettings] = useState({
    storeName: 'My AI Store',
    storeUrl: 'https://mystore.hojai.ai',
    supportEmail: 'support@mystore.com',
    stripeConnected: false,
    stripeAccountId: '',
    notificationEmail: true,
    notificationPayment: true,
    notificationReview: true,
    notificationMarketing: false,
  });

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    // Simulate save
    await new Promise(resolve => setTimeout(resolve, 1000));

    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const handleConnectStripe = async () => {
    // In production, redirect to Stripe Connect OAuth
    alert('In production, this would redirect to Stripe Connect OAuth flow.');
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-slate-900 mb-8">Settings</h1>

      <form onSubmit={handleSave} className="space-y-8">
        {/* Store Settings */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6">
          <h2 className="text-lg font-semibold text-slate-900 mb-6">Store Settings</h2>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Store Name</label>
              <input
                type="text"
                value={settings.storeName}
                onChange={e => setSettings({ ...settings, storeName: e.target.value })}
                className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Store URL</label>
              <input
                type="url"
                value={settings.storeUrl}
                onChange={e => setSettings({ ...settings, storeUrl: e.target.value })}
                className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Support Email</label>
              <input
                type="email"
                value={settings.supportEmail}
                onChange={e => setSettings({ ...settings, supportEmail: e.target.value })}
                className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>

        {/* Stripe Settings */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6">
          <h2 className="text-lg font-semibold text-slate-900 mb-6">Payment Settings</h2>

          {settings.stripeConnected ? (
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-4 bg-green-50 rounded-lg">
                <span className="text-2xl">✅</span>
                <div>
                  <div className="font-semibold text-green-800">Stripe Connected</div>
                  <div className="text-sm text-green-600">Account: {settings.stripeAccountId}</div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSettings({ ...settings, stripeConnected: false, stripeAccountId: '' })}
                className="px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg"
              >
                Disconnect Stripe
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-slate-600">
                Connect your Stripe account to receive payments from your listings.
                You&apos;ll need a Stripe account to receive payouts.
              </p>
              <button
                type="button"
                onClick={handleConnectStripe}
                className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-medium"
              >
                Connect with Stripe
              </button>
              <p className="text-sm text-slate-500">
                BAM takes a 30% platform fee. You keep 70% of each sale.
              </p>
            </div>
          )}
        </div>

        {/* Notifications */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6">
          <h2 className="text-lg font-semibold text-slate-900 mb-6">Notifications</h2>

          <div className="space-y-4">
            {[
              { key: 'notificationEmail', label: 'Email notifications', desc: 'Receive updates about your listings' },
              { key: 'notificationPayment', label: 'Payment notifications', desc: 'Get notified when you receive payments' },
              { key: 'notificationReview', label: 'Review notifications', desc: 'Get notified when someone reviews your listing' },
              { key: 'notificationMarketing', label: 'Marketing updates', desc: 'Receive tips and best practices' },
            ].map(item => (
              <label key={item.key} className="flex items-center justify-between p-4 bg-slate-50 rounded-lg cursor-pointer">
                <div>
                  <div className="font-medium text-slate-900">{item.label}</div>
                  <div className="text-sm text-slate-500">{item.desc}</div>
                </div>
                <input
                  type="checkbox"
                  checked={settings[item.key as keyof typeof settings] as boolean}
                  onChange={e => setSettings({ ...settings, [item.key]: e.target.checked })}
                  className="w-5 h-5 rounded text-blue-600"
                />
              </label>
            ))}
          </div>
        </div>

        {/* Save Button */}
        <div className="flex items-center gap-4">
          <button
            type="submit"
            disabled={saving}
            className="px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium disabled:bg-blue-400"
          >
            {saving ? 'Saving...' : 'Save Settings'}
          </button>
          {saved && <span className="text-green-600 font-medium">✓ Saved!</span>}
        </div>
      </form>
    </div>
  );
}
