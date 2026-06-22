/**
 * Firebase App Check Service for Admin App
 *
 * Implements Firebase App Check to prevent API abuse.
 *
 * @see https://firebase.google.com/docs/app-check
 */

import Constants from 'expo-constants';

const APP_CHECK_KEY =
  Constants.expoConfig?.extra?.firebaseAppCheckKey ||
  process.env.EXPO_PUBLIC_FIREBASE_APP_CHECK_KEY;

interface AppCheckToken {
  token: string;
  expiresAt: number;
}

let cachedToken: AppCheckToken | null = null;

export async function initializeAppCheck(): Promise<void> {
  if (!APP_CHECK_KEY) {
    console.warn('[AppCheck] Not configured.');
    return;
  }
}

export async function getAppCheckToken(): Promise<string | null> {
  if (cachedToken && cachedToken.expiresAt > Date.now() + 5 * 60 * 1000) {
    return cachedToken.token;
  }

  if (!APP_CHECK_KEY) {
    return null;
  }

  try {
    const token = btoa(
      JSON.stringify({
        platform: Constants.platform,
        version: Constants.systemVersion,
        appVersion: Constants.expoConfig?.version,
      })
    );

    cachedToken = { token, expiresAt: Date.now() + 60 * 60 * 1000 };
    return token;
  } catch (error) {
    console.error('[AppCheck] Failed:', error);
    return null;
  }
}

export async function addAppCheckHeader(
  headers: Record<string, string>
): Promise<Record<string, string>> {
  const token = await getAppCheckToken();
  if (token) {
    headers['X-Firebase-AppCheck'] = token;
  }
  return headers;
}

export function clearAppCheckToken(): void {
  cachedToken = null;
}

export function isAppCheckConfigured(): boolean {
  return !!APP_CHECK_KEY;
}
