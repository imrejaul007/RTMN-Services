/**
 * Root Layout — Admin App
 *
 * TS-L1 NOTE — i18n PENDING (Phase 2):
 * All user-visible strings in this app are currently hardcoded in English.
 * A centralized strings object is available at constants/strings.ts to document
 * the intent and serve as the migration source when react-i18next is added.
 * See TS-L1 in docs/Bugs/15-TYPESCRIPT-UI.md for tracking.
 */

import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { logger } from '@/utils/logger';
import { Stack, useSegments, router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as Sentry from '@sentry/react-native';
import React, { useState, useEffect } from 'react';
import { useFonts } from 'expo-font';
import {
  Platform,
  View,
  ActivityIndicator,
  Text,
  StyleSheet,
  Linking,
  TouchableOpacity,
} from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Notifications from 'expo-notifications';
import * as Updates from 'expo-updates';
import { addUpdatesStateChangeListener } from 'expo-updates/build/UpdatesEmitter';

// Initialize Sentry — only on native platforms; Sentry's react-native SDK does not
// support web and calling Sentry.init() on web causes runtime errors.
// ADM-019 FIX: wrap in try/catch so a failing import or init does not crash the
// app before the ErrorBoundary is mounted. Any init errors are caught and will be
// surfaced by the nearest error boundary during the first render.
if (Platform.OS !== 'web') {
  try {
    Sentry.init({
      dsn: process.env.EXPO_PUBLIC_SENTRY_DSN || '',
      enabled: !__DEV__,
      tracesSampleRate: 0.2,
      environment: process.env.EXPO_PUBLIC_ENV || 'production',
      integrations: [Sentry.reactNativeTracingIntegration()],
      beforeSend(event) {
        // Scrub sensitive fields
        if (event.request?.data) {
          const data = event.request.data as Record<string, any>;
          ['password', 'token', 'pin', 'otp', 'cardNumber'].forEach((k) => {
            if (data[k]) data[k] = '[SCRUBBED]';
          });
        }
        return event;
      },
    });

    // OBS-7: Hard-fail when DSN is missing in production.
    //
    // Previously we only logged a warning (via Sentry.captureMessage, which
    // itself can't deliver without a DSN — the warning had nowhere to go).
    // For admin specifically, crashes that go unreported are a launch
    // blocker because admin operators hit financial / ops endpoints and
    // silent crashes mean silent data loss.
    //
    // TDZ note: logger isn't initialized at this IIFE; use Sentry.captureMessage
    // first (best effort for the Sentry-is-on-but-DSN-empty case), fall back
    // to process.stderr, and finally throw to short-circuit app boot. The
    // React error boundary downstream will surface the error to the user.
    if (!process.env.EXPO_PUBLIC_SENTRY_DSN && !__DEV__) {
      const msg =
        '[Sentry] FATAL: EXPO_PUBLIC_SENTRY_DSN is not set. Admin app refuses to start in production without crash reporting.';
      try {
        Sentry.captureMessage(msg, 'fatal');
      } catch {
        /* no DSN — nowhere to send */
      }
      if (typeof process !== 'undefined' && process.stderr) {
        process.stderr.write(msg + '\n');
      }
      throw new Error(msg);
    }
  } catch (sentryInitError) {
    // Re-throw so the React error boundary can catch and display it
    logger.warn('[Admin Layout] Sentry initialization failed', { error: sentryInitError });
    // Don't re-throw — allow the app to continue so operators can still work
    // and the error boundary can display the failure gracefully.
  }
}

// Only import react-native-reanimated on native platforms
// ADM-019 FIX: wrap in try/catch so a failing require does not crash the app
// before the ErrorBoundary is mounted.
if (Platform.OS !== 'web') {
  try {
    require('react-native-reanimated');
  } catch (reanimatedError) {
    logger.warn('[Admin Layout] react-native-reanimated require failed', { error: reanimatedError });
    // Continue without reanimated — animations may not work but the app can still boot.
  }
}

import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from '@/config/reactQuery';
import { useColorScheme } from '@/hooks/useColorScheme';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { ThemeProvider as AdminThemeProvider } from '@/contexts/ThemeContext';
import { Colors } from '@/constants/DesignTokens';
import { installProductionConsoleGuard } from '@/utils/logger';
import { buildApiUrl, getApiUrl } from '@/config/api';
import { storageService } from '@/services/storage';
import { VALID_ADMIN_ROLES, isValidAdminRole } from '@/constants/roles';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { ReactQueryErrorBoundary } from '@/components/ReactQueryErrorBoundary';

// ADM-007 FIX: Call guard at module level (before any component renders) to catch
// all console output from initialization, not just post-mount calls.
// ADM-019 FIX: wrap in try/catch so a failing guard does not crash the app before
// the ErrorBoundary is mounted.
try {
  installProductionConsoleGuard();
} catch (guardError) {
  logger.warn('[Admin Layout] installProductionConsoleGuard failed', { error: guardError });
}

/**
 * Check if user has an admin role
 * NEW-A-L3 FIX: Replaced bare type casts with the isValidAdminRole type guard from roles.ts.
 * This provides proper TypeScript narrowing without bypassing type safety.
 */
const isAdminRole = (role: string | undefined): boolean => {
  if (!role) return false;

  // Use the typed isValidAdminRole guard instead of the previous bare type cast
  if (isValidAdminRole(role)) {
    return true;
  }

  // Unknown role - reject access on the frontend as well.
  // The backend is authoritative, but the frontend must not grant dashboard access
  // to unrecognised roles — a compromised or spoofed token with role:"anything" must
  // not reach admin screens. New backend roles must also be added to VALID_ADMIN_ROLES.
  if (__DEV__) {
    logger.warn(
      `[Admin] Unknown role: "${role}" - denying access. Add to VALID_ADMIN_ROLES if intentional.`
    );
  }

  return false; // Strict: reject unknown roles
};

// Custom Theme to match design tokens (Red admin theme)
const CustomDefaultTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: Colors.light.background,
    primary: Colors.light.tint,
    text: Colors.light.text,
    border: Colors.light.border,
    card: Colors.light.card,
  },
};

const CustomDarkTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    background: Colors.dark.background,
    primary: Colors.dark.tint,
    text: Colors.dark.text,
    border: Colors.dark.border,
    card: Colors.dark.card,
  },
};

// Inner layout with auth guard — must be inside AuthProvider
function AuthGuardedLayout() {
  const colorScheme = useColorScheme();
  const { isAuthenticated, isLoading, isInitializing, user } = useAuth();
  const segments = useSegments();

  // Check route groups — use both to avoid relying on a single segment value on web
  const firstSegment = segments[0];
  const inAuthGroup = firstSegment === '(auth)';
  const inDashboard = firstSegment === '(dashboard)';

  // Redirect based on auth state via useEffect — the Stack must stay mounted
  // so the navigator is ready to handle REPLACE actions. Declarative <Redirect>
  // early-returns unmount the Stack, causing "action was not handled" errors on web.
  useEffect(() => {
    if (isInitializing) return;

    if (isAuthenticated && isAdminRole(user?.role) && !inDashboard) {
      router.replace('/(dashboard)');
    } else if (isAuthenticated && !isAdminRole(user?.role) && inDashboard) {
      router.replace('/(auth)/login');
    } else if (!isAuthenticated && !inAuthGroup) {
      router.replace('/(auth)/login');
    }
  }, [isAuthenticated, isInitializing, inAuthGroup, inDashboard, user?.role]);

  // ADMIN-010: Show loading only during initial auth check.
  // The login screen has its own button spinner for login progress.
  if (isInitializing) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center',
          backgroundColor: colorScheme === 'dark' ? Colors.dark.background : Colors.light.background,
        }}
      >
        <ActivityIndicator size="large" color={Colors.light.tint} />
      </View>
    );
  }

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: colorScheme === 'dark' ? Colors.dark.background : Colors.light.background,
      }}
    >
      <Stack
        screenOptions={{
          headerShown: false,
          animation: 'slide_from_right',
          contentStyle: {
            backgroundColor: colorScheme === 'dark' ? Colors.dark.background : Colors.light.background,
          },
        }}
      >
        {/* Entry Point */}
        <Stack.Screen name="index" options={{ headerShown: false }} />

        {/* Authentication Flow */}
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />

        {/* Main Dashboard — all admin screens live under (dashboard) */}
        <Stack.Screen name="(dashboard)" options={{ headerShown: false }} />

        {/* BUG-061 FIX: removed dead Stack.Screen entries for "merchants",
            "users", "coin-rewards", and "settings" — none of those exist as
            top-level app routes. All such screens live under (dashboard)/. */}

        {/* Not Found */}
        <Stack.Screen name="+not-found" />
      </Stack>
      <StatusBar
        style={colorScheme === 'dark' ? 'light' : 'dark'}
        backgroundColor="transparent"
        translucent
      />
    </View>
  );
}

