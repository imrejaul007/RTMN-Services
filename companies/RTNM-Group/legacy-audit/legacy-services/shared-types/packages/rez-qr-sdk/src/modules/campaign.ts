/**
 * Campaign QR Module (Ads) - Campaigns, rewards, and attribution
 */

import { QRClient } from './client';
import type {
  Campaign,
  Reward,
  ConsultationRequest,
  Booking,
  SampleRequest,
} from '../types';

export class CampaignModule {
  private client: QRClient;

  constructor(client: QRClient) {
    this.client = client;
  }

  /**
   * Get campaign by slug
   */
  async getCampaign(slug: string): Promise<Campaign> {
    return this.client.get(`/campaigns/${slug}`);
  }

  /**
   * Get campaign by ID
   */
  async getCampaignById(campaignId: string): Promise<Campaign> {
    return this.client.get(`/campaigns/id/${campaignId}`);
  }

  /**
   * Get active campaigns
   */
  async getActiveCampaigns(params?: {
    category?: string;
    location?: string;
    limit?: number;
  }): Promise<Campaign[]> {
    const query = params ? '?' + new URLSearchParams(params as Record<string, string>).toString() : '';
    return this.client.get(`/campaigns/active${query}`);
  }

  /**
   * Get campaign rewards
   */
  async getRewards(campaignId: string): Promise<Campaign['rewards']> {
    return this.client.get(`/campaigns/${campaignId}/rewards`);
  }

  /**
   * Claim a reward
   */
  async claimReward(campaignId: string, rewardType: string): Promise<Reward> {
    return this.client.post(`/campaigns/${campaignId}/rewards/claim`, { rewardType });
  }

  /**
   * Get claimed rewards
   */
  async getClaimedRewards(campaignId?: string): Promise<Reward[]> {
    const url = campaignId
      ? `/campaigns/${campaignId}/rewards/claimed`
      : '/campaigns/rewards/claimed';
    return this.client.get(url);
  }

  /**
   * Use/redeem a reward
   */
  async redeemReward(rewardId: string): Promise<{ success: boolean; code?: string; message?: string }> {
    return this.client.post(`/campaigns/rewards/${rewardId}/redeem`);
  }

  /**
   * Book consultation
   */
  async bookConsultation(data: ConsultationRequest): Promise<Booking> {
    return this.client.post('/campaigns/consultations', data);
  }

  /**
   * Get consultation details
   */
  async getConsultation(bookingId: string): Promise<Booking> {
    return this.client.get(`/campaigns/consultations/${bookingId}`);
  }

  /**
   * Cancel consultation
   */
  async cancelConsultation(bookingId: string): Promise<void> {
    return this.client.delete(`/campaigns/consultations/${bookingId}`);
  }

  /**
   * Request sample
   */
  async requestSample(campaignId: string, sampleId: string, address?: {
    name: string;
    line1: string;
    line2?: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
  }): Promise<SampleRequest> {
    return this.client.post(`/campaigns/${campaignId}/samples`, { sampleId, address });
  }

  /**
   * Get sample request status
   */
  async getSampleStatus(requestId: string): Promise<SampleRequest> {
    return this.client.get(`/campaigns/samples/${requestId}`);
  }

  /**
   * Track campaign conversion
   */
  async trackConversion(campaignId: string, data: {
    type: 'scan' | 'visit' | 'purchase' | 'signup' | 'share';
    value?: number;
    metadata?: Record<string, unknown>;
  }): Promise<void> {
    return this.client.post(`/campaigns/${campaignId}/conversions`, data);
  }

  /**
   * Get campaign analytics
   */
  async getAnalytics(campaignId: string): Promise<CampaignAnalytics> {
    return this.client.get(`/campaigns/${campaignId}/analytics`);
  }

  /**
   * Complete campaign action
   */
  async completeAction(campaignId: string, actionId: string): Promise<{ completed: boolean; reward?: Reward }> {
    return this.client.post(`/campaigns/${campaignId}/actions/${actionId}/complete`);
  }

  /**
   * Share campaign
   */
  async shareCampaign(campaignId: string, platform: 'copy_link' | 'whatsapp' | 'instagram' | 'twitter' | 'facebook'): Promise<{ shareUrl: string }> {
    return this.client.post(`/campaigns/${campaignId}/share`, { platform });
  }

  /**
   * Get campaign leaderboard
   */
  async getLeaderboard(campaignId: string, limit?: number): Promise<LeaderboardEntry[]> {
    const url = limit
      ? `/campaigns/${campaignId}/leaderboard?limit=${limit}`
      : `/campaigns/${campaignId}/leaderboard`;
    return this.client.get(url);
  }

  /**
   * Subscribe to campaign notifications
   */
  async subscribe(campaignId: string, channel: 'push' | 'email' | 'sms'): Promise<void> {
    return this.client.post(`/campaigns/${campaignId}/subscribe`, { channel });
  }

  /**
   * Unsubscribe from campaign
   */
  async unsubscribe(campaignId: string): Promise<void> {
    return this.client.delete(`/campaigns/${campaignId}/subscribe`);
  }
}

export interface CampaignAnalytics {
  totalScans: number;
  uniqueScans: number;
  totalConversions: number;
  conversionRate: number;
  totalRevenue: number;
  rewardsClaimed: number;
  rewardsRedeemed: number;
  engagement: {
    averageTimeOnPage: number;
    bounceRate: number;
    returnVisitors: number;
  };
  demographics: {
    ageGroups: { range: string; count: number }[];
    locations: { city: string; count: number }[];
  };
  dailyStats: { date: string; scans: number; conversions: number; revenue: number }[];
}

export interface LeaderboardEntry {
  rank: number;
  userId: string;
  userName: string;
  userAvatar?: string;
  score: number;
  actionsCompleted: number;
}
