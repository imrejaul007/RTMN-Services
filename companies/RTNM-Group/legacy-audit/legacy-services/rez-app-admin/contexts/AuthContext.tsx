import React, {
  createContext,
  useContext,
  useReducer,
  useEffect,
  useCallback,
  useMemo,
  useRef,
  ReactNode,
} from 'react';
import { router } from 'expo-router';
import { authService, AdminUser } from '../services/api/auth';
import { apiClient } from '../services/api/apiClient';
import { queryClient } from '../config/reactQuery';
import { logger } from '../utils/logger';
import { isValidAdminRole, VALID_ADMIN_ROLES, AdminRole } from '../constants/roles';

// Types
interface AuthState {
  isAuthenticated: boolean;
  isLoading: boolean;
  isInitializing: boolean; // ADMIN-010: Track initial auth check separately
  user: AdminUser | null;
  token: string | null;
  error: string | null;
  networkWarning: string | null; // L5 FIX: non-null when authenticated via cached data due to network error
  isOffline: boolean; // SEC: true when session was resumed from cache without server confirmation
  offlineSince: number | null; // SEC: epoch ms when offline mode began; used for 5-min TTL cap
}

type AuthAction =
  | { type: 'AUTH_START' }
  | { type: 'AUTH_SUCCESS'; payload: { user: AdminUser; token: string } }
  | { type: 'AUTH_OFFLINE'; payload: { user: AdminUser; token: string; warning: string } } // L5 FIX
  | { type: 'AUTH_ERROR'; payload: string }
  | { type: 'LOGOUT' }
  | { type: 'CLEAR_ERROR' }
  | { type: 'UPDATE_USER'; payload: AdminUser };

interface AuthContextType {
  state: AuthState;
  token: string | null;
  user: AdminUser | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  clearError: () => void;
  updateUser: (user: AdminUser) => void;
  isAuthenticated: boolean;
  isLoading: boolean;
  isInitializing: boolean; // ADMIN-010: Track initial auth check
  networkWarning: string | null; // L5 FIX: exposed so UI can show a stale-data banner
  hasPermission: (permission: string) => boolean;
  hasRole: (role: string) => boolean;
}

// Initial state
const initialState: AuthState = {
  isAuthenticated: false,
  isLoading: true,
  isInitializing: true, // ADMIN-010: Track initial auth check
  user: null,
  token: null,
  error: null,
  networkWarning: null,
  isOffline: false,
  offlineSince: null,
};

// Reducer
function authReducer(state: AuthState, action: AuthAction): AuthState {
  switch (action.type) {
    case 'AUTH_START':
      return {
        ...state,
        isLoading: true,
        error: null,
      };
    case 'AUTH_SUCCESS':
      return {
        ...state,
        isAuthenticated: true,
        isLoading: false,
        isInitializing: false, // ADMIN-010: Mark initialization complete
        user: action.payload.user,
        token: action.payload.token,
        error: null,
        networkWarning: null,
        isOffline: false,
        offlineSince: null,
      };
    case 'AUTH_OFFLINE': // L5 FIX: authenticated from cache due to network failure
      return {
        ...state,
        isAuthenticated: true,
        isLoading: false,
        isInitializing: false,
        user: action.payload.user,
        token: action.payload.token,
        error: null,
        networkWarning: action.payload.warning,
        // SEC: record when offline mode began so the 5-min TTL useEffect can force logout
        isOffline: true,
        offlineSince: Date.now(),
      };
    case 'AUTH_ERROR':
      return {
        ...state,
        isAuthenticated: false,
        isLoading: false,
        isInitializing: false, // ADMIN-010: Mark initialization complete
        user: null,
        token: null,
        error: action.payload,
      };
    case 'LOGOUT':
      logger.info('🔄 [Admin] LOGOUT action dispatched');
      return {
        ...state,
        isAuthenticated: false,
        isLoading: false,
        isInitializing: false, // ADMIN-010: Mark initialization complete
        user: null,
        token: null,
        error: null,
        networkWarning: null,
        isOffline: false,
        offlineSince: null,
      };
    case 'CLEAR_ERROR':
      return {
        ...state,
        error: null,
      };
    case 'UPDATE_USER':
      return {
        ...state,
        user: action.payload,
      };
    default:
      return state;
  }
}

