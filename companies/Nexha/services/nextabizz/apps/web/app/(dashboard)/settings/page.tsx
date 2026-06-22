'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getSession, MerchantSession } from '@/lib/supabase';

interface LinkStatus {
  linked: boolean;
  merchantId?: string | null;
  businessName?: string | null;
  isActive?: boolean;
}

export default function SettingsPage() {
  const router = useRouter();
  const [session, setSession] = useState<MerchantSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Link form state
  const [merchantId, setMerchantId] = useState('');
  const [isLinking, setIsLinking] = useState(false);
  const [linkError, setLinkError] = useState<string | null>(null);
  const [linkSuccess, setLinkSuccess] = useState(false);

  // Check link status
  const [linkStatus, setLinkStatus] = useState<LinkStatus>({ linked: false });
  const [isCheckingLink, setIsCheckingLink] = useState(false);

  useEffect(() => {
    const currentSession = getSession();
    if (!currentSession) {
      router.push('/login');
      return;
    }
    setSession(currentSession);
    setIsLoading(false);
  }, [router]);

  // On mount, check if this REZ user is already linked to a merchant
  useEffect(() => {
    if (!session?.id) return;
    checkLinkStatus();
  }, [session?.id]);

  const checkLinkStatus = async () => {
    if (!session?.id) return;

    setIsCheckingLink(true);
    try {
      const res = await fetch(
        `/api/merchant/check-link-status?userId=${encodeURIComponent(session.id)}`,
      );
      const data = await res.json() as LinkStatus;

      setLinkStatus({
        linked: data.linked,
        merchantId: data.merchantId || null,
        businessName: data.businessName || null,
        isActive: data.isActive,
      });

      // If linked, update the session with the real merchantId and businessName
      if (data.linked && data.merchantId) {
        const updatedSession: MerchantSession = {
          ...session!,
          merchantId: data.merchantId,
          businessName: data.businessName || session!.businessName,
        };
        localStorage.setItem('nextabizz_session', JSON.stringify(updatedSession));
        setSession(updatedSession);
      }
    } catch {
      // Non-fatal — treat as not linked
      setLinkStatus({ linked: false });
    } finally {
      setIsCheckingLink(false);
    }
  };

  const handleLinkAccount = async () => {
    if (!session?.accessToken) return;

    setLinkError(null);
    setLinkSuccess(false);

    if (!merchantId || !/^[a-f0-9]{24}$/i.test(merchantId)) {
      setLinkError('Please enter a valid 24-character merchant ID (ObjectId format)');
      return;
    }

    setIsLinking(true);

    try {
      const res = await fetch('/api/merchant/link-rez-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          merchantId,
          accessToken: session.accessToken,
        }),
      });

      const data = await res.json() as { success?: boolean; error?: string };

      if (!res.ok || !data.success) {
        setLinkError(data.error || 'Failed to link account. Please try again.');
        return;
      }

      setLinkSuccess(true);
      setLinkStatus({
        linked: true,
        merchantId,
        businessName: session.businessName,
        isActive: true,
      });

      // Update session with the real merchantId
      const updatedSession: MerchantSession = {
        ...session,
        merchantId,
      };
      localStorage.setItem('nextabizz_session', JSON.stringify(updatedSession));
      setSession(updatedSession);
    } catch (err) {
      setLinkError(err instanceof Error ? err.message : 'Failed to link account');
    } finally {
      setIsLinking(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-purple-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl space-y-8">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-sm text-gray-500 mt-1">
          Manage your account and platform connections
        </p>
      </div>

      {/* REZ Account Linkage */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 bg-gray-50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
              </svg>
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">REZ Account Connection</h2>
              <p className="text-sm text-gray-500">
                Link your NextaBizz account to your REZ merchant account
              </p>
            </div>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Current Status */}
          <div className="bg-gray-50 rounded-lg p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500">REZ User ID</span>
              <span className="text-xs font-mono text-gray-400 bg-white px-2 py-1 rounded border">
                {session?.id ? `${session.id.slice(0, 8)}...${session.id.slice(-4)}` : '—'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500">Merchant ID</span>
              {isCheckingLink ? (
                <span className="flex items-center gap-1.5 text-sm text-gray-400">
                  <span className="w-3 h-3 border border-gray-300 border-t-purple-600 rounded-full animate-spin" />
                  Checking...
                </span>
              ) : linkStatus.linked ? (
                <span className="flex items-center gap-1.5 text-sm text-green-600">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  {linkStatus.merchantId ? `${linkStatus.merchantId.slice(0, 8)}...` : 'Connected'}
                </span>
              ) : (
                <span className="flex items-center gap-1.5 text-sm text-amber-600">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  Not linked
                </span>
              )}
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500">Business Name</span>
              <span className="text-sm text-gray-900">{linkStatus.businessName || session?.businessName || '—'}</span>
            </div>
          </div>

          {/* Success State */}
          {linkSuccess && (
            <div className="flex items-start gap-3 p-4 bg-green-50 border border-green-200 rounded-lg">
              <svg className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <div>
                <p className="text-sm font-medium text-green-800">Account linked successfully!</p>
                <p className="text-xs text-green-600 mt-0.5">
                  Your NextaBizz account is now connected to your REZ merchant account.
                </p>
              </div>
            </div>
          )}

          {/* Error State */}
          {linkError && (
            <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-lg">
              <svg className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
              <p className="text-sm text-red-700">{linkError}</p>
            </div>
          )}

          {/* Link Form — show when not linked */}
          {!linkStatus.linked && !linkSuccess && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Merchant ID
                </label>
                <input
                  type="text"
                  value={merchantId}
                  onChange={e => setMerchantId(e.target.value.trim())}
                  placeholder="Enter your REZ merchant ID (24-character ObjectId)"
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm font-mono
                    placeholder:text-gray-400 focus:ring-2 focus:ring-purple-500 focus:border-transparent
                    transition-shadow"
                />
                <p className="text-xs text-gray-400 mt-1.5">
                  Find your Merchant ID in your REZ Merchant Dashboard under Account Settings.
                </p>
              </div>

              <button
                onClick={handleLinkAccount}
                disabled={isLinking || !merchantId}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5
                  bg-gradient-to-r from-[#7C3AED] to-[#6D28D9]
                  text-white font-medium rounded-lg
                  hover:shadow-lg hover:scale-[1.01] active:scale-[0.99]
                  disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100
                  transition-all duration-200"
              >
                {isLinking ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Linking...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101" />
                    </svg>
                    Connect Account
                  </>
                )}
              </button>
            </div>
          )}

          {/* Re-check button when already linked */}
          {linkStatus.linked && !linkSuccess && (
            <div className="flex gap-3">
              <button
                onClick={checkLinkStatus}
                disabled={isCheckingLink}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 font-medium rounded-lg
                  hover:bg-gray-50 transition-colors text-sm disabled:opacity-50"
              >
                {isCheckingLink ? 'Checking...' : 'Verify Connection'}
              </button>
              <button
                onClick={() => {
                  setLinkStatus({ linked: false });
                  setLinkSuccess(false);
                }}
                className="flex-1 px-4 py-2 bg-gray-100 text-gray-600 font-medium rounded-lg
                  hover:bg-gray-200 transition-colors text-sm"
              >
                Re-link
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Account Info */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Account Information</h2>
        <div className="space-y-3">
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Email</span>
            <span className="text-gray-900">{session?.email || '—'}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Session Expires</span>
            <span className="text-gray-900">
              {session?.expiresAt
                ? new Date(session.expiresAt).toLocaleString()
                : '—'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
