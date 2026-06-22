/**
 * Screenshot Protection Utility
 *
 * SECURITY IMPLEMENTATION: Provides screen capture prevention for sensitive admin screens.
 * Prevents screenshots and screen recording on financial and administrative screens.
 *
 * USAGE:
 *   import { enableScreenProtection, disableScreenProtection } from '@/utils/screenshotProtection';
 *
 *   // In sensitive screen component:
 *   useEffect(() => {
 *     enableScreenProtection();
 *     return () => disableScreenProtection();
 *   }, []);
 *
 * COMPATIBILITY:
 *   - iOS: Uses UIScreen.isCaptured API via expo-screen-capture
 *   - Android: Uses FLAG_SECURE window flag (requires native module)
 *   - Web: Graceful no-op (no browser API for screenshot prevention)
 */

import { Platform, AppState, AppStateStatus } from 'react-native';

// Module-level state to prevent double-enabling
let _isProtectionEnabled = false;
let _appStateSubscription: { remove: () => void } | null = null;

// Type for optional native module
type ScreenCaptureType = {
  preventScreenCapture?: () => Promise<void>;
  allowScreenCapture?: () => Promise<void>;
};

let _screenCapture: ScreenCaptureType | null = null;

async function getScreenCapture(): Promise<ScreenCaptureType | null> {
  if (_screenCapture !== null) return _screenCapture;
  if (Platform.OS === 'web') return null;

  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    _screenCapture = require('expo-screen-capture') as ScreenCaptureType;
    return _screenCapture;
  } catch {
    _screenCapture = null;
    return null;
  }
}

/**
 * Enable screenshot protection for the current screen
 * Returns true if protection was successfully enabled
 */
export async function enableScreenProtection(): Promise<boolean> {
  if (_isProtectionEnabled) {
    return true;
  }

  if (Platform.OS === 'web') {
    console.debug('[ScreenProtection] Web platform - screenshot protection not available');
    return false;
  }

  const module = await getScreenCapture();
  if (module?.preventScreenCapture) {
    await module.preventScreenCapture();
    _isProtectionEnabled = true;

    _appStateSubscription = AppState.addEventListener('change', _handleAppStateChange);
    console.info('[ScreenProtection] Screenshot protection enabled');
    return true;
  }

  console.debug('[ScreenProtection] expo-screen-capture not available');
  return false;
}

/**
 * Disable screenshot protection when leaving sensitive screen
 * Returns true if protection was successfully disabled
 */
export async function disableScreenProtection(): Promise<boolean> {
  if (!_isProtectionEnabled && !_appStateSubscription) {
    return false;
  }

  if (Platform.OS === 'web') {
    return false;
  }

  const module = await getScreenCapture();
  if (module?.allowScreenCapture) {
    await module.allowScreenCapture();
    _isProtectionEnabled = false;

    if (_appStateSubscription) {
      _appStateSubscription.remove();
      _appStateSubscription = null;
    }

    console.info('[ScreenProtection] Screenshot protection disabled');
    return true;
  }

  return false;
}

/**
 * Handle app state changes to maintain protection
 */
function _handleAppStateChange(nextAppState: AppStateStatus) {
  if (nextAppState === 'active' && _isProtectionEnabled) {
    enableScreenProtection().catch(() => {});
  }
}

/**
 * Check if screenshot protection is currently enabled
 */
export function isScreenProtectionEnabled(): boolean {
  return _isProtectionEnabled;
}

/**
 * Configuration for screens that should have protection
 */
export const PROTECTED_SCREENS: Record<string, boolean> = {
  walletAdjustment: true,
  cashStore: true,
  adminUsers: true,
  refundProcessing: true,
  transactionHistory: true,
  reportExport: true,
};

/**
 * Check if a screen name requires protection
 */
export function isProtectedScreen(screenName: string): boolean {
  const lowerName = screenName.toLowerCase();
  return lowerName in PROTECTED_SCREENS ||
    Object.keys(PROTECTED_SCREENS).some(key => lowerName.includes(key));
}

export default {
  enableScreenProtection,
  disableScreenProtection,
  isScreenProtectionEnabled,
  isProtectedScreen,
  PROTECTED_SCREENS,
};