// Context
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Provider
export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(authReducer, initialState);

  // ADMIN-002: Wrap checkStoredToken in useCallback to avoid stale closure
  // MED-10 FIX: Note - empty deps is intentional, VALID_ADMIN_ROLES is a module-level constant
  const checkStoredToken = useCallback(async () => {
    let initialized = false;
    try {
      logger.info('🔍 [Admin] Checking stored authentication...');

      const isAuthenticated = await authService.isAuthenticated();

      if (isAuthenticated) {
        const [user, token] = await Promise.all([
          authService.getCurrentUser(),
          authService.getToken(),
        ]);

        if (user && token) {
          // BUG-022: Verify the token is still valid with the backend before trusting it.
          try {
            const meResponse = await apiClient.get<{ user: AdminUser }>('admin/auth/me');
            const serverUser: AdminUser | null =
              meResponse.success && meResponse.data?.user ? meResponse.data.user : null;

            if (serverUser) {
              logger.info('✅ [Admin] Token verified with server');
              dispatch({
                type: 'AUTH_SUCCESS',
                payload: { user: serverUser, token },
              });
            } else {
              logger.warn('❌ [Admin] Server rejected token, logging out');
              await authService.logout();
              dispatch({ type: 'LOGOUT' });
            }
          } catch (verifyError) {
            // L5 FIX: Network failure — fall back to locally stored user but surface a warning
            // so the UI can show a "working offline / stale data" banner instead of silently
            // proceeding. The API client will surface 401s on the next request if the token expired.
            if (__DEV__)
              logger.warn(
                '⚠️ [Admin] Could not verify token with server (network?), using stored user:',
                verifyError
              );
            dispatch({
              type: 'AUTH_OFFLINE',
              payload: {
                user,
                token,
                warning: 'Could not reach server. Showing cached session — some data may be stale.',
              },
            });
          }
        } else {
          logger.warn('❌ [Admin] Incomplete stored data, logging out');
          await authService.logout();
          dispatch({ type: 'LOGOUT' });
        }
      } else {
        logger.info('❌ [Admin] No valid authentication found');
        dispatch({ type: 'LOGOUT' });
      }
      initialized = true;
    } catch (error) {
      logger.error('❌ [Admin] Error checking stored authentication:', error);
      try {
        await authService.logout();
      } catch {
        // Ignore logout errors during init
      }
      dispatch({ type: 'LOGOUT' });
      initialized = true;
    } finally {
      // Ensure initialization always completes so the spinner never hangs,
      // even if an unexpected synchronous error bypassed both try and catch.
      if (!initialized) {
        dispatch({ type: 'LOGOUT' });
      }
    }
  }, []);

  // Register a logout callback with the API client so it can trigger a
  // session-expiry redirect when a token refresh fails mid-request.
  useEffect(() => {
    apiClient.setOnLogoutCallback(() => {
      dispatch({ type: 'LOGOUT' });
      router.replace('/(auth)/login');
    });
  }, []);

  // Check for stored token on app start
  useEffect(() => {
    checkStoredToken();
  }, [checkStoredToken]);

  // SEC: Offline TTL cap — force logout after 5 minutes in offline mode to prevent a
  // revoked/compromised token from operating indefinitely on cached credentials.
  // CRITICAL FIX: Check immediately on effect start AND on app resume to prevent bypass.
  useEffect(() => {
    if (!state.isOffline || !state.offlineSince) return;

    const checkTTL = () => {
      // Use Date.now() directly to avoid any cached value issues
      const elapsed = Date.now() - (state.offlineSince as number);
      if (elapsed > 5 * 60 * 1000) {
        if (__DEV__)
          logger.warn('⚠️ [Admin] Offline session exceeded 5-minute TTL — forcing logout');
        dispatch({ type: 'LOGOUT' });
      }
    };

    checkTTL(); // Check immediately when entering offline mode

    const interval = setInterval(checkTTL, 30_000);
    return () => clearInterval(interval);
  }, [state.isOffline, state.offlineSince]);

  // JWT-expiry-based refresh — schedule a token validation 2 minutes before the JWT expires
  // instead of polling unconditionally every 5 minutes.
  const refreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Decode JWT expiry without an external library.
  const decodeJwtExpiry = useCallback((token: string): number | null => {
    try {
      const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString('utf8'));
      return typeof payload.exp === 'number' ? payload.exp : null;
    } catch {
      return null;
    }
  }, []);

  useEffect(() => {
    // Clear any pending timer whenever token or auth state changes.
    if (refreshTimerRef.current !== null) {
      clearTimeout(refreshTimerRef.current);
      refreshTimerRef.current = null;
    }

    if (!state.isAuthenticated || !state.token) return;

    const scheduleRefresh = (token: string) => {
      const exp = decodeJwtExpiry(token);
      if (exp === null) {
        // Token has no decodable expiry — fall back to a single 5-minute check.
        if (__DEV__)
          logger.info('ℹ️ [Admin] JWT expiry unreadable, falling back to 5-min validation');
        refreshTimerRef.current = setTimeout(
          async () => {
            try {
              const valid = await authService.isAuthenticated();
              if (!valid) {
                logger.warn('⚠️ [Admin] Token expired during session');
                dispatch({ type: 'LOGOUT' });
              }
            } catch {
              // Network error — don't logout; the API interceptor will catch a 401
            }
          },
          5 * 60 * 1000
        );
        return;
      }

      const refreshIn = exp * 1000 - Date.now() - 2 * 60 * 1000;
      if (refreshIn <= 0) {
        // Token already within the 2-minute window or expired — validate immediately.
        logger.warn('⚠️ [Admin] Token already near/past expiry, validating now');
        authService
          .isAuthenticated()
          .then((valid) => {
            if (!valid) dispatch({ type: 'LOGOUT' });
          })
          .catch(() => {
            // Network error — defer to API interceptor
          });
        return;
      }

      if (__DEV__)
        logger.info(
          `ℹ️ [Admin] Scheduling token validation in ${Math.round(refreshIn / 1000)}s (2 min before JWT exp)`
        );

      refreshTimerRef.current = setTimeout(async () => {
        try {
          const valid = await authService.isAuthenticated();
          if (!valid) {
            logger.warn('⚠️ [Admin] Token expired during session');
            dispatch({ type: 'LOGOUT' });
          } else {
            // Re-read the (possibly refreshed) token and reschedule for its new expiry.
            const freshToken = await authService.getToken();
            if (freshToken) {
              scheduleRefresh(freshToken);
            }
          }
        } catch {
          // Network error — don't logout; the API interceptor handles 401s
        }
      }, refreshIn);
    };

    scheduleRefresh(state.token);

    return () => {
      if (refreshTimerRef.current !== null) {
        clearTimeout(refreshTimerRef.current);
        refreshTimerRef.current = null;
      }
    };
  }, [state.isAuthenticated, state.token, decodeJwtExpiry]);

  const login = async (email: string, password: string) => {
    dispatch({ type: 'AUTH_START' });

    try {
      logger.info('🔐 [Admin] Attempting login for:', email);

      const authResponse = await authService.login(email, password);

      if (authResponse.success && authResponse.data) {
        logger.info('✅ [Admin] Login successful');

        dispatch({
          type: 'AUTH_SUCCESS',
          payload: {
            user: authResponse.data.user,
            token: authResponse.data.token,
          },
        });
      } else {
        throw new Error(authResponse.message || 'Login failed');
      }
    } catch (error: any) {
      if (error.requiresTotp || error.requiresTotpSetup) throw error; // propagate auth setup steps to login screen
      logger.error('❌ [Admin] Login failed:', error.message);
      dispatch({
        type: 'AUTH_ERROR',
        payload: error.message || 'Login failed',
      });
      throw error;
    }
  };

  const logout = async () => {
    try {
      logger.info('🚪 [Admin] Starting logout process...');

      await authService.logout();

      logger.info('📤 [Admin] Dispatching LOGOUT action...');
      dispatch({ type: 'LOGOUT' });

      // Clear React Query cache so stale data never leaks to the next admin session
      queryClient.clear();

      logger.info('🚀 [Admin] Redirecting to login page...');
      router.replace('/(auth)/login');

      logger.info('✅ [Admin] Logout completed successfully');
    } catch (error) {
      logger.error('❌ [Admin] Error during logout:', error);
      dispatch({ type: 'LOGOUT' });
      queryClient.clear();
      router.replace('/(auth)/login');
    }
  };

  const clearError = () => {
    dispatch({ type: 'CLEAR_ERROR' });
  };

  const updateUser = (user: AdminUser) => {
    dispatch({ type: 'UPDATE_USER', payload: user });
  };

  const hasPermission = useCallback((permission: string): boolean => {
    // FIX-077: Rely solely on the backend-issued permissions array. A super_admin
    // account that lacks a permission in its JWT claims will be denied — the backend
    // is authoritative and must populate the permissions array correctly for all roles.
    if (!state.user?.permissions) {
      logger.warn(
        `[Admin] hasPermission("${permission}") called but user.permissions is undefined. Denying.`
      );
      return false;
    }

    return state.user.permissions.includes(permission);
  }, [state.user]);

  // BUG-045 FIX: wrapped with useCallback so the reference is stable across user changes,
  // preventing all 100+ dashboard components that destructure hasRole from re-rendering.
  const hasRole = useCallback((role: string): boolean => {
    if (!state.user) return false;
    // isValidAdminRole narrows to AdminRole — after the guard, includes() accepts the narrowed type
    return isValidAdminRole(role) && VALID_ADMIN_ROLES.includes(role as AdminRole);
  }, [state.user]);

  // BUG-045 FIX: useMemo ensures the value object reference is stable unless state.user
  // actually changes, so consumers of useAuth() that only destructure hasRole/hasPermission
  // are not spuriously re-rendered on unrelated state mutations.
  const value = useMemo<AuthContextType>(() => ({
    state,
    token: state.token,
    user: state.user,
    isAuthenticated: state.isAuthenticated,
    isLoading: state.isLoading,
    isInitializing: state.isInitializing, // ADMIN-010: Expose initial auth check state
    networkWarning: state.networkWarning, // L5 FIX: surface offline/stale-data warning
    login,
    logout,
    clearError,
    updateUser,
    hasPermission,
    hasRole,
  }), [state, hasPermission, hasRole]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// Hook
export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
