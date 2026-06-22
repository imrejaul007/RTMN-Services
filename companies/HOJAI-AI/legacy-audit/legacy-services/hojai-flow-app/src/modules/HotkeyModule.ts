/**
 * Native Hotkey Module - Desktop keyboard shortcuts
 *
 * Registers global hotkeys using native modules:
 * - ⌥ + Space (macOS)
 * - Alt + Space (Windows)
 *
 * Requires:
 * - react-native-global-shortcuts (desktop)
 * - Expo modules (mobile)
 */

import { NativeModules, Platform } from 'react-native';

const { HotkeyModule } = NativeModules;

interface HotkeyConfig {
  key: string;
  modifiers?: string[];
  callback: () => void;
}

class NativeHotkey {
  private registeredKeys: Map<string, () => void> = new Map();

  /**
   * Register global hotkey
   */
  async register(config: HotkeyConfig): Promise<boolean> {
    const { key, modifiers = [], callback } = config;

    // Platform-specific key
    const platformKey = this.getPlatformKey(key, modifiers);

    try {
      if (Platform.OS === 'macos' || Platform.OS === 'windows') {
        // Use native module
        if (HotkeyModule?.registerHotkey) {
          await HotkeyModule.registerHotkey(platformKey);
          this.registeredKeys.set(platformKey, callback);
          return true;
        }
      }

      // Fallback: log warning
      console.warn('[Hotkey] Native module not available');
      return false;
    } catch (error) {
      console.error('[Hotkey] Registration failed:', error);
      return false;
    }
  }

  /**
   * Unregister hotkey
   */
  async unregister(key: string): Promise<void> {
    try {
      if (HotkeyModule?.unregisterHotkey) {
        await HotkeyModule.unregisterHotkey(key);
        this.registeredKeys.delete(key);
      }
    } catch (error) {
      console.error('[Hotkey] Unregister failed:', error);
    }
  }

  /**
   * Unregister all hotkeys
   */
  async unregisterAll(): Promise<void> {
    for (const key of this.registeredKeys.keys()) {
      await this.unregister(key);
    }
  }

  /**
   * Get platform-specific key string
   */
  private getPlatformKey(key: string, modifiers: string[]): string {
    if (Platform.OS === 'macos') {
      return modifiers.map(m => `Cmd+${m}`).join('+') + `+${key}`;
    }
    if (Platform.OS === 'windows') {
      return modifiers.map(m => `${m}+`).join('') + key;
    }
    return key;
  }

  /**
   * Check if hotkey is supported
   */
  isSupported(): boolean {
    return Platform.OS === 'macos' || Platform.OS === 'windows';
  }
}

export const nativeHotkey = new NativeHotkey();

/**
 * Common hotkey configurations
 */
export const HOTKEYS = {
  OPEN_HOJAI: {
    macos: { key: 'Space', modifiers: ['Option'] },
    windows: { key: 'Space', modifiers: ['Alt'] },
  },
  CLOSE_OVERLAY: {
    macos: { key: 'Escape', modifiers: [] },
    windows: { key: 'Escape', modifiers: [] },
  },
};

export default nativeHotkey;
