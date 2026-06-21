'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function RatingsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('nexha_token');
    if (!token) { router.push('/login'); return; }
    setLoading(false);
  }, [router]);

  if (loading) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
    </div>
  );

  const reviews = [
    { score: 5, label: 'Quality', count: 12 },
    { score: 5, label: 'Delivery', count: 10 },
    { score: 5, label: 'Communication', count: 8 },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center gap-4">
          <Link href="/dashboard" className="text-gray-400 hover:text-gray-600">← Back</Link>
          <h1 className="font-semibold text-gray-900">Ratings & Reviews</h1>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-8">
        {/* Overall Score */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex items-end gap-4 mb-4">
            <span className="text-6xl font-bold text-blue-600">0</span>
            <span className="text-gray-400 text-xl mb-2">/100</span>
          </div>
          <p className="text-gray-500">No ratings received yet. Complete transactions to build your reputation.</p>
        </div>

        {/* Dimension breakdown */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 mb-6">
          <h2 className="font-semibold text-gray-900 mb-4">Rating Breakdown</h2>
          <div className="space-y-4">
            {reviews.map((r) => (
              <div key={r.label} className="flex items-center gap-4">
                <span className="w-32 text-sm text-gray-600">{r.label}</span>
                <div className="flex-1 h-2 bg-gray-100 rounded-full">
                  <div className="h-full bg-blue-600 rounded-full" style={{ width: `${(r.score / 5) * 100}%` }}></div>
                </div>
                <span className="text-sm text-gray-500 w-16 text-right">{r.count} reviews</span>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Reviews */}
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
