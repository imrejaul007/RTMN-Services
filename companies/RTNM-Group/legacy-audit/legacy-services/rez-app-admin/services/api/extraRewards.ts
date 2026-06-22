/**
 * Extra Rewards API Service (Double Cashback Campaigns & Coin Drops)
 *
 * NOTE: This file overlaps with cashStore.ts which also defines endpoints for
 * admin/double-campaigns/* and admin/coin-drops/*. This service is used by
 * extra-rewards.tsx while cashStore.ts is used by cash-store.tsx.
 * Both hit the same backend endpoints but have different type definitions
 * and method signatures tailored to their respective pages.
 * If you modify endpoint paths here, update cashStore.ts as well.
 */
import { apiClient } from './apiClient';

// Types
export interface DoubleCashbackCampaign {
  _id: string;
  title: string;
  subtitle: string;
  description?: string;
  multiplier: number;
  startTime: string;
  endTime: string;
  eligibleStores: string[];
  eligibleStoreNames: string[];
  eligibleCategories: string[];
  terms: string[];
  minOrderValue?: number;
  maxCashback?: number;
  backgroundColor: string;
  bannerImage?: string;
  icon: string;
  isActive: boolean;
  priority: number;
  usageCount: number;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CoinDrop {
  _id: string;
  storeId: string | { _id: string; name?: string; logo?: string };
  storeName: string;
  storeLogo?: string;
  multiplier: number;
  normalCashback: number;
  boostedCashback: number;
  category: string;
  startTime: string;
  endTime: string;
  minOrderValue?: number;
  maxCashback?: number;
  isActive: boolean;
  priority: number;
  usageCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface StoreOption {
  _id: string;
  name: string;
  logo?: string;
  category?: string;
}

export interface DoubleCampaignsListResponse {
  campaigns: DoubleCashbackCampaign[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export interface CoinDropsListResponse {
  coinDrops: CoinDrop[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export interface DoubleCampaignsFilter {
  page?: number;
  limit?: number;
  status?: string;
  running?: string;
}

export interface CoinDropsFilter {
  page?: number;
  limit?: number;
  status?: string;
  category?: string;
  running?: string;
}

export interface CreateDoubleCampaignRequest {
  title: string;
  subtitle: string;
  multiplier: number;
  startTime: string | Date;
  endTime: string | Date;
  description?: string;
  eligibleStores?: string[];
  eligibleStoreNames?: string[];
  eligibleCategories?: string[];
  terms?: string[];
  minOrderValue?: number;
  maxCashback?: number;
  backgroundColor?: string;
  bannerImage?: string;
  icon?: string;
  priority?: number;
}

export interface CreateCoinDropRequest {
  storeId: string;
  multiplier: number;
  normalCashback: number;
  category: string;
  startTime: string | Date;
  endTime: string | Date;
  minOrderValue?: number;
  maxCashback?: number;
  priority?: number;
}

// API Service
export const extraRewardsService = {
  // ==========================================
  // Double Cashback Campaigns
  // ==========================================

  /**
   * Get all double cashback campaigns with optional filters
   */
  async getCampaigns(filters: DoubleCampaignsFilter = {}): Promise<DoubleCampaignsListResponse> {
    const params = new URLSearchParams();
    if (filters.page) params.append('page', String(filters.page));
    if (filters.limit) params.append('limit', String(filters.limit));
    if (filters.status) params.append('status', filters.status);
    if (filters.running) params.append('running', filters.running);

    const res = await apiClient.get<DoubleCampaignsListResponse>(
      `admin/double-campaigns?${params.toString()}`
    );
    if (!res.success) throw new Error(res.message || 'Failed to fetch campaigns');
    if (!res.data) throw new Error('No data returned from campaigns endpoint');
    return res.data;
  },

  /**
   * Get single double cashback campaign by ID
   */
  async getCampaign(id: string): Promise<DoubleCashbackCampaign> {
    const res = await apiClient.get<DoubleCashbackCampaign>(`admin/double-campaigns/${id}`);
    if (!res.success) throw new Error(res.message || 'Failed to fetch campaign');
    if (!res.data) throw new Error('No data returned for campaign');
    return res.data;
  },

  /**
   * Create new double cashback campaign
   */
  async createCampaign(campaignData: CreateDoubleCampaignRequest): Promise<DoubleCashbackCampaign> {
    const res = await apiClient.post<DoubleCashbackCampaign, CreateDoubleCampaignRequest>(
      'admin/double-campaigns',
      campaignData
    );
    if (!res.success) throw new Error(res.message || 'Failed to create campaign');
    if (!res.data) throw new Error('No data returned after creating campaign');
    return res.data;
  },

  /**
   * Update double cashback campaign
   */
  async updateCampaign(
    id: string,
    campaignData: CreateDoubleCampaignRequest
  ): Promise<DoubleCashbackCampaign> {
    const res = await apiClient.put<DoubleCashbackCampaign, CreateDoubleCampaignRequest>(
      `admin/double-campaigns/${id}`,
      campaignData
    );
    if (!res.success) throw new Error(res.message || 'Failed to update campaign');
    if (!res.data) throw new Error('No data returned after updating campaign');
    return res.data;
  },

  /**
   * Toggle double cashback campaign active status
   */
  async toggleCampaign(id: string): Promise<{ isActive: boolean }> {
    const res = await apiClient.patch<{ isActive: boolean }>(`admin/double-campaigns/${id}/toggle`);
    if (!res.success) throw new Error(res.message || 'Failed to toggle campaign');
    if (!res.data) throw new Error('No data returned after toggling campaign');
    return res.data;
  },

  /**
   * Delete double cashback campaign
   */
  async deleteCampaign(id: string): Promise<void> {
    const res = await apiClient.delete(`admin/double-campaigns/${id}`);
    if (!res.success) throw new Error(res.message || 'Failed to delete campaign');
  },

  // ==========================================
  // Coin Drops
  // ==========================================

  /**
   * Get all coin drops with optional filters
   */
  async getCoinDrops(filters: CoinDropsFilter = {}): Promise<CoinDropsListResponse> {
    const params = new URLSearchParams();
    if (filters.page) params.append('page', String(filters.page));
    if (filters.limit) params.append('limit', String(filters.limit));
    if (filters.status) params.append('status', filters.status);
    if (filters.category) params.append('category', filters.category);
    if (filters.running) params.append('running', filters.running);

    const res = await apiClient.get<CoinDropsListResponse>(`admin/coin-drops?${params.toString()}`);
    if (!res.success) throw new Error(res.message || 'Failed to fetch coin drops');
    if (!res.data) throw new Error('No data returned from coin drops endpoint');
    return res.data;
  },

  /**
   * Get list of stores for coin drop dropdown
   */
  async getCoinDropStores(search?: string): Promise<StoreOption[]> {
    const params = new URLSearchParams();
    if (search) params.append('q', search);
    const res = await apiClient.get<StoreOption[]>(`admin/coin-drops/stores?${params.toString()}`);
    if (!res.success) throw new Error(res.message || 'Failed to fetch stores');
    if (!res.data) throw new Error('No data returned from stores endpoint');
    return res.data;
  },

  /**
   * Get single coin drop by ID
   */
  async getCoinDrop(id: string): Promise<CoinDrop> {
    const res = await apiClient.get<CoinDrop>(`admin/coin-drops/${id}`);
    if (!res.success) throw new Error(res.message || 'Failed to fetch coin drop');
    if (!res.data) throw new Error('No data returned for coin drop');
    return res.data;
  },

  /**
   * Create new coin drop
   */
  async createCoinDrop(coinDropData: CreateCoinDropRequest): Promise<CoinDrop> {
    const res = await apiClient.post<CoinDrop, CreateCoinDropRequest>(
      'admin/coin-drops',
      coinDropData
    );
    if (!res.success) throw new Error(res.message || 'Failed to create coin drop');
    if (!res.data) throw new Error('No data returned after creating coin drop');
    return res.data;
  },

  /**
   * Update coin drop
   */
  async updateCoinDrop(id: string, coinDropData: CreateCoinDropRequest): Promise<CoinDrop> {
    const res = await apiClient.put<CoinDrop, CreateCoinDropRequest>(
      `admin/coin-drops/${id}`,
      coinDropData
    );
    if (!res.success) throw new Error(res.message || 'Failed to update coin drop');
    if (!res.data) throw new Error('No data returned after updating coin drop');
    return res.data;
  },

  /**
   * Toggle coin drop active status
   */
  async toggleCoinDrop(id: string): Promise<{ isActive: boolean }> {
    const res = await apiClient.patch<{ isActive: boolean }>(`admin/coin-drops/${id}/toggle`);
    if (!res.success) throw new Error(res.message || 'Failed to toggle coin drop');
    if (!res.data) throw new Error('No data returned after toggling coin drop');
    return res.data;
  },

  /**
   * Delete coin drop
   */
  async deleteCoinDrop(id: string): Promise<void> {
    const res = await apiClient.delete(`admin/coin-drops/${id}`);
    if (!res.success) throw new Error(res.message || 'Failed to delete coin drop');
  },
};

export default extraRewardsService;
