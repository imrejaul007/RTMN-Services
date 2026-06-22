/**
 * Audit Logs Page - View all admin actions
 */

export default function AuditLogs() {
  const logs = [
    { id: 'log_001', action: 'POST /api/users', user: 'super@rez.money', role: 'super_admin', company: 'Platform', status: 201, time: '2 min ago' },
    { id: 'log_002', action: 'GET /api/companies', user: 'cfo@rez.money', role: 'cfo', company: 'Platform', status: 200, time: '5 min ago' },
    { id: 'log_003', action: 'POST /api/services/restart', user: 'cto@rez.money', role: 'cto', company: 'Platform', status: 200, time: '15 min ago' },
    { id: 'log_004', action: 'PATCH /api/users/role', user: 'super@rez.money', role: 'super_admin', company: 'Platform', status: 200, time: '1h ago' },
    { id: 'log_005', action: 'DELETE /api/company', user: 'super@rez.money', role: 'super_admin', company: 'Platform', status: 200, time: '2h ago' }
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Audit Logs</h1>
        <button className="px-4 py-2 bg-blue-600 text-white rounded">Export CSV</button>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="p-4 border-b flex gap-4">
          <input placeholder="Search logs..." className="border rounded px-3 py-2 flex-1" />
          <select className="border rounded px-3 py-2">
            <option>All Roles</option>
            <option>Super Admin</option>
            <option>CFO</option>
            <option>CTO</option>
          </select>
          <select className="border rounded px-3 py-2">
            <option>All Companies</option>
          </select>
        </div>

        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="p-3 text-left">Action</th>
              <th className="p-3 text-left">User</th>
              <th className="p-3 text-left">Role</th>
              <th className="p-3 text-left">Company</th>
              <th className="p-3 text-left">Status</th>
              <th className="p-3 text-left">Time</th>
            </tr>
          </thead>
          <tbody>
            {logs.map(log => (
              <tr key={log.id} className="border-t">
                <td className="p-3 font-mono text-xs">{log.action}</td>
                <td className="p-3">{log.user}</td>
                <td className="p-3">
                  <span className={`px-2 py-1 rounded text-xs ${
                    log.role === 'super_admin' ? 'bg-purple-100 text-purple-800' : 'bg-gray-100 text-gray-800'
                  }`}>{log.role}</span>
                </td>
                <td className="p-3 text-gray-600">{log.company}</td>
                <td className="p-3">
                  <span className={`px-2 py-1 rounded text-xs ${
                    log.status < 300 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                  }`}>{log.status}</span>
                </td>
                <td className="p-3 text-gray-500">{log.time}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
