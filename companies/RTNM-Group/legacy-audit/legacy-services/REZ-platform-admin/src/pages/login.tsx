/**
 * REZ Platform Admin - Login Page
 */

import React, { useState } from 'react';
import { useRouter } from 'next/router';

const API = process.env.NEXT_PUBLIC_API || 'http://localhost:4000';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await fetch(`${API}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      const data = await res.json();

      if (res.ok) {
        localStorage.setItem('platform_token', data.token);
        router.push('/dashboard');
      } else {
        setError(data.error || 'Login failed');
      }
    } catch (e) {
      setError('Connection error');
    }

    setLoading(false);
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="bg-white p-8 rounded-lg shadow-lg w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">REZ Platform</h1>
          <p className="text-gray-500 mt-2">Sign in to your account</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="admin@rez.money"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter password"
              required
            />
          </div>

          {error && (
            <div className="p-3 bg-red-50 text-red-600 rounded-lg text-sm">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <div className="mt-8 text-center">
          <p className="text-sm text-gray-500 mb-4">Quick Access (Demo)</p>
          <div className="grid grid-cols-3 gap-2 text-xs">
            <DemoButton role="Super Admin" email="super@rez.money" onClick={() => { setEmail('super@rez.money'); setPassword('superadmin123'); }} />
            <DemoButton role="CFO" email="cfo@rez.money" onClick={() => setEmail('cfo@rez.money')} />
            <DemoButton role="CTO" email="cto@rez.money" onClick={() => setEmail('cto@rez.money')} />
            <DemoButton role="CMO" email="cmo@rez.money" onClick={() => setEmail('cmo@rez.money')} />
            <DemoButton role="COO" email="coo@rez.money" onClick={() => setEmail('coo@rez.money')} />
            <DemoButton role="CHRO" email="chro@rez.money" onClick={() => setEmail('chro@rez.money')} />
          </div>
        </div>
      </div>
    </div>
  );
}

function DemoButton({ role, email, onClick }: { role: string; email: string; onClick: any }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="p-2 bg-gray-100 rounded hover:bg-gray-200 text-xs"
    >
      {role}
    </button>
  );
}
