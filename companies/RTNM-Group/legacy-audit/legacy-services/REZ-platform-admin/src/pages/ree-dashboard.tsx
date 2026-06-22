/**
 * REZ Platform Admin - REE Services Dashboard
 *
 * Unified control for all REE (RTNM Digital) services
 */

export default function REEDashboard() {
  const services = [
    { name: 'ops-center', port: 3000, status: 'healthy', incidents: 12, escalations: 45 },
    { name: 'trust-platform', port: 3001, status: 'healthy', fraud_blocked: 234, risk_alerts: 89 },
    { name: 'integration-hub', port: '-', status: 'healthy', events: '2.3M', agents: 38 },
    { name: 'growth-engine', port: '-', status: 'healthy', referrals: 12450, viral_coefficient: 1.8 },
    { name: 'logistics-engine', port: '-', status: 'healthy', deliveries: 4523, routes_optimized: 234 },
    { name: 'attribution-engine', port: '-', status: 'healthy', conversions: 8945, roas: 3.2 },
    { name: 'creative-studio', port: '-', status: 'healthy', creatives: 342, templates: 89 },
    { name: 'franchise-mode', port: '-', status: 'healthy', locations: 156, revenue: '₹12L' },
    { name: 'ai-marketplace', port: '-', status: 'healthy', services: 45, subscriptions: 234 },
    { name: 'mind-grocery', port: '-', status: 'healthy', predictions: '89%', waste_reduced: '23%' },
    { name: 'mind-retail', port: '-', status: 'healthy', insights: 234, loss_prevented: '₹45K' },
    { name: 'rto-fraud-prevention', port: '-', status: 'healthy', blocked: 567, score: '0.4s' },
    { name: 'voice-ai', port: '-', status: 'healthy', calls: 1234, sentiment: '94%' }
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">REE Services</h1>
          <p className="text-gray-500">RTNM Digital - Enterprise Operations & Trust</p>
        </div>
        <div className="flex gap-2">
          <select className="border rounded px-3 py-2">
            <option>All Services</option>
            <option>Operations</option>
            <option>Trust & Fraud</option>
            <option>AI & ML</option>
          </select>
          <button className="px-4 py-2 bg-blue-600 text-white rounded">Deploy Service</button>
        </div>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-4 gap-6">
        <StatCard title="Total Services" value="13" icon="⚙️" />
        <StatCard title="Healthy" value="13" icon="✅" sub="100%" />
        <StatCard title="Active Incidents" value="12" icon="🚨" sub="-5 vs yesterday" />
        <StatCard title="Fraud Blocked" value="₹8.2L" icon="🛡️" sub="567 attempts" />
      </div>

      {/* Operations Services */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-4 border-b">
          <h2 className="font-semibold">Operations & Trust</h2>
        </div>
        <div className="grid grid-cols-3 gap-4 p-4">
          {/* Ops Center */}
          <div className="border rounded-lg p-4">
            <div className="flex justify-between items-start mb-3">
              <div>
                <p className="font-semibold">REZ-ops-center</p>
                <p className="text-sm text-gray-500">Port 3000</p>
              </div>
              <span className="px-2 py-1 bg-green-100 text-green-800 rounded text-xs">healthy</span>
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="bg-gray-50 p-2 rounded">
                <p className="text-gray-500">Incidents</p>
                <p className="font-semibold">12</p>
              </div>
              <div className="bg-gray-50 p-2 rounded">
                <p className="text-gray-500">Escalations</p>
                <p className="font-semibold">45</p>
              </div>
              <div className="bg-gray-50 p-2 rounded">
                <p className="text-gray-500">Refunds</p>
                <p className="font-semibold">23</p>
              </div>
              <div className="bg-gray-50 p-2 rounded">
                <p className="text-gray-500">Disputes</p>
                <p className="font-semibold">8</p>
              </div>
            </div>
            <div className="mt-3 flex gap-2">
              <button className="flex-1 px-3 py-1 bg-blue-50 text-blue-600 rounded text-sm">View</button>
              <button className="flex-1 px-3 py-1 bg-gray-100 text-gray-600 rounded text-sm">Logs</button>
            </div>
          </div>

          {/* Trust Platform */}
          <div className="border rounded-lg p-4">
            <div className="flex justify-between items-start mb-3">
              <div>
                <p className="font-semibold">REZ-trust-platform</p>
                <p className="text-sm text-gray-500">Port 3001</p>
              </div>
              <span className="px-2 py-1 bg-green-100 text-green-800 rounded text-xs">healthy</span>
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="bg-gray-50 p-2 rounded">
                <p className="text-gray-500">Fraud Blocked</p>
                <p className="font-semibold">234</p>
              </div>
              <div className="bg-gray-50 p-2 rounded">
                <p className="text-gray-500">Risk Alerts</p>
                <p className="font-semibold">89</p>
              </div>
              <div className="bg-gray-50 p-2 rounded">
                <p className="text-gray-500">AML Flags</p>
                <p className="font-semibold">12</p>
              </div>
              <div className="bg-gray-50 p-2 rounded">
                <p className="text-gray-500">Trust Score</p>
                <p className="font-semibold">94%</p>
              </div>
            </div>
            <div className="mt-3 flex gap-2">
              <button className="flex-1 px-3 py-1 bg-blue-50 text-blue-600 rounded text-sm">View</button>
              <button className="flex-1 px-3 py-1 bg-gray-100 text-gray-600 rounded text-sm">Rules</button>
            </div>
          </div>

          {/* RTO Fraud Prevention */}
          <div className="border rounded-lg p-4">
            <div className="flex justify-between items-start mb-3">
              <div>
                <p className="font-semibold">RTO-fraud-prevention</p>
                <p className="text-sm text-gray-500">Real-time</p>
              </div>
              <span className="px-2 py-1 bg-green-100 text-green-800 rounded text-xs">healthy</span>
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="bg-gray-50 p-2 rounded">
                <p className="text-gray-500">Blocked</p>
                <p className="font-semibold">567</p>
              </div>
              <div className="bg-gray-50 p-2 rounded">
                <p className="text-gray-500">Score Time</p>
                <p className="font-semibold">0.4s</p>
              </div>
              <div className="bg-gray-50 p-2 rounded">
                <p className="text-gray-500">Devices</p>
                <p className="font-semibold">12.4K</p>
              </div>
              <div className="bg-gray-50 p-2 rounded">
                <p className="text-gray-500">Accuracy</p>
                <p className="font-semibold">97.2%</p>
              </div>
            </div>
            <div className="mt-3 flex gap-2">
              <button className="flex-1 px-3 py-1 bg-blue-50 text-blue-600 rounded text-sm">Dashboard</button>
              <button className="flex-1 px-3 py-1 bg-gray-100 text-gray-600 rounded text-sm">Blocklist</button>
            </div>
          </div>
        </div>
      </div>

      {/* Growth & Analytics */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-4 border-b">
          <h2 className="font-semibold">Growth & Analytics</h2>
        </div>
        <div className="grid grid-cols-4 gap-4 p-4">
          <ServiceCard name="integration-hub" events="2.3M" agents={38} />
          <ServiceCard name="growth-engine" referrals="12.5K" coefficient="1.8x" />
          <ServiceCard name="attribution-engine" conversions="8.9K" roas="3.2x" />
          <ServiceCard name="logistics-engine" deliveries="4.5K" optimized={234} />
        </div>
      </div>

      {/* AI Services */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-4 border-b">
          <h2 className="font-semibold">AI Services</h2>
        </div>
        <div className="grid grid-cols-4 gap-4 p-4">
          <ServiceCard name="voice-ai" calls="1.2K" sentiment="94%" />
          <ServiceCard name="mind-grocery" predictions="89%" waste="23%" />
          <ServiceCard name="mind-retail" insights={234} prevented="₹45K" />
          <ServiceCard name="ai-marketplace" services={45} subs={234} />
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="font-semibold mb-4">Quick Actions</h2>
        <div className="grid grid-cols-4 gap-4">
          <ActionButton icon="🔄" label="Sync Services" />
          <ActionButton icon="📊" label="View Reports" />
          <ActionButton icon="⚠️" label="View Alerts" />
          <ActionButton icon="🔒" label="Security Scan" />
        </div>
      </div>
    </div>
  );
}

function StatCard({ title, value, icon, sub }: { title: string; value: string; icon: string; sub?: string }) {
  return (
    <div className="bg-white rounded-lg shadow p-4">
      <div className="flex items-center gap-3">
        <span className="text-2xl">{icon}</span>
        <div>
          <p className="text-2xl font-bold">{value}</p>
          <p className="text-sm text-gray-500">{title}</p>
          {sub && <p className="text-xs text-green-600">{sub}</p>}
        </div>
      </div>
    </div>
  );
}

function ServiceCard({ name, ...metrics }: { name: string; [key: string]: any }) {
  return (
    <div className="border rounded-lg p-3">
      <div className="flex justify-between items-center mb-2">
        <p className="font-medium text-sm">{name}</p>
        <span className="w-2 h-2 bg-green-500 rounded-full"></span>
      </div>
      <div className="grid grid-cols-2 gap-2 text-xs">
        {Object.entries(metrics).slice(0, 4).map(([key, val]) => (
          <div key={key} className="bg-gray-50 p-1 rounded">
            <p className="text-gray-500">{key}</p>
            <p className="font-medium">{val}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function ActionButton({ icon, label }: { icon: string; label: string }) {
  return (
    <button className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg hover:bg-gray-100">
      <span className="text-lg">{icon}</span>
      <span className="text-sm">{label}</span>
    </button>
  );
}