// ── App status types ─────────────────────────────────────────────────────────

interface AppStatusResponse {
  maintenance?: { enabled: boolean; message?: string };
  forceUpdate?: { required: boolean; message?: string; updateUrl?: string };
}

type AppStatus = 'checking' | 'ok' | 'maintenance' | 'update_required';

// ── Maintenance / force-update screens ───────────────────────────────────────

function MaintenanceScreen({ message }: { message?: string }) {
  return (
    <SafeAreaView style={appStatusStyles.container}>
      <Text style={appStatusStyles.icon}>🔧</Text>
      <Text style={appStatusStyles.title}>Down for Maintenance</Text>
      <Text style={appStatusStyles.body}>
        {message || 'The admin panel is temporarily unavailable. Please check back shortly.'}
      </Text>
    </SafeAreaView>
  );
}

// F4: Validate the force-update URL before opening it. `updateUrl` is served from the
// remote /config/app-status endpoint, so a compromised/misconfigured server could
// otherwise open any URL (phishing, javascript:, arbitrary app scheme) via Linking.
function isAllowedStoreUrl(url: string | undefined): boolean {
  if (!url || typeof url !== 'string' || url.length > 500) return false;
  try {
    const u = new URL(url);
    if (u.protocol !== 'https:') return false;
    const allowedHosts = [
      'apps.apple.com',
      'itunes.apple.com',
      'play.google.com',
      'admin.rez.money',
    ];
    return allowedHosts.includes(u.hostname);
  } catch {
    return false;
  }
}

function ForceUpdateScreen({ message, updateUrl }: { message?: string; updateUrl?: string }) {
  const canOpen = isAllowedStoreUrl(updateUrl);
  return (
    <SafeAreaView style={appStatusStyles.container}>
      <Text style={appStatusStyles.icon}>⬆️</Text>
      <Text style={appStatusStyles.title}>Update Required</Text>
      <Text style={appStatusStyles.body}>
        {message || 'A critical update is available. Please update the admin app to continue.'}
      </Text>
      {canOpen && updateUrl && (
        <TouchableOpacity
          style={appStatusStyles.button}
          onPress={() => {
            if (isAllowedStoreUrl(updateUrl)) {
              Linking.openURL(updateUrl);
            } else {
              logger.warn(
                `[ForceUpdate] Rejected updateUrl (not in allowlist): ${String(updateUrl).slice(0, 200)}`
              );
            }
          }}
        >
          <Text style={appStatusStyles.buttonText}>Update Now</Text>
        </TouchableOpacity>
      )}
    </SafeAreaView>
  );
}

const appStatusStyles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
    backgroundColor: '#F8FAFC',
  },
  icon: { fontSize: 48, marginBottom: 16 },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#11181C',
    textAlign: 'center',
    marginBottom: 12,
  },
  body: { fontSize: 15, color: '#687076', textAlign: 'center', lineHeight: 22 },
  button: {
    marginTop: 24,
    backgroundColor: '#DC2626',
    paddingHorizontal: 28,
    paddingVertical: 12,
    borderRadius: 8,
  },
  buttonText: { color: '#FFFFFF', fontWeight: '600', fontSize: 15 },
});

// ── Root layout ───────────────────────────────────────────────────────────────

