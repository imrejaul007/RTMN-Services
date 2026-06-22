/**
 * Simple debounce hook for delaying function execution
 * ADMIN-012: Add debounce for user search and other frequent operations
 */

// BUG-039 FIX: Centralized debounce duration constants — ensures consistency across
// all screens. Previously: merchants/orders=300ms, users=500ms. Now: all=300ms.
export const DEBOUNCE_MS = Object.freeze({
  SEARCH: 300,    // Search input debounce
  FILTER: 300,    // Filter chip debounce
  INPUT: 300,     // General input debounce
} as const);

export type DebounceKey = keyof typeof DEBOUNCE_MS;

import { useEffect, useRef, useCallback } from 'react';

/**
 * Hook to debounce a callback function
 * @param callback Function to debounce
 * @param delay Delay in milliseconds
 * @returns Debounced callback
 */
export function useDebouncedCallback<T extends (...args: any[]) => any>(
  callback: T,
  delay: number
): T {
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // BUG-042 FIX: Store callback in a ref so the debounced wrapper always calls
  // the latest version without being recreated (avoids stale closure issue).
  const callbackRef = useRef<T>(callback);

  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  const debounced = useCallback(
    (...args: Parameters<T>) => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      timeoutRef.current = setTimeout(() => {
        callbackRef.current(...args);
      }, delay);
    },
    // Only recreate when delay changes — callback changes are handled via ref
    [delay]
  ) as T;

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return debounced;
}

/**
 * Simple debounce function for non-hook usage
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;

  return (...args: Parameters<T>) => {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
    timeoutId = setTimeout(() => {
      func(...args);
    }, delay);
  };
}
