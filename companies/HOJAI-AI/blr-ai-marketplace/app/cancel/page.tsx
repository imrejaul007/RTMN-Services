'use client';

import { Suspense } from 'react';
import Link from 'next/link';

export default function CancelPage() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4">
      <div className="max-w-lg w-full text-center">
        <div className="animate-fade-in">
          <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-slate-100 flex items-center justify-center">
            <span className="text-5xl">🛒</span>
          </div>

          <h1 className="text-3xl font-bold text-slate-900 mb-2">
            Payment Cancelled
          </h1>

          <p className="text-lg text-slate-600 mb-8">
            No worries! Your payment was not processed and you have not been charged.
          </p>

          {/* Info Box */}
          <div className="bg-slate-50 rounded-xl p-6 mb-8 text-left">
            <h2 className="font-semibold text-slate-900 mb-3">💡 Common reasons for cancellation:</h2>
            <ul className="space-y-2 text-sm text-slate-600">
              <li className="flex items-start gap-2">
                <span className="text-slate-400">•</span>
                <span>Changed your mind about the purchase</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-slate-400">•</span>
                <span>Wanted to review the total cost first</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-slate-400">•</span>
                <span>Card was declined by your bank</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-slate-400">•</span>
                <span>Navigation or browser issue</span>
              </li>
            </ul>
          </div>

          {/* CTA */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/listings"
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              Continue Browsing
            </Link>
            <Link
              href="/"
              className="px-6 py-3 bg-white text-slate-700 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors font-medium"
            >
              Back to Home
            </Link>
          </div>

          {/* Help */}
          <p className="text-sm text-slate-500 mt-8">
            Having trouble?{' '}
            <a href="mailto:support@hojai.ai" className="text-blue-600 hover:underline">
              Contact support
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
