'use client';
/**
 * Federation — Homepage
 * Nexha Portal v2.0
 * Shows federation overview: stats, health score, featured members, how to join.
 */

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { federation, type FederationHealth, type FederationStats, type Nexha } from '@/lib/federation-api';

const TIER_COLORS: Record<string, string> = {
  founding: 'bg-amber-100 text-amber-800 border-amber-300',
  strategic: 'bg-violet-100 text-violet-800 border-violet-300',
  standard: 'bg-blue-100 text-blue-800 border-blue-300',
  associate: 'bg-gray-100 text-gray-700 border-gray-300',
  observer: 'bg-green-50 text-green-700 border-green-200',
};

const TIER_LABELS: Record<string, string> = {
  founding: '🏆 Founding',
  strategic: '⭐ Strategic',
  standard: '✓ Standard',
  associate: '⚡ Associate',
  observer: '👁 Observer',
};

export default function FederationPage() {
  const [health, setHealth] = useState<FederationHealth | null>(null);
  const [stats, setStats] = useState<FederationStats | null>(null);
  const [featured, setFeatured] = useState<Nexha[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      federation.health().catch(() => null),
      federation.stats().catch(() => null),
      federation.list({ status: 'active' }).catch(() => null),
    ]).then(([h, s, list]) => {
      setHealth(h);
      setStats(s);
      if (list?.nexhas) setFeatured(list.nexhas.slice(0, 6));
      setLoading(false);
    });
  }, []);

  const healthScore = health?.score ?? 0;
  const healthColor = healthScore >= 80 ? 'text-green-600' : healthScore >= 50 ? 'text-amber-600' : 'text-red-600';

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Nav */}
      <nav className="border-b border-gray-800 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-2xl">🌐</span>
          <span className="font-bold text-lg">Nexha Federation</span>
        </div>
        <div className="flex gap-4 text-sm">
          <Link href="/federation/network" className="text-gray-400 hover:text-white transition">Network</Link>
          <Link href="/federation/join" className="text-gray-400 hover:text-white transition">Join</Link>
          <Link href="/federation/dashboard" className="text-gray-400 hover:text-white transition">Dashboard</Link>
        </div>
      </nav>

      {/* Hero */}
      <div className="px-6 py-20 max-w-6xl mx-auto text-center">
        <div className="inline-block mb-4 px-4 py-1.5 rounded-full bg-violet-950 border border-violet-800 text-violet-300 text-sm">
          🌐 The Autonomous Business Network
        </div>
        <h1 className="text-5xl font-bold mb-6 leading-tight">
          Join the <span className="text-violet-400">Nexha Federation</span>
        </h1>
        <p className="text-xl text-gray-400 max-w-2xl mx-auto mb-10">
          The world&apos;s first autonomous business network. AI agents negotiate,
          trade, and collaborate across 100+ independent business networks — all
          governed by federated policies, not a central authority.
        </p>
        <div className="flex gap-4 justify-center">
          <Link
            href="/federation/join"
            className="px-8 py-3 rounded-lg bg-violet-600 hover:bg-violet-500 text-white font-semibold transition"
          >
            Apply to Join
          </Link>
          <Link
            href="/federation/network"
            className="px-8 py-3 rounded-lg border border-gray-700 hover:border-gray-500 text-gray-300 font-semibold transition"
          >
            Browse Network
          </Link>
        </div>
      </div>

      {/* Stats */}
      <div className="px-6 py-16 bg-gray-900 border-y border-gray-800">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-2xl font-bold mb-8 text-center">Federation at a Glance</h2>
          {loading ? (
            <div className="text-center text-gray-500 py-12">Loading...</div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              <StatCard label="Member Nexhas" value={stats?.totalNexhas ?? '—'} />
              <StatCard label="Active Handshakes" value={stats?.activeHandshakes ?? '—'} />
              <StatCard label="Regions" value={stats?.regions.length ?? '—'} sub={stats?.regions.slice(0, 3).join(', ')} />
              <StatCard label="Governance Policies" value={stats?.totalPolicies ?? '—'} />
            </div>
          )}
        </div>
      </div>

      {/* Health Score */}
      <div className="px-6 py-16 max-w-6xl mx-auto">
        <h2 className="text-2xl font-bold mb-8 text-center">Federation Health</h2>
        {loading ? (
          <div className="text-center text-gray-500 py-12">Loading...</div>
        ) : health ? (
          <div className="grid md:grid-cols-3 gap-6">
            {/* Score */}
            <div className="bg-gray-900 rounded-xl p-8 border border-gray-800 text-center">
              <div className={`text-7xl font-bold ${healthColor}`}>{health.score}</div>
              <div className="text-gray-400 mt-2">/ 100</div>
              <div className="mt-4 inline-flex items-center gap-2 px-3 py-1 rounded-full bg-gray-800 text-sm">
                <span className={`w-2 h-2 rounded-full ${health.status === 'healthy' ? 'bg-green-500' : health.status === 'degraded' ? 'bg-amber-500' : 'bg-red-500'}`} />
                {health.status.charAt(0).toUpperCase() + health.status.slice(1)}
              </div>
            </div>
            {/* Checks */}
            <div className="md:col-span-2 bg-gray-900 rounded-xl p-6 border border-gray-800">
              <div className="space-y-3">
                {health.checks.map((check) => (
                  <div key={check.name} className="flex items-center gap-3">
                    <span className={`text-lg ${check.status === 'pass' ? '✅' : check.status === 'warn' ? '⚠️' : '❌'}`} />
                    <span className="text-gray-300">{check.message}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center text-gray-500 py-12">Health data unavailable</div>
        )}
      </div>

      {/* Tier breakdown */}
      <div className="px-6 py-16 bg-gray-900 border-y border-gray-800">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-2xl font-bold mb-8 text-center">Membership Tiers</h2>
          <div className="grid md:grid-cols-5 gap-4">
            {(stats ? Object.entries(stats.byTier) : []).map(([tier, count]) => (
              <div key={tier} className={`rounded-xl p-4 border text-center ${TIER_COLORS[tier] || 'bg-gray-800 text-gray-300'}`}>
                <div className="text-3xl font-bold">{count}</div>
                <div className="text-sm mt-1 opacity-80">{TIER_LABELS[tier] || tier}</div>
              </div>
            ))}
          </div>
          <div className="mt-8 text-center">
            <Link href="/federation/join" className="text-violet-400 hover:underline text-sm">
              Learn about membership tiers →
            </Link>
          </div>
        </div>
      </div>

      {/* Featured Nexhas */}
      <div className="px-6 py-16 max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-2xl font-bold">Featured Members</h2>
          <Link href="/federation/network" className="text-violet-400 hover:underline text-sm">
            View all →
          </Link>
        </div>
        {loading ? (
          <div className="text-center text-gray-500 py-12">Loading...</div>
        ) : (
          <div className="grid md:grid-cols-3 gap-4">
            {featured.map((n) => (
              <Link key={n.id} href={`/federation/network?nexha=${n.id}`} className="block">
                <div className="bg-gray-900 rounded-xl p-5 border border-gray-800 hover:border-violet-600 transition group">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <div className="font-semibold text-white group-hover:text-violet-300 transition">{n.name}</div>
                      <div className="text-xs text-gray-500 mt-0.5">{n.region} · Joined {new Date(n.joinedAt).getFullYear()}</div>
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded border ${TIER_COLORS[n.tier]}`}>
                      {TIER_LABELS[n.tier]}
                    </span>
                  </div>
                  <p className="text-gray-400 text-sm line-clamp-2">{n.description}</p>
                  <div className="flex flex-wrap gap-1 mt-3">
                    {n.categories.slice(0, 3).map((cat) => (
                      <span key={cat} className="text-xs bg-gray-800 text-gray-400 px-2 py-0.5 rounded">
                        {cat}
                      </span>
                    ))}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* How it works */}
      <div className="px-6 py-20 bg-gray-900 border-y border-gray-800">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold mb-12 text-center">How the Federation Works</h2>
          <div className="space-y-8">
            {[
              { step: '01', title: 'Deploy Nexha OS', desc: 'Run the Docker bundle on your infrastructure. Lite, Standard, or Enterprise.' },
              { step: '02', title: 'Join the Federation', desc: 'Register with FederationOS. You start as an Observer — explore the network.' },
              { step: '03', title: 'Build Handshakes', desc: 'Initiate bilateral handshakes with partners. Agree on capabilities, data sharing, and payment terms.' },
              { step: '04', title: 'Trade Autonomously', desc: 'Your AI agents negotiate, contract, and transact — all governed by federation policies.' },
            ].map((item) => (
              <div key={item.step} className="flex gap-6 items-start">
                <div className="text-4xl font-bold text-violet-600 w-16 shrink-0">{item.step}</div>
                <div>
                  <div className="font-semibold text-lg text-white">{item.title}</div>
                  <div className="text-gray-400 mt-1">{item.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="px-6 py-8 text-center text-gray-600 text-sm">
        <p>Nexha Federation OS · federation.nexha.io · API v1.1</p>
      </footer>
    </div>
  );
}

function StatCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="bg-gray-900 rounded-xl p-6 border border-gray-800 text-center">
      <div className="text-3xl font-bold text-white">{value}</div>
      <div className="text-gray-400 mt-1">{label}</div>
      {sub && <div className="text-xs text-gray-600 mt-1">{sub}</div>}
    </div>
  );
}
