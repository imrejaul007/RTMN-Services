import { apiClient } from './apiClient';
import { logger } from '../../utils/logger';

// Funding source
export interface BonusFundingSource {
  type: 'platform' | 'branded' | 'partner';
  partnerId?: string;
  partnerName?: string;
  partnerLogo?: string;
}

// Eligibility criteria
export interface BonusEligibility {
  paymentMethods?: string[];
  bankCodes?: string[];
  binPrefixes?: string[];
  merchantCategories?: string[];
  storeIds?: string[];
  minSpend?: number;
  firstTransactionOnly?: boolean;
  userSegments?: string[];
  regions?: string[];
}

// Reward config
export interface BonusReward {
  type: 'percentage' | 'flat' | 'multiplier';
  value: number;
  capPerUser: number;
  capPerTransaction: number;
  totalBudget: number;
  consumedBudget: number;
  coinType: 'rez' | 'branded';
}

// Claim limits
export interface BonusLimits {
  maxClaimsPerUser: number;
  maxClaimsPerUserPerDay: number;
  totalGlobalClaims: number;
  currentGlobalClaims: number;
}

// Display settings
export interface BonusDisplay {
  icon: string;
  bannerImage?: string;
  partnerLogo?: string;
  backgroundColor?: string;
  badgeText?: string;
  featured: boolean;
  priority: number;
}

// Deep link config
export interface BonusDeepLink {
  screen: string;
  params?: Record<string, any>;
}

// Campaign type union
export type BonusCampaignType =
  | 'cashback_boost'
  | 'bank_offer'
  | 'bill_upload_bonus'
  | 'category_multiplier'
  | 'first_transaction_bonus'
  | 'festival_offer';

// Campaign status union
export type BonusCampaignStatus =
  | 'draft'
  | 'scheduled'
  | 'active'
  | 'paused'
  | 'exhausted'
  | 'expired'
  | 'cancelled';

// Main campaign interface
export interface BonusCampaignAdmin {
  _id: string;
  slug: string;
  title: string;
  subtitle: string;
  description?: string;
  campaignType: BonusCampaignType;
  fundingSource: BonusFundingSource;
  eligibility: BonusEligibility;
  reward: BonusReward;
  limits: BonusLimits;
  startTime: string;
  endTime: string;
  display: BonusDisplay;
  deepLink: BonusDeepLink;
  status: BonusCampaignStatus;
  terms: string[];
  createdAt: string;
  updatedAt: string;
}

