/**
 * Screen Protection Hook
 *
 * React hook for enabling/disabling screenshot protection on sensitive screens.
 *
 * USAGE:
 *   import { useScreenProtection } from '@/hooks/useScreenProtection';
 *
 *   function SensitiveScreen() {
 *     useScreenProtection(); // Enables on mount, disables on unmount
 *     // ... rest of component
 *   }
 *
 *   // With conditional protection:
 *   function ConditionalScreen() {
 *     const protected = useColorScheme() === 'dark';
 *     useScreenProtection(protected);
 *   }
 */

import { useEffect } from 'react';
import {
  enableScreenProtection,
  disableScreenProtection,
  isScreenProtectionEnabled,
} from '../utils/screenshotProtection';

export interface UseScreenProtectionOptions {
  /** Enable protection on mount (default: true) */
  enableOnMount?: boolean;
  /** Optional custom key for debugging */
  name?: string;
}

/**
 * Hook to manage screen protection for sensitive screens
 */
export function useScreenProtection(
  options: UseScreenProtectionOptions = {}
): { enabled: boolean } {
  const { enableOnMount = true, name } = options;

  useEffect(() => {
    if (!enableOnMount) {
      return;
    }

    const screenName = name || 'Screen';
    enableScreenProtection()
      .then((success) => {
        if (success) {
          console.debug(`[ScreenProtection] Enabled for ${screenName}`);
        }
      })
      .catch((error) => {
        console.debug(`[ScreenProtection] Could not enable for ${screenName}:`, error);
      });

    return () => {
      disableScreenProtection()
        .then((success) => {
          if (success) {
            console.debug(`[ScreenProtection] Disabled for ${screenName}`);
          }
        })
        .catch(() => {
          // Silent cleanup
        });
    };
  }, [enableOnMount, name]);

  return {
    enabled: isScreenProtectionEnabled(),
  };
}

export default useScreenProtection;
