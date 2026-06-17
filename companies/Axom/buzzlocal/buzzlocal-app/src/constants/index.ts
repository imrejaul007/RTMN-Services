/**
 * BuzzLocal - Design System
 */

export const COLORS = {
  // Primary
  primary: '#FF6B35',
  primaryLight: '#FF8A5B',
  primaryDark: '#E55A2B',

  // Accent
  accent: '#4ECDC4',
  accentLight: '#7EDDD6',

  // Background
  background: '#F8F9FA',
  card: '#FFFFFF',
  cardDark: '#1A1A2E',

  // Text
  text: '#2D3436',
  textSecondary: '#636E72',
  textMuted: '#B2BEC3',

  // Status
  success: '#00B894',
  warning: '#FDCB6E',
  error: '#E17055',
  info: '#74B9FF',

  // Safety
  safe: '#00B894',
  caution: '#FDCB6E',
  danger: '#D63031',

  // Gradient
  gradient: ['#FF6B35', '#FF8A5B'],
  safetyGradient: ['#00B894', '#4ECDC4'],
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

// Feed categories
export const FEED_CATEGORIES = [
  { id: 'all', label: 'For You', icon: 'compass' },
  { id: 'news', label: 'News', icon: 'newspaper' },
  { id: 'events', label: 'Events', icon: 'calendar' },
  { id: 'offers', label: 'Offers', icon: 'pricetag' },
  { id: 'alerts', label: 'Alerts', icon: 'warning' },
  { id: 'trending', label: 'Trending', icon: 'flame' },
];

// Safety alert types
export const SAFETY_TYPES = [
  { id: 'traffic', label: 'Traffic', icon: 'car', color: '#FDCB6E' },
  { id: 'accident', label: 'Accident', icon: 'alert-circle', color: '#E17055' },
  { id: 'fire', label: 'Fire', icon: 'flame', color: '#D63031' },
  { id: 'crime', label: 'Crime', icon: 'shield', color: '#D63031' },
  { id: 'flood', label: 'Flood', icon: 'water', color: '#74B9FF' },
  { id: 'power', label: 'Power Cut', icon: 'flash', color: '#FDCB6E' },
];

// Society features
export const SOCIETY_FEATURES = [
  { id: 'notices', label: 'Notices', icon: 'megaphone' },
  { id: 'visitors', label: 'Visitors', icon: 'people' },
  { id: 'complaints', label: 'Complaints', icon: 'chatbubbles' },
  { id: 'polls', label: 'Polls', icon: 'bar-chart' },
  { id: 'facilities', label: 'Facilities', icon: 'tennisball' },
  { id: 'maintenance', label: 'Maintenance', icon: 'construct' },
];
