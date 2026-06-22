/**
 * Admin Push Notifications + Deep Linking (F5 + F8 — MASTER-PLAN-2026-04-19)
 *
 * Establishes the full notification + URL deep-link handler stack for the admin app.
 * Mirrors the merchant pattern (`rez-app-marchant/hooks/usePushNotifications.ts`)
 * but with admin-specific query invalidations and a tightened deep-link allowlist.
 *
 * Responsibilities:
 *   1. Configure the foreground `setNotificationHandler` at module scope.
 *   2. Register the device's Expo push token with the backend after login.
 *   3. Listen for foreground notifications and invalidate affected React Query keys.
 *   4. Listen for notification taps and route via an allowlist (no remote-controlled
 *      route hijack — admin payloads cannot navigate to arbitrary in-app screens).
 *   5. Handle Linking URL deep-links (F8): cold-start getInitialURL + addEventListener.
 *
 * The backend endpoint `admin/notifications/register-token` may not exist yet;
 * `apiClient` fails gracefully (logged, no local fallback).
 */
import { useEffect, useRef } from 'react';
import { Linking, Platform, Alert } from 'react-native';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { router } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';

import { useAuth } from '@/contexts/AuthContext';
import { apiClient } from '@/services/api/apiClient';
import { logger } from '@/utils/logger';

// ──────────────────────────────────────────────────────────────────────────────
// Module-scope: foreground notification display behavior.
// ──────────────────────────────────────────────────────────────────────────────
// expo-notifications v0.31 requires shouldShowBanner / shouldShowList (the legacy
// shouldShowAlert is deprecated but still accepted). We include both forms so the
// handler is forward-compatible with the iOS UNNotificationPresentationOptions map.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

// ──────────────────────────────────────────────────────────────────────────────
// Push-route allowlist (mirrors F2/F3 security pattern).
// ──────────────────────────────────────────────────────────────────────────────
// Notification `data.screen` payloads are remote-controlled; without this
// allowlist a malicious push could navigate admin staff to an arbitrary in-app
// screen. We permit only the specific admin routes that legitimately receive
// push-triggered deep links.
const ALLOWED_PUSH_ROUTES: RegExp[] = [
  /^\/\(dashboard\)\/[\w-]+$/,
  /^\/\(dashboard\)\/merchants\/[a-zA-Z0-9-]+$/,
  /^\/\(dashboard\)\/disputes$/,
  /^\/\(dashboard\)\/fraud-queue$/,
  /^\/\(dashboard\)\/notification-management$/,
];

function isAllowedPushRoute(route: string): boolean {
  if (typeof route !== 'string' || route.length === 0 || route.length > 200) return false;
  if (route.includes('://')) return false; // reject absolute URLs
  return ALLOWED_PUSH_ROUTES.some((re) => re.test(route));
}

// ──────────────────────────────────────────────────────────────────────────────
// Token registration helper — exported so higher-level flows (login, token
// refresh) can trigger a re-registration without running the full hook.
// ──────────────────────────────────────────────────────────────────────────────
export async function registerForPushNotificationsAsync(): Promise<string | null> {
  // Web has no Expo push token (no VAPID wired on admin).
  if (Platform.OS === 'web') return null;

  try {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      logger.warn('[admin push] permission denied');
      return null;
    }

    const projectId = Constants.expoConfig?.extra?.eas?.projectId;
    const tokenResponse = await Notifications.getExpoPushTokenAsync(
      projectId ? { projectId } : undefined
    );
    return tokenResponse.data;
  } catch (err) {
    logger.error('[admin push] token registration failed', err);
    return null;
  }
}

// ──────────────────────────────────────────────────────────────────────────────
// Notification payload typing (locally declared — avoids duplicating an
// enum/type from rez-shared; push payloads are a remote wire format, not a
// domain type, so this is intentional scoping rather than drift).
// ──────────────────────────────────────────────────────────────────────────────
interface AdminPushData {
  type?: string;
  screen?: string;
  merchantId?: string;
  disputeId?: string;
  fraudReportId?: string;
}

function readAdminPushData(
  raw: Record<string, unknown> | null | undefined
): AdminPushData | null {
  if (!raw || typeof raw !== 'object') return null;
  const out: AdminPushData = {};
  if (typeof raw.type === 'string') out.type = raw.type;
  if (typeof raw.screen === 'string') out.screen = raw.screen;
  if (typeof raw.merchantId === 'string') out.merchantId = raw.merchantId;
  if (typeof raw.disputeId === 'string') out.disputeId = raw.disputeId;
  if (typeof raw.fraudReportId === 'string') out.fraudReportId = raw.fraudReportId;
  return out;
}

