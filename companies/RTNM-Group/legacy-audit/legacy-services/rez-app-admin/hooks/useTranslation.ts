/**
 * useTranslation — i18n hook for Admin App
 *
 * TS-L1: Provides the same interface as react-i18next's `useTranslation` so that
 * migrating to react-i18next in Phase 2 requires minimal component changes.
 *
 * Reads from the centralized `constants/strings.ts` — all user-visible strings
 * are defined there. Components import the hook, not the constants directly.
 *
 * Usage:
 *   const { t } = useTranslation();
 *   <Text>{t('common.loading')}</Text>
 *
 *   const { t } = useTranslation('auth');
 *   <Text>{t('login')}</Text>
 *
 * Phase 2 migration (when react-i18next is added):
 *   1. npm install react-i18next i18next
 *   2. Create i18n/index.ts with i18next instance and locale files
 *   3. Replace this stub with: import { useTranslation as _useTranslation } from 'react-i18next'
 *      export const useTranslation = (ns?: string) => _useTranslation(ns ?? 'common')
 *   4. Run codemod: t('old.string') → t('new.string')
 *
 * See TS-L1 in docs/Bugs/15-TYPESCRIPT-UI.md for tracking.
 */

import { Strings } from '@/constants/strings';

type Namespace = keyof typeof Strings;

interface UseTranslationReturn {
  t: (key: string, options?: { fallback?: string }) => string;
}

function getNestedValue(obj: any, path: string): string | undefined {
  const parts = path.split('.');
  let value: any = obj;
  for (const part of parts) {
    if (value == null || typeof value !== 'object') return undefined;
    value = value[part];
  }
  return typeof value === 'string' ? value : undefined;
}

export function useTranslation(namespace: Namespace = 'common'): UseTranslationReturn {
  const t = (key: string, options?: { fallback?: string }): string => {
    // Dot-notation path: "namespace.key" overrides the default namespace
    if (key.includes('.')) {
      const dotIdx = key.indexOf('.');
      const ns = key.slice(0, dotIdx) as Namespace;
      const rest = key.slice(dotIdx + 1);
      return getNestedValue(Strings[ns], rest) ?? options?.fallback ?? key;
    }
    // Single key: look in the default namespace
    return getNestedValue(Strings[namespace], key) ?? options?.fallback ?? key;
  };

  return { t };
}

/**
 * Standalone translation function for cases where a hook is inconvenient.
 * Less preferred than useTranslation() — use the hook where possible.
 */
export function translate(key: string, fallback?: string): string {
  const result = getNestedValue(Strings, key);
  return result ?? fallback ?? key;
}

export default useTranslation;
