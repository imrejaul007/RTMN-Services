/**
 * CHRO Dashboard - Human Resources
 */

export default function HRDashboard() {
  const employees = [
    { id: 'EMP-001', name: 'Priya Sharma', dept: 'Engineering', role: 'Senior Engineer', status: 'active' },
    { id: 'EMP-002', name: 'Rahul Verma', dept: 'Marketing', role: 'Manager', status: 'active' },
    { id: 'EMP-003', name: 'Anita Desai', dept: 'Operations', role: 'Team Lead', status: 'active' }
  ];

  const positions = [
    { title: 'Senior Engineer', dept: 'Engineering', applications: 45, status: 'open' },
    { title: 'Product Manager', dept: 'Product', applications: 23, status: 'open' },
    { title: 'Designer', dept: 'Design', applications: 56, status: 'review' }
  ];

  return (
    <div className="space-y-6">
      {/* Overview */}
      <div className="grid grid-cols-4 gap-6">
        <Metric title="Total Employees" value="456" sub="+5 this month" />
        <Metric title="Open Positions" value="23" sub="-3 from last month" />
        <Metric title="Turnover Rate" value="8.5%" sub="-2% YoY" />
        <Metric title="Satisfaction" value="94%" sub="+3%" />
      </div>

      {/* Headcount by Department */}
      <div className="grid grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="font-semibold mb-4">Headcount by Department</h2>
          <div className="space-y-3">
            {[
              { dept: 'Engineering', count: 156, color: 'bg-blue-500' },
              { dept: 'Operations', count: 123, color: 'bg-green-500' },
              { dept: 'Support', count: 89, color: 'bg-purple-500' },
              { dept: 'Marketing', count: 45, color: 'bg-orange-500' },
              { dept: 'Admin', count: 43, color: 'bg-gray-500' }
            ].map(d => (
              <div key={d.dept} className="flex items-center gap-3">
                <span className="w-24 text-sm">{d.dept}</span>
                <div className="flex-1 bg-gray-200 rounded-full h-4">
                  <div
                    className={`${d.color} h-4 rounded-full`}
                    style={{ width: `${(d.count / 160) * 100}%` }}
                  />
                </div>
                <span className="w-12 text-right text-sm">{d.count}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Hiring Pipeline */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="font-semibold mb-4">Hiring Pipeline</h2>
          <div className="space-y-3">
            {[
              { stage: 'Applied', count: 1234, color: 'bg-gray-400' },
              { stage: 'Screening', count: 456, color: 'bg-blue-400' },
              { stage: 'Interview', count: 123, color: 'bg-yellow-400' },
              { stage: 'Offer', count: 45, color: 'bg-green-400' },
              { stage: 'Joined', count: 23, color: 'bg-green-600' }
            ].map(s => (
              <div key={s.stage} className="flex items-center gap-3">
                <div className={`w-24 ${s.color} text-white text-center py-1 rounded text-sm`}>
                  {s.stage}
                </div>
                <div className="flex-1" />
                <span className="text-sm">{s.count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Open Positions */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-4 border-b flex justify-between items-center">
          <h2 className="font-semibold">Open Positions</h2>
          <button className="px-4 py-2 bg-blue-600 text-white rounded text-sm">+ Post Position</button>
        </div>
        {positions.map(pos => (
          <div key={pos.title} className="p-4 border-b last:border-0 flex justify-between items-center">
            <div>
              <p className="font-medium">{pos.title}</p>
              <p className="text-sm text-gray-500">{pos.dept} • {pos.applications} applications</p>
            </div>
            <span className={`px-3 py-1 rounded-full text-sm ${
              pos.status === 'open' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
            }`}>
              {pos.status}
            </span>
          </div>
        ))}
      </div>

      {/* Recent Hires */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-4 border-b">
          <h2 className="font-semibold">Recent Hires</h2>
        </div>
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left">
            <tr>
              <th className="p-3">Employee</th>
              <th className="p-3">Department</th>
              <th className="p-3">Role</th>
              <th className="p-3">Start Date</th>
            </tr>
          </thead>
          <tbody>
            {employees.map(emp => (
              <tr key={emp.id} className="border-t">
                <td className="p-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-gray-200 rounded-full" />
                    <div>
                      <p className="font-medium">{emp.name}</p>
                      <p className="text-xs text-gray-500">{emp.id}</p>
                    </div>
                  </div>
                </td>
                <td className="p-3 text-gray-600">{emp.dept}</td>
                <td className="p-3">{emp.role}</td>
                <td className="p-3 text-gray-600">May 15, 2026</td>
              </tr>
            ))}
          </tbody>
        </table>
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
