'use client';

import { useState, useEffect } from 'react';
import { api, formatDate } from '@/lib/api';

interface DashboardData {
  contracts: { id: string; title: string; status: string; createdAt: string }[];
  cases: { id: string; title: string; court: string; date: string }[];
  compliance: Record<string, { status: string }>;
  stats: {
    totalContracts: number;
    totalCases: number;
    pendingCompliance: number;
  };
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getDashboard()
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-slate-400">Loading dashboard...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 text-white">
      {/* Header */}
      <header className="border-b border-slate-800 bg-slate-800/50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-amber-400 to-orange-500 rounded-lg flex items-center justify-center font-bold text-xl">
              L
            </div>
            <span className="text-xl font-semibold">LawGens</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-slate-400">Dashboard</span>
            <button onClick={() => api.logout()} className="text-slate-400 hover:text-white">
              Logout
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Stats */}
        <div className="grid grid-cols-4 gap-6 mb-8">
          {[
            { label: 'Contracts', value: data?.stats.totalContracts || 0, icon: '📄' },
            { label: 'Court Cases', value: data?.stats.totalCases || 0, icon: '⚖️' },
            { label: 'Compliance', value: data?.stats.pendingCompliance || 0, icon: '🛡️' },
            { label: 'Documents', value: 0, icon: '📁' },
          ].map((stat, i) => (
            <div key={i} className="bg-slate-800 rounded-xl p-6 border border-slate-700">
              <div className="text-3xl mb-2">{stat.icon}</div>
              <div className="text-3xl font-bold">{stat.value}</div>
              <div className="text-slate-400 text-sm">{stat.label}</div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-6">
          {/* Recent Contracts */}
          <div className="bg-slate-800 rounded-xl border border-slate-700">
            <div className="p-6 border-b border-slate-700 flex justify-between items-center">
              <h2 className="text-lg font-semibold">Recent Contracts</h2>
              <a href="/contracts" className="text-amber-400 text-sm hover:text-amber-300">View all</a>
            </div>
            <div className="p-6">
              {data?.contracts.length ? (
                <div className="space-y-4">
                  {data.contracts.slice(0, 5).map((c) => (
                    <div key={c.id} className="flex justify-between items-center p-3 bg-slate-900 rounded-lg">
                      <div>
                        <div className="font-medium">{c.title}</div>
                        <div className="text-slate-400 text-sm">{formatDate(c.createdAt)}</div>
                      </div>
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                        c.status === 'signed' ? 'bg-green-500/20 text-green-400' :
                        c.status === 'analyzed' ? 'bg-amber-500/20 text-amber-400' :
                        'bg-slate-700 text-slate-400'
                      }`}>
                        {c.status}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center text-slate-400 py-8">
                  No contracts yet. <a href="/contracts/new" className="text-amber-400">Create one</a>
                </div>
              )}
            </div>
          </div>

          {/* Court Cases */}
          <div className="bg-slate-800 rounded-xl border border-slate-700">
            <div className="p-6 border-b border-slate-700 flex justify-between items-center">
              <h2 className="text-lg font-semibold">Court Cases</h2>
              <a href="/cases" className="text-amber-400 text-sm hover:text-amber-300">View all</a>
            </div>
            <div className="p-6">
              {data?.cases.length ? (
                <div className="space-y-4">
                  {data.cases.slice(0, 5).map((c) => (
                    <div key={c.id} className="p-3 bg-slate-900 rounded-lg">
                      <div className="font-medium">{c.title}</div>
                      <div className="text-slate-400 text-sm">{c.court} • {formatDate(c.date)}</div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center text-slate-400 py-8">
                  No cases tracked. <a href="/cases/search" className="text-amber-400">Search cases</a>
                </div>
              )}
            </div>
          </div>

          {/* Compliance Status */}
          <div className="bg-slate-800 rounded-xl border border-slate-700">
            <div className="p-6 border-b border-slate-700">
              <h2 className="text-lg font-semibold">Compliance Status</h2>
            </div>
            <div className="p-6">
              <div className="space-y-3">
                {['GDPR', 'PCI-DSS', 'RBI', 'SEBI'].map((framework) => (
                  <div key={framework} className="flex justify-between items-center p-3 bg-slate-900 rounded-lg">
                    <span className="font-medium">{framework}</span>
                    <span className="px-3 py-1 rounded-full text-xs font-medium bg-green-500/20 text-green-400">
                      Compliant
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="bg-slate-800 rounded-xl border border-slate-700">
            <div className="p-6 border-b border-slate-700">
              <h2 className="text-lg font-semibold">Quick Actions</h2>
            </div>
            <div className="p-6 grid grid-cols-2 gap-3">
              {[
                { label: 'Analyze Contract', icon: '📄', href: '/contracts/analyze' },
                { label: 'Search Cases', icon: '🔍', href: '/cases/search' },
                { label: 'Generate Doc', icon: '📝', href: '/documents/new' },
                { label: 'Compliance Check', icon: '🛡️', href: '/compliance' },
              ].map((action, i) => (
                <a key={i} href={action.href} className="p-4 bg-slate-900 rounded-lg text-center hover:bg-slate-700 transition">
                  <div className="text-2xl mb-2">{action.icon}</div>
                  <div className="text-sm font-medium">{action.label}</div>
                </a>
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}