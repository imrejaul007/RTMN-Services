/**
 * Store QR Module (Rez Now / Linktree) - Profile, links, and analytics
 */

import { QRClient } from './client';
import type {
  StoreProfile,
  StoreLink,
  QRType,
  QRCode,
  AnalyticsEvent,
} from '../types';

export class StoreModule {
  private client: QRClient;

  constructor(client: QRClient) {
    this.client = client;
  }

  /**
   * Get store profile by slug
   */
  async getProfile(slug: string): Promise<StoreProfile> {
    return this.client.get(`/stores/profile/${slug}`);
  }

  /**
   * Get store profile by ID
   */
  async getProfileById(storeId: string): Promise<StoreProfile> {
    return this.client.get(`/stores/${storeId}`);
  }

  /**
   * Get store links
   */
  async getLinks(storeId: string): Promise<StoreLink[]> {
    return this.client.get(`/stores/${storeId}/links`);
  }

  /**
   * Get link details
   */
  async getLink(storeId: string, linkId: string): Promise<StoreLink> {
    return this.client.get(`/stores/${storeId}/links/${linkId}`);
  }

  /**
   * Generate QR code for a store
   */
  async generateQR(storeId: string, type: QRType, options?: {
    size?: number;
    foregroundColor?: string;
    backgroundColor?: string;
    logo?: string;
    expiresAt?: string;
  }): Promise<QRCode> {
    return this.client.post(`/stores/${storeId}/qr/generate`, { type, ...options });
  }

  /**
   * Get generated QR codes for a store
   */
  async getQRCodes(storeId: string): Promise<QRCode[]> {
    return this.client.get(`/stores/${storeId}/qr`);
  }

  /**
   * Download QR code image
   */
  async downloadQR(qrId: string, format: 'png' | 'svg' | 'pdf' = 'png'): Promise<ArrayBuffer> {
    const response = await this.client.get(`/stores/qr/${qrId}/download?format=${format}`, {
      responseType: 'arraybuffer',
    });
    return response as ArrayBuffer;
  }

  /**
   * Track analytics event
   */
  async trackEvent(storeId: string, event: AnalyticsEvent): Promise<void> {
    return this.client.post(`/stores/${storeId}/analytics`, event);
  }

  /**
   * Get store analytics
   */
  async getAnalytics(storeId: string, params?: {
    startDate?: string;
    endDate?: string;
    period?: 'day' | 'week' | 'month' | 'year';
  }): Promise<StoreAnalytics> {
    const query = params ? '?' + new URLSearchParams(params as Record<string, string>).toString() : '';
    return this.client.get(`/stores/${storeId}/analytics${query}`);
  }

  /**
   * Get link click analytics
   */
  async getLinkAnalytics(storeId: string, linkId: string): Promise<LinkAnalytics> {
    return this.client.get(`/stores/${storeId}/links/${linkId}/analytics`);
  }

  /**
   * Get QR scan analytics
   */
  async getQRAnalytics(storeId: string, qrId?: string): Promise<QRAnalytics> {
    const url = qrId
      ? `/stores/${storeId}/qr/${qrId}/analytics`
      : `/stores/${storeId}/qr/analytics`;
    return this.client.get(url);
  }

  /**
   * Create a favorite/like for a store
   */
  async favoriteStore(storeId: string): Promise<void> {
    return this.client.post(`/stores/${storeId}/favorite`);
  }

  /**
   * Remove favorite from a store
   */
  async unfavoriteStore(storeId: string): Promise<void> {
    return this.client.delete(`/stores/${storeId}/favorite`);
  }

  /**
   * Check if user has favorited a store
   */
  async isFavorited(storeId: string): Promise<boolean> {
    return this.client.get(`/stores/${storeId}/favorite`);
  }

  /**
   * Share store profile
   */
  async shareStore(storeId: string, platform: 'copy_link' | 'whatsapp' | 'instagram' | 'twitter' | 'facebook'): Promise<{ shareUrl: string }> {
    return this.client.post(`/stores/${storeId}/share`, { platform });
  }

  /**
   * Get store reviews
   */
  async getReviews(storeId: string, params?: { page?: number; limit?: number }): Promise<ReviewList> {
    const query = params ? '?' + new URLSearchParams(params as Record<string, string>).toString() : '';
    return this.client.get(`/stores/${storeId}/reviews${query}`);
  }

  /**
   * Submit a review
   */
  async submitReview(storeId: string, data: { rating: number; comment?: string }): Promise<{ reviewId: string }> {
    return this.client.post(`/stores/${storeId}/reviews`, data);
  }

  /**
   * Get nearby stores
   */
  async getNearby(latitude: number, longitude: number, radius?: number): Promise<StoreProfile[]> {
    const params = new URLSearchParams({
      lat: latitude.toString(),
      lng: longitude.toString(),
      ...(radius && { radius: radius.toString() }),
    });
    return this.client.get(`/stores/nearby?${params.toString()}`);
  }

  /**
   * Search stores
   */
  async search(query: string, params?: { category?: string; city?: string; limit?: number }): Promise<StoreProfile[]> {
    const searchParams = new URLSearchParams({ q: query });
    if (params?.category) searchParams.set('category', params.category);
    if (params?.city) searchParams.set('city', params.city);
    if (params?.limit) searchParams.set('limit', params.limit.toString());
    return this.client.get(`/stores/search?${searchParams.toString()}`);
  }
}

export interface StoreAnalytics {
  totalScans: number;
  uniqueScans: number;
  totalClicks: number;
  uniqueClicks: number;
  totalPurchases: number;
  revenue: number;
  conversionRate: number;
  topLinks: { linkId: string; title: string; clicks: number }[];
  scansByDay: { date: string; count: number }[];
}

export interface LinkAnalytics {
  clicks: number;
  uniqueClicks: number;
  devices: { type: string; count: number }[];
  locations: { city: string; count: number }[];
  topReferrers: { source: string; count: number }[];
}

export interface QRAnalytics {
  totalScans: number;
  uniqueScans: number;
  scansByDay: { date: string; count: number }[];
  scansByLocation: { city: string; count: number }[];
  devices: { type: string; count: number }[];
}

export interface ReviewList {
  items: Review[];
  total: number;
  page: number;
  limit: number;
  averageRating: number;
}

export interface Review {
  id: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  rating: number;
  comment?: string;
  createdAt: string;
  helpful: number;
}
