/**
 * Karma Admin API Service
 *
 * Service layer for NGO Karma Dashboard admin operations.
 * Handles events, bookings, leaderboard, badges, CSR partners, and communities.
 *
 * Endpoints:
 * - POST /api/karma/admin/event          - Create karma event
 * - PATCH /api/karma/admin/event/:eventId/publish - Publish event
 * - PATCH /api/karma/booking/:bookingId/approve   - Approve booking
 * - PATCH /api/karma/booking/:bookingId/reject     - Reject booking
 * - GET  /api/karma/leaderboard              - Get karma rankings
 * - GET  /api/karma/badges                  - Get all badges
 * - GET  /api/karma/csr/partners            - Get CSR partners
 * - POST /api/karma/csr/partner            - Add CSR partner
 * - GET  /api/karma/communities             - Get cause communities
 * - GET  /api/karma/micro-actions           - Get micro-actions config
 * - GET  /api/karma/csr/dashboard          - Get CSR dashboard stats
 */

import { apiClient } from './apiClient';
import { logger } from '../../utils/logger';

// ============================================================================
// TYPES
// ============================================================================

// Karma Event Types
export type KarmaEventStatus = 'draft' | 'published' | 'ongoing' | 'completed' | 'cancelled';

export interface KarmaEvent {
  _id: string;
  title: string;
  description?: string;
  category: string;
  difficulty: 'easy' | 'medium' | 'hard';
  baseKarma: number;
  karmaPerHour?: number;
  maxVolunteers: number;
  confirmedCount: number;
  status: KarmaEventStatus;
  startDate: string;
  endDate?: string;
  location?: {
    name?: string;
    address?: string;
    city?: string;
  };
  ngoId?: {
    _id: string;
    name: string;
    logo?: string;
  };
  verificationMethods?: string[];
  image?: string;
  createdAt: string;
  updatedAt: string;
}

export interface KarmaEventRequest {
  title: string;
  description?: string;
  category: string;
  difficulty?: 'easy' | 'medium' | 'hard';
  baseKarma?: number;
  karmaPerHour?: number;
  maxVolunteers: number;
  startDate: string;
  endDate?: string;
  location?: {
    name?: string;
    address?: string;
    city?: string;
  };
  verificationMethods?: string[];
  image?: string;
  status?: KarmaEventStatus;
}

// Karma Booking Types
export type KarmaBookingStatus = 'pending' | 'approved' | 'rejected' | 'completed' | 'cancelled';

export interface KarmaBooking {
  _id: string;
  bookingRef: string;
  event: {
    _id: string;
    title: string;
  };
  userId: {
    _id: string;
    firstName?: string;
    lastName?: string;
    displayName?: string;
    phone?: string;
  };
  status: KarmaBookingStatus;
  confidenceScore?: number;
  hours?: number;
  karmaEarned?: number;
  verificationSignals?: {
    qrIn: boolean;
    qrOut: boolean;
    gpsMatch: boolean;
    ngoApproved: boolean;
    photoVerified: boolean;
  };
  appliedAt: string;
  approvedAt?: string;
  completedAt?: string;
}

// Leaderboard Types
export type LeaderboardScope = 'global' | 'city' | 'cause';
export type LeaderboardPeriod = 'all-time' | 'monthly' | 'weekly' | 'daily';

export interface LeaderboardEntry {
  rank: number;
  userId: {
    _id: string;
    displayName: string;
    firstName?: string;
    lastName?: string;
    avatar?: string;
  };
  karma: number;
  level: number;
  band?: string;
  streak?: number;
  monthlyKarma?: number;
  weeklyKarma?: number;
}

export interface LeaderboardResponse {
  entries: LeaderboardEntry[];
  userRank?: LeaderboardEntry;
  totalParticipants: number;
  scope: LeaderboardScope;
  period: LeaderboardPeriod;
  updatedAt: string;
}

// Badge Types
export type BadgeLevel = 'bronze' | 'silver' | 'gold' | 'platinum' | 'diamond';

export interface KarmaBadge {
  _id: string;
  name: string;
  description: string;
  icon: string;
  level: BadgeLevel;
  karmaRequired: number;
  earnedCount: number;
  category?: string;
  criteria?: string;
}

export interface UserBadge {
  _id: string;
  badge: KarmaBadge;
  earnedAt: string;
  userId: {
    _id: string;
    displayName: string;
  };
}

