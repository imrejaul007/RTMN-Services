/**
 * CMO Dashboard - Marketing
 */

export default function MarketingDashboard() {
  const campaigns = [
    { name: 'Summer Sale', budget: 500000, spent: 320000, conversions: 4521, roi: 312 },
    { name: 'New User Acquisition', budget: 250000, spent: 180000, conversions: 2340, roi: 245 },
    { name: 'Brand Awareness', budget: 300000, spent: 150000, conversions: 12500, roi: 180 }
  ];

  return (
    <div className="space-y-6">
      {/* Overview */}
      <div className="grid grid-cols-4 gap-6">
        <Metric title="Active Campaigns" value="12" sub="₹12L budget" />
        <Metric title="Total Reach" value="45L" sub="+22% vs last month" />
        <Metric title="Conversions" value="8.5K" sub="+18% vs target" />
        <Metric title="Avg ROI" value="312%" sub="+45% improvement" />
      </div>

      {/* Karma Program */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold mb-4">Karma Program Overview</h2>
        <div className="grid grid-cols-4 gap-6">
          <KarmaCard title="Points Issued" value="25L" />
          <KarmaCard title="Active Users" value="45K" />
          <KarmaCard title="Redemptions" value="₹12L" />
          <KarmaCard title="Redemption Rate" value="68%" />
        </div>
      </div>

      {/* Campaigns */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-4 border-b flex justify-between items-center">
          <h2 className="font-semibold">Campaigns</h2>
          <button className="px-4 py-2 bg-blue-600 text-white rounded text-sm">+ New Campaign</button>
        </div>
        {campaigns.map((c, i) => (
          <div key={i} className="p-4 border-b last:border-0">
            <div className="flex justify-between items-start mb-3">
              <div>
                <p className="font-medium">{c.name}</p>
                <p className="text-sm text-gray-500">₹{(c.budget / 100000).toFixed(1)}L budget</p>
              </div>
              <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm">
                {c.roi}% ROI
              </span>
            </div>
            <div className="mb-2">
              <div className="flex justify-between text-sm mb-1">
                <span>₹{(c.spent / 1000)}K / ₹{(c.budget / 1000)}K</span>
                <span>{Math.round(c.spent / c.budget * 100)}%</span>
              </div>
              <div className="h-2 bg-gray-200 rounded-full">
                <div
                  className="h-2 bg-blue-500 rounded-full"
                  style={{ width: `${(c.spent / c.budget) * 100}%` }}
                />
              </div>
            </div>
            <p className="text-sm text-gray-500">
              {c.conversions.toLocaleString()} conversions
            </p>
          </div>
        ))}
      </div>

      {/* Channel Performance */}
      <div className="grid grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="font-semibold mb-4">Channel Performance</h2>
          {[
            { channel: 'QR Scans', value: 45000, color: 'bg-blue-500' },
            { channel: 'App Notifications', value: 23000, color: 'bg-green-500' },
            { channel: 'Social Media', value: 18000, color: 'bg-purple-500' },
            { channel: 'Email', value: 8500, color: 'bg-orange-500' }
          ].map((ch) => (
            <div key={ch.channel} className="flex items-center gap-4 mb-3">
              <span className="w-32 text-sm">{ch.channel}</span>
              <div className="flex-1 bg-gray-200 rounded-full h-6">
                <div
                  className={`${ch.color} h-6 rounded-full flex items-center justify-end pr-2 text-white text-sm`}
                  style={{ width: `${(ch.value / 50000) * 100}%` }}
                >
                  {ch.value.toLocaleString()}
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="font-semibold mb-4">Quick Actions</h2>
          <div className="space-y-2">
            <Action icon="📊" label="Create Campaign" />
            <Action icon="🎯" label="Audience Segments" />
            <Action icon="📱" label="Push Notifications" />
            <Action icon="📧" label="Email Campaigns" />
            <Action icon="🎁" label="Karma Rewards" />
          </div>
        </div>
      </div>
    </div>
  );
}

function Metric({ title, value, sub }: { title: string; value: string; sub: string }) {
  return (
    <div className="bg-white p-6 rounded-lg shadow">
      <p className="text-sm text-gray-500">{title}</p>
      <p className="text-2xl font-bold mt-1">{value}</p>
      <p className="text-xs text-green-600 mt-1">{sub}</p>
    </div>
  );
}

function KarmaCard({ title, value }: { title: string; value: string }) {
  return (
    <div className="text-center p-4 bg-gray-50 rounded-lg">
      <p className="text-2xl font-bold text-blue-600">{value}</p>
      <p className="text-sm text-gray-500 mt-1">{title}</p>
    </div>
  );
}

function Action({ icon, label }: { icon: string; label: string }) {
  return (
    <button className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-gray-100 text-left">
      <span className="text-xl">{icon}</span>
      <span className="text-sm">{label}</span>
    </button>
  );
}
