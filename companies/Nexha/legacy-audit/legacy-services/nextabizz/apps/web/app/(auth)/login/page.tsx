'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { buildAuthorizeUrl } from '@/lib/rezOAuth';
import { setSession, MerchantSession } from '@/lib/supabase';

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Handle OAuth errors passed back from the callback
  useEffect(() => {
    const oauthError = searchParams.get('oauth_error');
    if (oauthError) {
      const errorMessages: Record<string, string> = {
        access_denied: 'Sign-in was cancelled. Please try again.',
        invalid_request: 'Invalid sign-in request. Please contact support.',
        token_exchange_failed: 'Failed to complete sign-in. Please try again.',
        callback_error: 'An error occurred during sign-in. Please try again.',
        sso_failed: 'Failed to link your REZ account. Please try again.',
      };
      setError(errorMessages[oauthError] || 'Sign-in failed. Please try again.');
      // Clean up the URL
      router.replace('/(auth)/login');
    }
  }, [searchParams, router]);

  const handleReZLogin = () => {
    // Generate state for CSRF protection
    const state = Buffer.from(
      JSON.stringify({ redirectTo: '/signals' }),
    ).toString('base64');

    // Redirect to REZ Auth Service OAuth2 authorization endpoint
    window.location.href = buildAuthorizeUrl(state);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#7C3AED] via-[#6D28D9] to-[#5B21B6] flex flex-col">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-10">
        <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="grid" width="32" height="32" patternUnits="userSpaceOnUse">
              <path d="M32 0L0 0 0 32" fill="none" stroke="white" strokeWidth="0.5"/>
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />
        </svg>
      </div>

      {/* Content */}
      <div className="flex-1 flex items-center justify-center p-4 relative">
        <div className="w-full max-w-md">
          {/* Logo & Branding */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-white rounded-2xl shadow-lg mb-4">
              <span className="text-2xl font-bold text-[#7C3AED]">N</span>
            </div>
            <h1 className="text-3xl font-bold text-white">NextaBizz</h1>
            <p className="text-purple-200 mt-2">B2B Procurement Platform</p>
          </div>

          {/* Login Card */}
          <div className="bg-white rounded-2xl shadow-2xl p-8">
            <div className="text-center mb-8">
              <h2 className="text-xl font-semibold text-gray-900">Welcome Back</h2>
              <p className="text-sm text-gray-500 mt-1">
                Sign in to manage your procurement
              </p>
            </div>

            {/* Error Message */}
            {error && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl">
                <div className="flex items-start gap-3">
                  <svg className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              </div>
            )}

            {/* ReZ SSO Login Button */}
            <button
              onClick={handleReZLogin}
              disabled={isLoading}
              className={`
                w-full flex items-center justify-center gap-3 px-6 py-4
                bg-gradient-to-r from-[#7C3AED] to-[#6D28D9]
                text-white font-semibold rounded-xl
                transition-all duration-200
                hover:shadow-lg hover:scale-[1.02]
                active:scale-[0.98]
                disabled:opacity-70 disabled:cursor-not-allowed disabled:hover:scale-100
              `}
            >
              {isLoading ? (
                <>
                  <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span>Signing in...</span>
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-1-13h2v6h-2zm0 8h2v2h-2z"/>
                  </svg>
                  <span>Sign in with ReZ</span>
                </>
              )}
            </button>

            {/* Divider */}
            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-200" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-4 bg-white text-gray-500">or</span>
              </div>
            </div>

            {/* Demo Login - SECURITY FIX: Removed hardcoded credentials
                 Demo login should use OAuth flow or call /api/auth/demo endpoint */}
            {process.env.NEXT_PUBLIC_ENABLE_DEMO_LOGIN === 'true' && (
              <button
                onClick={() => {
                  // Demo login via OAuth flow - redirects to REZ auth service
                  window.location.href = `${process.env.NEXT_PUBLIC_REZ_AUTH_URL}/oauth/authorize?client_id=nextabizz&redirect_uri=${encodeURIComponent(window.location.origin + '/api/auth/callback')}&response_type=code&scope=profile merchant`;
                }}
                className="w-full px-6 py-3 border border-gray-300 text-gray-700 font-medium rounded-xl hover:bg-gray-50 transition-colors"
              >
                Try Demo Account
              </button>
            )}

            {/* Help Text */}
            <p className="mt-6 text-center text-xs text-gray-400">
              By signing in, you agree to our{' '}
              <a href="#" className="text-[#7C3AED] hover:underline">Terms of Service</a>
              {' '}and{' '}
              <a href="#" className="text-[#7C3AED] hover:underline">Privacy Policy</a>
            </p>
          </div>

          {/* Features */}
          <div className="mt-8 grid grid-cols-3 gap-4 text-center">
            <div className="text-white/80">
              <div className="w-10 h-10 bg-white/10 rounded-lg flex items-center justify-center mx-auto mb-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
              </div>
              <p className="text-xs font-medium">Real-time Alerts</p>
            </div>
            <div className="text-white/80">
              <div className="w-10 h-10 bg-white/10 rounded-lg flex items-center justify-center mx-auto mb-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
              <p className="text-xs font-medium">Smart POs</p>
            </div>
            <div className="text-white/80">
              <div className="w-10 h-10 bg-white/10 rounded-lg flex items-center justify-center mx-auto mb-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <p className="text-xs font-medium">Analytics</p>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="py-6 text-center">
        <p className="text-sm text-white/60">
          Powered by{' '}
          <span className="font-semibold text-white/80">ReZ Platform</span>
        </p>
      </footer>
    </div>
  );
}

// Wrap in Suspense for useSearchParams()
export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gradient-to-br from-[#7C3AED] via-[#6D28D9] to-[#5B21B6]" />}>
      <LoginContent />
    </Suspense>
  );
}
