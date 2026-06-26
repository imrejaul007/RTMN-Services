'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { getCheckoutSession } from '@/lib/api';

function SuccessContent() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get('session_id');

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sessionData, setSessionData] = useState<any>(null);

  useEffect(() => {
    if (!sessionId) {
      setLoading(false);
      return;
    }

    async function fetchSession() {
      try {
        const data = await getCheckoutSession(sessionId || '');
        setSessionData(data);
      } catch (err) {
        console.error('Failed to fetch session:', err);
        setError('Could not verify payment. Please check your email for confirmation.');
      } finally {
        setLoading(false);
      }
    }
    fetchSession();
  }, [sessionId]);

  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4">
      <div className="max-w-lg w-full text-center">
        {loading ? (
          <div className="animate-fade-in">
            <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-blue-100 flex items-center justify-center">
              <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
            </div>
            <h1 className="text-2xl font-bold text-slate-900 mb-2">Verifying your payment...</h1>
            <p className="text-slate-600">Please wait while we confirm your purchase.</p>
          </div>
        ) : error ? (
          <div className="animate-fade-in">
            <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-amber-100 flex items-center justify-center">
              <span className="text-4xl">⚠️</span>
            </div>
            <h1 className="text-2xl font-bold text-slate-900 mb-2">Payment Verification Issue</h1>
            <p className="text-slate-600 mb-8">{error}</p>
            <div className="space-y-3">
              <p className="text-sm text-slate-500">
                Your payment may still have gone through. Check your email for confirmation.
              </p>
              <Link
                href="/listings"
                className="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Continue Shopping
              </Link>
            </div>
          </div>
        ) : (
          <div className="animate-fade-in">
            <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-green-100 flex items-center justify-center">
              <span className="text-5xl">✅</span>
            </div>

            <h1 className="text-3xl font-bold text-slate-900 mb-2">
              Payment Successful! 🎉
            </h1>

            <p className="text-lg text-slate-600 mb-8">
              Thank you for your purchase. Your asset is ready to use.
            </p>

            {/* Order Details */}
            {sessionData && (
              <div className="bg-slate-50 rounded-xl p-6 mb-8 text-left">
                <h2 className="font-semibold text-slate-900 mb-4">Order Details</h2>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Order ID</span>
                    <span className="font-mono text-slate-700">{sessionId?.slice(0, 20)}...</span>
                  </div>
                  {sessionData.metadata?.listingId && (
                    <div className="flex justify-between">
                      <span className="text-slate-500">Asset ID</span>
                      <span className="font-mono text-slate-700">{sessionData.metadata.listingId}</span>
                    </div>
                  )}
                  {sessionData.amount && (
                    <div className="flex justify-between">
                      <span className="text-slate-500">Amount</span>
                      <span className="font-semibold text-slate-900">
                        {sessionData.currency?.toUpperCase()} {(sessionData.amount / 100).toLocaleString()}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-slate-500">Status</span>
                    <span className="text-green-600 font-medium">
                      {sessionData.paymentStatus === 'paid' ? '✓ Paid' : sessionData.paymentStatus}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* What's Next */}
            <div className="bg-blue-50 rounded-xl p-6 mb-8 text-left">
              <h2 className="font-semibold text-blue-900 mb-3">📦 What happens next?</h2>
              <ul className="space-y-2 text-sm text-blue-800">
                <li className="flex items-start gap-2">
                  <span className="text-blue-500">1.</span>
                  <span>Check your email for a receipt and access instructions</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-500">2.</span>
                  <span>Log into your dashboard to access your new asset</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-500">3.</span>
                  <span>Start using your AI employee, agent, or solution</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-500">4.</span>
                  <span>Leave a review to help others discover great assets</span>
                </li>
              </ul>
            </div>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                href="/listings"
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
              >
                Continue Shopping
              </Link>
              <Link
                href="/dashboard"
                className="px-6 py-3 bg-white text-slate-700 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors font-medium"
              >
                Go to Dashboard
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function SuccessPage() {
  return (
    <Suspense fallback={
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full" />
      </div>
    }>
      <SuccessContent />
    </Suspense>
  );
}
