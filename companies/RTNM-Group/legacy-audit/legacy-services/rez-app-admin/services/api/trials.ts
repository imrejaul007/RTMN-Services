import apiClient from './apiClient';

// ─── Types ──────────────────────────────────────────────

export interface PendingTrial {
  _id: string;
  merchantId: string;
  merchantName: string;
  title: string;
  category: string;
  originalPrice: number;
  trialCoinPrice: number;
  commitmentFee: number;
  dailySlots: number;
  qrWindowType: string;
  qrWindowMinutes: number;
  images: Array<{ url: string }>;
  terms: string;
  rewardCoins: number;
  brandedCoins: number;
  status: string;
  createdAt: string;
}

export type FraudSignalType =
  | 'geo_mismatch'
  | 'instant_completion'
  | 'velocity_abuse'
  | 'duplicate_trial_month'
  | 'geo_implausible'
  | 'scan_geo_missing';

export interface FraudAlert {
  _id: string;
  userId: { _id: string; name?: string; email?: string; phone?: string };
  trialId: { _id: string; name?: string; category?: string };
  merchantId: { _id: string; name?: string };
  fraudSignals: FraudSignalType[];
  status: string;
  createdAt: string;
}

export interface BreakageStats {
  totalBreakage: number;
  daily: Array<{ date: string; amount: number }>;
  monthly: Array<{ month: string; amount: number }>;
}

/**
 * Current Coin Governor state as reported by the backend. Used to hydrate the
 * Coin Governor screen on mount so two admins viewing the screen share the same
 * source of truth and do not flip a toggle in the wrong direction.
 */
export interface CoinGovernorStatus {
  pauseBookings: boolean;
  pausePurchases: boolean;
  frozenMerchants: Array<{
    merchantId: string;
    merchantName: string;
    frozenAt: string;
  }>;
  maxTrialsPerDay?: number;
}

export interface DiscoveryCampaign {
  _id: string;
  title: string;
  subtitle?: string;
  type: 'mission_sprint' | 'festival' | 'category_push';
  targetCategory?: string;
  targetCity?: string;
  targetTrialCount: number;
  rewardCoins: number;
  rewardTryCoins?: number;
  startsAt: string;
  endsAt: string;
  isActive: boolean;
}

export interface TrialBundle {
  _id: string;
  name: string;
  description: string;
  slug: string;
  bundleType: 'pass' | 'pack';
  price: number;
  originalPrice: number;
  trialCoinsIncluded: number;
  bonusRewardCoins: number;
  trialSlots: number;
  validityDays: number;
  eligibleCategories: string[];
  category?: string;
  featured: boolean;
  sortOrder: number;
  isActive: boolean;
  totalPurchases: number;
}

// ─── Service ────────────────────────────────────────────

