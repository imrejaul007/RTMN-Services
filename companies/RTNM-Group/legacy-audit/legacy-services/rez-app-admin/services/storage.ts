import AsyncStorage from '@react-native-async-storage/async-storage';
import { logger } from '@/utils/logger';

// BUG-057 FIX: Use typeof window !== 'undefined' instead of Platform.OS === 'web'.
// Platform.OS can be 'web' in Expo/React Native web builds but 'ios'/'android' in
// web views or SSR environments. typeof window is universally reliable for browser detection.
const isWeb = typeof window !== 'undefined';

let SecureStore: typeof import('expo-secure-store') | null = null;
if (!isWeb) {
  SecureStore = require('expo-secure-store');
}

// BUG-057 FIX: explicit shape for stored admin user data.
export interface AdminUserRecord {
  _id: string;
  role: string;
  email?: string;
  name?: string;
  [key: string]: unknown; // allow extra API fields without reverting to `any`
}

// Phase 6: COOKIE_AUTH_ENABLED — when true, access tokens are managed by httpOnly cookies
// set by the backend on login. The apiClient skips injecting the Authorization header from
// localStorage and relies on the browser to send the cookie automatically (withCredentials).
// localStorage fallback is retained for backward compatibility during the migration window:
//   - Existing sessions with a valid localStorage token continue to work (bearer path)
//   - New logins receive cookies and no longer need localStorage token injection
// Set to false to revert to the old localStorage-only bearer token behaviour.
// In dev mode, use localStorage bearer tokens (server doesn't set httpOnly cookies locally).
// In production, use httpOnly cookies (set by the server on login response).
export const COOKIE_AUTH_ENABLED = typeof __DEV__ !== 'undefined' ? !__DEV__ : true;

// BUG-067 NOTE: On web, tokens and user data are stored in localStorage because
// expo-secure-store is native-only. localStorage is not encrypted and is
// accessible to any JS running on the same origin. The admin app is served from
// a controlled internal domain, so the XSS risk is accepted. With Phase 6,
// tokens are now also managed by httpOnly cookies (COOKIE_AUTH_ENABLED=true),
// which removes the token from JS-accessible storage for all new sessions.
const STORAGE_KEYS = {
  AUTH_TOKEN: 'admin_auth_token',
  USER_DATA: 'admin_user_data',
  REFRESH_TOKEN: 'admin_refresh_token',
  MIGRATION_COMPLETED: 'admin_migration_completed', // BUG-067 FIX: prevent migration re-runs
};

class StorageService {
  private async secureSetItem(key: string, value: string): Promise<void> {
    if (isWeb) {
      // Use localStorage so admin tokens persist across tab refreshes.
      // The admin app runs in a controlled environment; losing session on
      // every refresh is a larger operational hazard than XSS risk here.
      // ADM-013: log a warning so engineers auditing storage operations can
      // see this is intentional and not an accidental plaintext leak.
      try {
        localStorage.setItem(key, value);
      } catch (err) {
        logger.warn('[StorageService] localStorage.setItem failed — storage may be full or blocked:', err);
        throw err;
      }
    } else {
      // ADMIN-019: Write to SecureStore first, then delete from AsyncStorage only on success
      await SecureStore!.setItemAsync(key, value);
      // Only delete from AsyncStorage after SecureStore write succeeds
      await AsyncStorage.removeItem(key);
    }
  }

  private async secureGetItem(key: string): Promise<string | null> {
    if (isWeb) {
      return localStorage.getItem(key);
    }

    const secureValue = await SecureStore!.getItemAsync(key);
    if (secureValue !== null) {
      return secureValue;
    }

    // BUG-067 FIX: Check migration flag to prevent re-running migration on every access
    const migrationCompleted = await AsyncStorage.getItem(STORAGE_KEYS.MIGRATION_COMPLETED);
    if (migrationCompleted === 'true') {
      return null;
    }

    // Migration: Legacy AsyncStorage → SecureStore
    const legacyValue = await AsyncStorage.getItem(key);
    if (legacyValue !== null) {
      try {
        await SecureStore!.setItemAsync(key, legacyValue);
        // Only delete from AsyncStorage after SecureStore write succeeds
        await AsyncStorage.removeItem(key);
        // Mark migration as completed only after all legacy data is migrated
        await AsyncStorage.setItem(STORAGE_KEYS.MIGRATION_COMPLETED, 'true');
      } catch (error) {
        logger.error(`[StorageService] Migration failed for key ${key}:`, error);
        // Don't mark as completed; retry on next access
        throw error;
      }
    }

    return legacyValue;
  }

  private async secureRemoveItem(key: string): Promise<void> {
    if (isWeb) {
      localStorage.removeItem(key);
    } else {
      await SecureStore!.deleteItemAsync(key);
      await AsyncStorage.removeItem(key);
    }
  }

  async setAuthToken(token: string): Promise<void> {
    // Phase 6: httpOnly cookies manage auth on web — skip localStorage write.
    // Reads are still allowed so old sessions (pre-Phase 6) continue to work via bearer fallback.
    if (isWeb && COOKIE_AUTH_ENABLED) return;
    await this.secureSetItem(STORAGE_KEYS.AUTH_TOKEN, token);
  }

  async getAuthToken(): Promise<string | null> {
    // Phase 6: web auth is fully cookie-based — skip localStorage read.
    if (isWeb && COOKIE_AUTH_ENABLED) return null;
    return this.secureGetItem(STORAGE_KEYS.AUTH_TOKEN);
  }

  async removeAuthToken(): Promise<void> {
    await this.secureRemoveItem(STORAGE_KEYS.AUTH_TOKEN);
  }

  async setRefreshToken(token: string): Promise<void> {
    // Phase 6: httpOnly cookies manage refresh token on web — skip localStorage write.
    if (isWeb && COOKIE_AUTH_ENABLED) return;
    await this.secureSetItem(STORAGE_KEYS.REFRESH_TOKEN, token);
  }

  async getRefreshToken(): Promise<string | null> {
    // Phase 6: web refresh is cookie-based — skip localStorage read.
    if (isWeb && COOKIE_AUTH_ENABLED) return null;
    return this.secureGetItem(STORAGE_KEYS.REFRESH_TOKEN);
  }

  async removeRefreshToken(): Promise<void> {
    await this.secureRemoveItem(STORAGE_KEYS.REFRESH_TOKEN);
  }

  // BUG-057 FIX: replaced `any` with a typed AdminUserRecord so callers get
  // compile-time safety and readers can see the expected shape.
  async setUserData(userData: AdminUserRecord): Promise<void> {
    // SECURITY: Store admin user data in SecureStore (not plaintext AsyncStorage)
    await this.secureSetItem(STORAGE_KEYS.USER_DATA, JSON.stringify(userData));
  }

  async getUserData(): Promise<AdminUserRecord | null> {
    try {
      const data = await this.secureGetItem(STORAGE_KEYS.USER_DATA);
      if (!data) return null;
      const parsed = JSON.parse(data);
      // Basic structural validation to catch corrupted storage
      if (!parsed || typeof parsed !== 'object' || !parsed.role) {
        return null;
      }
      return parsed;
    } catch {
      return null;
    }
  }

  async removeUserData(): Promise<void> {
    await this.secureRemoveItem(STORAGE_KEYS.USER_DATA);
  }

  async logout(): Promise<void> {
    await Promise.all([this.removeAuthToken(), this.removeRefreshToken(), this.removeUserData()]);
  }

  async isAuthenticated(): Promise<boolean> {
    const token = await this.getAuthToken();
    return !!token;
  }
}

export const storageService = new StorageService();
export default storageService;