// CSR Partner Types
export type CSRPartnerTier = 'bronze' | 'silver' | 'gold' | 'platinum' | 'diamond';

export interface CSRPartner {
  _id: string;
  companyName: string;
  contactPerson?: string;
  email?: string;
  phone?: string;
  tier: CSRPartnerTier;
  logo?: string;
  budget: number;
  creditsUsed: number;
  creditsRemaining: number;
  totalEventsSponsored: number;
  totalVolunteersEngaged: number;
  activeSince: string;
  status: 'active' | 'inactive' | 'suspended';
}

export interface CSRPartnerRequest {
  companyName: string;
  contactPerson?: string;
  email?: string;
  phone?: string;
  tier?: CSRPartnerTier;
  logo?: string;
  budget: number;
}

export interface CSRDashboard {
  totalPartners: number;
  activePartners: number;
  totalBudget: number;
  totalCreditsUsed: number;
  totalEventsSponsored: number;
  totalVolunteersEngaged: number;
  topPartners: CSRPartner[];
  recentActivity: Array<{
    action: string;
    partner: string;
    timestamp: string;
  }>;
}

// Community Types
export interface KarmaCommunity {
  _id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  memberCount: number;
  activeMembers: number;
  eventCount: number;
  recentPostCount?: number;
  cause?: string;
  createdAt: string;
}

// Micro-Action Types
export interface MicroAction {
  _id: string;
  name: string;
  description: string;
  karmaPoints: number;
  dailyLimit: number;
  category: string;
  icon: string;
  isActive: boolean;
}

// Stats Types
export interface KarmaStats {
  totalEvents: number;
  activeEvents: number;
  totalVolunteers: number;
  totalKarmaDistributed: number;
  totalBadgesAwarded: number;
  pendingBookings: number;
  totalCommunities: number;
  topCauses: Array<{ cause: string; count: number }>;
}

// ============================================================================
// SERVICE CLASS
// ============================================================================

class KarmaAdminService {
  private readonly baseEndpoint = 'karma';

  // ── Events ──────────────────────────────────────────────────────────────────

