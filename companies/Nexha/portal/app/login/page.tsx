'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { login } from '@/lib/api';

export default function LoginPage() {
  const router = useRouter();
  const [form, setForm] = useState({ corpId: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      // Phase 5 fix: backend sets the JWT as an httpOnly cookie. The portal
      // no longer reads or writes localStorage.
      await login(form.corpId, form.password);
      router.push('/dashboard');
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-md mx-auto flex items-center gap-3">
          <Link href="/" className="text-gray-500 hover:text-gray-700 text-sm">← Back</Link>
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold">N</div>
          <span className="font-semibold text-gray-900">Sign In</span>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center px-6">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
            <h1 className="text-2xl font-bold text-gray-900 mb-6">Sign in to NeXha</h1>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">CorpID or GuestID</label>
                <input className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="SUP-XXXX or GST-XXXX" required
                  value={form.corpId} onChange={(e) => setForm({...form, corpId: e.target.value})} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                <input type="password" className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="••••••••" required
                  value={form.password} onChange={(e) => setForm({...form, password: e.target.value})} />
              </div>
              {error && <p className="text-red-500 text-sm">{error}</p>}
              <button type="submit" disabled={loading}
                className="w-full py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 disabled:opacity-50 transition">
                {loading ? 'Signing in...' : 'Sign In'}
              </button>
            </form>
            <p className="text-sm text-gray-500 mt-4 text-center">
              No account? <Link href="/onboard-guest" className="text-blue-600 hover:underline">Join as Guest Supplier</Link>
              {' · '}
              <Link href="/onboard-supplier" className="text-blue-600 hover:underline">Register Business</Link>
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
