'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { getMe } from '@/lib/api';

export default function UpgradePage() {
  const router = useRouter();
  const [me, setMe] = useState<{ corpId: string; role: string; guestId?: string } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('nexha_token');
    if (!token) { router.push('/login'); return; }
    getMe()
      .then((data) => setMe(data as { corpId: string; role: string; guestId?: string }))
      .catch(() => router.push('/login'))
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
        <div className="max-w-4xl mx-auto flex items-center gap-4">
          <Link href="/dashboard" className="text-gray-400 hover:text-gray-600">← Back</Link>
          <h1 className="font-semibold text-gray-900">Upgrade to Full Account</h1>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-8">
        {/* Guest status banner */}
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6 mb-6">
          <div className="flex items-start gap-4">
            <span className="text-3xl">⭐</span>
            <div>
              <h2 className="text-lg font-semibold text-amber-900">Guest Account — Limited Access</h2>
              <p className="text-amber-700 mt-1">
                You're currently on a guest account ({me?.guestId}). Upgrade to unlock full features:
              </p>
              <ul className="mt-3 space-y-2 text-amber-800 text-sm">
                <li>✅ Submit RFQs and receive quotes</li>
                <li>✅ Build verified reputation</li>
                <li>✅ Access to all 24 industry networks</li>
                <li>✅ Direct API access</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Upgrade form */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
          <h2 className="text-xl font-bold text-gray-900 mb-6">Business Verification</h2>

          <form className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">GSTIN *</label>
                <input
                  type="text"
                  placeholder="27AABCU9603R1ZM"
                  maxLength={15}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                <p className="text-xs text-gray-400 mt-1">15-character GST Identification Number</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">PAN</label>
                <input
                  type="text"
                  placeholder="AABCU9603R"
                  maxLength={10}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Business Legal Name *</label>
              <input
                type="text"
                placeholder="Acme Supplies Pvt Ltd"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Business Category *</label>
              <select className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                <option value="">Select a category</option>
                <option>Electronics & Components</option>
                <option>Raw Materials</option>
                <option>Industrial Machinery</option>
                <option>Packaging & Logistics</option>
                <option>Professional Services</option>
              </select>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">City *</label>
                <input type="text" placeholder="Mumbai"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">State *</label>
                <select className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                  <option value="">Select state</option>
                  <option>Maharashtra</option><option>Delhi</option><option>Karnataka</option>
                  <option>Tamil Nadu</option><option>Gujarat</option><option>Uttar Pradesh</option>
                </select>
              </div>
            </div>

            <div className="border-t pt-6">
              <button
                type="button"
                onClick={() => alert('Upgrade submission coming soon!')}
                className="w-full px-6 py-3 bg-blue-600 text-white font-medium rounded-xl hover:bg-blue-700 transition"
              >
                Submit for Verification
              </button>
              <p className="text-xs text-gray-400 text-center mt-3">
                By submitting, you agree to NeXha's Terms of Service and Privacy Policy
              </p>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}
