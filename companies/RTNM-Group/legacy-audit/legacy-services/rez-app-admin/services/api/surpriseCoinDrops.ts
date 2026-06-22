import { apiClient } from './apiClient';

// Types
export interface SurpriseCoinDrop {
  _id: string;
  userId: string | { _id: string; fullName?: string; phoneNumber?: string };
  coins: number;
  reason: 'random' | 'milestone' | 'promo' | 'special_event' | 'welcome' | 'comeback';
  message: string;
  status: 'available' | 'claimed' | 'expired';
  expiresAt: string;
  claimedAt?: string;
  metadata?: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

export interface SurpriseCoinDropsListResponse {
  drops: SurpriseCoinDrop[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface SurpriseCoinDropsFilter {
  page?: number;
  limit?: number;
  status?: string;
  reason?: string;
  userId?: string;
  search?: string;
  dateFrom?: string;
  dateTo?: string;
}

export interface CreateSurpriseCoinDropRequest {
  userId: string;
  coins: number;
  reason?: string;
  message?: string;
  expiryHours?: number;
  metadata?: Record<string, any>;
}

export interface BulkCreateRequest {
  userIds: string[];
  coins: number;
  reason?: string;
  message?: string;
  expiryHours?: number;
  metadata?: Record<string, any>;
}

export interface AnalyticsResponse {
  period: string;
  summary: {
    totalDrops: number;
    totalCoins: number;
    avgCoins: number;
    uniqueUsers: number;
    claimRate: number;
    unclaimed: number;
  };
  statusBreakdown: Array<{ _id: string; count: number; totalCoins: number }>;
  reasonBreakdown: Array<{ _id: string; count: number; totalCoins: number }>;
  dailyVolume: Array<{ _id: string; count: number; totalCoins: number }>;
}

export const surpriseCoinDropsService = {
  /**
   * Get all surprise coin drops with optional filters
   */
  async getDrops(filters: SurpriseCoinDropsFilter = {}): Promise<SurpriseCoinDropsListResponse> {
    const params = new URLSearchParams();
    if (filters.page) params.append('page', String(filters.page));
    if (filters.limit) params.append('limit', String(filters.limit));
    if (filters.status) params.append('status', filters.status);
    if (filters.reason) params.append('reason', filters.reason);
    if (filters.userId) params.append('userId', filters.userId);
    if (filters.search) params.append('search', filters.search);
    if (filters.dateFrom) params.append('dateFrom', filters.dateFrom);
    if (filters.dateTo) params.append('dateTo', filters.dateTo);

    const res = await apiClient.get<SurpriseCoinDropsListResponse>(
      `admin/surprise-coin-drops?${params.toString()}`
    );
    if (!res.success) throw new Error(res.message || 'Failed to fetch surprise coin drops');
    return res.data!;
  },

  /**
   * Get analytics for surprise coin drops
   */
  async getAnalytics(days?: number): Promise<AnalyticsResponse> {
    const params = days ? `?days=${days}` : '';
    const res = await apiClient.get<AnalyticsResponse>(
      `admin/surprise-coin-drops/analytics${params}`
    );
    if (!res.success) throw new Error(res.message || 'Failed to fetch analytics');
    return res.data!;
  },

  /**
   * Get single surprise coin drop by ID
   */
  async getDrop(id: string): Promise<SurpriseCoinDrop> {
    const res = await apiClient.get<SurpriseCoinDrop>(`admin/surprise-coin-drops/${id}`);
    if (!res.success) throw new Error(res.message || 'Failed to fetch surprise coin drop');
    return res.data!;
  },

  /**
   * Create a surprise coin drop for one user
   */
  async createDrop(dropData: CreateSurpriseCoinDropRequest): Promise<SurpriseCoinDrop> {
    const res = await apiClient.post<SurpriseCoinDrop, CreateSurpriseCoinDropRequest>(
      'admin/surprise-coin-drops',
      dropData
    );
    if (!res.success) throw new Error(res.message || 'Failed to create surprise coin drop');
    return res.data!;
  },

  /**
   * Bulk create surprise coin drops for multiple users
   */
  async bulkCreate(
    bulkData: BulkCreateRequest
  ): Promise<{ created: number; skipped: number; invalidIds: number }> {
    const res = await apiClient.post<{ created: number; skipped: number; invalidIds: number }, BulkCreateRequest>(
      'admin/surprise-coin-drops/bulk',
      bulkData
    );
    if (!res.success) throw new Error(res.message || 'Failed to bulk create surprise coin drops');
    return res.data!;
  },

  /**
   * Update a surprise coin drop
   */
  async updateDrop(
    id: string,
    dropData: Partial<CreateSurpriseCoinDropRequest>
  ): Promise<SurpriseCoinDrop> {
    const res = await apiClient.put<SurpriseCoinDrop, Partial<CreateSurpriseCoinDropRequest>>(
      `admin/surprise-coin-drops/${id}`,
      dropData
    );
    if (!res.success) throw new Error(res.message || 'Failed to update surprise coin drop');
    return res.data!;
  },

  /**
   * Delete a surprise coin drop (only unclaimed)
   */
  async deleteDrop(id: string): Promise<void> {
    const res = await apiClient.delete(`admin/surprise-coin-drops/${id}`);
    if (!res.success) throw new Error(res.message || 'Failed to delete surprise coin drop');
  },

  /**
   * Manually expire all old unclaimed drops
   */
  async expireOldDrops(): Promise<{ expiredCount: number }> {
    const res = await apiClient.post<{ expiredCount: number }>(
      'admin/surprise-coin-drops/expire-old'
    );
    if (!res.success) throw new Error(res.message || 'Failed to expire old drops');
    return res.data!;
  },
};

export default surpriseCoinDropsService;