// List response
export interface BonusCampaignsListResponse {
  campaigns: BonusCampaignAdmin[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

// Query parameters
export interface BonusCampaignsQuery {
  page?: number;
  limit?: number;
  status?: BonusCampaignStatus;
  campaignType?: BonusCampaignType;
  region?: string;
  search?: string;
}

// Analytics response (matches bonusCampaignService.getCampaignAnalytics)
export interface BonusCampaignAnalytics {
  totalClaims: number;
  creditedClaims: number;
  pendingClaims: number;
  rejectedClaims: number;
  uniqueUsers: number;
  totalCoinsDistributed: number;
  budgetUsedPercent: number;
  avgRewardPerUser: number;
}

// Claims list response
export interface BonusCampaignClaimsResponse {
  claims: BonusCampaignClaim[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

// Individual claim
export interface BonusCampaignClaim {
  _id: string;
  userId: string | { _id: string; name?: string; email?: string; phoneNumber?: string };
  campaignId: string;
  transactionId?: string;
  transactionRef?: { type: string; refId: string };
  rewardAmount: number;
  rewardType: string;
  claimedAt?: string;
  createdAt?: string;
  status: 'pending' | 'verified' | 'credited' | 'rejected' | 'failed' | 'reversed' | 'expired';
}

// Claims query
export interface BonusCampaignClaimsQuery {
  page?: number;
  limit?: number;
  status?: string;
  search?: string;
}

// Dashboard stats
// Note: Backend getDashboardStats() returns activeCampaigns, totalBudgetAllocated,
// totalBudgetConsumed, totalClaimsLast30d, totalDistributedLast30d, campaignsByStatus.
// Optional fields are declared for potential future backend expansion.
export interface BonusZoneDashboard {
  activeCampaigns: number;
  totalBudgetAllocated: number;
  totalBudgetConsumed: number;
  totalClaimsLast30d: number;
  totalDistributedLast30d: number;
  campaignsByStatus: Record<string, number>;
  // Optional — not currently returned by backend
  totalCampaigns?: number;
  totalClaims?: number;
  uniqueClaimants?: number;
  campaignsByType?: Record<string, number>;
  recentCampaigns?: BonusCampaignAdmin[];
  topPerformingCampaigns?: {
    campaignId: string;
    title: string;
    claims: number;
    budgetUsed: number;
  }[];
}

// Fraud alert
export interface BonusFraudAlert {
  _id: string;
  campaignId: string;
  campaignTitle: string;
  userId: string;
  userName?: string;
  alertType: string;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  detectedAt: string;
  resolved: boolean;
}

class BonusZoneService {
  /**
   * Get bonus campaigns with pagination and filters
   */
  async getCampaigns(query: BonusCampaignsQuery = {}): Promise<BonusCampaignsListResponse> {
    try {
      logger.info('[BonusZone] Fetching campaigns with query:', { query });

      const params = new URLSearchParams();
      if (query.page) params.append('page', query.page.toString());
      if (query.limit) params.append('limit', query.limit.toString());
      if (query.status) params.append('status', query.status);
      if (query.campaignType) params.append('campaignType', query.campaignType);
      if (query.region) params.append('region', query.region);
      if (query.search) params.append('search', query.search);

      const endpoint = `admin/bonus-zone/campaigns${params.toString() ? `?${params.toString()}` : ''}`;
      const response = await apiClient.get<BonusCampaignsListResponse>(endpoint);

      if (response.success && response.data) {
        if (__DEV__)
        logger.info('[BonusZone] Fetched successfully', {
          count: response.data.campaigns?.length || 0,
        });
        return response.data;
      }

      throw new Error(response.message || 'Failed to fetch bonus campaigns');
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      logger.error('[BonusZone] Get campaigns error:', message);
      throw new Error(message || 'Failed to fetch bonus campaigns');
    }
  }

  /**
   * Create a new bonus campaign
   */
  async createCampaign(data: Partial<BonusCampaignAdmin>): Promise<BonusCampaignAdmin> {
    try {
      logger.info('[BonusZone] Creating campaign:', { title: data.title });
      const response = await apiClient.post<BonusCampaignAdmin>('admin/bonus-zone/campaigns', data);

      if (response.success && response.data) {
        logger.info('[BonusZone] Campaign created:', { slug: response.data.slug });
        return response.data;
      }

      throw new Error(response.message || 'Failed to create bonus campaign');
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      logger.error('[BonusZone] Create campaign error:', message);
      throw new Error(message || 'Failed to create bonus campaign');
    }
  }

  /**
   * Update an existing bonus campaign
   */
  async updateCampaign(id: string, data: Partial<BonusCampaignAdmin>): Promise<BonusCampaignAdmin> {
    try {
      logger.info('[BonusZone] Updating campaign:', { id });
      const response = await apiClient.put<BonusCampaignAdmin>(
        `admin/bonus-zone/campaigns/${id}`,
        data
      );

      if (response.success && response.data) {
        logger.info('[BonusZone] Campaign updated:', { slug: response.data.slug });
        return response.data;
      }

      throw new Error(response.message || 'Failed to update bonus campaign');
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      logger.error('[BonusZone] Update campaign error:', message);
      throw new Error(message || 'Failed to update bonus campaign');
    }
  }

  /**
   * Delete a bonus campaign
   */
  async deleteCampaign(id: string): Promise<void> {
    try {
      logger.info('[BonusZone] Deleting campaign:', { id });
      const response = await apiClient.delete(`admin/bonus-zone/campaigns/${id}`);

      if (response.success) {
        logger.info('[BonusZone] Campaign deleted');
        return;
      }

      throw new Error(response.message || 'Failed to delete bonus campaign');
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      logger.error('[BonusZone] Delete campaign error:', message);
      throw new Error(message || 'Failed to delete bonus campaign');
    }
  }

  /**
   * Update campaign status (draft, active, paused, cancelled, etc.)
   */
  async updateStatus(id: string, status: BonusCampaignStatus): Promise<BonusCampaignAdmin> {
    try {
      logger.info('[BonusZone] Updating status for campaign:', { id, status });
      const response = await apiClient.patch<BonusCampaignAdmin>(
        `admin/bonus-zone/campaigns/${id}/status`,
        { status }
      );

      if (response.success && response.data) {
        logger.info('[BonusZone] Status updated to:', { status: response.data.status });
        return response.data;
      }

      throw new Error(response.message || 'Failed to update campaign status');
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      logger.error('[BonusZone] Update status error:', message);
      throw new Error(message || 'Failed to update campaign status');
    }
  }

  /**
   * Get analytics for a specific bonus campaign
   */
  async getCampaignAnalytics(id: string): Promise<BonusCampaignAnalytics> {
    try {
      logger.info('[BonusZone] Fetching analytics for campaign:', { id });
      const response = await apiClient.get<BonusCampaignAnalytics>(
        `admin/bonus-zone/campaigns/${id}/analytics`
      );

      if (response.success && response.data) {
        if (__DEV__)
          logger.info('[BonusZone] Analytics fetched, totalClaims:', { totalClaims: response.data.totalClaims });
        return response.data;
      }

      throw new Error(response.message || 'Failed to fetch campaign analytics');
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      logger.error('[BonusZone] Get analytics error:', message);
      throw new Error(message || 'Failed to fetch campaign analytics');
    }
  }

  /**
   * Get claims for a specific bonus campaign
   */
  async getCampaignClaims(
    id: string,
    query: BonusCampaignClaimsQuery = {}
  ): Promise<BonusCampaignClaimsResponse> {
    try {
      logger.info('[BonusZone] Fetching claims for campaign:', { id, query });

      const params = new URLSearchParams();
      if (query.page) params.append('page', query.page.toString());
      if (query.limit) params.append('limit', query.limit.toString());
      if (query.status) params.append('status', query.status);
      if (query.search) params.append('search', query.search);

      const endpoint = `admin/bonus-zone/campaigns/${id}/claims${params.toString() ? `?${params.toString()}` : ''}`;
      const response = await apiClient.get<BonusCampaignClaimsResponse>(endpoint);

      if (response.success && response.data) {
        if (__DEV__)
          logger.info('[BonusZone] Claims fetched:', { count: response.data.claims?.length || 0 });
        return response.data;
      }

      throw new Error(response.message || 'Failed to fetch campaign claims');
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      logger.error('[BonusZone] Get claims error:', message);
      throw new Error(message || 'Failed to fetch campaign claims');
    }
  }

  /**
   * Add funds to a bonus campaign's budget
   */
  async fundCampaign(id: string, amount: number): Promise<BonusCampaignAdmin> {
    try {
      logger.info('[BonusZone] Funding campaign:', { id, amount });
      const response = await apiClient.post<BonusCampaignAdmin>(
        `admin/bonus-zone/campaigns/${id}/fund`,
        { amount }
      );

      if (response.success && response.data) {
        if (__DEV__)
          logger.info('[BonusZone] Campaign funded', { newBudget: response.data.reward?.totalBudget });
        return response.data;
      }

      throw new Error(response.message || 'Failed to fund bonus campaign');
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      logger.error('[BonusZone] Fund campaign error:', message);
      throw new Error(message || 'Failed to fund bonus campaign');
    }
  }

  /**
   * Duplicate an existing bonus campaign
   */
  async duplicateCampaign(id: string, newSlug?: string): Promise<BonusCampaignAdmin> {
    try {
      logger.info('[BonusZone] Duplicating campaign:', { id });
      const body: { newSlug?: string } = {};
      if (newSlug) body.newSlug = newSlug;

      const response = await apiClient.post<BonusCampaignAdmin>(
        `admin/bonus-zone/campaigns/${id}/duplicate`,
        body
      );

      if (response.success && response.data) {
        logger.info('[BonusZone] Campaign duplicated:', { slug: response.data.slug });
        return response.data;
      }

      throw new Error(response.message || 'Failed to duplicate bonus campaign');
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      logger.error('[BonusZone] Duplicate campaign error:', message);
      throw new Error(message || 'Failed to duplicate bonus campaign');
    }
  }

  /**
   * Get bonus zone dashboard overview stats
   */
  async getDashboard(): Promise<BonusZoneDashboard> {
    try {
      logger.info('[BonusZone] Fetching dashboard...');
      const response = await apiClient.get<BonusZoneDashboard>('admin/bonus-zone/dashboard');

      if (response.success && response.data) {
        if (__DEV__)
          logger.info('[BonusZone] Dashboard fetched', {
            activeCampaigns: response.data.activeCampaigns,
          });
        return response.data;
      }

      throw new Error(response.message || 'Failed to fetch bonus zone dashboard');
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      logger.error('[BonusZone] Get dashboard error:', message);
      throw new Error(message || 'Failed to fetch bonus zone dashboard');
    }
  }

  /**
   * Reject a bonus claim (and reverse coins if already credited)
   */
  async rejectClaim(claimId: string, reason: string): Promise<BonusCampaignClaim> {
    try {
      logger.info('[BonusZone] Rejecting claim:', { claimId, reason });
      const response = await apiClient.patch<{ claim: BonusCampaignClaim }>(
        `admin/bonus-zone/claims/${claimId}/reject`,
        { reason }
      );

      if (response.success && response.data) {
        logger.info('[BonusZone] Claim rejected:', { claimId });
        return response.data.claim;
      }

      throw new Error(response.message || 'Failed to reject claim');
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      logger.error('[BonusZone] Reject claim error:', message);
      throw new Error(message || 'Failed to reject claim');
    }
  }

  /**
   * Get fraud alerts for bonus campaigns
   */
  async getFraudAlerts(limit?: number): Promise<BonusFraudAlert[]> {
    try {
      logger.info('[BonusZone] Fetching fraud alerts...');

      const params = new URLSearchParams();
      if (limit) params.append('limit', limit.toString());

      const endpoint = `admin/bonus-zone/fraud-alerts${params.toString() ? `?${params.toString()}` : ''}`;
      const response = await apiClient.get<any>(endpoint);

      if (response.success && response.data) {
        // Extract the arrays from the response object and flatten into a displayable format
        const data = response.data;
        const alerts: BonusFraudAlert[] = [];
        if (data?.highVelocityUsers) {
          data.highVelocityUsers.forEach((u: any) =>
            alerts.push({
              _id: u._id?.toString() || '',
              campaignId: '',
              campaignTitle: `${u.claimCount} claims across ${u.campaigns?.length || 0} campaigns`,
              userId: u._id?.toString() || '',
              userName: '',
              alertType: 'high_velocity',
              description: `User made ${u.claimCount} claims, earned ${u.totalReward} NC`,
              severity: u.claimCount > 20 ? 'critical' : u.claimCount > 10 ? 'high' : 'medium',
              detectedAt: new Date().toISOString(),
              resolved: false,
            })
          );
        }
        if (data?.sameIpClaims) {
          data.sameIpClaims.forEach((ip: any) =>
            alerts.push({
              _id: ip._id || '',
              campaignId: '',
              campaignTitle: `${ip.users?.length || 0} users from same IP`,
              userId: '',
              userName: '',
              alertType: 'same_ip',
              description: `IP ${ip._id}: ${ip.claimCount} claims from ${ip.users?.length || 0} different users`,
              severity: (ip.users?.length || 0) > 5 ? 'high' : 'medium',
              detectedAt: new Date().toISOString(),
              resolved: false,
            })
          );
        }
        logger.info('[BonusZone] Fraud alerts fetched:', { count: alerts.length });
        return alerts;
      }

      return [];
    } catch (error: unknown) {
      logger.error('[BonusZone] Get fraud alerts error:', error instanceof Error ? error.message : String(error));
      return [];
    }
  }
}

export const bonusZoneService = new BonusZoneService();
export default bonusZoneService;
