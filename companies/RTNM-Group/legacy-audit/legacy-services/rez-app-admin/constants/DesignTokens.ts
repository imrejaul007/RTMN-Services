/**
 * Design System Constants
 * Centralized design tokens for consistent UI across the admin app.
 *
 * COLOR SOURCE OF TRUTH (gap A10-C7):
 * Colors are defined ONCE in `./Colors` (flat `{ light, dark }` palette shape).
 * This file re-exports `Colors` from there so legacy imports of
 * `import { Colors } from '@/constants/DesignTokens'` keep working.
 *
 * DEPRECATED: `import { Colors } from '@/constants/DesignTokens'` — prefer
 * `import { Colors } from '@/constants/Colors'` in new code.
 *
 * All other design tokens below (Typography, Spacing, BorderRadius, Shadows,
 * Layout, IconSizes, BusinessColors) remain canonical in this file.
 */

// Re-export canonical Colors (single source of truth).
export { Colors } from './Colors';
import { Colors } from './Colors';

// Typography Scale
export const Typography = {
  fontFamily: {
    regular: 'System',
    medium: 'System',
    semiBold: 'System',
    bold: 'System',
    mono: 'Courier',
  },

  fontSize: {
    xs: 12,
    sm: 14,
    base: 16,
    lg: 18,
    xl: 20,
    '2xl': 24,
    '3xl': 30,
    '4xl': 36,
    '5xl': 48,
    '6xl': 60,
  },

  lineHeight: {
    xs: 16,
    sm: 20,
    base: 24,
    lg: 28,
    xl: 32,
    '2xl': 32,
    '3xl': 36,
    '4xl': 40,
    '5xl': 52,
    '6xl': 64,
  },

  fontWeight: {
    light: '300' as const,
    normal: '400' as const,
    medium: '500' as const,
    semiBold: '600' as const,
    bold: '700' as const,
    extraBold: '800' as const,
  },
};

// Spacing Scale (in pixels)
export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  base: 16,
  lg: 20,
  xl: 24,
  '2xl': 32,
  '3xl': 40,
  '4xl': 48,
  '5xl': 64,
} as const;

/**
 * Standard 8pt-grid spacing tokens.
 * Use these for new components to ensure consistency across both admin and
 * merchant apps. Prefer these over raw numbers in StyleSheet definitions.
 */
export const SpacingScale = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const;

// Border Radius
export const BorderRadius = {
  none: 0,
  sm: 4,
  base: 6,
  md: 8,
  lg: 12,
  xl: 16,
  '2xl': 24,
  '3xl': 32,
  full: 9999,
};

// Shadows
export const Shadows = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 2,
  },
  base: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 6,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.1,
    shadowRadius: 24,
    elevation: 10,
  },
};

// Layout Dimensions
export const Layout = {
  header: {
    height: 64,
    paddingHorizontal: 20,
  },

  tabBar: {
    height: 70,
    paddingBottom: 12,
  },

  container: {
    paddingHorizontal: 20,
    paddingVertical: 24,
  },

  card: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderRadius: 16,
  },

  button: {
    height: 48,
    paddingHorizontal: 24,
    borderRadius: 12,
  },

  input: {
    height: 48,
    paddingHorizontal: 24,
    borderRadius: 12,
  },
};

// Business-Specific Color Mappings for Admin.
// Now sourced from the canonical flat `Colors.light` palette.
export const BusinessColors = {
  merchant: {
    pending: Colors.light.warning,
    approved: Colors.light.success,
    rejected: Colors.light.error,
    suspended: Colors.light.gray500,
  },

  order: {
    pending: Colors.light.warning,
    confirmed: Colors.light.info,
    preparing: Colors.light.warningDark,
    ready: Colors.light.green,
    delivered: Colors.light.success,
    cancelled: Colors.light.error,
    refunded: Colors.light.gray500,
  },

  coinReward: {
    pending: Colors.light.warning,
    approved: Colors.light.success,
    rejected: Colors.light.error,
    credited: Colors.light.successDark,
  },

  adminRole: {
    support: Colors.light.success,
    operator: Colors.light.info,
    admin: Colors.light.tint,
    super_admin: Colors.light.errorDeep,
  },
};

// Icon Sizes
export const IconSizes = {
  xs: 12,
  sm: 16,
  base: 20,
  lg: 24,
  xl: 32,
  '2xl': 40,
  '3xl': 48,
};
