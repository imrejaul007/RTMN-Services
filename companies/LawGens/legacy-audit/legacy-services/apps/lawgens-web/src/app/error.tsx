'use client';

import { useEffect } from 'react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center">
      <div className="text-center max-w-md mx-auto p-8">
        <div className="text-6xl mb-6">⚠️</div>
        <h2 className="text-2xl font-bold text-white mb-4">Something went wrong!</h2>
        <p className="text-slate-400 mb-6">
          We encountered an unexpected error. Please try again or contact support if the problem persists.
        </p>
        <button
          onClick={() => reset()}
          className="bg-amber-500 hover:bg-amber-600 px-6 py-3 rounded-lg font-medium transition"
        >
          Try again
        </button>
      </div>
    </div>
  );
}