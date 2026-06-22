/**
 * CorpPerks Rewards API Service
 *
 * ReZ Coins integration for corporate rewards:
 * - Benefit usage rewards
 * - Milestone rewards
 * - Referral rewards
 * - Campaign rewards
 */

import { apiClient } from './apiClient';

// Types
export interface RewardTransaction {
  _id: string;
  transactionId: string;
  type: 'earn' | 'redeem' | 'expire' | 'adjust';
  amount: number;
  source: 'benefit_usage' | 'milestone' | 'referral' | 'campaign' | 'manual';
  description: string;
  status: 'pending' | 'completed' | 'failed';
  employeeId: string;
  employeeName: string;
  metadata?: Record<string, any>;
  createdAt: string;
}

export interface RewardTier {
  tierId: string;
  name: string;
  minCoins: number;
  maxCoins: number;
  benefits: string[];
  icon: string;
  color: string;
}

export interface RewardCatalog {
  _id: string;
  itemId: string;
  name: string;
  description: string;
  category: 'voucher' | 'gift' | 'experience' | 'donation' | 'recharge';
  image?: string;
  coinCost: number;
  stock: number;
  isActive: boolean;
  expiresAt?: string;
}

export interface RewardSummary {
  totalEarned: number;
  totalRedeemed: number;
  balance: number;
  lifetimeEarned: number;
  currentTier: RewardTier;
  nextTier?: RewardTier;
  progressToNextTier: number;
}

// Helper
function getCompanyId(): string {
  return 'demo-company';
}

