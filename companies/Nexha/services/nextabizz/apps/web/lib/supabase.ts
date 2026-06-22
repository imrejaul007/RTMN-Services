import { createClient } from '@supabase/supabase-js';

export function createBrowserClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

export interface MerchantSession {
  id: string;
  merchantId: string;
  businessName: string;
  email: string;
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
}

const SESSION_KEY = 'nextabizz_session';

export function getSession(): MerchantSession | null {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    const sessionJson = localStorage.getItem(SESSION_KEY);
    if (!sessionJson) {
      return null;
    }

    const session: MerchantSession = JSON.parse(sessionJson);

    // Check if token is expired
    if (session.expiresAt && Date.now() > session.expiresAt) {
      clearSession();
      return null;
    }

    return session;
  } catch {
    clearSession();
    return null;
  }
}

export function setSession(session: MerchantSession): void {
  if (typeof window === 'undefined') {
    return;
  }

  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

export function clearSession(): void {
  if (typeof window === 'undefined') {
    return;
  }

  localStorage.removeItem(SESSION_KEY);
}

export function getAuthToken(): string | null {
  const session = getSession();
  return session?.accessToken || null;
}

export function isAuthenticated(): boolean {
  return getSession() !== null;
}
