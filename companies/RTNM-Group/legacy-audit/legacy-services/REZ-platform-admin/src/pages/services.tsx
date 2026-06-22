/**
 * Services Management Page
 */

export default function ServicesPage() {
  const services = [
    { name: 'verify-qr', company: 'REZ-Consumer', version: 'v2.0.5', status: 'healthy', latency: 45, uptime: 99.9, deployments: '2h ago' },
    { name: 'safe-qr', company: 'REZ-Consumer', version: 'v1.8.2', status: 'healthy', latency: 38, uptime: 99.8, deployments: '5h ago' },
    { name: 'auth-service', company: 'RABTUL', version: 'v3.2.1', status: 'healthy', latency: 32, uptime: 99.99, deployments: '1d ago' },
    { name: 'payment-service', company: 'RABTUL', version: 'v2.1.0', status: 'healthy', latency: 28, uptime: 99.95, deployments: '2d ago' },
    { name: 'wallet-service', company: 'RABTUL', version: 'v1.9.3', status: 'healthy', latency: 25, uptime: 99.9, deployments: '3d ago' },
    { name: 'cdp-service', company: 'Intelligence', version: 'v3.1.0', status: 'warning', latency: 120, uptime: 98.5, deployments: 'In progress' },
    { name: 'karma-service', company: 'Media', version: 'v1.5.3', status: 'healthy', latency: 35, uptime: 99.8, deployments: '1w ago' },
    { name: 'ai-agent', company: 'Intelligence', version: 'v4.0.1', status: 'healthy', latency: 180, uptime: 99.2, deployments: '1d ago' }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Services</h1>
          <p className="text-gray-500">Manage and monitor all ecosystem services</p>
        </div>
        <button className="px-4 py-2 bg-blue-600 text-white rounded flex items-center gap-2">
          <span>🚀</span>
          Deploy Service
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-6">
        <StatCard title="Total Services" value="169" change="+12" />
        <StatCard title="Healthy" value="165" change="0" />
        <StatCard title="Warning" value="3" change="-1" />
        <StatCard title="Down" value="1" change="+1" />
      </div>

      {/* Services Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="p-4 border-b flex justify-between items-center">
          <input
            type="search"
            placeholder="Search services..."
            className="border rounded px-3 py-2 w-64"
          />
          <div className="flex gap-2">
            <FilterButton active>All</FilterButton>
            <FilterButton>Healthy</FilterButton>
            <FilterButton>Warning</FilterButton>
            <FilterButton>Down</FilterButton>
          </div>
        </div>

        <table className="w-full">
          <thead className="bg-gray-50 text-left text-sm">
            <tr>
              <th className="p-4">Service</th>
              <th className="p-4">Status</th>
              <th className="p-4">Latency</th>
              <th className="p-4">Uptime</th>
              <th className="p-4">Last Deploy</th>
              <th className="p-4">Actions</th>
            </tr>
          </thead>
          <tbody className="text-sm">
            {services.map((svc) => (
              <tr key={svc.name} className="border-t">
                <td className="p-4">
                  <div>
                    <p className="font-medium">{svc.name}</p>
                    <p className="text-gray-500 text-xs">{svc.company}</p>
                  </div>
                </td>
                <td className="p-4">
                  <span className={`px-2 py-1 rounded text-xs ${
                    svc.status === 'healthy' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                  }`}>
                    {svc.status}
                  </span>
                </td>
                <td className="p-4">
                  <div className="flex items-center gap-2">
                    <div className="w-16 bg-gray-200 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full ${
                          svc.latency < 50 ? 'bg-green-500' :
                          svc.latency < 100 ? 'bg-yellow-500' : 'bg-red-500'
                        }`}
                        style={{ width: `${Math.min(svc.latency, 200) / 2}%` }}
                      />
                    </div>
                    <span>{svc.latency}ms</span>
                  </div>
                </td>
                <td className="p-4">{svc.uptime}%</td>
                <td className="p-4 text-gray-500">{svc.deployments}</td>
                <td className="p-4">
                  <div className="flex gap-2">
                    <ActionBtn>Restart</ActionBtn>
                    <ActionBtn>Logs</ActionBtn>
                    <ActionBtn>Settings</ActionBtn>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex justify-between items-center">
        <p className="text-sm text-gray-500">Showing 1-8 of 169 services</p>
        <div className="flex gap-2">
          <PaginationBtn>Previous</PaginationBtn>
          <PaginationBtn active>1</PaginationBtn>
          <PaginationBtn>2</PaginationBtn>
          <PaginationBtn>3</PaginationBtn>
          <PaginationBtn>Next</PaginationBtn>
        </div>
      </div>
    </div>
  );
}

function StatCard({ title, value, change }: { title: string; value: string; change: string }) {
  return (
    <div className="bg-white p-6 rounded-lg shadow">
      <p className="text-sm text-gray-500">{title}</p>
      <p className="text-2xl font-bold mt-1">{value}</p>
      <p className="text-xs text-green-600 mt-1">{change} this month</p>
    </div>
  );
}

function FilterButton({ children, active }: { children: React.ReactNode; active?: boolean }) {
  return (
    <button className={`px-3 py-1 rounded text-sm ${
      active ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-600'
    }`}>
      {children}
    </button>
  );
}

function ActionBtn({ children }: { children: React.ReactNode }) {
  return (
    <button className="px-2 py-1 text-xs text-blue-600 hover:bg-blue-50 rounded">
      {children}
    </button>
  );
}

function PaginationBtn({ children, active }: { children: React.ReactNode; active?: boolean }) {
  return (
    <button className={`px-3 py-1 rounded text-sm ${
      active ? 'bg-blue-600 text-white' : 'bg-gray-100'
    }`}>
      {children}
    </button>
  );
}
