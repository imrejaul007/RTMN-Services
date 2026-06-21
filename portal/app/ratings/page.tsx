'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { getMe, getReputation } from '@/lib/api';

export default function RatingsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [reputation, setReputation] = useState<{
    overallScore: number;
    recentTrend: string;
    breakdown?: Record<string, { average: number; count: number; weighted: number }>;
  } | null>(null);

  useEffect(() => {
    // Phase 5 fix: auth via httpOnly cookie; fetch real reputation data.
    getMe()
      .then((me) => {
        if (me && 'corpId' in me) {
          return getReputation((me as { corpId: string }).corpId)
            .then((data) => setReputation(data as typeof reputation))
            .catch(() => null);
        }
        return null;
      })
      .catch(() => {
        router.push('/login');
        return null;
      })
      .finally(() => setLoading(false));
  }, [router]);

  const score = reputation?.overallScore ?? 0;
  const trend = reputation?.recentTrend ?? 'No data yet';
  const scoreColor = score >= 75 ? 'text-green-600' : score >= 50 ? 'text-yellow-600' : 'text-red-600';

  if (loading) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
    </div>
  );

  const reviews = reputation?.breakdown
    ? Object.entries(reputation.breakdown)
        .filter(([k]) => ['quality', 'delivery', 'communication', 'payment', 'overall'].includes(k))
        .map(([k, v]) => ({
          label: k.charAt(0).toUpperCase() + k.slice(1),
          // v is { average, count, weighted } — use the 0-100 weighted for the bar
          score: Math.max(0, Math.min(100, (v as { weighted?: number }).weighted ?? 0)),
          count: (v as { count?: number }).count ?? 0,
        }))
    : [];

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center gap-4">
          <Link href="/dashboard" className="text-gray-400 hover:text-gray-600">← Back</Link>
          <h1 className="font-semibold text-gray-900">Ratings & Reviews</h1>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-8">
        {/* Overall Score — live data from /api/suppliers/:corpId/reputation */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex items-end gap-4 mb-4">
            <span className={`text-6xl font-bold ${scoreColor}`}>{score}</span>
            <span className="text-gray-400 text-xl mb-2">/100</span>
          </div>
          <p className="text-gray-500">
            {reputation
              ? `Trend: ${trend}. Complete transactions to continue building your reputation.`
              : 'No ratings received yet. Complete transactions to build your reputation.'}
          </p>
        </div>

        {/* Dimension breakdown */}
        {reviews.length > 0 ? (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 mb-6">
            <h2 className="font-semibold text-gray-900 mb-4">Rating Breakdown</h2>
            <div className="space-y-4">
              {reviews.map((r) => (
                <div key={r.label} className="flex items-center gap-4">
                  <span className="w-32 text-sm text-gray-600">{r.label}</span>
                  <div className="flex-1 h-2 bg-gray-100 rounded-full">
                    <div className="h-full bg-blue-600 rounded-full" style={{ width: `${r.score}%` }}></div>
                  </div>
                  <span className="text-sm text-gray-500 w-16 text-right">{r.count} reviews</span>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 mb-6 text-center">
            <span className="text-4xl">📊</span>
            <p className="text-gray-400 mt-4">No ratings yet</p>
          </div>
        )}

        {/* Recent Reviews — would need a /api/ratings/recent endpoint; placeholder */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
          <h2 className="font-semibold text-gray-900 mb-4">Recent Reviews</h2>
          <div className="text-center py-12">
            <span className="text-4xl">⭐</span>
            <p className="text-gray-400 mt-4">No reviews yet</p>
            <p className="text-gray-300 text-sm mt-1">Complete deals to receive your first review</p>
          </div>
        </div>
      </main>
    </div>
  );
}
