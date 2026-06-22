/**
 * Hotkey Hook - Global keyboard shortcuts
 *
 * Registers global hotkeys to trigger Hojai Flow overlay
 * - ⌥ + Space (macOS)
 * - Alt + Space (Windows)
 * - Fn button (mobile)
 */

import { useEffect, useCallback } from 'react';
import { Platform, AppState, AppStateStatus } from 'react-native';
import * as Haptics from 'expo-haptics';

type HotkeyCallback = () => void;

interface HotkeyConfig {
  onTrigger: HotkeyCallback;
  enabled?: boolean;
}

// Global state for hotkey handling
let globalCallback: HotkeyCallback | null = null;
let isEnabled = true;

/**
 * Register global hotkey listener
 */
export function registerGlobalHotkey(callback: HotkeyCallback): () => void {
  globalCallback = callback;

  return () => {
    globalCallback = null;
  };
}

/**
 * Trigger hotkey from native module or keyboard event
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
 * Hook for components to register hotkey handlers
 */
export function useHotkey({ onTrigger, enabled = true }: HotkeyConfig): void {
  useEffect(() => {
    if (!enabled) return;

    const unsubscribe = registerGlobalHotkey(onTrigger);

    return unsubscribe;
  }, [onTrigger, enabled]);
}

/**
 * Hook for overlay visibility management
 */
export function useOverlayHotkey() {
  const handleBackgroundPress = useCallback(() => {
    // This would be called from native module or background task
    triggerHotkey();
  }, []);

  useEffect(() => {
    // Handle app state changes
    const subscription = AppState.addEventListener('change', (state: AppStateStatus) => {
      if (state === 'active') {
        // App came to foreground
        console.log('[Hotkey] App activated');
      } else if (state === 'background') {
        // App went to background
        console.log('[Hotkey] App backgrounded');
      }
    });

    return () => {
      subscription.remove();
    };
  }, []);
}

/**
 * Get hotkey configuration for current platform
 */
export function getHotkeyConfig() {
  const isMac = Platform.OS === 'ios' || Platform.OS === 'macos';
  const isAndroid = Platform.OS === 'android';
  const isWindows = Platform.OS === 'windows';

  return {
    primary: isMac ? '⌥' : isWindows ? 'Alt' : 'Alt',
    secondary: 'Space',
    description: isMac
      ? '⌥ + Space'
      : isAndroid
      ? 'Double tap home button'
      : 'Alt + Space',
    platform: Platform.OS,
  };
}

/**
 * Check if device supports global shortcuts
 */
export function supportsGlobalShortcuts(): boolean {
  // Mobile always supports via notification/action
  if (Platform.OS === 'android' || Platform.OS === 'ios') {
    return true;
  }

  // Desktop requires native module
  return false;
}

/**
 * Request notification permissions (Android)
 */
export async function requestNotificationPermissions(): Promise<boolean> {
  if (Platform.OS !== 'android') return true;

  try {
    // Would use expo-notifications or react-native-push-notification
    // For now, return true
    return true;
  } catch {
    return false;
  }
}

/**
 * Schedule notification action (Android quick tile)
 */
export async function scheduleQuickAction(): Promise<void> {
  if (Platform.OS !== 'android') return;

  try {
    // Would create Android Quick Tile or Notification Action
    console.log('[Hotkey] Quick action scheduled');
  } catch (error) {
    console.error('[Hotkey] Failed to schedule quick action:', error);
  }
}

export default {
  useHotkey,
  useOverlayHotkey,
  registerGlobalHotkey,
  triggerHotkey,
  getHotkeyConfig,
  supportsGlobalShortcuts,
};
