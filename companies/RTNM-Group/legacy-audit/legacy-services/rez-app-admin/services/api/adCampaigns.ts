import { apiClient } from './apiClient';
import { logger } from '../../utils/logger';

export interface AdCampaign {
  _id: string;
  title: string;
  headline: string;
  description: string;
  ctaText: string;
  imageUrl: string;
  placement: 'home_banner' | 'explore_feed' | 'store_listing' | 'search_result';
  targetSegment: string;
  bidType: 'CPC' | 'CPM';
  bidAmount: number;
  dailyBudget: number;
  totalBudget: number;
  totalSpent: number;
  startDate: string;
  endDate?: string;
  status: 'draft' | 'pending_review' | 'active' | 'paused' | 'rejected' | 'completed';
  rejectionReason?: string;
  impressions: number;
  clicks: number;
  ctr: number;
  merchantId: { _id: string; businessName?: string; name?: string };
  createdAt: string;
}

export interface AdNetworkStats {
  total: number;
  byStatus: Record<string, number>;
  totalImpressions: number;
  totalClicks: number;
  totalSpend: number;
}

export interface AdsListResponse {
  ads: AdCampaign[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export interface AdsQuery {
  page?: number;
  limit?: number;
  status?: AdCampaign['status'];
  search?: string;
}

class AdCampaignsService {
  /**
   * Fetch ads with optional filters and pagination
   */
  async fetchAds(params: AdsQuery = {}): Promise<AdsListResponse> {
    try {
      logger.info('[AdCampaigns] Fetching ads with params:', params);

      const query = new URLSearchParams();
      if (params.page) query.append('page', params.page.toString());
      if (params.limit) query.append('limit', params.limit.toString());
      if (params.status) query.append('status', params.status);
      if (params.search) query.append('search', params.search);

      const endpoint = `admin/ads${query.toString() ? `?${query.toString()}` : ''}`;
      const response = await apiClient.get<AdsListResponse>(endpoint);

      if (response.success && response.data) {
        logger.info('[AdCampaigns] Fetched successfully', { count: response.data.ads?.length ?? 0 });
        return response.data;
      }

      throw new Error(response.message || 'Failed to fetch ads');
    } catch (error: any) {
      logger.error('[AdCampaigns] fetchAds error:', error.message);
      throw new Error(error.message || 'Failed to fetch ads');
    }
  }

  /**
   * Fetch ad network stats
   */
  async fetchAdStats(): Promise<AdNetworkStats> {
    try {
      logger.info('[AdCampaigns] Fetching stats...');
      const response = await apiClient.get<AdNetworkStats>('admin/ads/stats');

      if (response.success && response.data) {
        logger.info('[AdCampaigns] Stats fetched successfully');
        return response.data;
      }

      throw new Error(response.message || 'Failed to fetch ad stats');
    } catch (error: any) {
      logger.error('[AdCampaigns] fetchAdStats error:', error.message);
      throw new Error(error.message || 'Failed to fetch ad stats');
    }
  }

  /**
   * Fetch a single ad by ID
   */
  async fetchAdById(id: string): Promise<AdCampaign> {
    try {
      logger.info('[AdCampaigns] Fetching ad:', id);
      const response = await apiClient.get<AdCampaign>(`admin/ads/${id}`);

      if (response.success && response.data) {
        logger.info('[AdCampaigns] Ad fetched:', response.data.title);
        return response.data;
      }

      throw new Error(response.message || 'Ad not found');
    } catch (error: any) {
      logger.error('[AdCampaigns] fetchAdById error:', error.message);
      throw new Error(error.message || 'Failed to fetch ad');
    }
  }

  /**
   * Approve a pending ad
   */
  async approveAd(id: string): Promise<AdCampaign> {
    try {
      logger.info('[AdCampaigns] Approving ad:', id);
      const response = await apiClient.patch<AdCampaign>(`admin/ads/${id}/approve`);

      if (response.success && response.data) {
        logger.info('[AdCampaigns] Ad approved:', id);
        return response.data;
      }

      throw new Error(response.message || 'Failed to approve ad');
    } catch (error: any) {
      logger.error('[AdCampaigns] approveAd error:', error.message);
      throw new Error(error.message || 'Failed to approve ad');
    }
  }

  /**
   * Reject an ad with a reason
   */
  async rejectAd(id: string, rejectionReason: string): Promise<AdCampaign> {
    try {
      logger.info('[AdCampaigns] Rejecting ad:', id);
      const response = await apiClient.patch<AdCampaign>(`admin/ads/${id}/reject`, {
        rejectionReason,
      } as any);

      if (response.success && response.data) {
        logger.info('[AdCampaigns] Ad rejected:', id);
        return response.data;
      }

      throw new Error(response.message || 'Failed to reject ad');
    } catch (error: any) {
      logger.error('[AdCampaigns] rejectAd error:', error.message);
      throw new Error(error.message || 'Failed to reject ad');
    }
  }

  /**
   * Force-pause an active ad
   */
  async pauseAd(id: string): Promise<AdCampaign> {
    try {
      logger.info('[AdCampaigns] Pausing ad:', id);
      const response = await apiClient.patch<AdCampaign>(`admin/ads/${id}/pause`);

      if (response.success && response.data) {
        logger.info('[AdCampaigns] Ad paused:', id);
        return response.data;
      }

      throw new Error(response.message || 'Failed to pause ad');
    } catch (error: any) {
      logger.error('[AdCampaigns] pauseAd error:', error.message);
      throw new Error(error.message || 'Failed to pause ad');
    }
  }
}

export const adCampaignsService = new AdCampaignsService();
export default adCampaignsService;
