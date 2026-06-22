/**
 * Shared Brand Tokens - Single Source of Truth
 *
 * All ReZ applications must reference these core brand colors.
 * App-specific variations (error/warning/success) are allowed,
 * but primary and secondary brand colors are NON-NEGOTIABLE.
 *
 * Last Updated: 2026-03-23
 */

// ============================================================================
// CORE BRAND COLORS - IMMUTABLE ACROSS ALL APPS
// ============================================================================

export const BrandTokens = {
  // REZ OFFICIAL BRAND PALETTE
  brand: {
    // Primary Accent
    mustard: '#ffcd57',
    mustard50: '#FFF9E6',
    mustard100: '#FFF3CC',
    mustard200: '#FFE799',
    mustard300: '#FFDB66',
    mustard400: '#FFD433',
    mustard500: '#ffcd57', // PRIMARY
    mustard600: '#E6B84E',
    mustard700: '#CCA345',
    mustard800: '#B38F3C',
    mustard900: '#9A7A32',

    // Primary Dark
    navy: '#1a3a52',
    navy50: '#E8EEF3',
    navy100: '#D1DDE7',
    navy200: '#A3BBCF',
    navy300: '#7599B7',
    navy400: '#47779F',
    navy500: '#2A5577',
    navy600: '#1a3a52', // PRIMARY DARK
    navy700: '#163148',
    navy800: '#12283D',
    navy900: '#0E1F33',

    // Extended Brand Palette
    linen: '#faf1e0',
    peach: '#ffd7b5',
    lavender: '#dfebf7',
  },

  // SEMANTIC COLORS (App-independent)
  semantic: {
    success: {
      50: '#F0FDF4',
      100: '#DCFCE7',
      200: '#BBF7D0',
      400: '#34D399',
      500: '#2ECC71',
      700: '#15803D',
    },
    warning: {
      50: '#FFF9E6',
      100: '#FFF3CC',
      200: '#FDE68A',
      400: '#FBBF24',
      500: '#FF9F1C',
      700: '#E6B84E',
    },
    error: {
      50: '#FEF2F2',
      100: '#FEE2E2',
      200: '#FECACA',
      400: '#F87171',
      500: '#EF4444',
      700: '#B91C1C',
    },
    info: {
      50: '#dfebf7',
      100: '#C9DCF0',
      200: '#BFDBFE',
      400: '#60A5FA',
      500: '#3B82F6',
      700: '#1E40AF',
    },
  },

  // NEUTRAL GRAYS - Cross-app consistent
  gray: {
    50: '#F9FAFB',
    100: '#F3F4F6',
    200: '#E5E7EB',
    300: '#D1D5DB',
    400: '#9CA3AF',
    500: '#6B7280',
    600: '#4B5563',
    700: '#374151',
    800: '#1F2937',
    900: '#111827',
  },
} as const;

// ============================================================================
// SPACING SCALE - ENFORCED 8px GRID (no exceptions)
// ============================================================================

export const SpacingTokens = {
  // Atomic spacing (4px increments)
  0: 0,
  1: 4,
  2: 8,
  3: 12,
  4: 16,
  5: 20,
  6: 24,
  7: 28,
  8: 32,
  9: 36,
  10: 40,
  12: 48,
  14: 56,
  16: 64,
  20: 80,
  24: 96,
  28: 112,
  32: 128,
  36: 144,
  40: 160,
  44: 176,
  48: 192,
  52: 208,
  56: 224,
  60: 240,
  64: 256,
  72: 288,
  80: 320,
  96: 384,

  // Semantic aliases
  xs: 4,
  sm: 8,
  base: 16,
  md: 16,
  lg: 24,
  xl: 32,
  '2xl': 48,
  '3xl': 64,
  '4xl': 80,
  '5xl': 96,
  '6xl': 112,
  '7xl': 128,
} as const;

// ============================================================================
// TYPOGRAPHY SCALE - Consistent naming convention
// ============================================================================

export const TypographyTokens = {
  // Font families
  fontFamily: {
    default: 'System',
    mono: 'Courier',
  },

  // Font sizes (in points)
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

  // Font weights
  fontWeight: {
    light: '300' as const,
    normal: '400' as const,
    medium: '500' as const,
    semiBold: '600' as const,
    bold: '700' as const,
    extraBold: '800' as const,
    black: '900' as const,
  },

  // Line heights
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

  // Letter spacing
  letterSpacing: {
    tighter: -0.05,
    tight: -0.025,
    normal: 0,
    wide: 0.025,
    wider: 0.05,
    widest: 0.1,
  },
} as const;

// ============================================================================
// COMPONENT TOKENS - Default component styling
// ============================================================================

export const ComponentTokens = {
  // Border radius scale
  borderRadius: {
    none: 0,
    xs: 2,
    sm: 4,
    md: 8,
    lg: 12,
    xl: 16,
    '2xl': 24,
    '3xl': 32,
    full: 9999,
  },

  // Shadow elevations
  shadow: {
    none: {
      shadowColor: 'transparent',
      shadowOpacity: 0,
      elevation: 0,
    },
    sm: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.03,
      shadowRadius: 4,
      elevation: 2,
    },
    md: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.05,
      shadowRadius: 8,
      elevation: 3,
    },
    lg: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.08,
      shadowRadius: 16,
      elevation: 6,
    },
    xl: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 16 },
      shadowOpacity: 0.1,
      shadowRadius: 24,
      elevation: 10,
    },
  },

  // Z-index scale
  zIndex: {
    hide: -1,
    auto: 'auto' as const,
    base: 0,
    docked: 10,
    dropdown: 1000,
    sticky: 1100,
    banner: 1200,
    overlay: 1300,
    modal: 1400,
    popover: 1500,
    tooltip: 1800,
  },
} as const;

// ============================================================================
// LAYOUT TOKENS - Standard component dimensions
// ============================================================================

export const LayoutTokens = {
  // Minimum touch target (accessibility)
  minTouchTarget: 44,

  // Icon sizes
  icon: {
    xs: 12,
    sm: 16,
    base: 20,
    md: 24,
    lg: 32,
    xl: 40,
    '2xl': 48,
    '3xl': 56,
    '4xl': 64,
  },

  // Button sizes (height)
  button: {
    sm: 32,
    md: 40,
    lg: 48,
    xl: 56,
  },

  // Input field sizes (height)
  input: {
    sm: 32,
    md: 40,
    lg: 48,
    xl: 56,
  },

  // Navigation bar dimensions
  navBar: {
    height: 64,
    paddingHorizontal: 16,
  },

  // Tab bar dimensions
  tabBar: {
    height: 64,
    paddingBottom: 8,
  },
} as const;

// ============================================================================
// TYPE EXPORTS
// ============================================================================

export type BrandTokenKey = keyof typeof BrandTokens.brand;
export type SpacingKey = keyof typeof SpacingTokens;
export type FontSizeKey = keyof typeof TypographyTokens.fontSize;
export type FontWeightKey = keyof typeof TypographyTokens.fontWeight;
export type BorderRadiusKey = keyof typeof ComponentTokens.borderRadius;
export type ShadowKey = keyof typeof ComponentTokens.shadow;
export type ZIndexKey = keyof typeof ComponentTokens.zIndex;