// Rewards API Service
export const corpRewardsApi = {
  // ========== Summary ==========

  /**
   * Get employee's reward summary
   */
  async getRewardSummary(employeeId?: string): Promise<RewardSummary> {
    const response = await apiClient.get<{ data: RewardSummary }>(
      `/api/corp/rewards/summary${employeeId ? `/${employeeId}` : '/me'}`,
      { headers: { 'x-company-id': getCompanyId() } }
    );
    return (
      response.data?.data || {
        totalEarned: 0,
        totalRedeemed: 0,
        balance: 0,
        lifetimeEarned: 0,
        currentTier: {
          tierId: 'bronze',
          name: 'Bronze',
          minCoins: 0,
          maxCoins: 1000,
          benefits: ['Basic rewards'],
          icon: '🥉',
          color: '#CD7F32',
        },
        progressToNextTier: 0,
      }
    );
  },

  // ========== Transactions ==========

  /**
   * Get reward transactions
   */
  async getTransactions(params?: {
    employeeId?: string;
    type?: RewardTransaction['type'];
    startDate?: string;
    endDate?: string;
    page?: number;
    limit?: number;
  }): Promise<{
    data: RewardTransaction[];
    pagination: { total: number; page: number; limit: number };
  }> {
    const queryParams = new URLSearchParams();
    if (params?.type) queryParams.set('type', params.type);
    if (params?.startDate) queryParams.set('startDate', params.startDate);
    if (params?.endDate) queryParams.set('endDate', params.endDate);
    if (params?.page) queryParams.set('page', String(params.page));
    if (params?.limit) queryParams.set('limit', String(params.limit || 50));

    const response = await apiClient.get<{
      data: RewardTransaction[];
      pagination: { total: number; page: number; limit: number };
    }>(
      `/api/corp/rewards/transactions${params?.employeeId ? `/${params.employeeId}` : '/me'}?${queryParams}`,
      { headers: { 'x-company-id': getCompanyId() } }
    );

    return {
      data: response.data?.data || [],
      pagination: response.data?.pagination || { total: 0, page: 1, limit: 50 },
    };
  },

  /**
   * Award coins to employee
   */
  async awardCoins(data: {
    employeeId: string;
    amount: number;
    source: RewardTransaction['source'];
    description: string;
  }): Promise<RewardTransaction> {
    const response = await apiClient.post<{ data: RewardTransaction }>(
      '/api/corp/rewards/award',
      data,
      { headers: { 'x-company-id': getCompanyId() } }
    );
    if (!response.success) {
      throw new Error(response.message || 'Failed to award coins');
    }
    return response.data!.data;
  },

  // ========== Tiers ==========

  /**
   * Get all reward tiers
   */
  async getTiers(): Promise<RewardTier[]> {
    const response = await apiClient.get<{ data: RewardTier[] }>('/api/corp/rewards/tiers', {
      headers: { 'x-company-id': getCompanyId() },
    });
    return response.data?.data || [];
  },

  /**
   * Get employee's tier info
   */
  async getMyTier(): Promise<{ current: RewardTier; next?: RewardTier; progress: number }> {
    const response = await apiClient.get<{
      data: { current: RewardTier; next?: RewardTier; progress: number };
    }>('/api/corp/rewards/tiers/me', { headers: { 'x-company-id': getCompanyId() } });
    return (
      response.data?.data || {
        current: {
          tierId: 'bronze',
          name: 'Bronze',
          minCoins: 0,
          maxCoins: 1000,
          benefits: ['Basic rewards'],
          icon: '🥉',
          color: '#CD7F32',
        },
        progress: 0,
      }
    );
  },

  // ========== Catalog ==========

  /**
   * Get reward catalog
   */
  async getCatalog(params?: {
    category?: RewardCatalog['category'];
    minCoins?: number;
    maxCoins?: number;
    page?: number;
    limit?: number;
  }): Promise<{
    data: RewardCatalog[];
    pagination: { total: number; page: number; limit: number };
  }> {
    const queryParams = new URLSearchParams();
    if (params?.category) queryParams.set('category', params.category);
    if (params?.minCoins) queryParams.set('minCoins', String(params.minCoins));
    if (params?.maxCoins) queryParams.set('maxCoins', String(params.maxCoins));
    if (params?.page) queryParams.set('page', String(params.page));
    if (params?.limit) queryParams.set('limit', String(params.limit || 50));

    const response = await apiClient.get<{
      data: RewardCatalog[];
      pagination: { total: number; page: number; limit: number };
    }>(`/api/corp/rewards/catalog?${queryParams}`, {
      headers: { 'x-company-id': getCompanyId() },
    });

    return {
      data: response.data?.data || [],
      pagination: response.data?.pagination || { total: 0, page: 1, limit: 50 },
    };
  },

  /**
   * Redeem reward
   */
  async redeemReward(data: { itemId: string; quantity?: number }): Promise<{
    redemptionId: string;
    item: RewardCatalog;
    coinsDeducted: number;
    status: string;
  }> {
    const response = await apiClient.post<{
      data: {
        redemptionId: string;
        item: RewardCatalog;
        coinsDeducted: number;
        status: string;
      };
    }>('/api/corp/rewards/redeem', data, { headers: { 'x-company-id': getCompanyId() } });
    if (!response.success) {
      throw new Error(response.message || 'Failed to redeem reward');
    }
    return response.data!.data;
  },

  // ========== Company Admin ==========

  /**
   * Get company reward stats
   */
  async getCompanyStats(): Promise<{
    totalCoinsAwarded: number;
    totalCoinsRedeemed: number;
    activeEmployees: number;
    topEarners: Array<{ employeeId: string; name: string; coins: number }>;
    topRedemptions: Array<{ itemName: string; count: number }>;
  }> {
    const response = await apiClient.get<{
      data: {
        totalCoinsAwarded: number;
        totalCoinsRedeemed: number;
        activeEmployees: number;
        topEarners: Array<{ employeeId: string; name: string; coins: number }>;
        topRedemptions: Array<{ itemName: string; count: number }>;
      };
    }>('/api/corp/rewards/stats', { headers: { 'x-company-id': getCompanyId() } });
    return (
      response.data?.data || {
        totalCoinsAwarded: 0,
        totalCoinsRedeemed: 0,
        activeEmployees: 0,
        topEarners: [],
        topRedemptions: [],
      }
    );
  },

  /**
   * Configure reward rules
   */
  async configureRules(data: {
    benefitUsageCoins: number;
    bookingCoinsPerThousand: number;
    milestoneRewards: Array<{ trigger: string; coins: number }>;
  }): Promise<void> {
    const response = await apiClient.put('/api/corp/rewards/rules', data, {
      headers: { 'x-company-id': getCompanyId() },
    });
    if (!response.success) {
      throw new Error(response.message || 'Failed to configure rules');
    }
  },

  /**
   * Bulk award coins
   */
  async bulkAwardCoins(data: {
    employeeIds: string[];
    amount: number;
    source: RewardTransaction['source'];
    description: string;
  }): Promise<{
    successful: number;
    failed: number;
    errors: Array<{ employeeId: string; error: string }>;
  }> {
    const response = await apiClient.post<{
      data: {
        successful: number;
        failed: number;
        errors: Array<{ employeeId: string; error: string }>;
      };
    }>('/api/corp/rewards/bulk-award', data, { headers: { 'x-company-id': getCompanyId() } });
    return response.data?.data || { successful: 0, failed: 0, errors: [] };
  },
};

export default corpRewardsApi;
