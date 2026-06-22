'use client';

interface TopVendor {
  vendorId: string;
  vendorName: string;
  totalOrders: number;
  rating: number;
  revenue: number;
}

interface RevenueService {
  serviceType: string;
  revenue: number;
  orders: number;
}

interface TopServicesTableProps {
  topVendors: TopVendor[];
  revenueByServiceType: RevenueService[];
}

const StarIcon = () => (
  <svg className="w-4 h-4 fill-amber-400 text-amber-400" viewBox="0 0 20 20">
    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
  </svg>
);

const formatCurrency = (value: number) => {
  if (value >= 1000000) return `₹${(value / 1000000).toFixed(1)}M`;
  if (value >= 1000) return `₹${(value / 1000).toFixed(0)}K`;
  return `₹${value.toLocaleString()}`;
};

export default function TopServicesTable({ topVendors, revenueByServiceType }: TopServicesTableProps) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Top Vendors Table */}
      <div className="bg-[#1a1a2e] border border-[#2d2d44] rounded-2xl overflow-hidden">
        <div className="p-6 border-b border-[#2d2d44]">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-white">Top Vendors</h3>
              <p className="text-sm text-gray-400 mt-1">Best performing service providers</p>
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 bg-violet-500/20 rounded-lg">
              <StarIcon />
              <span className="text-sm font-medium text-violet-300">Top Rated</span>
            </div>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[#2d2d44]">
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Vendor
                </th>
                <th className="px-6 py-4 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Orders
                </th>
                <th className="px-6 py-4 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Rating
                </th>
                <th className="px-6 py-4 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Revenue
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#2d2d44]">
              {topVendors.map((vendor, index) => (
                <tr key={vendor.vendorId} className="hover:bg-[#2d2d44]/30 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
                        <span className="text-white text-sm font-bold">
                          {vendor.vendorName.charAt(0)}
                        </span>
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium text-white truncate max-w-[140px]">
                            {vendor.vendorName}
                          </p>
                          {index === 0 && (
                            <span className="px-1.5 py-0.5 text-[10px] font-bold bg-amber-500/20 text-amber-400 rounded">
                              #1
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-gray-500">ID: {vendor.vendorId}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <span className="text-sm font-medium text-white">
                      {vendor.totalOrders.toLocaleString()}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <StarIcon />
                      <span className="text-sm font-medium text-white">{vendor.rating}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <span className="text-sm font-medium text-emerald-400">
                      {formatCurrency(vendor.revenue)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="p-4 border-t border-[#2d2d44] bg-[#13131f]">
          <button className="w-full px-4 py-2 text-sm font-medium text-violet-400 hover:text-violet-300 transition-colors">
            View All Vendors
          </button>
        </div>
      </div>

      {/* Revenue by Service Type Table */}
      <div className="bg-[#1a1a2e] border border-[#2d2d44] rounded-2xl overflow-hidden">
        <div className="p-6 border-b border-[#2d2d44]">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-white">Revenue by Service</h3>
              <p className="text-sm text-gray-400 mt-1">Top revenue generating services</p>
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-500/20 rounded-lg">
              <svg className="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
              <span className="text-sm font-medium text-emerald-300">High Revenue</span>
            </div>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[#2d2d44]">
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Service
                </th>
                <th className="px-6 py-4 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Orders
                </th>
                <th className="px-6 py-4 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Revenue
                </th>
                <th className="px-6 py-4 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Avg Value
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#2d2d44]">
              {revenueByServiceType.map((service, index) => {
                const avgValue = service.orders > 0 ? service.revenue / service.orders : 0;
                return (
                  <tr key={service.serviceType} className="hover:bg-[#2d2d44]/30 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500/20 to-purple-500/20 border border-violet-500/30 flex items-center justify-center">
                          <span className="text-violet-400 text-sm font-bold">
                            {index + 1}
                          </span>
                        </div>
                        <p className="text-sm font-medium text-white truncate max-w-[120px]">
                          {service.serviceType}
                        </p>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span className="text-sm font-medium text-gray-300">
                        {service.orders.toLocaleString()}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span className="text-sm font-medium text-emerald-400">
                        {formatCurrency(service.revenue)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span className="text-sm text-gray-400">
                        {formatCurrency(avgValue)}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="p-4 border-t border-[#2d2d44] bg-[#13131f]">
          <button className="w-full px-4 py-2 text-sm font-medium text-violet-400 hover:text-violet-300 transition-colors">
            View All Services
          </button>
        </div>
      </div>
    </div>
  );
}
