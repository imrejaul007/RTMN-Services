'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

const MOCK_REVENUE = {
  totalSales: 156,
  grossRevenue: 156000,
  commission: 46800,
  netRevenue: 109200,
};

const MOCK_LISTINGS = [
  { listingId: 'AE001', title: 'AI Sales Manager', status: 'PUBLISHED', views: 1234, installs: 45, revenue: 22500 },
  { listingId: 'AE002', title: 'AI Accountant', status: 'PUBLISHED', views: 987, installs: 32, revenue: 12768 },
  { listingId: 'AE003', title: 'AI Recruiter', status: 'PUBLISHED', views: 756, installs: 28, revenue: 13972 },
  { listingId: 'AE004', title: 'AI Procurement Officer', status: 'DRAFT', views: 234, installs: 0, revenue: 0 },
];

export default function DashboardPage() {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setTimeout(() => setLoading(false), 500);
  }, []);

  const totalViews = MOCK_LISTINGS.reduce((sum, l) => sum + l.views, 0);
  const totalInstalls = MOCK_LISTINGS.reduce((sum, l) => sum + l.installs, 0);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Publisher Dashboard</h1>
          <p className="text-slate-600 mt-1">Manage your listings and track revenue</p>
        </div>
        <div className="flex gap-3">
          <Link href="/dashboard/studio" className="px-4 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-medium flex items-center gap-2">
            🏗️ HOJAI Studio
          </Link>
          <Link href="/dashboard/publish" className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium">
            + Publish New Listing
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <div className="text-3xl mb-2">💰</div>
          <div className="text-2xl font-bold text-slate-900">₹{(MOCK_REVENUE.netRevenue / 100).toLocaleString('en-IN')}</div>
          <div className="text-sm text-slate-500">Net Revenue</div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <div className="text-3xl mb-2">📈</div>
          <div className="text-2xl font-bold text-slate-900">{MOCK_REVENUE.totalSales}</div>
          <div className="text-sm text-slate-500">Total Sales</div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <div className="text-3xl mb-2">👁️</div>
          <div className="text-2xl font-bold text-slate-900">{totalViews.toLocaleString()}</div>
          <div className="text-sm text-slate-500">Total Views</div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <div className="text-3xl mb-2">📥</div>
          <div className="text-2xl font-bold text-slate-900">{totalInstalls}</div>
          <div className="text-sm text-slate-500">Installs</div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <h2 className="text-lg font-semibold text-slate-900 mb-4">Your Listings</h2>
        <table className="w-full">
          <thead>
            <tr className="text-left text-sm text-slate-500 border-b">
              <th className="pb-3">Listing</th>
              <th className="pb-3">Status</th>
              <th className="pb-3 text-right">Views</th>
              <th className="pb-3 text-right">Installs</th>
              <th className="pb-3 text-right">Revenue</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {MOCK_LISTINGS.map(listing => (
              <tr key={listing.listingId} className="text-sm">
                <td className="py-4">
                  <Link href={`/listings/${listing.listingId}`} className="font-medium text-slate-900 hover:text-blue-600">
                    {listing.title}
                  </Link>
                </td>
                <td className="py-4">
                  <span className={`px-2 py-1 text-xs rounded-full ${listing.status === 'PUBLISHED' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-600'}`}>
                    {listing.status}
                  </span>
                </td>
                <td className="py-4 text-right">{listing.views.toLocaleString()}</td>
                <td className="py-4 text-right">{listing.installs}</td>
                <td className="py-4 text-right font-medium">₹{listing.revenue > 0 ? (listing.revenue / 100).toLocaleString('en-IN') : '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
