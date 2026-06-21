'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { getMe, convertGuest, issueCorpId, registerSupplier } from '@/lib/api';

type FormState = {
  gstin: string;
  pan: string;
  legalName: string;
  city: string;
  state: string;
  category: string;
  submitting: boolean;
  error: string;
  done: boolean;
};

export default function UpgradePage() {
  const router = useRouter();
  const [me, setMe] = useState<{ corpId: string; role: string; guestId?: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState<FormState>({
    gstin: '',
    pan: '',
    legalName: '',
    city: '',
    state: '',
    category: '',
    submitting: false,
    error: '',
    done: false,
  });

  useEffect(() => {
    // Phase 5 fix: auth via httpOnly cookie. Also gates to guests only.
    getMe()
      .then((data) => {
        setMe(data as { corpId: string; role: string; guestId?: string });
        if (!(data as { guestId?: string })?.guestId) {
          // Not a guest — send them back to dashboard
          router.push('/dashboard');
        }
      })
      .catch(() => router.push('/login'))
      .finally(() => setLoading(false));
  }, [router]);

  const update = <K extends keyof FormState>(k: K, v: FormState[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!me?.guestId) return;
    if (!form.gstin && !form.pan) {
      update('error', 'Either GSTIN or PAN is required');
      return;
    }
    update('submitting', true);
    update('error', '');
    try {
      // 1. Mint a corpId for the upgraded account
      const corp = await issueCorpId({
        type: 'supplier',
        businessName: form.legalName,
        phone: '', // The guest already verified their phone — pass empty here; backend will use what's already known
        email: '',
      });
      // 2. Register the supplier profile
      await registerSupplier({
        corpId: corp.corpId,
        businessName: form.legalName,
        legalName: form.legalName,
        email: '',
        phone: '',
        categories: form.category ? [form.category] : [],
        address: { line1: 'Onboarded via guest upgrade', city: form.city, state: form.state, pincode: '000000' },
        documents: [
          ...(form.gstin ? [{ type: 'gstin', number: form.gstin }] : []),
          ...(form.pan ? [{ type: 'pan', number: form.pan }] : []),
        ],
      });
      // 3. Convert the guest to a full supplier
      await convertGuest(me.guestId, corp.corpId, {
        gstin: form.gstin || undefined,
        pan: form.pan || undefined,
      });
      update('done', true);
    } catch (err) {
      update('error', (err as Error).message);
    } finally {
      update('submitting', false);
    }
  };

  if (loading) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
    </div>
  );

  if (form.done) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-6">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 text-center max-w-md">
          <span className="text-5xl">🎉</span>
          <h2 className="text-2xl font-bold text-gray-900 mt-4 mb-2">Upgrade submitted!</h2>
          <p className="text-gray-500 mb-6">
            Your account is being verified. We'll email you when it's approved.
          </p>
          <Link
            href="/dashboard"
            className="block w-full py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition"
          >
            Back to dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center gap-4">
          <Link href="/dashboard" className="text-gray-400 hover:text-gray-600">← Back</Link>
          <h1 className="font-semibold text-gray-900">Upgrade to Full Account</h1>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-8">
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6 mb-6">
          <div className="flex items-start gap-4">
            <span className="text-3xl">⭐</span>
            <div>
              <h2 className="text-lg font-semibold text-amber-900">Guest Account — Limited Access</h2>
              <p className="text-amber-700 mt-1">
                You&apos;re currently on a guest account ({me?.guestId}). Upgrade to unlock full features:
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

        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
          <h2 className="text-xl font-bold text-gray-900 mb-6">Business Verification</h2>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">GSTIN *</label>
                <input
                  type="text"
                  placeholder="27AABCU9603R1ZM"
                  maxLength={15}
                  value={form.gstin}
                  onChange={(e) => update('gstin', e.target.value.toUpperCase())}
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
                  value={form.pan}
                  onChange={(e) => update('pan', e.target.value.toUpperCase())}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Business Legal Name *</label>
              <input
                type="text"
                placeholder="Acme Supplies Pvt Ltd"
                value={form.legalName}
                onChange={(e) => update('legalName', e.target.value)}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Business Category *</label>
              <select
                value={form.category}
                onChange={(e) => update('category', e.target.value)}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
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
                <input
                  type="text"
                  placeholder="Mumbai"
                  value={form.city}
                  onChange={(e) => update('city', e.target.value)}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">State *</label>
                <input
                  type="text"
                  placeholder="Maharashtra"
                  value={form.state}
                  onChange={(e) => update('state', e.target.value)}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>

            {form.error && (
              <p className="text-red-500 text-sm">{form.error}</p>
            )}

            <div className="border-t pt-6">
              <button
                type="submit"
                disabled={form.submitting}
                className="w-full px-6 py-3 bg-blue-600 text-white font-medium rounded-xl hover:bg-blue-700 transition disabled:opacity-50"
              >
                {form.submitting ? 'Submitting...' : 'Submit for Verification'}
              </button>
              <p className="text-xs text-gray-400 text-center mt-3">
                By submitting, you agree to NeXha&apos;s Terms of Service and Privacy Policy
              </p>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}
