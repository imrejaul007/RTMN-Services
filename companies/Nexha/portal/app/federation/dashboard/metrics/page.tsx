'use client';
/**
 * Federation Dashboard — ACI Metrics
 * Nexha Portal v2.0
 */

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { federation, type FoundingMemberMetrics } from '@/lib/federation-api';

export default function MetricsPage() {
  const [metrics, setMetrics] = useState<FoundingMemberMetrics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    federation.analytics.founding()
      .then(setMetrics)
      .catch(() => null)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <nav className="border-b border-gray-800 px-6 py-4 flex items-center gap-3">
        <span className="text-2xl">🌐</span>
        <Link href="/federation" className="font-bold text-lg hover:text-violet-300">Nexha Federation</Link>
        <span className="text-gray-600">/ Dashboard / Founding Metrics</span>
      </nav>

      <div className="px-6 py-8 max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold">Founding Member Metrics</h1>
            <p className="text-gray-400 mt-1">ACI scores and engagement for founding members</p>
          </div>
          <Link href="/federation/dashboard" className="text-gray-400 hover:text-white text-sm">
            ← Back to Dashboard
          </Link>
        </div>

        {loading ? (
          <div className="text-center text-gray-500 py-20">Loading metrics...</div>
        ) : !metrics ? (
          <div className="text-center text-gray-500 py-20">
            <p>Metrics unavailable. FederationOS may need seeding.</p>
            <p className="text-xs mt-2 text-gray-700">
              Run: npx tsx src/scripts/seed.ts in nexha-federation-os
            </p>
          </div>
        ) : (
          <>
            {/* Summary cards */}
            <div className="grid grid-cols-4 gap-4 mb-8">
              <div className="bg-gray-900 rounded-xl p-5 border border-gray-800 text-center">
                <div className="text-4xl font-bold">{metrics.totalFoundingMembers}</div>
                <div className="text-gray-400 text-sm mt-1">Founding Members</div>
              </div>
              <div className="bg-gray-900 rounded-xl p-5 border border-gray-800 text-center">
                <div className="text-4xl font-bold">{metrics.avgAciScore}</div>
                <div className="text-gray-400 text-sm mt-1">Avg ACI Score</div>
              </div>
              <div className="bg-gray-900 rounded-xl p-5 border border-gray-800 text-center">
                <div className="text-4xl font-bold">{metrics.avgPeersPerFounding}</div>
                <div className="text-gray-400 text-sm mt-1">Avg Peers</div>
              </div>
              <div className="bg-gray-900 rounded-xl p-5 border border-gray-800 text-center">
                <div className="text-4xl font-bold">{metrics.avgPendingHandshakes}</div>
                <div className="text-gray-400 text-sm mt-1">Avg Pending</div>
              </div>
            </div>

            {/* ACI Formula */}
            <div className="bg-gray-900 rounded-xl p-5 border border-gray-800 mb-8">
              <h3 className="font-semibold mb-2 text-sm text-gray-400">ACI Formula (Autonomous Commerce Index)</h3>
              <div className="font-mono text-sm bg-gray-800 rounded-lg p-4 space-y-1">
                <div className="text-gray-500">ACI = Trust×0.30 + CapabilityMatch×0.25 + TransactionVolume×0.20 + ResponseTime×0.15 + Compliance×0.10</div>
              </div>
            </div>

            {/* Founding members table */}
            <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-800">
                <h2 className="font-semibold">Founding Members</h2>
              </div>
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-gray-500 text-xs uppercase tracking-wider">
                    <th className="px-6 py-3">Member</th>
                    <th className="px-4 py-3">Region</th>
                    <th className="px-4 py-3">ACI Score</th>
                    <th className="px-4 py-3">Peers</th>
                    <th className="px-4 py-3">Pending HS</th>
                    <th className="px-4 py-3">Last Sync</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800">
                  {metrics.foundingMembers.map((m) => (
                    <tr key={m.id} className="hover:bg-gray-800/50">
                      <td className="px-6 py-4">
                        <div className="font-medium">{m.name}</div>
                        <div className="text-xs text-gray-500">{m.id}</div>
                      </td>
                      <td className="px-4 py-4">
                        <span className="text-xs bg-gray-800 px-2 py-0.5 rounded">{m.region}</span>
                      </td>
                      <td className="px-4 py-4">
                        <span className={`font-bold ${
                          m.aciScore >= 80 ? 'text-green-400' :
                          m.aciScore >= 60 ? 'text-amber-400' : 'text-red-400'
                        }`}>
                          {m.aciScore}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-gray-300">{m.peersCount}</td>
                      <td className="px-4 py-4">
                        {m.pendingHandshakes > 0 ? (
                          <span className="text-amber-400">{m.pendingHandshakes}</span>
                        ) : (
                          <span className="text-gray-600">{m.pendingHandshakes}</span>
                        )}
                      </td>
                      <td className="px-4 py-4 text-gray-500 text-xs">
                        {new Date(m.lastSyncAt).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
