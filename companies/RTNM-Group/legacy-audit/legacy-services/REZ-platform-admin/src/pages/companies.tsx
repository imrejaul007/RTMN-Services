/**
 * Companies Page - Manage all companies
 */

export default function CompaniesPage() {
  const companies = [
    {
      id: 'co_rabtul',
      name: 'RABTUL Technologies',
      slug: 'rabtul',
      type: 'Infrastructure',
      services: 35,
      users: 45,
      revenue: 'Infrastructure',
      status: 'active'
    },
    {
      id: 'co_consumer',
      name: 'REZ-Consumer',
      slug: 'rez-consumer',
      type: 'Consumer',
      services: 15,
      users: 125000,
      revenue: '₹18L/mo',
      status: 'active'
    },
    {
      id: 'co_merchant',
      name: 'REZ-Merchant',
      slug: 'rez-merchant',
      type: 'Merchant',
      services: 20,
      users: 2500,
      revenue: '₹12L/mo',
      status: 'active'
    },
    {
      id: 'co_media',
      name: 'REZ-Media',
      slug: 'rez-media',
      type: 'Media',
      services: 30,
      users: 50000,
      revenue: '₹8.5L/mo',
      status: 'active'
    },
    {
      id: 'co_hospitality',
      name: 'StayOwn-Hospitality',
      slug: 'stayown',
      type: 'Hospitality',
      services: 10,
      users: 5000,
      revenue: '₹4.5L/mo',
      status: 'active'
    },
    {
      id: 'co_corpperks',
      name: 'CorpPerks',
      slug: 'corpperks',
      type: 'Enterprise',
      services: 10,
      users: 456,
      revenue: '₹2.8L/mo',
      status: 'active'
    }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Companies</h1>
          <p className="text-gray-500">Manage ecosystem companies</p>
        </div>
        <button className="px-4 py-2 bg-blue-600 text-white rounded flex items-center gap-2">
          <span>+</span>
          Add Company
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-6">
        <StatCard title="Total Companies" value="6" />
        <StatCard title="Total Services" value="169" />
        <StatCard title="Total Users" value="182K" />
        <StatCard title="Active" value="6" />
      </div>

      {/* Companies Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="p-4 border-b flex justify-between items-center">
          <input
            type="search"
            placeholder="Search companies..."
            className="border rounded px-3 py-2 w-64"
          />
          <div className="flex gap-2">
            <button className="px-3 py-1 bg-blue-600 text-white rounded text-sm">All</button>
            <button className="px-3 py-1 bg-gray-100 rounded text-sm">Active</button>
            <button className="px-3 py-1 bg-gray-100 rounded text-sm">Inactive</button>
          </div>
        </div>

        <table className="w-full">
          <thead className="bg-gray-50 text-left text-sm">
            <tr>
              <th className="p-4">Company</th>
              <th className="p-4">Type</th>
              <th className="p-4">Services</th>
              <th className="p-4">Users</th>
              <th className="p-4">Revenue</th>
              <th className="p-4">Status</th>
              <th className="p-4">Actions</th>
            </tr>
          </thead>
          <tbody className="text-sm">
            {companies.map(company => (
              <tr key={company.id} className="border-t">
                <td className="p-4">
                  <div>
                    <p className="font-medium">{company.name}</p>
                    <p className="text-gray-500 text-xs">/{company.slug}</p>
                  </div>
                </td>
                <td className="p-4 text-gray-600">{company.type}</td>
                <td className="p-4">{company.services}+</td>
                <td className="p-4">{company.users.toLocaleString()}</td>
                <td className="p-4">{company.revenue}</td>
                <td className="p-4">
                  <span className={`px-2 py-1 rounded text-xs ${
                    company.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'
                  }`}>
                    {company.status}
                  </span>
                </td>
                <td className="p-4">
                  <div className="flex gap-2">
                    <button className="text-blue-600 text-sm px-2 py-1 hover:bg-blue-50 rounded">Manage</button>
                    <button className="text-gray-600 text-sm px-2 py-1 hover:bg-gray-100 rounded">Settings</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex justify-between items-center">
        <p className="text-sm text-gray-500">Showing 1-6 of 6 companies</p>
        <div className="flex gap-2">
          <button className="px-3 py-1 bg-gray-100 rounded text-sm">Previous</button>
          <button className="px-3 py-1 bg-blue-600 text-white rounded text-sm">1</button>
          <button className="px-3 py-1 bg-gray-100 rounded text-sm">Next</button>
        </div>
      </div>
    </div>
  );
}

function StatCard({ title, value }: { title: string; value: string }) {
  return (
    <div className="bg-white p-6 rounded-lg shadow">
      <p className="text-sm text-gray-500">{title}</p>
      <p className="text-2xl font-bold mt-1">{value}</p>
    </div>
  );
}
