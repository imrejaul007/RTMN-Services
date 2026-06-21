'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { getMe } from '@/lib/api';

export default function ProfilePage() {
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
      <div className="text-center">
        <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-gray-500">Loading profile...</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center gap-4">
          <Link href="/dashboard" className="text-gray-400 hover:text-gray-600">← Back</Link>
          <h1 className="font-semibold text-gray-900">Profile</h1>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-8">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
          <div className="flex items-center gap-4 mb-8">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 text-2xl font-bold">
              {me?.corpId?.slice(0, 2) || '?'}
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900">{me?.corpId}</h2>
              <p className="text-gray-500 capitalize">{me?.role} Account</p>
            </div>
          </div>

          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">CorpID</label>
                <p className="text-gray-900 font-mono bg-gray-50 px-3 py-2 rounded-lg">{me?.corpId}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">Role</label>
                <p className="text-gray-900 capitalize">{me?.role}</p>
              </div>
              {me?.guestId && (
                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">Guest ID</label>
                  <p className="text-gray-900 font-mono bg-gray-50 px-3 py-2 rounded-lg">{me.guestId}</p>
                </div>
              )}
            </div>

            <div className="border-t pt-6">
              <h3 className="font-semibold text-gray-700 mb-4">Business Information</h3>
              <p className="text-gray-400 text-sm italic">
                {me?.guestId
                  ? 'Complete your profile after upgrading to a full account with GSTIN verification.'
                  : 'Business details are managed through the supplier onboarding flow.'}
              </p>
            </div>

            <div className="border-t pt-6">
              <h3 className="font-semibold text-gray-700 mb-4">Security</h3>
              <button className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700">
                Change Password
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
