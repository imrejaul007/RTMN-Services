'use client';

import { useState } from 'react';
import Link from 'next/link';
import { registerSupplier, issueCorpId, setPassword } from '@/lib/api';

export default function SupplierOnboardPage() {
  const [step, setStep] = useState<number>(1);
  const [error, setError] = useState('');
  const [corpId, setCorpId] = useState('');
  const [password, setPassword_] = useState('');
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);

  const [form, setForm] = useState({
    businessName: '', legalName: '',
    email: '', phone: '', whatsapp: '',
    gstin: '', pan: '',
    line1: '', city: '', state: '', pincode: '',
    categories: '',
  });

  const inputClass = 'w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900';
  const labelClass = 'block text-sm font-medium text-gray-700 mb-1';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      // 1. Get CorpID
      const corp = await issueCorpId({ type: 'supplier', businessName: form.businessName, phone: form.phone.replace(/\D/g,''), email: form.email });
      setCorpId(corp.corpId);

      // 2. Register supplier
      await registerSupplier({
        corpId: corp.corpId,
        businessName: form.businessName,
        legalName: form.legalName || form.businessName,
        email: form.email,
        phone: form.phone.replace(/\D/g,''),
        categories: form.categories ? form.categories.split(',').map((c) => c.trim()) : [],
        address: { line1: form.line1, city: form.city, state: form.state, pincode: form.pincode },
        documents: [
          ...(form.gstin ? [{ type: 'gstin', number: form.gstin }] : []),
          ...(form.pan ? [{ type: 'pan', number: form.pan }] : []),
        ],
      });
      setStep(2);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleSetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 8) { setError('Password must be at least 8 characters'); return; }
    setLoading(true);
    setError('');
    try {
      // Save token from registration to call auth
      const token = localStorage.getItem('nexha_token') || '';
      await fetch('http://localhost:8000/api/auth/password', {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ password }),
      });
      setSaved(true);
      setStep(3);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center gap-3">
          <Link href="/" className="text-gray-500 hover:text-gray-700 text-sm">← Back</Link>
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold">N</div>
          <span className="font-semibold text-gray-900">Register Business Account</span>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-lg">

          {/* Step indicators */}
          <div className="flex items-center gap-2 mb-8">
            {[1,2,3].map((s) => (
              <div key={s} className="flex items-center gap-2">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition
                  ${step >= s ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-500'}`}>{s}</div>
                <div className={`text-sm font-medium ${step >= s ? 'text-gray-900' : 'text-gray-400'}`}>
                  {s === 1 ? 'Business Info' : s === 2 ? 'Set Password' : 'Done'}
                </div>
                {s < 3 && <div className={`flex-1 h-0.5 ${step > s ? 'bg-blue-600' : 'bg-gray-200'}`} style={{width:40}} />}
              </div>
            ))}
          </div>

          {step === 1 && (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
              <div className="mb-6">
                <h1 className="text-2xl font-bold text-gray-900 mb-1">Business Registration</h1>
                <p className="text-gray-500 text-sm">Full access to the NeXha commerce network.</p>
              </div>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className={labelClass}>Business Name *</label>
                  <input className={inputClass} placeholder="ACME Traders Pvt Ltd" required
                    value={form.businessName} onChange={(e) => setForm({...form, businessName: e.target.value})} />
                </div>
                <div>
                  <label className={labelClass}>Legal Name (if different)</label>
                  <input className={inputClass}
                    value={form.legalName} onChange={(e) => setForm({...form, legalName: e.target.value})} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className={labelClass}>Email *</label>
                    <input type="email" className={inputClass} required
                      value={form.email} onChange={(e) => setForm({...form, email: e.target.value})} />
                  </div>
                  <div>
                    <label className={labelClass}>Phone *</label>
                    <input className={inputClass} required
                      value={form.phone} onChange={(e) => setForm({...form, phone: e.target.value})} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className={labelClass}>GSTIN</label>
                    <input className={inputClass} placeholder="29ABCDE1234F1Z5" value={form.gstin}
                      onChange={(e) => setForm({...form, gstin: e.target.value.toUpperCase()})} />
                  </div>
                  <div>
                    <label className={labelClass}>PAN</label>
                    <input className={inputClass} placeholder="ABCDE1234F" value={form.pan}
                      onChange={(e) => setForm({...form, pan: e.target.value.toUpperCase()})} />
                  </div>
                </div>
                <div>
                  <label className={labelClass}>Address *</label>
                  <input className={`${inputClass} mb-2`} placeholder="Address line 1" required
                    value={form.line1} onChange={(e) => setForm({...form, line1: e.target.value})} />
                  <div className="grid grid-cols-3 gap-2">
                    <input className={inputClass} placeholder="City" required
                      value={form.city} onChange={(e) => setForm({...form, city: e.target.value})} />
                    <input className={inputClass} placeholder="State" required
                      value={form.state} onChange={(e) => setForm({...form, state: e.target.value})} />
                    <input className={inputClass} placeholder="411001" required maxLength={6}
                      value={form.pincode} onChange={(e) => setForm({...form, pincode: e.target.value})} />
                  </div>
                </div>
                <div>
                  <label className={labelClass}>Categories (comma-separated)</label>
                  <input className={inputClass} placeholder="electronics, grocery"
                    value={form.categories} onChange={(e) => setForm({...form, categories: e.target.value})} />
                </div>
                {error && <p className="text-red-500 text-sm">{error}</p>}
                <button type="submit" disabled={loading}
                  className="w-full py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 disabled:opacity-50 transition">
                  {loading ? 'Registering...' : 'Register Business'}
                </button>
              </form>
            </div>
          )}

          {step === 2 && (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
              <div className="text-center mb-6">
                <div className="text-4xl mb-2">🔐</div>
                <h2 className="text-2xl font-bold text-gray-900">Set Your Password</h2>
                <p className="text-gray-500 text-sm mt-1">CorpID: <strong>{corpId}</strong></p>
              </div>
              <form onSubmit={handleSetPassword} className="space-y-4">
                <div>
                  <label className={labelClass}>Password (min 8 chars) *</label>
                  <input type="password" className={inputClass} required minLength={8}
                    value={password} onChange={(e) => setPassword_(e.target.value)} />
                </div>
                {error && <p className="text-red-500 text-sm">{error}</p>}
                <button type="submit" disabled={loading}
                  className="w-full py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 disabled:opacity-50 transition">
                  {loading ? 'Saving...' : 'Set Password & Continue'}
                </button>
              </form>
            </div>
          )}

          {step === 3 && (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 text-center">
              <div className="text-5xl mb-4">✅</div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Registration Complete!</h2>
              <p className="text-gray-500 mb-6">Your business is registered on NeXha Commerce Network.</p>
              <div className="bg-blue-50 rounded-lg p-4 mb-6 text-left">
                <p className="text-sm text-blue-800"><strong>CorpID:</strong> {corpId}</p>
              </div>
              <Link href="/dashboard"
                className="block w-full py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition text-center">
                Go to Dashboard
              </Link>
            </div>
          )}

        </div>
      </main>
    </div>
  );
}