  /**
   * Get all karma events with filters
   */
  async getEvents(params?: {
    status?: KarmaEventStatus;
    search?: string;
    category?: string;
    page?: number;
    limit?: number;
  }): Promise<{ events: KarmaEvent[]; stats: KarmaStats; pagination: any }> {
    try {
      logger.info('[Karma] Fetching events:', params);

      const queryParams = new URLSearchParams();
      if (params?.status) queryParams.append('status', params.status);
      if (params?.search) queryParams.append('search', params.search);
      if (params?.category) queryParams.append('category', params.category);
      if (params?.page) queryParams.append('page', params.page.toString());
      if (params?.limit) queryParams.append('limit', params.limit.toString());

      const endpoint = `karma/admin/events${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
      const response = await apiClient.get<any>(endpoint);

      if (response.success && response.data) {
        const raw = response.data;
        return {
          events: raw.events || [],
          stats: raw.stats || {},
          pagination: raw.pagination || {},
        };
      }

      throw new Error(response.message || 'Failed to fetch karma events');
    } catch (error: any) {
      logger.error('[Karma] Get events error:', error.message);
      // Return empty data on error to prevent UI crash
      return {
        events: [],
        stats: {
          totalEvents: 0,
          activeEvents: 0,
          totalVolunteers: 0,
          totalKarmaDistributed: 0,
          totalBadgesAwarded: 0,
          pendingBookings: 0,
          totalCommunities: 0,
          topCauses: [],
        },
        pagination: { page: 1, limit: 20, total: 0, totalPages: 0 },
      };
    }
  }

  /**
   * Create a new karma event
   */
  async createEvent(data: KarmaEventRequest): Promise<KarmaEvent> {
    try {
      logger.info('[Karma] Creating event:', data.title);
      const response = await apiClient.post<KarmaEvent, KarmaEventRequest>(
        'karma/admin/event',
        data
      );

      if (response.success && response.data) {
        logger.info('[Karma] Event created:', response.data._id);
        return response.data;
      }

      throw new Error(response.message || 'Failed to create karma event');
    } catch (error: any) {
      logger.error('[Karma] Create event error:', error.message);
      throw error;
    }
  }

  /**
   * Update a karma event
   */
  async updateEvent(eventId: string, data: Partial<KarmaEventRequest>): Promise<KarmaEvent> {
    try {
      logger.info('[Karma] Updating event:', eventId);
      const response = await apiClient.put<KarmaEvent, Partial<KarmaEventRequest>>(
        `karma/admin/event/${eventId}`,
        data
      );

      if (response.success && response.data) {
        logger.info('[Karma] Event updated:', response.data._id);
        return response.data;
      }

      throw new Error(response.message || 'Failed to update karma event');
    } catch (error: any) {
      logger.error('[Karma] Update event error:', error.message);
      throw error;
    }
  }

  /**
   * Publish a karma event (change status from draft to published)
   */
  async publishEvent(eventId: string): Promise<KarmaEvent> {
    try {
      logger.info('[Karma] Publishing event:', eventId);
      const response = await apiClient.patch<KarmaEvent>(
        `karma/admin/event/${eventId}/publish`,
        {}
      );

      if (response.success && response.data) {
        logger.info('[Karma] Event published:', response.data._id);
        return response.data;
      }

      throw new Error(response.message || 'Failed to publish karma event');
    } catch (error: any) {
      logger.error('[Karma] Publish event error:', error.message);
      throw error;
    }
  }

  /**
   * Delete a karma event
   */
  async deleteEvent(eventId: string): Promise<void> {
    try {
      logger.info('[Karma] Deleting event:', eventId);
      const response = await apiClient.delete(`karma/admin/event/${eventId}`);

      if (response.success) {
        logger.info('[Karma] Event deleted');
        return;
      }

      throw new Error(response.message || 'Failed to delete karma event');
    } catch (error: any) {
      logger.error('[Karma] Delete event error:', error.message);
      throw error;
    }
  }

  // ── Bookings ─────────────────────────────────────────────────────────────────

  /**
   * Get pending karma bookings
   */
  async getBookings(params?: {
    status?: KarmaBookingStatus;
    page?: number;
    limit?: number;
  }): Promise<{
    bookings: KarmaBooking[];
    pagination: any;
    stats: { pending: number; approved: number; rejected: number };
  }> {
    try {
      logger.info('[Karma] Fetching bookings:', params);

      const queryParams = new URLSearchParams();
      if (params?.status) queryParams.append('status', params.status);
      if (params?.page) queryParams.append('page', params.page.toString());
      if (params?.limit) queryParams.append('limit', params.limit.toString());

      const endpoint = `karma/bookings${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
      const response = await apiClient.get<any>(endpoint);

      if (response.success && response.data) {
        const raw = response.data;
        return {
          bookings: raw.bookings || [],
          pagination: raw.pagination || {},
          stats: raw.stats || { pending: 0, approved: 0, rejected: 0 },
        };
      }

      throw new Error(response.message || 'Failed to fetch bookings');
    } catch (error: any) {
      logger.error('[Karma] Get bookings error:', error.message);
      return {
        bookings: [],
        pagination: { page: 1, limit: 20, total: 0, totalPages: 0 },
        stats: { pending: 0, approved: 0, rejected: 0 },
      };
    }
  }

  /**
   * Approve a karma booking
   */
  async approveBooking(bookingId: string): Promise<KarmaBooking> {
    try {
      logger.info('[Karma] Approving booking:', bookingId);
      const response = await apiClient.patch<KarmaBooking>(
        `karma/booking/${bookingId}/approve`,
        {}
      );

      if (response.success && response.data) {
        logger.info('[Karma] Booking approved:', response.data._id);
        return response.data;
      }

      throw new Error(response.message || 'Failed to approve booking');
    } catch (error: any) {
      logger.error('[Karma] Approve booking error:', error.message);
      throw error;
    }
  }

  /**
   * Reject a karma booking
   */
  async rejectBooking(bookingId: string, reason?: string): Promise<KarmaBooking> {
    try {
      logger.info('[Karma] Rejecting booking:', bookingId);
      const response = await apiClient.patch<KarmaBooking, { reason?: string }>(
        `karma/booking/${bookingId}/reject`,
        { reason }
      );

      if (response.success && response.data) {
        logger.info('[Karma] Booking rejected:', response.data._id);
        return response.data;
      }

      throw new Error(response.message || 'Failed to reject booking');
    } catch (error: any) {
      logger.error('[Karma] Reject booking error:', error.message);
      throw error;
    }
  }

  // ── Leaderboard ─────────────────────────────────────────────────────────────────

  /**
   * Get karma leaderboard
   */
  async getLeaderboard(params?: {
    scope?: LeaderboardScope;
    period?: LeaderboardPeriod;
    city?: string;
    cause?: string;
    limit?: number;
  }): Promise<LeaderboardResponse> {
    try {
      logger.info('[Karma] Fetching leaderboard:', params);

      const queryParams = new URLSearchParams();
      if (params?.scope) queryParams.append('scope', params.scope);
      if (params?.period) queryParams.append('period', params.period);
      if (params?.city) queryParams.append('city', params.city);
      if (params?.cause) queryParams.append('cause', params.cause);
      if (params?.limit) queryParams.append('limit', params.limit.toString());

      const endpoint = `karma/leaderboard${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
      const response = await apiClient.get<LeaderboardResponse>(endpoint);

      if (response.success && response.data) {
        return response.data;
      }

      throw new Error(response.message || 'Failed to fetch leaderboard');
    } catch (error: any) {
      logger.error('[Karma] Get leaderboard error:', error.message);
      return {
        entries: [],
        totalParticipants: 0,
        scope: params?.scope || 'global',
        period: params?.period || 'all-time',
        updatedAt: new Date().toISOString(),
      };
    }
  }

  // ── Badges ─────────────────────────────────────────────────────────────────────

  /**
   * Get all karma badges
   */
  async getBadges(params?: {
    level?: BadgeLevel;
    category?: string;
  }): Promise<{ badges: KarmaBadge[]; stats: any }> {
    try {
      logger.info('[Karma] Fetching badges:', params);

      const queryParams = new URLSearchParams();
      if (params?.level) queryParams.append('level', params.level);
      if (params?.category) queryParams.append('category', params.category);

      const endpoint = `karma/badges${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
      const response = await apiClient.get<any>(endpoint);

      if (response.success && response.data) {
        return {
          badges: response.data.badges || response.data || [],
          stats: response.data.stats || {},
        };
      }

      throw new Error(response.message || 'Failed to fetch badges');
    } catch (error: any) {
      logger.error('[Karma] Get badges error:', error.message);
      return { badges: [], stats: {} };
    }
  }

  /**
   * Get user badges
   */
  async getUserBadges(userId?: string): Promise<UserBadge[]> {
    try {
      logger.info('[Karma] Fetching user badges:', userId);
      const endpoint = userId ? `karma/badges/user/${userId}` : 'karma/badges/user';
      const response = await apiClient.get<any>(endpoint);

      if (response.success && response.data) {
        return response.data.badges || response.data || [];
      }

      throw new Error(response.message || 'Failed to fetch user badges');
    } catch (error: any) {
      logger.error('[Karma] Get user badges error:', error.message);
      return [];
    }
  }

  // ── CSR Partners ──────────────────────────────────────────────────────────────

  /**
   * Get all CSR partners
   */
  async getCSRPartners(params?: {
    tier?: CSRPartnerTier;
    status?: string;
    page?: number;
    limit?: number;
  }): Promise<{ partners: CSRPartner[]; pagination: any }> {
    try {
      logger.info('[Karma] Fetching CSR partners:', params);

      const queryParams = new URLSearchParams();
      if (params?.tier) queryParams.append('tier', params.tier);
      if (params?.status) queryParams.append('status', params.status);
      if (params?.page) queryParams.append('page', params.page.toString());
      if (params?.limit) queryParams.append('limit', params.limit.toString());

      const endpoint = `karma/csr/partners${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
      const response = await apiClient.get<any>(endpoint);

      if (response.success && response.data) {
        return {
          partners: response.data.partners || response.data || [],
          pagination: response.data.pagination || {},
        };
      }

      throw new Error(response.message || 'Failed to fetch CSR partners');
    } catch (error: any) {
      logger.error('[Karma] Get CSR partners error:', error.message);
      return { partners: [], pagination: {} };
    }
  }

  /**
   * Add a new CSR partner
   */
  async addCSRPartner(data: CSRPartnerRequest): Promise<CSRPartner> {
    try {
      logger.info('[Karma] Adding CSR partner:', data.companyName);
      const response = await apiClient.post<CSRPartner, CSRPartnerRequest>(
        'karma/csr/partner',
        data
      );

      if (response.success && response.data) {
        logger.info('[Karma] CSR partner added:', response.data._id);
        return response.data;
      }

      throw new Error(response.message || 'Failed to add CSR partner');
    } catch (error: any) {
      logger.error('[Karma] Add CSR partner error:', error.message);
      throw error;
    }
  }

  /**
   * Update CSR partner
   */
  async updateCSRPartner(partnerId: string, data: Partial<CSRPartnerRequest>): Promise<CSRPartner> {
    try {
      logger.info('[Karma] Updating CSR partner:', partnerId);
      const response = await apiClient.put<CSRPartner, Partial<CSRPartnerRequest>>(
        `karma/csr/partner/${partnerId}`,
        data
      );

      if (response.success && response.data) {
        logger.info('[Karma] CSR partner updated:', response.data._id);
        return response.data;
      }

      throw new Error(response.message || 'Failed to update CSR partner');
    } catch (error: any) {
      logger.error('[Karma] Update CSR partner error:', error.message);
      throw error;
    }
  }

  /**
   * Get CSR dashboard stats
   */
  async getCSRDashboard(partnerId?: string): Promise<CSRDashboard> {
    try {
      logger.info('[Karma] Fetching CSR dashboard');
      const endpoint = partnerId
        ? `karma/csr/dashboard?partnerId=${partnerId}`
        : 'karma/csr/dashboard';
      const response = await apiClient.get<CSRDashboard>(endpoint);

      if (response.success && response.data) {
        return response.data;
      }

      throw new Error(response.message || 'Failed to fetch CSR dashboard');
    } catch (error: any) {
      logger.error('[Karma] Get CSR dashboard error:', error.message);
      return {
        totalPartners: 0,
        activePartners: 0,
        totalBudget: 0,
        totalCreditsUsed: 0,
        totalEventsSponsored: 0,
        totalVolunteersEngaged: 0,
        topPartners: [],
        recentActivity: [],
      };
    }
  }

  // ── Communities ────────────────────────────────────────────────────────────────

  /**
   * Get cause communities
   */
  async getCommunities(params?: {
    category?: string;
    page?: number;
    limit?: number;
  }): Promise<{ communities: KarmaCommunity[]; pagination: any }> {
    try {
      logger.info('[Karma] Fetching communities:', params);

      const queryParams = new URLSearchParams();
      if (params?.category) queryParams.append('category', params.category);
      if (params?.page) queryParams.append('page', params.page.toString());
      if (params?.limit) queryParams.append('limit', params.limit.toString());

      const endpoint = `karma/communities${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
      const response = await apiClient.get<any>(endpoint);

      if (response.success && response.data) {
        return {
          communities: response.data.communities || response.data || [],
          pagination: response.data.pagination || {},
        };
      }

      throw new Error(response.message || 'Failed to fetch communities');
    } catch (error: any) {
      logger.error('[Karma] Get communities error:', error.message);
      return { communities: [], pagination: {} };
    }
  }

  // ── Micro-Actions ──────────────────────────────────────────────────────────────

  /**
   * Get micro-actions configuration
   */
  async getMicroActions(): Promise<MicroAction[]> {
    try {
      logger.info('[Karma] Fetching micro-actions');
      const response = await apiClient.get<any>('karma/micro-actions');

      if (response.success && response.data) {
        return response.data.actions || response.data || [];
      }

      throw new Error(response.message || 'Failed to fetch micro-actions');
    } catch (error: any) {
      logger.error('[Karma] Get micro-actions error:', error.message);
      return [];
    }
  }

  // ── Stats ─────────────────────────────────────────────────────────────────────

  /**
   * Get karma statistics overview
   */
  async getStats(): Promise<KarmaStats> {
    try {
      logger.info('[Karma] Fetching stats');
      const response = await apiClient.get<KarmaStats>('karma/stats');

      if (response.success && response.data) {
        return response.data;
      }

      throw new Error(response.message || 'Failed to fetch karma stats');
    } catch (error: any) {
      logger.error('[Karma] Get stats error:', error.message);
      return {
        totalEvents: 0,
        activeEvents: 0,
        totalVolunteers: 0,
        totalKarmaDistributed: 0,
        totalBadgesAwarded: 0,
        pendingBookings: 0,
        totalCommunities: 0,
        topCauses: [],
      };
    }
  }
}

export const karmaAdminService = new KarmaAdminService();
export default karmaAdminService;
