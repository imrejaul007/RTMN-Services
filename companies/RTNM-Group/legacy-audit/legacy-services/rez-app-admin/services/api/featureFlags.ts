import apiClient from './apiClient';

export interface FeatureFlagItem {
  _id: string;
  key: string;
  label: string;
  group: string;
  enabled: boolean;
  sortOrder: number;
  metadata: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

export interface EarningConfigData {
  _id?: string;
  streaks: {
    login: { milestones: { day: number; coins: number }[] };
    order: { milestones: { day: number; coins: number }[] };
    review: { milestones: { day: number; coins: number }[] };
  };
  referral: {
    referrerAmount: number;
    refereeDiscount: number;
    milestoneBonus: number;
    minOrders: number;
    minSpend: number;
    timeframeDays: number;
    expiryDays: number;
  };
  dailyCheckin: {
    baseCoins: number;
    bonuses: { streak: number; coins: number }[];
  };
  billUpload: {
    minAmount: number;
    maxCashbackPercent: number;
    maxCashbackAmount: number;
  };
  updatedBy?: string;
  createdAt?: string;
  updatedAt?: string;
}

export const featureFlagsService = {
  // Feature Flags
  // Backend route: GET /api/admin/feature-flags  (mounted at /api/admin, path /feature-flags)
  async listFlags(group?: string) {
    const query = group ? `?group=${group}` : '';
    return apiClient.get<{ flags: FeatureFlagItem[] }>(`/admin/feature-flags${query}`);
  },
  async getFlag(key: string) {
    // Backend has no GET /feature-flags/:key — use list and filter client-side
    return apiClient.get<{ flags: FeatureFlagItem[] }>(`/admin/feature-flags`);
  },
  async createFlag(data: Partial<FeatureFlagItem>) {
    return apiClient.post('/admin/feature-flags', data);
  },
  async updateFlag(key: string, data: Partial<FeatureFlagItem>) {
    // Backend uses PATCH for updates
    return apiClient.patch(`/admin/feature-flags/${key}`, data);
  },
  async toggleFlag(key: string, enabled: boolean) {
    // Backend PATCH /admin/feature-flags/:key with explicit enabled value
    return apiClient.patch(`/admin/feature-flags/${key}`, { enabled });
  },
  async reorderFlags(_items: { key: string; sortOrder: number }[]) {
    // No reorder endpoint exists on the backend yet — throw so callers can surface a real error
    throw new Error('Feature flags reorder is not yet implemented on the backend');
  },
  async deleteFlag(key: string) {
    // No DELETE endpoint in backend — disable the flag instead
    return apiClient.patch(`/admin/feature-flags/${key}`, { enabled: false });
  },
  async seedFlags() {
    // No seed endpoint exists on the backend yet — throw so callers can surface a real error
    throw new Error('Feature flags seed is not yet implemented on the backend');
  },

  // Earning Config
  async getEarningConfig() {
    const response = await apiClient.get<EarningConfigData>('/admin/earning-config');
    if (response.success && response.data) {
      return { success: true, data: response.data, message: response.message };
    }
    return {
      success: false,
      data: null,
      message: response.message || 'Failed to fetch earning config',
    };
  },
  async updateEarningConfig(data: Partial<EarningConfigData>) {
    const response = await apiClient.put<EarningConfigData>('/admin/earning-config', data);
    if (response.success && response.data) {
      return { success: true, data: response.data, message: response.message };
    }
    return {
      success: false,
      data: null,
      message: response.message || 'Failed to update earning config',
    };
  },
  async seedEarningConfig() {
    const response = await apiClient.post<EarningConfigData>('/admin/earning-config/seed');
    if (response.success && response.data) {
      return { success: true, data: response.data, message: response.message };
    }
    return {
      success: false,
      data: null,
      message: response.message || 'Failed to seed earning config',
    };
  },
};
