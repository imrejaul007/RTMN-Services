'use client';

import { useState } from 'react';

const MOCK_PUBLISHERS = [
  { id: 'pub_001', name: 'HOJAI AI', email: 'contact@hojai.ai', status: 'approved' },
  { id: 'pub_002', name: 'Nexha Labs', email: 'hello@nexha.io', status: 'approved' },
  { id: 'pub_003', name: 'Startup Labs', email: 'team@startuplabs.com', status: 'pending' },
  { id: 'pub_004', name: 'AI Solutions', email: 'contact@aisolutions.com', status: 'pending' },
];

const MOCK_LISTINGS = [
  { id: 'lst_001', title: 'AI Sales Manager', publisher: 'HOJAI AI', status: 'approved' },
  { id: 'lst_002', title: 'Restaurant Manager AI', publisher: 'Nexha Labs', status: 'approved' },
  { id: 'lst_003', title: 'AI Recruiter Pro', publisher: 'Startup Labs', status: 'pending_review' },
  { id: 'lst_004', title: 'Customer Support Bot', publisher: 'AI Solutions', status: 'pending_review' },
  { id: 'lst_005', title: 'HR Assistant AI', publisher: 'Startup Labs', status: 'pending_review' },
];

export default function ModerationPage() {
  const [tab, setTab] = useState<'listings' | 'publishers'>('listings');
  const [listings, setListings] = useState(MOCK_LISTINGS);
  const [publishers] = useState(MOCK_PUBLISHERS);

  const pendingListings = listings.filter(l => l.status === 'pending_review');
  const pendingPublishers = publishers.filter(p => p.status === 'pending');

  const approve = (id: string) => setListings(listings.map(l => l.id === id ? { ...l, status: 'approved' } : l));
  const reject = (id: string) => setListings(listings.map(l => l.id === id ? { ...l, status: 'rejected' } : l));

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-slate-900 mb-8">Moderation Dashboard</h1>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-white rounded-xl border p-6 text-center">
          <div className="text-3xl font-bold text-blue-600">{pendingListings.length}</div>
          <div className="text-sm text-slate-500">Pending Listings</div>
        </div>
        <div className="bg-white rounded-xl border p-6 text-center">
          <div className="text-3xl font-bold text-amber-600">{pendingPublishers.length}</div>
          <div className="text-sm text-slate-500">Pending Publishers</div>
        </div>
        <div className="bg-white rounded-xl border p-6 text-center">
          <div className="text-3xl font-bold text-green-600">{listings.filter(l => l.status === 'approved').length}</div>
          <div className="text-sm text-slate-500">Approved</div>
        </div>
        <div className="bg-white rounded-xl border p-6 text-center">
          <div className="text-3xl font-bold text-red-600">{listings.filter(l => l.status === 'rejected').length}</div>
          <div className="text-sm text-slate-500">Rejected</div>
        </div>
      </div>

      <div className="flex gap-4 mb-6 border-b">
        <button onClick={() => setTab('listings')}
          className={`pb-3 px-2 font-medium ${tab === 'listings' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-slate-500'}`}>
          Listings ({pendingListings.length})
        </button>
        <button onClick={() => setTab('publishers')}
          className={`pb-3 px-2 font-medium ${tab === 'publishers' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-slate-500'}`}>
          Publishers ({pendingPublishers.length})
        </button>
      </div>

      {tab === 'listings' && (
        <div className="space-y-4">
          {pendingListings.length === 0 ? (
            <div className="bg-white rounded-xl border p-12 text-center">
              <div className="text-4xl mb-4">✅</div>
              <p className="text-slate-600">All listings reviewed!</p>
            </div>
          ) : pendingListings.map(listing => (
            <div key={listing.id} className="bg-white rounded-xl border p-6 flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-slate-900">{listing.title}</h3>
                <p className="text-sm text-slate-500">by {listing.publisher}</p>
              </div>
              <div className="flex gap-2">
                <button onClick={() => approve(listing.id)} className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">✓ Approve</button>
                <button onClick={() => reject(listing.id)} className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700">✕ Reject</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === 'publishers' && (
        <div className="space-y-4">
          {pendingPublishers.length === 0 ? (
            <div className="bg-white rounded-xl border p-12 text-center">
              <div className="text-4xl mb-4">✅</div>
              <p className="text-slate-600">No pending applications!</p>
            </div>
          ) : pendingPublishers.map(pub => (
            <div key={pub.id} className="bg-white rounded-xl border p-6 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold">{pub.name.charAt(0)}</div>
                <div>
                  <h3 className="font-semibold text-slate-900">{pub.name}</h3>
                  <p className="text-sm text-slate-500">{pub.email}</p>
                </div>
              </div>
              <div className="flex gap-2">
                <button className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">✓ Approve</button>
                <button className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700">✕ Reject</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