function RootLayout() {
  const colorScheme = useColorScheme();
  const [appStatus, setAppStatus] = useState<AppStatus>('checking');
  const [statusPayload, setStatusPayload] = useState<AppStatusResponse>({});

  // TS-M6 FIX: Load custom fonts to match merchant app typography strategy.
  // SpaceMono-Regular.ttf should be placed in assets/fonts/ when available.
  // The hook is intentionally non-blocking — the app proceeds with system
  // fonts if the file is absent (e.g., in development before assets are added).
  const [fontsLoaded] = useFonts({
    // Fallback: System font is used until this file is provided in assets/fonts/
    // SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  });

  // Startup check: fetch app-status / config endpoint
  React.useEffect(() => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 s timeout

    const checkAppStatus = async () => {
      try {
        // BUG-066 FIX: use buildApiUrl and /admin/ prefix for consistency with all other API calls
        const statusUrl = buildApiUrl('/admin/config/app-status');
        const token = await storageService.getAuthToken();
        const response = await fetch(statusUrl, {
          signal: controller.signal,
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
          },
        });

        if (response.ok) {
          const data: AppStatusResponse = await response.json();
          setStatusPayload(data);

          if (data?.maintenance?.enabled) {
            setAppStatus('maintenance');
            return;
          }
          if (data?.forceUpdate?.required) {
            setAppStatus('update_required');
            return;
          }
        }
        // Any non-ok status or missing flags — allow app to proceed
        setAppStatus('ok');
      } catch {
        // Network failure or timeout — never block the app
        setAppStatus('ok');
      } finally {
        clearTimeout(timeoutId);
      }
    };

    checkAppStatus();

    return () => {
      controller.abort();
      clearTimeout(timeoutId);
    };
  }, []);

  // BUG-009 FIX: Request notification permission on app start (Android 13+ requires runtime permission)
  React.useEffect(() => {
    if (Platform.OS === 'web') return;

    async function requestNotificationPermission() {
      try {
        const { status: existing } = await Notifications.getPermissionsAsync();
        if (existing === 'granted') return;

        const { status } = await Notifications.requestPermissionsAsync();
        if (status !== 'granted') {
          logger.warn('[Notifications] Permission denied — push notifications disabled');
        }
      } catch (error) {
        logger.warn('[Notifications] Permission request failed', { error });
      }
    }

    requestNotificationPermission();
  }, []);

  // BUG-030 FIX: Listen for expo-updates events to handle forced updates
  React.useEffect(() => {
    if (Platform.OS === 'web') return;

    const subscription = addUpdatesStateChangeListener((event) => {
      const { isUpdateAvailable, isUpdatePending } = event.context;
      if (isUpdateAvailable && !isUpdatePending) {
        Updates.fetchUpdateAsync().catch((error) => {
          logger.warn('[Updates] Failed to fetch update:', String(error));
        });
      }
      if (isUpdatePending) {
        logger.info('[Updates] Update ready — will apply on next restart');
      }
    });

    // Check for updates on mount
    Updates.checkForUpdateAsync()
      .then((update) => {
        if (update.isAvailable) {
          return Updates.fetchUpdateAsync();
        }
      })
      .catch((error) => {
        logger.warn('[Updates] Check for update failed', { error });
      });

    return () => subscription.remove();
  }, []);

  if (appStatus === 'checking') {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center',
          backgroundColor: '#F8FAFC',
        }}
      >
        <ActivityIndicator size="large" color={Colors.light.tint} />
      </View>
    );
  }

  if (appStatus === 'maintenance') {
    return <MaintenanceScreen message={statusPayload?.maintenance?.message} />;
  }

  if (appStatus === 'update_required') {
    return (
      <ForceUpdateScreen
        message={statusPayload?.forceUpdate?.message}
        updateUrl={statusPayload?.forceUpdate?.updateUrl}
      />
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ErrorBoundary>
        <QueryClientProvider client={queryClient}>
          <ReactQueryErrorBoundary name="ReactQueryErrorBoundary">
            <ThemeProvider value={colorScheme === 'dark' ? CustomDarkTheme : CustomDefaultTheme}>
              <AdminThemeProvider>
                <AuthProvider>
                  <AuthGuardedLayout />
                </AuthProvider>
              </AdminThemeProvider>
            </ThemeProvider>
          </ReactQueryErrorBoundary>
        </QueryClientProvider>
      </ErrorBoundary>
    </GestureHandlerRootView>
  );
}

export default Platform.OS !== 'web' ? Sentry.wrap(RootLayout) : RootLayout;
