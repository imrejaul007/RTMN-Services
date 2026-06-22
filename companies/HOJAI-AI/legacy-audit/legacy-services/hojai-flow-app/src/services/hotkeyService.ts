/**
 * Hotkey Service - Native keyboard shortcuts
 *
 * Features:
 * - ⌥ + Space (macOS)
 * - Alt + Space (Windows)
 * - Fn button (Mobile)
 *
 * Native modules needed:
 * - react-native-keyboard-shortcuts (iOS/macOS)
 * - HardwareKeys (Android)
 * - expo-shortcuts / expo-haptics
 */

import { Platform, AppState, AppStateStatus } from 'react-native';
import * as Haptics from 'expo-haptics';
import * as Notifications from 'expo-notifications';

// Callbacks
type HotkeyCallback = () => void;
let globalCallback: HotkeyCallback | null = null;
let isEnabled = true;

/**
 * Register global hotkey callback
 */
export function registerHotkey(callback: HotkeyCallback): () => void {
  globalCallback = callback;
  return () => {
    globalCallback = null;
  };
}

/**
 * Trigger hotkey (called from native module)
 */
export function triggerHotkey(): void {
  if (globalCallback && isEnabled) {
    // Haptic feedback
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    // Trigger callback
    globalCallback();
  }
}

/**
 * Get platform-specific hotkey
 */
export function getHotkeyConfig() {
  if (Platform.OS === 'ios') {
    return {
      primary: '⌥',
      secondary: 'Space',
      description: 'Press Option + Space to open Hojai',
    };
  }

  if (Platform.OS === 'android') {
    return {
      primary: 'Home',
      secondary: 'Button',
      description: 'Double tap home or use quick tile',
    };
  }

  return {
    primary: 'Alt',
    secondary: 'Space',
    description: 'Press Alt + Space to open Hojai',
  };
}

/**
 * Setup notification shortcuts (Android)
 */
export async function setupNotificationShortcuts(): Promise<void> {
  if (Platform.OS !== 'android') return;

  try {
    // Create notification shortcut
    await Notifications.setNotificationCategoryAsync('hojai_flow', [
      {
        actionId: 'open',
        buttonTitle: 'Open',
        options: { opensAppToForeground: true },
      },
    ]);

    console.log('[Hotkey] Notification shortcuts set up');
  } catch (error) {
    console.error('[Hotkey] Setup failed:', error);
  }
}

/**
 * Setup Android Quick Tile
 */
export async function setupQuickTile(): Promise<void> {
  if (Platform.OS !== 'android') return;

  // In production, use HardwareKeys or custom native module
  // This requires Android native code:
  //
  // import { registerShortcut } from 'react-native-android-shortcuts';
  //
  // registerShortcut({
  //   id: 'hojai_flow',
  //   shortLabel: 'Hojai',
  //   icon: R.drawable.ic_hojai,
  //   action: 'com.hojai.flow.ACTION_OPEN',
  // });

  console.log('[Hotkey] Quick tile setup (native module needed)');
}

/**
 * Handle app state changes
 */
export function useAppStateHotkey() {
  const handleAppStateChange = (state: AppStateStatus) => {
    if (state === 'active') {
      console.log('[Hotkey] App activated');
    }
  };

  const subscription = AppState.addEventListener('change', handleAppStateChange);

  return () => subscription.remove();
}

/**
 * Enable/disable hotkey
 */
export function setHotkeyEnabled(enabled: boolean): void {
  isEnabled = enabled;
}

/**
 * Check if hotkey is supported
 */
export function isHotkeySupported(): boolean {
  // Mobile always supported via notification/action
  if (Platform.OS === 'android' || Platform.OS === 'ios') {
    return true;
  }

  // Desktop requires native module
  return false;
}

/**
 * Request permissions for hotkey
 */
export async function requestPermissions(): Promise<boolean> {
  // Haptics permission (vibration)
  const hapticPermission = await Haptics.requestPermissionsAsync();

  // Notification permission
  const notificationPermission = await Notifications.requestPermissionsAsync();

  return (
    hapticPermission.status === 'granted' &&
    notificationPermission.status === 'granted'
  );
}

export default {
  registerHotkey,
  triggerHotkey,
  getHotkeyConfig,
  setupNotificationShortcuts,
  setupQuickTile,
  setHotkeyEnabled,
  isHotkeySupported,
  requestPermissions,
  useAppStateHotkey,
};
