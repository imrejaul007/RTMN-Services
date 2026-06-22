/**
 * CorpPerks Karma/CSR API Service
 *
 * Corporate social impact, volunteering, and karma tracking endpoints
 */

import { apiClient } from './apiClient';

// Types
export interface KarmaCampaign {
  _id: string;
  campaignId: string;
  name: string;
  description: string;
  category: 'environment' | 'education' | 'health' | 'community' | 'disaster_relief' | 'custom';
  status: 'draft' | 'active' | 'completed' | 'cancelled';
  company: {
    companyId: string;
    name: string;
  };
  impactGoal: {
    metric: string;
    target: number;
    current: number;
  };
  rewards: {
    karmaPointsPerAction: number;
    bonusPointsOnCompletion: number;
    badgeUnlocked?: string;
  };
  actions: KarmaAction[];
  timeline: {
    startDate: string;
    endDate: string;
    registrationDeadline?: string;
  };
  participation: {
    totalParticipants: number;
    completedParticipants: number;
    totalActions: number;
  };
  media?: {
    coverImage?: string;
    bannerImage?: string;
  };
  createdBy: {
    userId: string;
    name: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface KarmaAction {
  _id: string;
  actionId: string;
  name: string;
  description: string;
  type: ' volunteering' | 'donation' | 'pledge' | 'challenge' | 'education';
  karmaPoints: number;
  maxPerParticipant?: number;
  evidenceRequired: boolean;
  evidenceTypes: ('photo' | 'certificate' | 'location' | 'selfie')[];
  instructions?: string;
}

export interface KarmaActivity {
  _id: string;
  activityId: string;
  employee: {
    employeeId: string;
    userId: string;
    name: string;
    department: string;
    avatar?: string;
  };
  campaign: {
    campaignId: string;
    name: string;
    category: string;
  };
  action: {
    actionId: string;
    name: string;
  };
  karmaEarned: number;
  status: 'pending' | 'approved' | 'rejected';
  evidence?: {
    type: string;
    url: string;
    submittedAt: string;
  };
  notes?: string;
  verifiedBy?: {
    userId: string;
    name: string;
    verifiedAt: string;
  };
  createdAt: string;
}

export interface KarmaBadge {
  _id: string;
  badgeId: string;
  name: string;
  description: string;
  icon: string;
  category: 'bronze' | 'silver' | 'gold' | 'platinum';
  criteria: {
    type: 'campaigns_completed' | 'karma_points' | 'streak' | 'custom';
    threshold: number;
  };
  rarity: number; // 1-100
  totalEarned: number;
  isActive: boolean;
}

export interface KarmaLeaderboard {
  rank: number;
  employee: {
    employeeId: string;
    name: string;
    department: string;
    avatar?: string;
  };
  karmaPoints: number;
  campaignsCompleted: number;
  badges: string[];
}

export interface KarmaStats {
  totalKarma: number;
  rank: number;
  totalParticipants: number;
  campaignsCompleted: number;
  currentStreak: number;
  longestStreak: number;
  totalImpactHours: number;
  co2Offset: number;
  treesPlanted: number;
  mealsDonated: number;
}

export interface CreateCampaignRequest {
  name: string;
  description: string;
  category: KarmaCampaign['category'];
  impactGoal: {
    metric: string;
    target: number;
  };
  rewards: {
    karmaPointsPerAction: number;
    bonusPointsOnCompletion?: number;
    badgeUnlocked?: string;
  };
  actions: Omit<KarmaAction, '_id' | 'actionId'>[];
  timeline: {
    startDate: string;
    endDate: string;
    registrationDeadline?: string;
  };
}

export interface SubmitActivityRequest {
  campaignId: string;
  actionId: string;
  evidence?: {
    type: string;
    url: string;
  };
  notes?: string;
}

// Helper
function getCompanyId(): string {
  return 'demo-company';
}

// Karma API Service
export const corpKarmaApi = {
  // ========== Campaigns ==========

  /**
   * Get all campaigns
   */
  async getCampaigns(params?: {
    status?: KarmaCampaign['status'];
    category?: KarmaCampaign['category'];
    page?: number;
    limit?: number;
  }): Promise<{
    data: KarmaCampaign[];
    pagination: { total: number; page: number; limit: number };
  }> {
    const queryParams = new URLSearchParams();
    if (params?.status) queryParams.set('status', params.status);
    if (params?.category) queryParams.set('category', params.category);
    if (params?.page) queryParams.set('page', String(params.page));
    if (params?.limit) queryParams.set('limit', String(params.limit || 20));

    const response = await apiClient.get<{
      data: KarmaCampaign[];
      pagination: { total: number; page: number; limit: number };
    }>(`/api/corp/karma/campaigns?${queryParams}`, {
      headers: { 'x-company-id': getCompanyId() },
    });

    return {
      data: response.data?.data || [],
      pagination: response.data?.pagination || { total: 0, page: 1, limit: 20 },
    };
  },

  /**
   * Get a single campaign
   */
  async getCampaign(id: string): Promise<KarmaCampaign | null> {
    const response = await apiClient.get<{ data: KarmaCampaign }>(
      `/api/corp/karma/campaigns/${id}`,
      { headers: { 'x-company-id': getCompanyId() } }
    );
    return response.data?.data || null;
  },

  /**
   * Create a new campaign
   */
  async createCampaign(data: CreateCampaignRequest): Promise<KarmaCampaign> {
    const response = await apiClient.post<{ data: KarmaCampaign }>(
      '/api/corp/karma/campaigns',
      data as unknown as Record<string, unknown>,
      { headers: { 'x-company-id': getCompanyId() } }
    );
    if (!response.success) {
      throw new Error(response.message || 'Failed to create campaign');
    }
    return response.data!.data;
  },

  /**
   * Update a campaign
   */
  async updateCampaign(id: string, data: Partial<CreateCampaignRequest>): Promise<KarmaCampaign> {
    const response = await apiClient.put<{ data: KarmaCampaign }>(
      `/api/corp/karma/campaigns/${id}`,
      data,
      { headers: { 'x-company-id': getCompanyId() } }
    );
    if (!response.success) {
      throw new Error(response.message || 'Failed to update campaign');
    }
    return response.data!.data;
  },

  /**
   * Launch a campaign
   */
  async launchCampaign(id: string): Promise<void> {
    const response = await apiClient.post(
      `/api/corp/karma/campaigns/${id}/launch`,
      {},
      {
        headers: { 'x-company-id': getCompanyId() },
      }
    );
    if (!response.success) {
      throw new Error(response.message || 'Failed to launch campaign');
    }
  },

  /**
   * Join a campaign
   */
  async joinCampaign(campaignId: string): Promise<void> {
    const response = await apiClient.post(
      `/api/corp/karma/campaigns/${campaignId}/join`,
      {},
      {
        headers: { 'x-company-id': getCompanyId() },
      }
    );
    if (!response.success) {
      throw new Error(response.message || 'Failed to join campaign');
    }
  },

  // ========== Activities ==========

  /**
   * Get activities (for admin verification)
   */
  async getActivities(params?: {
    campaignId?: string;
    status?: KarmaActivity['status'];
    page?: number;
    limit?: number;
  }): Promise<{
    data: KarmaActivity[];
    pagination: { total: number; page: number; limit: number };
  }> {
    const queryParams = new URLSearchParams();
    if (params?.campaignId) queryParams.set('campaignId', params.campaignId);
    if (params?.status) queryParams.set('status', params.status);
    if (params?.page) queryParams.set('page', String(params.page));
    if (params?.limit) queryParams.set('limit', String(params.limit || 20));

    const response = await apiClient.get<{
      data: KarmaActivity[];
      pagination: { total: number; page: number; limit: number };
    }>(`/api/corp/karma/activities?${queryParams}`, {
      headers: { 'x-company-id': getCompanyId() },
    });

    return {
      data: response.data?.data || [],
      pagination: response.data?.pagination || { total: 0, page: 1, limit: 20 },
    };
  },

  /**
   * Verify an activity
   */
  async verifyActivity(activityId: string, approved: boolean, notes?: string): Promise<void> {
    const response = await apiClient.post(
      `/api/corp/karma/activities/${activityId}/verify`,
      {
        approved,
        notes,
      },
      {
        headers: { 'x-company-id': getCompanyId() },
      }
    );
    if (!response.success) {
      throw new Error(response.message || 'Failed to verify activity');
    }
  },

  /**
   * Submit my activity
   */
  async submitActivity(data: SubmitActivityRequest): Promise<KarmaActivity> {
    const response = await apiClient.post<{ data: KarmaActivity }>(
      '/api/corp/karma/me/activities',
      data as unknown as Record<string, unknown>,
      { headers: { 'x-company-id': getCompanyId() } }
    );
    if (!response.success) {
      throw new Error(response.message || 'Failed to submit activity');
    }
    return response.data!.data;
  },

  /**
   * Get my karma stats
   */
  async getMyStats(): Promise<KarmaStats> {
    const response = await apiClient.get<{ data: KarmaStats }>('/api/corp/karma/me/stats', {
      headers: { 'x-company-id': getCompanyId() },
    });
    return (
      response.data?.data || {
        totalKarma: 0,
        rank: 0,
        totalParticipants: 0,
        campaignsCompleted: 0,
        currentStreak: 0,
        longestStreak: 0,
        totalImpactHours: 0,
        co2Offset: 0,
        treesPlanted: 0,
        mealsDonated: 0,
      }
    );
  },

  // ========== Leaderboard ==========

  /**
   * Get leaderboard
   */
  async getLeaderboard(params?: {
    period?: 'week' | 'month' | 'quarter' | 'year' | 'all';
    department?: string;
    limit?: number;
  }): Promise<KarmaLeaderboard[]> {
    const queryParams = new URLSearchParams();
    if (params?.period) queryParams.set('period', params.period);
    if (params?.department) queryParams.set('department', params.department);
    if (params?.limit) queryParams.set('limit', String(params.limit || 50));

    const response = await apiClient.get<{ data: KarmaLeaderboard[] }>(
      `/api/corp/karma/leaderboard?${queryParams}`,
      { headers: { 'x-company-id': getCompanyId() } }
    );
    return response.data?.data || [];
  },

  // ========== Badges ==========

  /**
   * Get all badges
   */
  async getBadges(): Promise<KarmaBadge[]> {
    const response = await apiClient.get<{ data: KarmaBadge[] }>('/api/corp/karma/badges', {
      headers: { 'x-company-id': getCompanyId() },
    });
    return response.data?.data || [];
  },

  /**
   * Get my badges
   */
  async getMyBadges(): Promise<KarmaBadge[]> {
    const response = await apiClient.get<{ data: KarmaBadge[] }>('/api/corp/karma/me/badges', {
      headers: { 'x-company-id': getCompanyId() },
    });
    return response.data?.data || [];
  },

  // ========== Impact Analytics ==========

  /**
   * Get company-wide impact stats
   */
  async getImpactStats(params?: { startDate?: string; endDate?: string }): Promise<{
    totalKarmaPoints: number;
    activeParticipants: number;
    totalActivities: number;
    impactByCategory: Array<{
      category: string;
      activities: number;
      karmaPoints: number;
    }>;
    topContributors: Array<{
      employeeId: string;
      name: string;
      karmaPoints: number;
    }>;
  }> {
    const queryParams = new URLSearchParams();
    if (params?.startDate) queryParams.set('startDate', params.startDate);
    if (params?.endDate) queryParams.set('endDate', params.endDate);

    const response = await apiClient.get<{ data: any }>(`/api/corp/karma/impact?${queryParams}`, {
      headers: { 'x-company-id': getCompanyId() },
    });
    return (
      response.data?.data || {
        totalKarmaPoints: 0,
        activeParticipants: 0,
        totalActivities: 0,
        impactByCategory: [],
        topContributors: [],
      }
    );
  },
};

export default corpKarmaApi;
