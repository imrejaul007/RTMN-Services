/**
 * Theme Context for Admin Panel
 * Provides a consistent color palette for the admin dashboard.
 * BUG-076: Reads system color scheme and returns dark theme colors when isDark is true.
 *
 * TS-L2 NOTE — WHY THIS FILE IS SEPARATE FROM THE MERCHANT ThemeProvider:
 * -------------------------------------------------------------------------
 * The admin app (rezadmin/rez-admin-main) and the merchant app
 * (rezmerchant/rez-merchant-master) intentionally maintain separate theme
 * implementations until the TS-H4/TS-H5 shared design-token sprint ships.
 *
 * CANONICAL API — both apps export a `useTheme` hook. The return shapes differ:
 *
 *   Admin  (this file):   useTheme() → { colors: ThemeColors, isDark: boolean }
 *   Merchant (ThemeProvider.tsx): useTheme() → { theme: Theme, themeMode, setThemeMode, isDark, toggleTheme }
 *
 * The admin hook returns `colors` directly (flat access).
 * The merchant hook returns a `theme` object (theme.colors.xxx access).
 *
 * TODO (TS-L2 / TS-H5): When shared extraction lands, unify to a single
 * interface. The admin consumer API (`colors.primary`) should become the
 * canonical shorthand via a `useThemeColors()` convenience hook in rez-shared.
 *
 * Any changes to the color token names (e.g. renaming `secondaryText`) must be
 * mirrored in the merchant ThemeProvider until extraction is complete.
 */

import React, { createContext, useContext, useMemo } from 'react';
import { useColorScheme } from 'react-native';

const lightColors = {
  background: '#FFFFFF',
  card: '#F9FAFB',
  text: '#111827',
  secondaryText: '#6B7280',
  border: '#E5E7EB',
  icon: '#9CA3AF',
  primary: '#C9A962',
  error: '#EF4444',
  success: '#10B981',
  gold: '#C9A962',
  warning: '#F59E0B',
  info: '#3B82F6',
  purple: '#8B5CF6',
};

const darkColors = {
  background: '#0F172A',
  card: '#1E293B',
  text: '#ECEDEE',
  secondaryText: '#9BA1A6',
  border: '#334155',
  icon: '#9BA1A6',
  primary: '#C9A962',
  error: '#EF4444',
  success: '#10B981',
  gold: '#C9A962',
  warning: '#F59E0B',
  info: '#3B82F6',
  purple: '#8B5CF6',
};

type ThemeColors = typeof lightColors;

interface ThemeContextValue {
  colors: ThemeColors;
  isDark: boolean;
}

const ThemeContext = createContext<ThemeContextValue>({
  colors: lightColors,
  isDark: false,
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const colors = useMemo(() => (isDark ? darkColors : lightColors), [isDark]);

  return <ThemeContext.Provider value={{ colors, isDark }}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  return useContext(ThemeContext);
}

export default ThemeContext;