export const adminTrialsService = {
  /**
   * Get pending trials for approval
   */
  async getPendingTrials(params?: { page?: number; limit?: number }) {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', String(params.page));
    if (params?.limit) queryParams.append('limit', String(params.limit));

    // C4 FIX: removed leading slash — buildApiUrl already handles joining
    return apiClient.get<{ trials: PendingTrial[]; pagination: any }>(
      `admin/trials/pending${queryParams.toString() ? '?' + queryParams.toString() : ''}`
    );
  },

  /**
   * Approve or reject a trial
   */
  async approveTrial(trialId: string, data: { approved: boolean; reason?: string }) {
    return apiClient.post(`admin/trials/${trialId}/approve`, data);
  },

  /**
   * Get fraud alerts
   */
  async getFraudAlerts(params?: { page?: number; limit?: number; signalType?: string }) {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', String(params.page));
    if (params?.limit) queryParams.append('limit', String(params.limit));
    if (params?.signalType) queryParams.append('signalType', params.signalType);

    return apiClient.get<{ alerts: FraudAlert[]; pagination: any }>(
      `admin/trials/fraud-alerts${queryParams.toString() ? '?' + queryParams.toString() : ''}`
    );
  },

  /**
   * Get breakage stats
   */
  async getBreakageStats() {
    return apiClient.get<{ stats: BreakageStats }>('admin/trials/coins/breakage');
  },

  /**
   * Execute governor action
   */
  async executeGovernorAction(data: { action: string; [key: string]: any }) {
    return apiClient.post('admin/trials/coins/governor', data);
  },

  /**
   * Fetch the current Coin Governor state (pause flags, frozen merchants, limits).
   *
   * TODO: Wire to a real backend endpoint. This method currently calls
   * `admin/trials/coins/governor/status` which does not yet exist in the service
   * — a 404 will return `success: false` and the caller should render an empty
   * "Loading current state from server..." skeleton rather than fabricating
   * defaults. Once the backend ships this endpoint the URL can stay; if it ships
   * at a different path, update it here.
   */
  async getGovernorStatus() {
    return apiClient.get<CoinGovernorStatus>('admin/trials/coins/governor/status');
  },

  /**
   * Suspend a user (fraud)
   */
  async suspendUser(userId: string, reason: string) {
    return apiClient.post(`admin/users/${userId}/suspend`, { reason });
  },

  /**
   * List discovery campaigns
   */
  async listDiscoveryCampaigns(params?: { isActive?: boolean; city?: string }) {
    const queryParams = new URLSearchParams();
    if (params?.isActive !== undefined) queryParams.append('isActive', String(params.isActive));
    if (params?.city) queryParams.append('city', params.city);

    return apiClient.get<{ campaigns: DiscoveryCampaign[]; count: number }>(
      `admin/trials/try/campaigns${queryParams.toString() ? '?' + queryParams.toString() : ''}`
    );
  },

  /**
   * Create a discovery campaign
   */
  async createDiscoveryCampaign(data: {
    title: string;
    subtitle: string;
    type: string;
    targetCategory?: string;
    targetCity?: string;
    targetTrialCount: number;
    rewardCoins: number;
    rewardTryCoins: number;
    bonusBadge?: string;
    bannerImage?: string;
    startsAt: string;
    endsAt: string;
  }) {
    return apiClient.post('admin/trials/try/campaigns', data);
  },

  /**
   * List trial bundles
   */
  async listBundles() {
    return apiClient.get<{ bundles: TrialBundle[]; count: number }>('admin/trials/try/bundles');
  },

  /**
   * Create a trial bundle
   */
  async createBundle(data: {
    name: string;
    description: string;
    slug: string;
    bundleType: 'pass' | 'pack';
    price: number;
    originalPrice: number;
    trialCoinsIncluded?: number;
    bonusRewardCoins?: number;
    trialSlots: number;
    validityDays: number;
    eligibleCategories?: string[];
    category?: string;
    maxUsesPerMerchant?: number;
    featured?: boolean;
    sortOrder?: number;
  }) {
    return apiClient.post('admin/trials/try/bundles', data);
  },

  /**
   * Update a trial bundle
   */
  async updateBundle(
    bundleId: string,
    data: {
      name?: string;
      description?: string;
      bundleType?: 'pass' | 'pack';
      price?: number;
      originalPrice?: number;
      trialCoinsIncluded?: number;
      bonusRewardCoins?: number;
      trialSlots?: number;
      validityDays?: number;
      category?: string | null;
      maxUsesPerMerchant?: number;
      isActive?: boolean;
      featured?: boolean;
      sortOrder?: number;
    }
  ) {
    return apiClient.patch(`admin/trials/try/bundles/${bundleId}`, data);
  },

  /**
   * Delete a trial bundle
   */
  async deleteBundle(bundleId: string) {
    return apiClient.delete(`admin/trials/try/bundles/${bundleId}`);
  },

  /**
   * Create a trial campaign boost
   */
  async createCampaignBoost(data: { trialId: string; boostValue: number; endsAt?: string }) {
    return apiClient.post('admin/trials/campaigns', data);
  },
};

export default adminTrialsService;
