'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { getMe } from '@/lib/api';

export default function ProductsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Phase 5 fix: auth via httpOnly cookie — /api/auth/me returns 401 if no session.
    getMe()
      .catch(() => {
        router.push('/login');
        return null;
      })
      .finally(() => setLoading(false));
  }, [router]);

  if (loading) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/dashboard" className="text-gray-400 hover:text-gray-600">← Back</Link>
            <h1 className="font-semibold text-gray-900">My Products</h1>
          </div>
          <button className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700">
            + Add Product
          </button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8">
        {/* Categories */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {['Electronics', 'Raw Materials', 'Machinery', 'Packaging'].map((cat) => (
            <div key={cat} className="bg-white rounded-xl border border-gray-200 p-4 text-center cursor-pointer hover:border-blue-300 hover:bg-blue-50 transition">
              <span className="text-2xl">📦</span>
              <p className="text-sm font-medium text-gray-700 mt-2">{cat}</p>
            </div>
          ))}
        </div>

        {/* Product list */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
          <h2 className="font-semibold text-gray-900 mb-4">All Products</h2>
          <div className="text-center py-16">
            <span className="text-4xl">🗃️</span>
            <p className="text-gray-400 mt-4">No products listed</p>
            <p className="text-gray-300 text-sm mt-1">Add your first product to start selling on NeXha</p>
            <button className="mt-4 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700">
              + Add First Product
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