// ──────────────────────────────────────────────────────────────────────────────
// Main hook — called from AuthGuardedLayout once the user is authenticated.
// ──────────────────────────────────────────────────────────────────────────────
export function usePushNotifications(): { pushToken: string | null } {
  const { isAuthenticated } = useAuth();
  const queryClient = useQueryClient();
  const tokenRef = useRef<string | null>(null);
  const registeredRef = useRef(false);

  // 1. Token registration — only after auth.
  useEffect(() => {
    if (!isAuthenticated || registeredRef.current) return;

    let cancelled = false;
    (async () => {
      const token = await registerForPushNotificationsAsync();
      if (cancelled || !token) return;

      tokenRef.current = token;
      const platform: 'ios' | 'android' | 'web' =
        Platform.OS === 'ios' ? 'ios' : Platform.OS === 'android' ? 'android' : 'web';

      try {
        const response = await apiClient.post<{ registered: boolean }>(
          'admin/notifications/register-token',
          { token, platform }
        );
        if (response.success) {
          registeredRef.current = true;
          logger.info('[admin push] token registered');
        } else {
          logger.warn('[admin push] token register rejected', response.message);
        }
      } catch (err) {
        logger.error('[admin push] token register failed', err);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isAuthenticated]);

  // 2. Foreground receive listener → invalidate React Query caches by type.
  useEffect(() => {
    const receivedSub = Notifications.addNotificationReceivedListener((notification) => {
      const rawData = notification.request.content.data as
        | Record<string, unknown>
        | null
        | undefined;
      const data = readAdminPushData(rawData);
      if (!data?.type) return;

      switch (data.type) {
        case 'fraud_alert':
          void queryClient.invalidateQueries({ queryKey: ['fraud'] });
          void queryClient.invalidateQueries({ queryKey: ['fraud-queue'] });
          break;
        case 'new_dispute':
          void queryClient.invalidateQueries({ queryKey: ['disputes'] });
          break;
        case 'merchant_flag':
          void queryClient.invalidateQueries({ queryKey: ['merchants'] });
          break;
        case 'system_alert':
          // No invalidation — existing toast/UI flow handles it.
          break;
        default:
          // Unknown type — no-op. Log at debug level would be nice, but the
          // admin logger does not expose debug(); info at __DEV__ is louder
          // than warranted for routine unknown pushes, so we simply skip.
          break;
      }
    });

    // 3. Tap (response) listener → allowlisted deep-link navigation.
    const responseSub = Notifications.addNotificationResponseReceivedListener((response) => {
      const rawData = response.notification.request.content.data as
        | Record<string, unknown>
        | null
        | undefined;
      const data = readAdminPushData(rawData);
      if (!data) return;

      try {
        // Explicit screen takes priority — but ONLY via the allowlist.
        if (data.screen) {
          if (isAllowedPushRoute(data.screen)) {
            router.push(data.screen);
            return;
          }
          logger.warn('[admin push] rejected push route (not in allowlist)', {
            screen: data.screen.slice(0, 200),
          });
          // Fall through to type-based routing so the tap still lands somewhere
          // sensible rather than silently no-op'ing.
        }

        switch (data.type) {
          case 'fraud_alert':
            router.push('/(dashboard)/fraud-queue');
            break;
          case 'new_dispute':
            router.push('/(dashboard)/disputes');
            break;
          case 'merchant_flag':
            if (data.merchantId) {
              router.push(`/(dashboard)/merchants/${data.merchantId}`);
            }
            break;
          case 'system_alert':
            router.push('/(dashboard)/notification-management');
            break;
          default:
            // Unknown type — do not navigate. Absence of a route is safer than
            // a best-guess screen (aligns with F3 security posture).
            break;
        }
      } catch (err) {
        logger.error('[admin push] navigation error', err);
      }
    });

    return () => {
      receivedSub.remove();
      responseSub.remove();
    };
  }, [queryClient]);

  // 4. Linking URL deep-links — handles rezadmin:// scheme and https://admin.rez.money/ URLs
  // tapped from external apps (browsers, other apps). Routes through the same allowlist
  // as notification responses so there is no bypass path for arbitrary URL navigation.
  useEffect(() => {
    let mounted = true;

    // F8: Handle cold-start deep links (app opened via URL).
    if (Platform.OS !== 'web') {
      Linking.getInitialURL()
        .then((url) => {
          if (mounted && url) {
            handleDeepLinkUrl(url);
          }
        })
        .catch(() => {});
    }

    // F8: Handle deep links while app is in foreground/background.
    const linkSub = Linking.addEventListener('url', (event) => {
      if (mounted) {
        handleDeepLinkUrl(event.url);
      }
    });

    return () => {
      mounted = false;
      linkSub.remove();
    };
  }, []);

  function handleDeepLinkUrl(url: string): void {
    if (!url || typeof url !== 'string') return;
    try {
      // Strip scheme prefix to get the path portion.
      // Handles: rezadmin://merchants/abc → /merchants/abc
      //          https://admin.rez.money/merchants/abc → /merchants/abc
      let path = url;
      if (url.includes('://')) {
        const parts = url.split('://');
        path = parts[1] || '/';
      } else if (url.startsWith('/')) {
        path = url;
      }
      // Normalize: strip leading slash for allowlist matching.
      const normalized = '/' + path.replace(/^\/+/, '');
      if (normalized.length === 1) return; // just "/"

      if (isAllowedPushRoute(normalized)) {
        router.push(normalized);
      } else {
        logger.warn('[admin deep-link] rejected URL (not in allowlist)', {
          url: url.slice(0, 200),
        });
        // LOW FIX: Notify user when deep link is blocked for security
        Alert.alert(
          'Navigation Blocked',
          'This link cannot be opened for security reasons.',
          [{ text: 'OK' }]
        );
      }
    } catch (err) {
      logger.error('[admin deep-link] navigation error', err);
    }
  }

  // 5. Reset registration state on logout so the next login re-registers.
  useEffect(() => {
    if (!isAuthenticated) {
      registeredRef.current = false;
      tokenRef.current = null;
    }
  }, [isAuthenticated]);

  return { pushToken: tokenRef.current };
}
