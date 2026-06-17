/**
 * BuzzLocal Feed Service - Types
 *
 * Local news, events, offers, and community updates
 */

// ============================================
// Enums
// ============================================

export type FeedItemType =
  | 'news'
  | 'event'
  | 'offer'
  | 'alert'
  | 'update'
  | 'trending';

export type AlertSeverity = 'info' | 'warning' | 'urgent' | 'emergency';

export type LocationRadius = 'neighborhood' | 'area' | 'city';

// ============================================
// Feed Items
// ============================================

export interface FeedItem {
  id: string;
  type: FeedItemType;
  title: string;
  description: string;
  content?: string;
  imageUrl?: string;
  author: {
    id: string;
    name: string;
    avatar?: string;
    isVerified: boolean;
    type: 'user' | 'business' | 'system';
  };
  location: {
    latitude: number;
    longitude: number;
    address?: string;
    area?: string;
    city: string;
  };
  radius: LocationRadius;
  category: string;
  tags: string[];
  likes: number;
  comments: number;
  shares: number;
  saved: number;
  views: number;
  createdAt: string;
  expiresAt?: string;
  metadata?: Record<string, any>;
}

export interface FeedComment {
  id: string;
  feedItemId: string;
  author: {
    id: string;
    name: string;
    avatar?: string;
  };
  content: string;
  likes: number;
  replies?: FeedComment[];
  createdAt: string;
}

export interface Alert extends FeedItem {
  type: 'alert';
  severity: AlertSeverity;
  alertType: 'traffic' | 'weather' | 'safety' | 'event' | 'maintenance' | 'utility';
  expiresAt: string;
  source: string;
  verified: boolean;
}

export interface Offer extends FeedItem {
  type: 'offer';
  business: {
    id: string;
    name: string;
    logo?: string;
    rating: number;
  };
  discount: number;
  discountType: 'percentage' | 'flat';
  minOrder?: number;
  validUntil: string;
  code?: string;
  url?: string;
  claimCount: number;
}

export interface Event extends FeedItem {
  type: 'event';
  eventDetails: {
    startDate: string;
    endDate?: string;
    startTime: string;
    venue: string;
    category: string;
    attendees: number;
    maxAttendees?: number;
    isFree: boolean;
    price?: number;
  };
  interested: number;
  going: number;
}

// ============================================
// Feed Filters
// ============================================

export interface FeedFilters {
  types?: FeedItemType[];
  categories?: string[];
  radius?: LocationRadius;
  area?: string;
  city?: string;
  lat?: number;
  lng?: number;
  radiusKm?: number;
  since?: string;
  limit?: number;
  offset?: number;
}

export interface TrendingTopic {
  id: string;
  tag: string;
  count: number;
  category: string;
  recent: boolean;
}

// ============================================
// Weather
// ============================================

export interface WeatherAlert {
  id: string;
  type: 'rain' | 'heat' | 'storm' | 'flood' | 'air_quality' | 'uv';
  severity: AlertSeverity;
  title: string;
  description: string;
  area: string;
  startTime: string;
  endTime: string;
  actionable: boolean;
  recommendations?: string[];
}

// ============================================
// API Response
// ============================================

export interface FeedResponse {
  items: FeedItem[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
  };
  trends?: TrendingTopic[];
}
