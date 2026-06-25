'use client';
/**
 * Federation Network — Browse all Nexhas
 * Nexha Portal v2.0
 */

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { federation, type Nexha, type MembershipTier, type MembershipStatus } from '@/lib/federation-api';

const TIER_COLORS: Record<string, string> = {
  founding: 'bg-amber-100 text-amber-800',
  strategic: 'bg-violet-100 text-violet-800',
  standard: 'bg-blue-100 text-blue-800',
  associate: 'bg-gray-100 text-gray-700',
  observer: 'bg-green-50 text-green-700',
};

const STATUS_BADGE: Record<string, string> = {
  active: 'bg-green-900 text-green-300',
  pending: 'bg-yellow-900 text-yellow-300',
  suspended: 'bg-red-900 text-red-300',
  expelled: 'bg-gray-800 text-gray-400',
  churned: 'bg-gray-800 text-gray-500',
};

export default function NetworkPage() {
  const [nexhas, setNexhas] = useState<Nexha[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterTier, setFilterTier] = useState<MembershipTier | ''>('');
  const [filterStatus, setFilterStatus] = useState<MembershipStatus | ''>('');
  const [filterRegion, setFilterRegion] = useState('');
  const [filterCat, setFilterCat] = useState('');
  const [search, setSearch] = useState('');

  useEffect(() => {
    federation.list().then((r) => {
      setNexhas(r.nexhas);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const filtered = nexhas.filter((n) => {
    if (filterTier && n.tier !== filterTier) return false;
    if (filterStatus && n.status !== filterStatus) return false;
    if (filterRegion && n.region !== filterRegion) return false;
    if (filterCat && !n.categories.some((c) => c.includes(filterCat))) return false;
    if (search && !n.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const regions = [...new Set(nexhas.map((n) => n.region))].sort();
  const tiers: MembershipTier[] = ['founding', 'strategic', 'standard', 'associate', 'observer'];
  const statuses: MembershipStatus[] = ['active', 'pending', 'suspended', 'expelled', 'churned'];

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <nav className="border-b border-gray-800 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-2xl">🌐</span>
          <Link href="/federation" className="font-bold text-lg hover:text-violet-300 transition">Nexha Federation</Link>
          <span className="text-gray-600">/ Network</span>
        </div>
        <div className="flex gap-4 text-sm">
          <Link href="/federation/join" className="text-violet-400 hover:underline">Join</Link>
          <Link href="/federation/dashboard" className="text-gray-400 hover:text-white">Dashboard</Link>
        </div>
      </nav>

      <div className="px-6 py-8 max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold">Federation Network</h1>
            <p className="text-gray-400 mt-1">
              {loading ? '...' : `${filtered.length} Nexhas`}
              {filterTier && ` · ${filterTier}`}
              {filterRegion && ` · ${filterRegion}`}
            </p>
          </div>
          <Link
            href="/federation/join"
            className="px-5 py-2.5 rounded-lg bg-violet-600 hover:bg-violet-500 text-white text-sm font-semibold transition"
          >
            + Join Federation
          </Link>
        </div>

        {/* Filters */}
        <div className="bg-gray-900 rounded-xl p-4 border border-gray-800 mb-6 grid grid-cols-2 md:grid-cols-5 gap-3">
          <input
            type="text"
            placeholder="Search by name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-violet-500"
          />
          <select
            value={filterTier}
            onChange={(e) => setFilterTier(e.target.value as MembershipTier | '')}
            className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-violet-500"
          >
            <option value="">All Tiers</option>
            {tiers.map((t) => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
          </select>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as MembershipStatus | '')}
            className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-violet-500"
          >
            <option value="">All Statuses</option>
            {statuses.map((s) => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
          </select>
          <select
            value={filterRegion}
            onChange={(e) => setFilterRegion(e.target.value)}
            className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-violet-500"
          >
            <option value="">All Regions</option>
            {regions.map((r) => <option key={r} value={r}>{r}</option>)}
          </select>
          <input
            type="text"
            placeholder="Category..."
            value={filterCat}
            onChange={(e) => setFilterCat(e.target.value)}
            className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-violet-500"
          />
        </div>

        {/* Grid */}
        {loading ? (
          <div className="text-center text-gray-500 py-20">Loading federation members...</div>
        ) : filtered.length === 0 ? (
          <div className="text-center text-gray-500 py-20">
            No Nexhas match your filters.{' '}
            <button onClick={() => { setFilterTier(''); setFilterStatus(''); setFilterRegion(''); setFilterCat(''); setSearch(''); }}
              className="text-violet-400 hover:underline">Clear filters</button>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((n) => (
              <div key={n.id} className="bg-gray-900 rounded-xl p-5 border border-gray-800 hover:border-violet-600 transition">
                <div className="flex items-start justify-between mb-3">
                  <div className="min-w-0">
                    <div className="font-semibold text-white truncate">{n.name}</div>
                    <div className="text-xs text-gray-500 mt-0.5">{n.id} · {n.region}</div>
                  </div>
                  <div className="flex flex-col items-end gap-1 shrink-0 ml-2">
                    <span className={`text-xs px-2 py-0.5 rounded font-medium ${TIER_COLORS[n.tier]}`}>
                      {n.tier}
                    </span>
                    <span className={`text-xs px-2 py-0.5 rounded ${STATUS_BADGE[n.status]}`}>
                      {n.status}
                    </span>
                  </div>
                </div>
                <p className="text-gray-400 text-sm line-clamp-2 mb-3">{n.description}</p>
                <div className="flex flex-wrap gap-1 mb-3">
                  {n.categories.slice(0, 4).map((cat) => (
                    <span key={cat} className="text-xs bg-gray-800 text-gray-400 px-2 py-0.5 rounded">{cat}</span>
                  ))}
                </div>
                <div className="flex items-center justify-between text-xs text-gray-600">
                  <span>Joined {new Date(n.joinedAt).toLocaleDateString()}</span>
                  <Link href={`/federation/dashboard?nexha=${n.id}`}
                    className="text-violet-400 hover:underline">
                    View →
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
