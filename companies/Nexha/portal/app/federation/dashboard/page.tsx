'use client';
/**
 * Federation Dashboard — Member overview
 * Nexha Portal v2.0
 */

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { federation, type FederationHealth, type FederationStats, type OnboardingChecklist } from '@/lib/federation-api';

const TIER_COLORS: Record<string, string> = {
  founding: 'bg-amber-100 text-amber-800',
  strategic: 'bg-violet-100 text-violet-800',
  standard: 'bg-blue-100 text-blue-800',
  associate: 'bg-gray-100 text-gray-700',
  observer: 'bg-green-50 text-green-700',
};

export default function DashboardPage() {
  const [nexhaId] = useState(() => localStorage.getItem('nexha_id') ?? '');
  const [health, setHealth] = useState<FederationHealth | null>(null);
  const [stats, setStats] = useState<FederationStats | null>(null);
  const [checklist, setChecklist] = useState<OnboardingChecklist | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      federation.health().catch(() => null),
      federation.stats().catch(() => null),
      nexhaId ? federation.checklist(nexhaId).catch(() => null) : Promise.resolve(null),
    ]).then(([h, s, cl]) => {
      setHealth(h);
      setStats(s);
      setChecklist(cl);
      setLoading(false);
    });
  }, [nexhaId]);

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <nav className="border-b border-gray-800 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-2xl">🌐</span>
          <Link href="/federation" className="font-bold text-lg hover:text-violet-300">Nexha Federation</Link>
          <span className="text-gray-600">/ Dashboard</span>
        </div>
        <div className="flex gap-4 text-sm">
          <Link href="/federation" className="text-gray-400 hover:text-white">Home</Link>
          <Link href="/federation/network" className="text-gray-400 hover:text-white">Network</Link>
          <Link href="/federation/dashboard/metrics" className="text-violet-400 hover:text-white">Metrics</Link>
          <Link href="/federation/dashboard/handshakes" className="text-gray-400 hover:text-white">Handshakes</Link>
        </div>
      </nav>

      <div className="px-6 py-8 max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold">Federation Dashboard</h1>
            <p className="text-gray-400 mt-1">Overview of the Nexha Federation</p>
          </div>
          {nexhaId && (
            <div className="text-xs text-gray-500 font-mono">
              Nexha ID: {nexhaId}
            </div>
          )}
        </div>

        {/* Health + Stats */}
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          {/* Health score */}
          {health ? (
            <div className="bg-gray-900 rounded-xl p-6 border border-gray-800 text-center">
              <div className={`text-6xl font-bold ${health.score >= 80 ? 'text-green-500' : health.score >= 50 ? 'text-amber-500' : 'text-red-500'}`}>
                {health.score}
              </div>
              <div className="text-gray-400 mt-1 text-sm">Federation Health</div>
              <div className="mt-3 text-xs text-gray-500 capitalize">{health.status}</div>
            </div>
          ) : (
            <div className="bg-gray-900 rounded-xl p-6 border border-gray-800 text-center text-gray-600">Health unavailable</div>
          )}

          {/* Stats */}
          {stats ? (
            <>
              <div className="bg-gray-900 rounded-xl p-6 border border-gray-800">
                <div className="text-gray-400 text-sm mb-3">Members</div>
                <div className="text-4xl font-bold">{stats.totalNexhas}</div>
                <div className="mt-3 space-y-1">
                  {Object.entries(stats.byTier).map(([tier, count]) => (
                    <div key={tier} className="flex justify-between text-xs">
                      <span className={`px-1.5 py-0.5 rounded ${TIER_COLORS[tier]}`}>{tier}</span>
                      <span className="text-gray-400">{count}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="bg-gray-900 rounded-xl p-6 border border-gray-800">
                <div className="text-gray-400 text-sm mb-3">Handshakes & Governance</div>
                <div className="space-y-3">
                  <div>
                    <div className="text-3xl font-bold">{stats.activeHandshakes}</div>
                    <div className="text-xs text-gray-500">Active Handshakes</div>
                  </div>
                  <div className="pt-3 border-t border-gray-800">
                    <div className="text-3xl font-bold">{stats.totalPolicies}</div>
                    <div className="text-xs text-gray-500">Governance Policies</div>
                  </div>
                  <div className="pt-3 border-t border-gray-800">
                    <div className="text-3xl font-bold">{stats.regions.length}</div>
                    <div className="text-xs text-gray-500">Regions: {stats.regions.slice(0, 3).join(', ')}{stats.regions.length > 3 ? '...' : ''}</div>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="bg-gray-900 rounded-xl p-6 border border-gray-800 text-center text-gray-600 col-span-2">
              Stats unavailable
            </div>
          )}
        </div>

        {/* Onboarding checklist */}
        {checklist ? (
          <div className="bg-gray-900 rounded-xl p-6 border border-gray-800 mb-8">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-semibold">Onboarding Checklist</h2>
                <p className="text-gray-400 text-sm">{checklist.nexhaName}</p>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold">{checklist.progress}%</div>
                <div className="text-xs text-gray-500">{checklist.completedItems}/{checklist.totalItems} complete</div>
              </div>
            </div>

            {/* Progress bar */}
            <div className="w-full h-2 bg-gray-800 rounded-full mb-6">
              <div
                className="h-2 bg-violet-600 rounded-full transition-all"
                style={{ width: `${checklist.progress}%` }}
              />
            </div>

            {/* Items by category */}
            {(['account', 'technical', 'compliance', 'partnership', 'training'] as const).map((cat) => {
              const items = checklist.items.filter((i) => i.category === cat);
              if (!items.length) return null;
              return (
                <div key={cat} className="mb-4">
                  <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">{cat}</h3>
                  <div className="space-y-1">
                    {items.map((item) => (
                      <div key={item.id} className="flex items-center gap-3 py-1.5 px-3 rounded-lg bg-gray-800/50">
                        <span className={`text-lg ${item.completed ? 'text-green-500' : 'text-gray-600'}`}>
                          {item.completed ? '☑' : '☐'}
                        </span>
                        <div className="flex-1 min-w-0">
                          <div className={`text-sm ${item.completed ? 'text-gray-400 line-through' : 'text-white'}`}>
                            {item.title}
                          </div>
                          <div className="text-xs text-gray-600">{item.description}</div>
                        </div>
                        {item.required && !item.completed && (
                          <span className="text-xs text-red-500 shrink-0">Required</span>
                        )}
                        {item.dueDays && !item.completed && (
                          <span className="text-xs text-amber-500 shrink-0">{item.dueDays}d</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          !loading && (
            <div className="bg-gray-900 rounded-xl p-6 border border-gray-800 mb-8 text-center">
              <p className="text-gray-500">No onboarding checklist found.</p>
              <Link href="/federation/join" className="text-violet-400 hover:underline text-sm mt-2 inline-block">
                Join the federation to get started →
              </Link>
            </div>
          )
        )}

        {/* Health checks */}
        {health && (
          <div className="bg-gray-900 rounded-xl p-6 border border-gray-800">
            <h2 className="text-lg font-semibold mb-4">Federation Health Checks</h2>
            <div className="space-y-2">
              {health.checks.map((check) => (
                <div key={check.name} className="flex items-center gap-3 text-sm">
                  <span className="text-lg">
                    {check.status === 'pass' ? '✅' : check.status === 'warn' ? '⚠️' : '❌'}
                  </span>
                  <span className="text-gray-300">{check.message}</span>
                  <span className={`ml-auto text-xs px-2 py-0.5 rounded ${
                    check.status === 'pass' ? 'bg-green-900/50 text-green-400' :
                    check.status === 'warn' ? 'bg-amber-900/50 text-amber-400' :
                    'bg-red-900/50 text-red-400'
                  }`}>
                    {check.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
