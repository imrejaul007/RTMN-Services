/**
 * CFO Dashboard - Finance
 */

import React, { useState, useEffect } from 'react';

const API = process.env.NEXT_PUBLIC_API || 'http://localhost:4000';

export default function FinanceDashboard() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchFinance();
  }, []);

  async function fetchFinance() {
    const token = localStorage.getItem('platform_token');
    try {
      const res = await fetch(`${API}/api/finance/revenue`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        setData(await res.json());
      }
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  }

  if (loading) return <div className="p-8">Loading...</div>;

  return (
    <div className="space-y-6">
      {/* Revenue Overview */}
      <div className="grid grid-cols-4 gap-6">
        <MetricCard title="Total Revenue" value="₹4.58 Cr" change={15.3} />
        <MetricCard title="This Month" value="₹48.5 L" change={12.1} />
        <MetricCard title="Budget" value="₹50 L" change={-3.5} />
        <MetricCard title="Run Rate" value="₹58 L" change={22} />
      </div>

      {/* Revenue Trend */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-lg font-semibold mb-4">Revenue Trend (12 months)</h2>
        <div className="h-64 flex items-end justify-around gap-2">
          {[38, 42, 40, 45, 44, 48, 52, 50, 55, 58, 56, 62].map((val, i) => (
            <div key={i} className="flex flex-col items-center gap-2">
              <div
                className="w-8 bg-blue-500 rounded-t"
                style={{ height: `${val * 3}px` }}
              />
              <span className="text-xs text-gray-500">
                {['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][i]}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* By Company */}
      <div className="grid grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-lg font-semibold mb-4">Revenue by Company</h2>
          <div className="space-y-4">
            {[
              { name: 'RABTUL Tech', value: 18, color: 'bg-blue-500' },
              { name: 'REZ Consumer', value: 15, color: 'bg-green-500' },
              { name: 'REZ Merchant', value: 12, color: 'bg-purple-500' },
              { name: 'REZ Media', value: 8, color: 'bg-orange-500' },
              { name: 'StayOwn', value: 4, color: 'bg-pink-500' }
            ].map((item) => (
              <div key={item.name}>
                <div className="flex justify-between text-sm mb-1">
                  <span>{item.name}</span>
                  <span className="font-medium">₹{item.value}L</span>
                </div>
                <div className="h-2 bg-gray-200 rounded-full">
                  <div
                    className={`h-2 ${item.color} rounded-full`}
                    style={{ width: `${item.value * 2}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Top Metrics */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-lg font-semibold mb-4">Financial Health</h2>
          <table className="w-full text-sm">
            <tbody>
              <tr className="border-b">
                <td className="py-3">Gross Margin</td>
                <td className="text-right font-medium">42%</td>
                <td className="text-right text-green-600">+2.5%</td>
              </tr>
              <tr className="border-b">
                <td className="py-3">Net Margin</td>
                <td className="text-right font-medium">18%</td>
                <td className="text-right text-red-600">-1.2%</td>
              </tr>
              <tr className="border-b">
                <td className="py-3">Burn Rate</td>
                <td className="text-right font-medium">₹15L/mo</td>
                <td className="text-right text-yellow-600">On track</td>
              </tr>
              <tr className="border-b">
                <td className="py-3">Runway</td>
                <td className="text-right font-medium">24 months</td>
                <td className="text-right text-green-600">Healthy</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Recent Transactions */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-4 border-b flex justify-between">
          <h2 className="text-lg font-semibold">Recent Transactions</h2>
          <button className="text-blue-600 text-sm">View All</button>
        </div>
        <table className="w-full">
          <thead className="bg-gray-50 text-left text-sm">
            <tr>
              <th className="p-3">Date</th>
              <th className="p-3">Description</th>
              <th className="p-3">Company</th>
              <th className="p-3 text-right">Amount</th>
            </tr>
          </thead>
          <tbody className="text-sm">
            <tr className="border-t">
              <td className="p-3">May 18</td>
              <td className="p-3">Subscription Revenue</td>
              <td className="p-3">REZ Consumer</td>
              <td className="p-3 text-right text-green-600">+₹2,45,000</td>
            </tr>
            <tr className="border-t">
              <td className="p-3">May 18</td>
              <td className="p-3">Service Fee</td>
              <td className="p-3">All Companies</td>
              <td className="p-3 text-right text-green-600">+₹45,000</td>
            </tr>
            <tr className="border-t">
              <td className="p-3">May 17</td>
              <td className="p-3">Infrastructure Cost</td>
              <td className="p-3">RABTUL</td>
              <td className="p-3 text-right text-red-600">-₹1,20,000</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

function MetricCard({ title, value, change }: { title: string; value: string; change: number }) {
  return (
    <div className="bg-white p-6 rounded-lg shadow">
      <p className="text-sm text-gray-500">{title}</p>
      <p className="text-2xl font-bold mt-1">{value}</p>
      <p className={`text-sm mt-1 ${change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
        {change >= 0 ? '+' : ''}{change}%
      </p>
    </div>
  );
}
