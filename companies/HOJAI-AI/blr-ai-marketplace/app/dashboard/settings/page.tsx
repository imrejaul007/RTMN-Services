'use client';

import { useState, useEffect } from 'react';

export default function SettingsPage() {
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [stripeOnboarding, setStripeOnboarding] = useState(false);

  const [settings, setSettings] = useState({
    storeName: 'My AI Store',
    storeUrl: 'https://mystore.hojai.ai',
    supportEmail: 'support@mystore.com',
    publisherName: 'Publisher Name',
    publisherBio: 'AI developer and creator',
    stripeConnected: false,
    stripeAccountId: '',
    stripePayoutsEnabled: false,
    pendingApproval: false,
    notificationEmail: true,
    notificationPayment: true,
    notificationReview: true,
    notificationMarketing: false,
  });

  useEffect(() => {
    // Load settings from localStorage in demo
    const saved = localStorage.getItem('bam_publisher_settings');
    if (saved) {
      setSettings(JSON.parse(saved));
    }
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    // Simulate save
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Save to localStorage in demo
    localStorage.setItem('bam_publisher_settings', JSON.stringify(settings));

    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const handleConnectStripe = async () => {
    setStripeOnboarding(true);
    // In production, redirect to Stripe Connect OAuth
    // const stripe = Stripe(process.env.NEXT_PUBLIC_STRIPE_KEY);
    // const accountLink = await stripe.accountLinks.create({...});
    // window.location.href = accountLink.url;
    alert('In production, this redirects to Stripe Connect onboarding.\n\nTo test locally, use Stripe CLI: stripe login && stripe connect/oauth/token');
  };

  const handleStripeCallback = async () => {
    // Handle Stripe Connect OAuth callback
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');
    const error = params.get('error');

    if (error) {
      alert('Stripe connection failed: ' + error);
      return;
    }

    if (code) {
      // In production, exchange code for account ID
      // const response = await fetch('/api/stripe/connect', { method: 'POST', body: JSON.stringify({ code }) });
      // const data = await response.json();
      setSettings(prev => ({ ...prev, stripeConnected: true, stripeAccountId: 'acct_demo123', stripePayoutsEnabled: true }));
      alert('Stripe connected successfully!');
    }
  };

  const handleRequestApproval = async () => {
    setSaving(true);
    await new Promise(resolve => setTimeout(resolve, 1000));
    setSettings(prev => ({ ...prev, pendingApproval: true }));
    setSaving(false);
    alert('Your publisher application has been submitted for review. We will notify you within 24-48 hours.');
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-slate-900 mb-8">Publisher Settings</h1>

      {/* Publisher Status Banner */}
      <div className={`rounded-xl p-6 mb-8 ${settings.stripeConnected && !settings.pendingApproval ? 'bg-green-50 border border-green-200' : 'bg-amber-50 border border-amber-200'}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className={`w-12 h-12 rounded-full flex items-center justify-center ${settings.stripeConnected && !settings.pendingApproval ? 'bg-green-100' : 'bg-amber-100'}`}>
              <span className="text-2xl">{settings.stripeConnected && !settings.pendingApproval ? '✅' : '⏳'}</span>
            </div>
            <div>
              <h3 className="font-semibold text-slate-900">
                {settings.pendingApproval ? 'Pending Approval' : settings.stripeConnected ? 'Publisher Active' : 'Setup Incomplete'}
              </h3>
              <p className="text-sm text-slate-600">
                {settings.pendingApproval ? 'Your application is under review' : settings.stripeConnected ? 'You can publish and sell AI products' : 'Complete setup to start publishing'}
              </p>
            </div>
          </div>
          {!settings.stripeConnected && !settings.pendingApproval && (
            <button onClick={handleRequestApproval} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium">
              Get Started
            </button>
          )}
        </div>
      </div>

      <form onSubmit={handleSave} className="space-y-8">
        {/* Publisher Profile */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6">
          <h2 className="text-lg font-semibold text-slate-900 mb-6">Publisher Profile</h2>

          <div className="space-y-4">
            <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-lg">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-2xl font-bold">
                {settings.publisherName.charAt(0).toUpperCase()}
              </div>
              <div>
                <button type="button" className="text-blue-600 hover:text-blue-700 text-sm font-medium">
                  Change avatar
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Publisher Name *</label>
                <input type="text" required value={settings.publisherName}
                  onChange={e => setSettings({ ...settings, publisherName: e.target.value })}
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Support Email *</label>
                <input type="email" required value={settings.supportEmail}
                  onChange={e => setSettings({ ...settings, supportEmail: e.target.value })}
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500" />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Bio / Description</label>
              <textarea value={settings.publisherBio} rows={3}
                onChange={e => setSettings({ ...settings, publisherBio: e.target.value })}
                placeholder="Tell buyers about yourself..."
                className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500" />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Store URL</label>
              <input type="url" value={settings.storeUrl}
                onChange={e => setSettings({ ...settings, storeUrl: e.target.value })}
                className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500" />
              <p className="text-xs text-slate-500 mt-1">Your public store URL: bam.hojai.ai/store/{settings.publisherName.toLowerCase().replace(/\s+/g, '-')}</p>
            </div>
          </div>
        </div>

        {/* Stripe Payments */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6">
          <h2 className="text-lg font-semibold text-slate-900 mb-6">Payment Settings</h2>

          {settings.stripeConnected ? (
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-4 bg-green-50 rounded-lg border border-green-200">
                <span className="text-2xl">✅</span>
                <div className="flex-1">
                  <div className="font-semibold text-green-800">Stripe Connected</div>
                  <div className="text-sm text-green-600">Account: {settings.stripeAccountId}</div>
                  {settings.stripePayoutsEnabled && <div className="text-xs text-green-600">Payouts enabled</div>}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 p-4 bg-slate-50 rounded-lg">
                <div>
                  <div className="text-sm text-slate-500">Revenue Share</div>
                  <div className="text-2xl font-bold text-green-600">70%</div>
                </div>
                <div>
                  <div className="text-sm text-slate-500">Platform Fee</div>
                  <div className="text-2xl font-bold text-slate-600">30%</div>
                </div>
              </div>

              <div className="text-sm text-slate-600">
                <p>💰 You receive 70% of each sale directly to your Stripe account.</p>
                <p>📅 Payouts are processed according to your Stripe payout schedule.</p>
              </div>

              <button type="button" onClick={() => setSettings(s => ({ ...s, stripeConnected: false, stripeAccountId: '', stripePayoutsEnabled: false }))}
                className="px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg">
                Disconnect Stripe
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                <h3 className="font-semibold text-blue-900 mb-2">🔗 Connect with Stripe</h3>
                <p className="text-sm text-blue-800 mb-4">
                  Connect your Stripe account to receive payments from your AI product sales.
                  You&apos;ll need a Stripe account to receive payouts.
                </p>
                <div className="flex flex-wrap gap-2 mb-4">
                  <span className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded">Bank transfers</span>
                  <span className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded">Credit cards</span>
                  <span className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded">UPI</span>
                  <span className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded">Net banking</span>
                </div>
              </div>

              <div className="bg-slate-50 p-4 rounded-lg">
                <h4 className="font-medium text-slate-900 mb-2">How it works:</h4>
                <ol className="text-sm text-slate-600 space-y-1">
                  <li>1. Click &quot;Connect with Stripe&quot;</li>
                  <li>2. Create or sign in to your Stripe account</li>
                  <li>3. Authorize BAM to process payments on your behalf</li>
                  <li>4. Start receiving payouts automatically!</li>
                </ol>
              </div>

              <button type="button" onClick={handleConnectStripe} disabled={stripeOnboarding}
                className="w-full px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-medium disabled:opacity-50">
                {stripeOnboarding ? 'Redirecting to Stripe...' : '🔗 Connect with Stripe'}
              </button>

              <p className="text-xs text-slate-500 text-center">
                BAM takes a 30% platform fee. You keep 70% of each sale.
              </p>
            </div>
          )}
        </div>

        {/* Notification Settings */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6">
          <h2 className="text-lg font-semibold text-slate-900 mb-6">Notifications</h2>

          <div className="space-y-4">
            {[
              { key: 'notificationEmail', label: 'Email notifications', desc: 'Receive updates about your listings' },
              { key: 'notificationPayment', label: 'Payment notifications', desc: 'Get notified when you receive payments' },
              { key: 'notificationReview', label: 'Review notifications', desc: 'Get notified when someone reviews your listing' },
              { key: 'notificationMarketing', label: 'Marketing updates', desc: 'Receive tips and best practices' },
            ].map(item => (
              <label key={item.key} className="flex items-center justify-between p-4 bg-slate-50 rounded-lg cursor-pointer hover:bg-slate-100">
                <div>
                  <div className="font-medium text-slate-900">{item.label}</div>
                  <div className="text-sm text-slate-500">{item.desc}</div>
                </div>
                <input type="checkbox" checked={settings[item.key as keyof typeof settings] as boolean}
                  onChange={e => setSettings({ ...settings, [item.key]: e.target.checked })}
                  className="w-5 h-5 rounded text-blue-600" />
              </label>
            ))}
          </div>
        </div>

        {/* Save Button */}
        <div className="flex items-center gap-4">
          <button type="submit" disabled={saving}
            className="px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium disabled:bg-blue-400">
            {saving ? 'Saving...' : 'Save Settings'}
          </button>
          {saved && <span className="text-green-600 font-medium">✓ Saved!</span>}
        </div>
      </form>

      {/* Help Section */}
      <div className="mt-8 p-6 bg-slate-100 rounded-xl">
        <h3 className="font-semibold text-slate-900 mb-2">Need Help?</h3>
        <ul className="text-sm text-slate-600 space-y-1">
          <li>📧 Contact: support@hojai.ai</li>
          <li>📖 Documentation: docs.bam.hojai.ai</li>
          <li>💬 Live Chat: Available 9 AM - 6 PM IST</li>
        </ul>
      </div>
    </div>
  );
}
