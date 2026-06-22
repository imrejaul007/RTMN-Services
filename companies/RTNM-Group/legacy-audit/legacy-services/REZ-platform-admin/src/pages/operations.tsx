/**
 * COO Dashboard - Operations
 */

export default function OperationsDashboard() {
  const orders = [
    { id: 'ORD-001', customer: 'Priya S.', item: 'Headphones', status: 'delivered', time: '2h' },
    { id: 'ORD-002', customer: 'Rahul V.', item: 'Smart Watch', status: 'shipped', time: '1d' },
    { id: 'ORD-003', customer: 'Anita D.', item: 'Laptop', status: 'processing', time: '3h' }
  ];

  const statusColors: Record<string, string> = {
    delivered: 'bg-green-100 text-green-800',
    shipped: 'bg-blue-100 text-blue-800',
    processing: 'bg-yellow-100 text-yellow-800',
    pending: 'bg-gray-100 text-gray-800'
  };

  return (
    <div className="space-y-6">
      {/* Overview */}
      <div className="grid grid-cols-4 gap-6">
        <Metric title="Orders Today" value="4,523" sub="+12% vs yesterday" />
        <Metric title="Fulfillment Rate" value="94.5%" sub="+2.3% vs target" />
        <Metric title="Avg Delivery Time" value="2.3 hrs" sub="-15% improvement" />
        <Metric title="Pending Orders" value="234" sub="-8% from morning" />
      </div>

      {/* Live Map Placeholder */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="font-semibold">Live Logistics Map</h2>
          <span className="text-sm text-green-600 flex items-center gap-2">
            <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            Live Tracking
          </span>
        </div>
        <div className="h-64 bg-gray-100 rounded-lg flex items-center justify-center">
          <div className="text-center">
            <div className="text-4xl mb-2">🗺️</div>
            <p className="text-gray-500">Map visualization component</p>
            <p className="text-sm text-gray-400">Drivers & deliveries shown here</p>
          </div>
        </div>
      </div>

      {/* Orders Table */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-4 border-b flex justify-between items-center">
          <h2 className="font-semibold">Recent Orders</h2>
          <button className="text-blue-600 text-sm">View All Orders</button>
        </div>
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left">
            <tr>
              <th className="p-3">Order ID</th>
              <th className="p-3">Customer</th>
              <th className="p-3">Item</th>
              <th className="p-3">Status</th>
              <th className="p-3">Time</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((order) => (
              <tr key={order.id} className="border-t">
                <td className="p-3 font-mono">{order.id}</td>
                <td className="p-3">{order.customer}</td>
                <td className="p-3">{order.item}</td>
                <td className="p-3">
                  <span className={`px-2 py-1 rounded text-xs ${statusColors[order.status]}`}>
                    {order.status}
                  </span>
                </td>
                <td className="p-3 text-gray-500">{order.time}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-5 gap-4">
        {[
          { label: 'Pending', count: 234, color: 'bg-yellow-100 border-yellow-300' },
          { label: 'Processing', count: 567, color: 'bg-blue-100 border-blue-300' },
          { label: 'Shipped', count: 1234, color: 'bg-purple-100 border-purple-300' },
          { label: 'Delivered', count: 2456, color: 'bg-green-100 border-green-300' },
          { label: 'Returned', count: 45, color: 'bg-red-100 border-red-300' }
        ].map((stat) => (
          <div key={stat.label} className={`${stat.color} border rounded-lg p-4 text-center`}>
            <p className="text-2xl font-bold">{stat.count.toLocaleString()}</p>
            <p className="text-sm text-gray-600">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Warehouse Status */}
      <div className="grid grid-cols-3 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="font-semibold mb-4">Warehouse Status</h3>
          {[
            { name: 'Mumbai WH', capacity: 78, status: 'operational' },
            { name: 'Delhi WH', capacity: 65, status: 'operational' },
            { name: 'Bangalore WH', capacity: 82, status: 'high_load' }
          ].map((wh) => (
            <div key={wh.name} className="flex items-center justify-between py-2 border-b last:border-0">
              <div>
                <p className="font-medium">{wh.name}</p>
                <p className="text-sm text-gray-500">{wh.capacity}% capacity</p>
              </div>
              <span className={`px-2 py-1 rounded text-xs ${
                wh.status === 'operational' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
              }`}>
                {wh.status}
              </span>
            </div>
          ))}
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="font-semibold mb-4">Delivery Partners</h3>
          {[
            { name: 'BlueDart', active: 45, deliveries: 234 },
            { name: 'Delhivery', active: 38, deliveries: 189 },
            { name: 'DTDC', active: 25, deliveries: 123 }
          ].map((partner) => (
            <div key={partner.name} className="flex items-center justify-between py-2 border-b last:border-0">
              <div>
                <p className="font-medium">{partner.name}</p>
                <p className="text-sm text-gray-500">{partner.active} active</p>
              </div>
              <div className="text-right">
                <p className="font-medium">{partner.deliveries}</p>
                <p className="text-sm text-gray-500">today</p>
              </div>
            </div>
          ))}
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="font-semibold mb-4">Quick Actions</h3>
          <div className="space-y-2">
            <Action icon="📦" label="Create Order" />
            <Action icon="🚚" label="Track Shipment" />
            <Action icon="📍" label="Update Location" />
            <Action icon="📊" label="View Reports" />
          </div>
        </div>
      </div>
    </div>
  );
}

function Metric({ title, value, sub }: { title: string; value: string; sub: string }) {
  return (
    <div className="bg-white rounded-lg shadow p-6">
      <p className="text-sm text-gray-500">{title}</p>
      <p className="text-2xl font-bold mt-1">{value}</p>
      <p className="text-xs text-green-600 mt-1">{sub}</p>
    </div>
  );
}

function Action({ icon, label }: { icon: string; label: string }) {
  return (
    <button className="w-full flex items-center gap-3 p-2 rounded hover:bg-gray-100 text-left">
      <span className="text-lg">{icon}</span>
      <span className="text-sm">{label}</span>
    </button>
  );
}
