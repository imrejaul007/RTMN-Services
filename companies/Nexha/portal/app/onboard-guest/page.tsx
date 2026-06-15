'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { onboardGuest, verifyOtp } from '@/lib/api';

type Step = 'form' | 'otp' | 'success' | 'error';

export default function GuestOnboardPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>('form');
  const [error, setError] = useState('');
  const [guestId, setGuestId] = useState('');
  const [form, setForm] = useState({
    businessName: '',
    ownerName: '',
    phone: '',
    whatsapp: '',
    email: '',
    city: '',
    state: '',
    pincode: '',
    categories: '',
  });
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const data = await onboardGuest({
        ...form,
        phone: form.phone.replace(/\D/g, ''),
        whatsapp: form.whatsapp.replace(/\D/g, '') || undefined,
        categories: form.categories ? form.categories.split(',').map((c) => c.trim()) : [],
      });
      setGuestId(data.guestId);
      setStep('otp');
    } catch (err) {
      setError((err as Error).message);
      setStep('error');
    } finally {
      setLoading(false);
    }
  };

  const handleOtpChange = (idx: number, val: string) => {
    const next = [...otp];
    next[idx] = val.replace(/\D/g, '').slice(-1);
    setOtp(next);
    // auto-advance
    if (val && idx < 5) {
      const inputs = document.querySelectorAll<HTMLInputElement>('.otp-input');
      (inputs[idx + 1] as HTMLInputElement)?.focus();
    }
  };

  const handleOtpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const code = otp.join('');
    if (code.length < 6) { setError('Enter all 6 digits'); return; }
    setLoading(true);
    setError('');
    try {
      await verifyOtp(guestId, code);
      setStep('success');
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const inputClass = 'w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900';
  const labelClass = 'block text-sm font-medium text-gray-700 mb-1';

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center gap-3">
          <Link href="/" className="text-gray-500 hover:text-gray-700 text-sm">← Back</Link>
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold">N</div>
          <span className="font-semibold text-gray-900">Join NeXha — No GST Required</span>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-lg">

          {step === 'form' && (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
              <div className="mb-6">
                <h1 className="text-2xl font-bold text-gray-900 mb-1">Start Selling Today</h1>
                <p className="text-gray-500 text-sm">No GST required. Just your phone number and business details.</p>
              </div>

              {/* Progress */}
              <div className="flex gap-1 mb-8">
                <div className="flex-1 h-1.5 bg-blue-600 rounded-full"></div>
                <div className="flex-1 h-1.5 bg-gray-200 rounded-full"></div>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className={labelClass}>Business Name *</label>
                  <input className={inputClass} placeholder="Ravi General Store" required
                    value={form.businessName} onChange={(e) => setForm({ ...form, businessName: e.target.value })} />
                </div>
                <div>
                  <label className={labelClass}>Owner Name *</label>
                  <input className={inputClass} placeholder="Ravi Kumar" required
                    value={form.ownerName} onChange={(e) => setForm({ ...form, ownerName: e.target.value })} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className={labelClass}>Phone *</label>
                    <input className={inputClass} placeholder="9876543210" required
                      value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
                  </div>
                  <div>
                    <label className={labelClass}>WhatsApp (optional)</label>
                    <input className={inputClass} placeholder="Same as phone"
                      value={form.whatsapp} onChange={(e) => setForm({ ...form, whatsapp: e.target.value })} />
                  </div>
                </div>
                <div>
                  <label className={labelClass}>Email (optional)</label>
                  <input type="email" className={inputClass} placeholder="ravi@example.com"
                    value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div className="col-span-1">
                    <label className={labelClass}>City *</label>
                    <input className={inputClass} placeholder="Pune" required
                      value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
                  </div>
                  <div className="col-span-1">
                    <label className={labelClass}>State *</label>
                    <input className={inputClass} placeholder="Maharashtra" required
                      value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value })} />
                  </div>
                  <div className="col-span-1">
                    <label className={labelClass}>Pincode *</label>
                    <input className={inputClass} placeholder="411001" required maxLength={6}
                      value={form.pincode} onChange={(e) => setForm({ ...form, pincode: e.target.value })} />
                  </div>
                </div>
                <div>
                  <label className={labelClass}>Categories (comma-separated)</label>
                  <input className={inputClass} placeholder="vegetables, groceries, grains"
                    value={form.categories} onChange={(e) => setForm({ ...form, categories: e.target.value })} />
                </div>
                <button type="submit" disabled={loading}
                  className="w-full py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 disabled:opacity-50 transition">
                  {loading ? 'Sending OTP...' : 'Send Verification Code'}
                </button>
              </form>
              <p className="text-xs text-gray-400 mt-4 text-center">
                Already have an account? <Link href="/login" className="text-blue-600 hover:underline">Sign in</Link>
              </p>
            </div>
          )}

          {step === 'otp' && (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 text-center">
              <div className="text-4xl mb-4">📱</div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Verify your phone</h2>
              <p className="text-gray-500 mb-6">We sent a 6-digit code to <strong>{form.phone}</strong> on WhatsApp</p>
              <form onSubmit={handleOtpSubmit}>
                <div className="flex gap-2 justify-center mb-6">
                  {otp.map((digit, i) => (
                    <input key={i} type="text" inputMode="numeric" maxLength={1}
                      className="otp-input w-12 h-14 text-center text-2xl font-bold border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      value={digit} onChange={(e) => handleOtpChange(i, e.target.value)} />
                  ))}
                </div>
                {error && <p className="text-red-500 text-sm mb-4">{error}</p>}
                <button type="submit" disabled={loading}
                  className="w-full py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 disabled:opacity-50 transition">
                  {loading ? 'Verifying...' : 'Verify & Activate'}
                </button>
              </form>
              <button className="mt-4 text-sm text-blue-600 hover:underline"
                onClick={() => setStep('form')}>Change phone number</button>
            </div>
          )}

          {step === 'success' && (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 text-center">
              <div className="text-5xl mb-4">🎉</div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">You&apos;re in!</h2>
              <p className="text-gray-500 mb-6">Your guest account is active. You can receive RFQs immediately.</p>
              <div className="bg-blue-50 rounded-lg p-4 mb-6 text-left">
                <p className="text-sm text-blue-800"><strong>Guest ID:</strong> {guestId}</p>
                <p className="text-sm text-blue-800 mt-1"><strong>Valid for:</strong> 30 days</p>
              </div>
              <p className="text-sm text-gray-500 mb-6">
                Submit your GSTIN to convert to a full supplier account and unlock all features.
              </p>
              <Link href="/dashboard" className="block w-full py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition text-center">
                Go to Dashboard
              </Link>
            </div>
          )}

          {step === 'error' && (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 text-center">
              <div className="text-4xl mb-4">❌</div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Something went wrong</h2>
              <p className="text-red-500 mb-6">{error}</p>
              <button className="px-6 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition"
                onClick={() => { setStep('form'); setError(''); }}>
                Try Again
              </button>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
