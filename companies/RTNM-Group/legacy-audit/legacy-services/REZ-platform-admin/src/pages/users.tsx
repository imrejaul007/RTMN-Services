/**
 * Users Page - Manage all users
 */

export default function UsersPage() {
  const users = [
    { id: 'usr_super', name: 'Super Admin', email: 'super@rez.money', role: 'super_admin', company: 'Platform', status: 'active', last: 'Now' },
    { id: 'usr_cfo', name: 'CFO', email: 'cfo@rez.money', role: 'cfo', company: 'Platform', status: 'active', last: '2h ago' },
    { id: 'usr_cto', name: 'CTO', email: 'cto@rez.money', role: 'cto', company: 'Platform', status: 'active', last: '5h ago' },
    { id: 'usr_001', name: 'Priya Sharma', email: 'priya@rez.money', role: 'company_admin', company: 'REZ-Consumer', status: 'active', last: '1d ago' },
    { id: 'usr_002', name: 'Rahul Verma', email: 'rahul@rez.money', role: 'company_cto', company: 'REZ-Merchant', status: 'active', last: '2d ago' }
  ];

  const roleColors: Record<string, string> = {
    super_admin: 'bg-purple-100 text-purple-800',
    cfo: 'bg-blue-100 text-blue-800',
    cto: 'bg-green-100 text-green-800',
    cmo: 'bg-orange-100 text-orange-800',
    coo: 'bg-cyan-100 text-cyan-800',
    chro: 'bg-pink-100 text-pink-800',
    chief_ai_officer: 'bg-indigo-100 text-indigo-800',
    company_admin: 'bg-gray-100 text-gray-800',
    company_cto: 'bg-gray-200 text-gray-800'
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Users</h1>
          <p className="text-gray-500">Manage users and permissions</p>
        </div>
        <button className="px-4 py-2 bg-blue-600 text-white rounded flex items-center gap-2">
          <span>+</span>
          Add User
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-lg shadow">
          <p className="text-sm text-gray-500">Total Users</p>
          <p className="text-2xl font-bold mt-1">456</p>
          <p className="text-xs text-green-600 mt-1">+5 this month</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <p className="text-sm text-gray-500">Active</p>
          <p className="text-2xl font-bold mt-1">423</p>
          <p className="text-xs text-gray-500 mt-1">93%</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <p className="text-sm text-gray-500">Admins</p>
          <p className="text-2xl font-bold mt-1">45</p>
          <p className="text-xs text-gray-500 mt-1">10% of users</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <p className="text-sm text-gray-500">New (30d)</p>
          <p className="text-2xl font-bold mt-1">12</p>
          <p className="text-xs text-gray-500 mt-1">+3 vs last month</p>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="p-4 border-b flex justify-between items-center">
          <input
            type="search"
            placeholder="Search users..."
            className="border rounded px-3 py-2 w-80"
          />
          <div className="flex gap-2">
            <select className="border rounded px-3 py-2 text-sm">
              <option>All Roles</option>
              <option>Super Admin</option>
              <option>C-Suite</option>
              <option>Company Admin</option>
            </select>
            <select className="border rounded px-3 py-2 text-sm">
              <option>All Companies</option>
              <option>RABTUL</option>
              <option>REZ-Consumer</option>
              <option>REZ-Merchant</option>
            </select>
          </div>
        </div>

        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left">
            <tr>
              <th className="p-4">User</th>
              <th className="p-4">Role</th>
              <th className="p-4">Company</th>
              <th className="p-4">Status</th>
              <th className="p-4">Last Active</th>
              <th className="p-4">Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map(user => (
              <tr key={user.id} className="border-t">
                <td className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center font-medium">
                      {user.name[0]}
                    </div>
                    <div>
                      <p className="font-medium">{user.name}</p>
                      <p className="text-gray-500 text-xs">{user.email}</p>
                    </div>
                  </div>
                </td>
                <td className="p-4">
                  <span className={`px-2 py-1 rounded text-xs ${roleColors[user.role]}`}>
                    {user.role.replace(/_/g, ' ')}
                  </span>
                </td>
                <td className="p-4 text-gray-600">{user.company}</td>
                <td className="p-4">
                  <span className={`px-2 py-1 rounded text-xs ${
                    user.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'
                  }`}>
                    {user.status}
                  </span>
                </td>
                <td className="p-4 text-gray-500">{user.last}</td>
                <td className="p-4">
                  <div className="flex gap-2">
                    <button className="px-3 py-1 text-blue-600 bg-blue-50 rounded text-xs hover:bg-blue-100">
                      Edit
                    </button>
                    <button className="px-3 py-1 text-gray-600 bg-gray-50 rounded text-xs hover:bg-gray-100">
                      Permissions
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="p-4 border-t flex justify-between items-center">
          <p className="text-sm text-gray-500">Showing 1-5 of 456 users</p>
          <div className="flex gap-2">
            <button className="px-3 py-1 bg-gray-100 rounded text-sm">Previous</button>
            <button className="px-3 py-1 bg-blue-600 text-white rounded text-sm">1</button>
            <button className="px-3 py-1 bg-gray-100 rounded text-sm">2</button>
            <button className="px-3 py-1 bg-gray-100 rounded text-sm">3</button>
            <button className="px-3 py-1 bg-gray-100 rounded text-sm">Next</button>
          </div>
        </div>
      </div>
    </div>
  );
}
