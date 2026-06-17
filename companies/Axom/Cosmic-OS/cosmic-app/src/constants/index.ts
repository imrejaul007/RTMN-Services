/**
 * Cosmic OS - Design System
 */

export const COLORS = {
  // Primary cosmic palette
  cosmic: '#8B5CF6',
  cosmicLight: '#A78BFA',
  cosmicDark: '#7C3AED',

  // Accent
  mystic: '#06B6D4',
  healer: '#10B981',
  strategist: '#F59E0B',
  oracle: '#EC4899',
  connector: '#6366F1',
  wealth: '#FCD34D',
  explorer: '#14B8A6',

  // Background
  background: '#0F0A1E',
  backgroundLight: '#1A1028',
  card: '#1E1535',
  cardLight: '#2D2448',

  // Text
  text: '#FFFFFF',
  textSecondary: '#A1A1AA',
  textMuted: '#6B7280',

  // Energy states
  highEnergy: '#10B981',
  mediumEnergy: '#F59E0B',
  lowEnergy: '#6B7280',

  // Status
  success: '#10B981',
  warning: '#F59E0B',
  error: '#EF4444',

  // Gradient
  gradient: ['#1E1535', '#0F0A1E'],
  cosmicGradient: ['#8B5CF6', '#06B6D4'],
};

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  '2xl': 48,
};

export const RADIUS = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  full: 9999,
};

export const FONTS = {
  h1: { size: 32, weight: '700' as const },
  h2: { size: 24, weight: '700' as const },
  h3: { size: 20, weight: '600' as const },
  body: { size: 16, weight: '400' as const },
  caption: { size: 14, weight: '400' as const },
  small: { size: 12, weight: '400' as const },
};

// Mood options with colors
export const MOODS = [
  { value: 'very_positive' as const, label: 'Radiant', emoji: '✨', color: '#10B981' },
  { value: 'positive' as const, label: 'Happy', emoji: '😊', color: '#34D399' },
  { value: 'energetic' as const, label: 'Energetic', emoji: '⚡', color: '#FBBF24' },
  { value: 'peaceful' as const, label: 'Peaceful', emoji: '🕊️', color: '#06B6D4' },
  { value: 'calm' as const, label: 'Calm', emoji: '😌', color: '#14B8A6' },
  { value: 'neutral' as const, label: 'Neutral', emoji: '😐', color: '#6B7280' },
  { value: 'tired' as const, label: 'Tired', emoji: '😴', color: '#9CA3AF' },
  { value: 'anxious' as const, label: 'Anxious', emoji: '😰', color: '#F97316' },
  { value: 'stressed' as const, label: 'Stressed', emoji: '😤', color: '#EF4444' },
  { value: 'negative' as const, label: 'Down', emoji: '😔', color: '#A855F7' },
  { value: 'very_negative' as const, label: 'Low', emoji: '😢', color: '#8B5CF6' },
];

// Agents
export const AGENTS = [
  { id: 'mystic' as const, name: 'The Mystic', emoji: '🔮', specialty: 'spiritual', color: '#8B5CF6' },
  { id: 'healer' as const, name: 'The Healer', emoji: '💚', specialty: 'emotional', color: '#10B981' },
  { id: 'strategist' as const, name: 'The Strategist', emoji: '🎯', specialty: 'career', color: '#F59E0B' },
  { id: 'oracle' as const, name: 'The Oracle', emoji: '👁️', specialty: 'spiritual', color: '#EC4899' },
  { id: 'connector' as const, name: 'The Connector', emoji: '💫', specialty: 'relationship', color: '#6366F1' },
  { id: 'wealth_guide' as const, name: 'The Wealth Guide', emoji: '💎', specialty: 'financial', color: '#FCD34D' },
  { id: 'explorer' as const, name: 'The Explorer', emoji: '🧭', specialty: 'spiritual', color: '#14B8A6' },
];

// Domains
export const DOMAINS = [
  { id: 'emotional' as const, name: 'Emotional', emoji: '💚' },
  { id: 'relationship' as const, name: 'Relationship', emoji: '💫' },
  { id: 'career' as const, name: 'Career', emoji: '🎯' },
  { id: 'financial' as const, name: 'Financial', emoji: '💎' },
  { id: 'health' as const, name: 'Health', emoji: '🌿' },
  { id: 'spiritual' as const, name: 'Spiritual', emoji: '🔮' },
  { id: 'social' as const, name: 'Social', emoji: '🤝' },
];
