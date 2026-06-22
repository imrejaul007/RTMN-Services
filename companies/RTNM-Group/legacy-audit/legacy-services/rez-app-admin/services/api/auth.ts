import { Platform } from 'react-native';

// BUG-056 FIX: Lazy-load expo-local-authentication so the package is only required
// on native platforms. The web build never attempts to import it.
const getLocalAuth = () => {
  if (Platform.OS === 'web') return null;
  try {
    return require('expo-local-authentication');
  } catch {
    return null;
  }
};
import { apiClient } from './apiClient';
import { storageService, COOKIE_AUTH_ENABLED } from '../storage';
import { logger } from '../../utils/logger';
import type { AdminUserRecord } from '../storage';

// Canonical types: @rez/shared-types — migrate imports when package is published

// NEW-A-M6 FIX: Restrict role to only valid admin roles.
// 'user', 'consumer', 'merchant' roles should never authenticate to the admin panel.
// NEW-A-M2 FIX: level is optional — JWT payload never includes it, only the login response.
export interface AdminUser {
  _id: string;
  email: string;
  name: string;
  role: 'admin' | 'support' | 'operator' | 'super_admin';
  level?: number;
  permissions: string[];
  lastLogin?: string;
  createdAt: string;
}

export interface LoginResponse {
  success: boolean;
  message?: string;
  data?: {
    user: AdminUser;
    token: string;
    refreshToken?: string;
  };
}

type LoginPayload = {
  user: AdminUser;
  token: string;
  refreshToken?: string;
};

type LoginApiResponse = LoginResponse & {
  data?: LoginPayload;
};

function toAdminUserRecord(user: AdminUser): AdminUserRecord {
  return {
    _id: user._id,
    email: user.email,
    name: user.name,
    role: user.role,
    level: user.level,
    permissions: user.permissions,
    lastLogin: user.lastLogin,
    createdAt: user.createdAt,
  };
}

function isAdminUserRecord(value: unknown): value is AdminUser {
  return (
    !!value &&
    typeof value === 'object' &&
    typeof (value as AdminUser)._id === 'string' &&
    typeof (value as AdminUser).role === 'string'
  );
}

/**
 * Authentication service for admin users
 * Handles login, logout, token refresh, and user profile management
 * ADMIN-022+: Added JSDoc comments for key functions
 */
class AuthService {
  /**
   * Login admin user
   * Uses the admin auth endpoint - backend validates admin role
   * @param email Admin email address
   * @param password Admin password
   * @returns Login response with user and token
   */
  async login(email: string, password: string): Promise<LoginResponse> {
    try {
      logger.info('🔐 [Admin Auth] Attempting login for:', { email });

      const response: LoginApiResponse = await apiClient.post<LoginPayload, Record<string, string>>(
        'admin/auth/login',
        { email, password }
      );

      if (response.success && response.data) {
        await storageService.setAuthToken(response.data.token);
        await storageService.setUserData(toAdminUserRecord(response.data.user));
        if (response.data.refreshToken) {
          await storageService.setRefreshToken(response.data.refreshToken);
        }

        logger.info('✅ [Admin Auth] Login successful, role:', { role: response.data.user.role });
        return {
          success: true,
          data: response.data,
        };
      }

      return {
        success: false,
        message: response.message || 'Login failed',
      };
    } catch (error: any) {
      logger.error('❌ [Admin Auth] Login error:', error.message);
      return {
        success: false,
        message: error.message || 'Login failed',
      };
    }
  }

  /**
   * Logout and clear all auth data
   * Calls backend logout endpoint and clears local storage
   */
  async logout(): Promise<void> {
    try {
      logger.info('🚪 [Admin Auth] Logging out...');

      // Call backend logout endpoint (optional)
      try {
        await apiClient.post('admin/auth/logout');
      } catch (e) {
        // ADM-014: surface the error so operators notice logout failures,
        // even though local storage is cleared regardless.
        logger.warn('[Admin Auth] Logout API call failed (storage cleared anyway):', e);
      }

      // Clear local storage
      await storageService.logout();
      logger.info('✅ [Admin Auth] Logout complete');
    } catch (error) {
      logger.error('❌ [Admin Auth] Logout error:', error);
      // Still clear local storage even if API fails
      await storageService.logout();
    }
  }

