/**
 * API Keys Page - Manage API access
 */

export default function APIKeysPage() {
  const keys = [
    { id: 'ak_001', name: 'Production Key', user: 'cfo@rez.money', scopes: ['finance.view', 'reports'], services: ['Finance API'], status: 'active', last: '2h ago' },
    { id: 'ak_002', name: 'Development Key', user: 'cto@rez.money', scopes: ['tech.*'], services: ['All Services'], status: 'active', last: '5h ago' },
    { id: 'ak_003', name: 'Analytics Key', user: 'cmo@rez.money', scopes: ['analytics.*'], services: ['Analytics API'], status: 'active', last: '1d ago' },
    { id: 'ak_004', name: 'Old Key', user: 'old@rez.money', scopes: ['*'], services: ['All Services'], status: 'expired', last: '30d ago' }
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">API Keys</h1>
          <p className="text-gray-500">Manage API access tokens</p>
        </div>
        <button className="px-4 py-2 bg-blue-600 text-white rounded">+ Create Key
        </button>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="p-4 border-b flex gap-4">
          <input placeholder="Search keys..." className="border rounded px-3 py-2 flex-1" />
          <select className="border rounded px-3 py-2">
            <option>All Services</option>
            <option>Active</option>
            <option>Expired</option>
          </select>
        </div>

        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left">
            <tr>
              <th className="p-3">Name</th>
              <th className="p-3">User</th>
              <th className="p-3">Scopes</th>
              <th className="p-3">Status</th>
              <th className="p-3">Last Used</th>
              <th className="p-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {keys.map(key => (
              <tr key={key.id} className="border-t">
                <td className="p-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-gray-100 rounded flex items-center justify-center">🔑</div>
                    <div>
                      <p className="font-medium">{key.name}</p>
                      <p className="text-xs text-gray-500 font-mono">{key.id}</p>
                    </div>
                  </div>
                </td>
                <td className="p-3 text-gray-600">{key.user}</td>
                <td className="p-3">
                  <div className="flex flex-wrap gap-1">
                    {key.scopes.map(scope => (
                      <span key={scope} className="px-2 py-1 bg-gray-100 rounded text-xs">{scope}</span>
                    ))}
                  </div>
                </td>
                <td className="p-3">
                  <span className={`px-2 py-1 rounded text-xs ${
                    key.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                  }`}>
                    {key.status}
                  </span>
                </td>
                <td className="p-3 text-gray-500">{key.last}</td>
                <td className="p-3">
                  <button className="px-3 py-1 text-blue-600 bg-blue-50 rounded text-xs">Copy</button>
                  <button className="ml-1 px-3 py-1 text-red-600 bg-red-50 rounded text-xs">Revoke</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
