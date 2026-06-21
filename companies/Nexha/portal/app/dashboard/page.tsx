'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { getMe, getReputation, getHealth, logout } from '@/lib/api';

export default function DashboardPage() {
  const router = useRouter();
  const [me, setMe] = useState<{ corpId: string; role: string; guestId?: string } | null>(null);
  const [reputation, setReputation] = useState<{ overallScore: number; recentTrend: string } | null>(null);
  const [healthStatus, setHealthStatus] = useState<'up' | 'down' | 'unknown'>('unknown');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Phase 5 fix: auth is via httpOnly cookie — call /api/auth/me to verify.
    // If it 401s, the API client throws and we redirect to login.
    Promise.all([
      getMe().catch(() => null),
      getHealth().catch(() => null),
    ]).then(([meData, healthData]) => {
      if (!meData) { router.push('/login'); return; }
      setMe(meData as { corpId: string; role: string; guestId?: string });
      setHealthStatus(healthData ? 'up' : 'down');
      if (meData && 'corpId' in meData) {
        getReputation((meData as { corpId: string }).corpId)
          .then(setReputation)
          .catch(() => null);
      }
    }).finally(() => setLoading(false));
  }, [router]);

  const handleSignOut = async () => {
    try { await logout(); } catch { /* even if it fails, redirect */ }
    router.push('/');
  };

  if (loading) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-gray-500">Loading dashboard...</p>
      </div>
    </div>
  );

  const score = reputation?.overallScore ?? 0;
  const scoreColor = score >= 75 ? 'text-green-600' : score >= 50 ? 'text-yellow-600' : 'text-red-600';

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold">N</div>
            <div>
              <h1 className="font-semibold text-gray-900">NeXha Commerce</h1>
              <p className="text-xs text-gray-500">Dashboard</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-sm font-medium text-gray-900">{me?.corpId}</p>
              <p className="text-xs text-gray-500 capitalize">{me?.role}</p>
            </div>
            <button className="text-sm text-gray-500 hover:text-red-600"
              onClick={handleSignOut}>
              Sign Out
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 px-6 py-8">
        <div className="max-w-6xl mx-auto space-y-8">

          {/* Welcome */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-1">
                  {me?.guestId ? 'Welcome, Guest Supplier!' : 'Welcome back!'}
                </h2>
                <p className="text-gray-500">
                  {me?.guestId
                    ? `Guest ID: ${me.guestId} · Upgrade to full account by submitting GSTIN`
                    : `CorpID: ${me?.corpId} · All systems operational`
                  }
                </p>
              </div>
              {me?.guestId && (
                <Link href="/upgrade" className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700">
                  Upgrade to Full Account
                </Link>
              )}
            </div>
          </div>

          {/* Stats grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Reputation */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
              <h3 className="text-sm font-medium text-gray-500 mb-4">Reputation Score</h3>
              <div className="flex items-end gap-3">
                <span className={`text-5xl font-bold ${scoreColor}`}>{score}</span>
                <span className="text-gray-400 text-lg mb-1">/100</span>
              </div>
              <div className="mt-3 h-2 bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full bg-blue-600 rounded-full transition-all"
                  style={{ width: `${score}%` }} />
              </div>
              <p className="text-xs text-gray-400 mt-2 capitalize">
                Trend: {reputation?.recentTrend || 'No data yet'}
              </p>
            </div>

            {/* Status */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
              <h3 className="text-sm font-medium text-gray-500 mb-4">Account Status</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Identity</span>
                  <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs font-medium rounded-full capitalize">{me?.role}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Commerce Identity</span>
                  <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs font-medium rounded-full">v1.0.0</span>
                </div>
              </div>
            </div>

            {/* API Health — Phase 5.7 fix: uses real /health fetch instead of hardcoded mock */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
              <h3 className="text-sm font-medium text-gray-500 mb-4">API Status</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-700">Commerce Identity</p>
                    <p className="text-xs text-gray-400">{process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className={`w-2 h-2 rounded-full ${healthStatus === 'up' ? 'bg-green-500' : healthStatus === 'down' ? 'bg-red-500' : 'bg-gray-300'}`}></div>
                    <span className={`text-xs font-medium ${healthStatus === 'up' ? 'text-green-600' : healthStatus === 'down' ? 'text-red-600' : 'text-gray-500'}`}>
                      {healthStatus === 'up' ? 'UP' : healthStatus === 'down' ? 'DOWN' : 'CHECKING'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: 'Update Profile', icon: '👤', href: '/profile' },
                { label: 'View RFQs', icon: '📋', href: '/rfqs' },
                { label: 'My Products', icon: '📦', href: '/products' },
                { label: 'Ratings', icon: '⭐', href: '/ratings' },
              ].map((a) => (
                <Link key={a.label} href={a.href}
                  className="flex flex-col items-center gap-2 p-4 rounded-xl border border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition">
                  <span className="text-2xl">{a.icon}</span>
                  <span className="text-sm font-medium text-gray-700">{a.label}</span>
                </Link>
              ))}
            </div>
          </div>

        </div>
      </main>
    </div>
  );
}
