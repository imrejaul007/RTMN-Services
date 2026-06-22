/**
 * REZ Platform Admin - Cost Analytics
 *
 * Tracks and analyzes:
 * - Infrastructure costs
 * - Service costs
 * - API usage costs
 * - Revenue vs costs
 * - Cost per company
 * - Cost optimization recommendations
 */

export default function CostAnalytics() {
  const costs = {
    total: 125000,
    previousMonth: 118000,
    change: 5.9
  };

  const costBreakdown = [
    { category: 'Compute', amount: 45000, percent: 36, color: 'bg-blue-500' },
    { category: 'Storage', amount: 25000, percent: 20, color: 'bg-green-500' },
    { category: 'Network', amount: 20000, percent: 16, color: 'bg-purple-500' },
    { category: 'AI/ML', amount: 18000, percent: 14, color: 'bg-orange-500' },
    { category: 'Database', amount: 12000, percent: 10, color: 'bg-pink-500' },
    { category: 'Other', amount: 5000, percent: 4, color: 'bg-gray-500' }
  ];

  const companyCosts = [
    { company: 'RABTUL', cost: 35000, users: 45, costPerUser: 778 },
    { company: 'REZ-Consumer', cost: 28000, users: 125000, costPerUser: 0.22 },
    { company: 'REZ-Merchant', cost: 22000, users: 2500, costPerUser: 8.80 },
    { company: 'REZ-Media', cost: 18000, users: 50000, costPerUser: 0.36 },
    { company: 'StayOwn', cost: 12000, users: 5000, costPerUser: 2.40 },
    { company: 'CorpPerks', cost: 10000, users: 456, costPerUser: 21.93 }
  ];

  const serviceCosts = [
    { service: 'AI/ML Services', calls: 2500000, costPerCall: 0.001, total: 2500 },
    { service: 'CDP Service', calls: 1500000, costPerCall: 0.0008, total: 1200 },
    { service: 'Signal Aggregator', calls: 3200000, costPerCall: 0.0005, total: 1600 },
    { service: 'Payment Service', calls: 850000, costPerCall: 0.002, total: 1700 },
    { service: 'Verify QR', calls: 450000, costPerCall: 0.0015, total: 675 }
  ];

  const monthlyTrend = [
    { month: 'Jan', cost: 98000 },
    { month: 'Feb', cost: 102000 },
    { month: 'Mar', cost: 108000 },
    { month: 'Apr', cost: 115000 },
    { month: 'May', cost: 118000 },
    { month: 'Jun', cost: 125000 }
  ];

  const recommendations = [
    { priority: 'HIGH', title: 'Scale down AI/ML during off-peak', savings: '₹8,500/mo' },
    { priority: 'MEDIUM', title: 'Archive old logs older than 90 days', savings: '₹3,200/mo' },
    { priority: 'MEDIUM', title: 'Use reserved instances for compute', savings: '₹5,000/mo' },
    { priority: 'LOW', title: 'Optimize CDN usage', savings: '₹1,500/mo' }
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Cost Analytics</h1>
          <p className="text-gray-500">Platform infrastructure costs and optimization</p>
        </div>
        <div className="flex gap-2">
          <select className="border rounded px-3 py-2">
            <option>Last 30 days</option>
            <option>Last 90 days</option>
            <option>Last 12 months</option>
          </select>
          <button className="px-4 py-2 bg-blue-600 text-white rounded">Export Report</button>
        </div>
      </div>

      {/* Overview */}
      <div className="grid grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <p className="text-sm text-gray-500">Total Monthly Cost</p>
          <p className="text-3xl font-bold mt-1">₹{costs.total.toLocaleString()}</p>
          <p className="text-sm text-red-600 mt-1">+{costs.change}% vs last month</p>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <p className="text-sm text-gray-500">Cost Per User</p>
          <p className="text-3xl font-bold mt-1">₹{Math.round(costs.total / 182000).toFixed(2)}</p>
          <p className="text-sm text-gray-500 mt-1">182K total users</p>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <p className="text-sm text-gray-500">API Calls</p>
          <p className="text-3xl font-bold mt-1">{(125000 / 1000000).toFixed(2)}M</p>
          <p className="text-sm text-green-600 mt-1">+12% vs last month</p>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <p className="text-sm text-gray-500">Potential Savings</p>
          <p className="text-3xl font-bold mt-1 text-green-600">₹18,200</p>
          <p className="text-sm text-gray-500 mt-1">14% of current cost</p>
        </div>
      </div>

      {/* Cost Breakdown */}
      <div className="grid grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-4">Cost by Category</h2>
          <div className="space-y-4">
            {costBreakdown.map(item => (
              <div key={item.category}>
                <div className="flex justify-between mb-1">
                  <span className="text-sm">{item.category}</span>
                  <span className="text-sm font-medium">₹{item.amount.toLocaleString()} ({item.percent}%)</span>
                </div>
                <div className="h-2 bg-gray-200 rounded-full">
                  <div className={`h-2 ${item.color} rounded-full`} style={{ width: `${item.percent}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-4">Monthly Trend</h2>
          <div className="h-48 flex items-end justify-around gap-2">
            {monthlyTrend.map((item, i) => (
              <div key={item.month} className="flex flex-col items-center gap-1">
                <div
                  className="w-12 bg-blue-500 rounded-t"
                  style={{ height: `${(item.cost / 130000) * 100}%` }}
                />
                <span className="text-xs text-gray-500">{item.month}</span>
              </div>
            ))}
          </div>
          <p className="text-center text-sm text-gray-500 mt-4">
            Total growth: +{(125000 / 98000 - 1) * 100}% over 6 months
          </p>
        </div>
      </div>

      {/* Cost by Company */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-4 border-b">
          <h2 className="text-lg font-semibold">Cost by Company</h2>
        </div>
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="p-3 text-left">Company</th>
              <th className="p-3 text-right">Total Cost</th>
              <th className="p-3 text-right">Users</th>
              <th className="p-3 text-right">Cost/User</th>
              <th className="p-3 text-right">% of Total</th>
            </tr>
          </thead>
          <tbody>
            {companyCosts.map(c => (
              <tr key={c.company} className="border-t">
                <td className="p-3 font-medium">{c.company}</td>
                <td className="p-3 text-right">₹{c.cost.toLocaleString()}</td>
                <td className="p-3 text-right">{c.users.toLocaleString()}</td>
                <td className="p-3 text-right">₹{c.costPerUser.toFixed(2)}</td>
                <td className="p-3 text-right">{Math.round(c.cost / costs.total * 100)}%</td>
              </tr>
            ))}
          </tbody>
          <tfoot className="bg-gray-50 font-semibold">
            <tr>
              <td className="p-3">Total</td>
              <td className="p-3 text-right">₹{costs.total.toLocaleString()}</td>
              <td className="p-3 text-right">182K</td>
              <td className="p-3 text-right">-</td>
              <td className="p-3 text-right">100%</td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Service Costs */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-4 border-b">
          <h2 className="text-lg font-semibold">API/Service Costs</h2>
        </div>
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="p-3 text-left">Service</th>
              <th className="p-3 text-right">API Calls</th>
              <th className="p-3 text-right">Cost/Call</th>
              <th className="p-3 text-right">Total Cost</th>
            </tr>
          </thead>
          <tbody>
            {serviceCosts.map(s => (
              <tr key={s.service} className="border-t">
                <td className="p-3 font-medium">{s.service}</td>
                <td className="p-3 text-right">{s.calls.toLocaleString()}</td>
                <td className="p-3 text-right">₹{s.costPerCall.toFixed(4)}</td>
                <td className="p-3 text-right font-medium">₹{s.total.toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Recommendations */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold mb-4">Cost Optimization Recommendations</h2>
        <div className="space-y-3">
          {recommendations.map((rec, i) => (
            <div key={i} className="flex items-center justify-between p-4 border rounded-lg">
              <div className="flex items-center gap-4">
                <span className={`px-2 py-1 rounded text-xs ${
                  rec.priority === 'HIGH' ? 'bg-red-100 text-red-800' :
                  rec.priority === 'MEDIUM' ? 'bg-yellow-100 text-yellow-800' :
                  'bg-gray-100 text-gray-800'
                }`}>
                  {rec.priority}
                </span>
                <span className="font-medium">{rec.title}</span>
              </div>
              <span className="text-green-600 font-medium">{rec.savings}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