  /**
   * Get current user from storage
   * @returns Current authenticated user or null if not logged in
   */
  async getCurrentUser(): Promise<AdminUser | null> {
    try {
      const userData = await storageService.getUserData();
      return isAdminUserRecord(userData) ? userData : null;
    } catch (error) {
      logger.error('❌ [Admin Auth] Get current user error:', error);
      return null;
    }
  }

  /**
   * Get stored auth token
   * @returns JWT token or null if not authenticated
   */
  async getToken(): Promise<string | null> {
    // On web, tokens are in httpOnly cookies — return a sentinel so callers
    // don't treat null as "not logged in" before validating via the API.
    if (Platform.OS === 'web' && COOKIE_AUTH_ENABLED) return 'cookie-session';
    return await storageService.getAuthToken();
  }

  /**
   * Check if user is authenticated
   * @returns true if user has valid auth token
   */
  async isAuthenticated(): Promise<boolean> {
    if (Platform.OS === 'web' && COOKIE_AUTH_ENABLED) {
      // Web: token is in an httpOnly cookie — validate via network call.
      try {
        const response = await apiClient.get<{ user: AdminUser }>('admin/auth/me');
        return !!(response.success && response.data?.user);
      } catch {
        return false;
      }
    }
    return await storageService.isAuthenticated();
  }

  /**
   * Refresh user profile from backend
   * @returns Updated user profile or null on failure
   */
  async refreshProfile(): Promise<AdminUser | null> {
    try {
      const response = await apiClient.get<{ user: AdminUser }>('admin/auth/me');

      if (response.success && response.data?.user) {
        await storageService.setUserData(toAdminUserRecord(response.data.user));
        return response.data.user;
      }

      return null;
    } catch (error) {
      logger.error('❌ [Admin Auth] Refresh profile error:', error);
      return null;
    }
  }

  /**
   * Logout from all active devices by invalidating all sessions server-side.
   * After this call, callers should perform a full local logout.
   * @throws {Error} If the API call fails
   */
  async logoutAllDevices(): Promise<void> {
    logger.info('[Admin Auth] Logging out all devices...');
    const response = await apiClient.post('admin/auth/logout-all-devices');
    if (!response.success) {
      throw new Error(response.message || 'Failed to logout all devices');
    }
    logger.info('[Admin Auth] All devices logged out');
  }

  /**
   * BUG-056 FIX: Authenticate using device biometrics (Face ID / fingerprint).
   * Returns true if the user successfully authenticates, false otherwise.
   * On web or if expo-local-authentication is unavailable, returns false silently.
   * Use this as a gate before sensitive operations (wallet adjustments, refunds, etc.).
   *
   * @param reason - Prompt shown to the user in the biometric dialog
   * @returns true if authentication succeeded, false if failed or unavailable
   */
  async authenticateWithBiometrics(reason = 'Authenticate to continue'): Promise<boolean> {
    if (Platform.OS === 'web') {
      logger.info('[Admin Auth] Biometrics not available on web');
      return false;
    }

    const LocalAuth = getLocalAuth();
    if (!LocalAuth) {
      logger.info('[Admin Auth] expo-local-authentication not installed');
      return false;
    }

    try {
      const hasHardware = await LocalAuth.hasHardwareAsync();
      if (!hasHardware) {
        logger.info('[Admin Auth] Device has no biometric hardware');
        return false;
      }

      const isEnrolled = await LocalAuth.isEnrolledAsync();
      if (!isEnrolled) {
        logger.info('[Admin Auth] No biometrics enrolled on this device');
        return false;
      }

      const result = await LocalAuth.authenticateAsync({
        promptMessage: reason,
        fallbackLabel: 'Use Password',
        cancelLabel: 'Cancel',
        disableDeviceFallback: false,
      });

      logger.info(`[Admin Auth] Biometric auth result: ${result.success}`);
      if (!result.success && result.error) {
        logger.info(`[Admin Auth] Biometric error: ${result.error}`);
      }

      return result.success;
    } catch (error) {
      logger.error('[Admin Auth] Biometric authentication error:', error);
      return false;
    }
  }
}

export const authService = new AuthService();
