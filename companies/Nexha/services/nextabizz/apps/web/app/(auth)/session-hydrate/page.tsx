'use client';

import { useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { setSession, MerchantSession } from '@/lib/supabase';

/**
 * Session hydration page — receives session data from the OAuth2 callback
 * (which runs server-side and can't write to localStorage directly) and
 * stores it in localStorage, then redirects to the intended destination.
 */
function SessionHydrateContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const sessionData = searchParams.get('session');
    const redirectTo = searchParams.get('redirectTo') || '/signals';

    if (!sessionData) {
      router.replace('/(auth)/login');
      return;
    }

    try {
      const session: MerchantSession = JSON.parse(
        Buffer.from(sessionData, 'base64').toString('utf-8'),
      );
      setSession(session);
      router.replace(redirectTo);
    } catch {
      router.replace('/(auth)/login');
    }
  }, [searchParams, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="w-8 h-8 border-4 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-gray-500 text-sm">Signing you in...</p>
      </div>
    </div>
  );
}

// Wrap in Suspense for useSearchParams()
export default function SessionHydratePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="text-center">
            <div className="w-8 h-8 border-4 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-gray-500 text-sm">Loading...</p>
          </div>
        </div>
      }
    >
      <SessionHydrateContent />
    </Suspense>
  );
}
