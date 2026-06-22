import { apiClient } from './apiClient';
import { logger } from '../../utils/logger';

export interface LoyaltyUser {
  _id: string;
  userId: {
    _id: string;
    profile?: {
      firstName?: string;
      lastName?: string;
    };
    phoneNumber: string;
    email?: string;
  };
  streak: {
    current: number;
    target: number;
    lastCheckin?: string;
  };
  brandLoyalty: Array<{
    brandId: string;
    brandName: string;
    purchaseCount: number;
    tier: 'Bronze' | 'Silver' | 'Gold' | 'Platinum' | 'bronze' | 'silver' | 'gold' | 'platinum';
    progress: number;
    nextTierAt: number;
  }>;
  missions: Array<{
    missionId: string;
    title: string;
    progress: number;
    target: number;
    reward: number;
    icon: string;
    completedAt?: string;
  }>;
  coins: {
    available: number;
    expiring: number;
    expiryDate?: string;
    history: Array<{
      amount: number;
      type: 'earned' | 'spent' | 'expired';
      description: string;
      date: string;
    }>;
  };
  categoryCoins: Record<string, { available: number; expiring: number; expiryDate?: string }>;
  createdAt: string;
  updatedAt: string;
}

export interface LoyaltyStats {
  totalUsers: number;
  activeStreaks: number;
  totalCoinsEarned: number;
  completedMissions: number;
  avgStreak: number;
  topCategory?: { category: string; totalCoins: number } | null;
}

export interface LoyaltyListResponse {
  users: LoyaltyUser[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

class LoyaltyService {
  /**
   * Get list of loyalty users
   */
  async getUsers(
    page: number = 1,
    limit: number = 20,
    search?: string,
    category?: string,
    sortBy?: string
  ): Promise<LoyaltyListResponse> {
    try {
      let url = `admin/loyalty?page=${page}&limit=${limit}`;
      if (search) url += `&search=${encodeURIComponent(search)}`;
      if (category) url += `&category=${encodeURIComponent(category)}`;
      if (sortBy) url += `&sortBy=${encodeURIComponent(sortBy)}`;

      logger.info('[Loyalty] Fetching users list...', { page, limit, search, category, sortBy });
      const response = await apiClient.get<any>(url);

      if (response.success && response.data) {
        logger.info('[Loyalty] Users fetched successfully', {
          count: response.data.users?.length,
        });
        // Backend returns { success: true, data: { users: [...], pagination: {...} } }
        return {
          users: response.data.users || [],
          pagination: response.data.pagination || { page, limit, total: 0, totalPages: 0 },
        };
      }

      throw new Error(response.message || 'Failed to get users');
    } catch (error: any) {
      logger.error('[Loyalty] Get users error:', error.message);
      throw new Error(error.message || 'Failed to get users');
    }
  }

  /**
   * Get loyalty statistics
   */
  async getStats(): Promise<LoyaltyStats> {
    try {
      logger.info('[Loyalty] Fetching stats...');
      const response = await apiClient.get<LoyaltyStats>('admin/loyalty/stats');

      if (response.success && response.data) {
        logger.info('[Loyalty] Stats fetched successfully', response.data);
        // Return default stats if any field is missing
        return {
          totalUsers: response.data.totalUsers ?? 0,
          activeStreaks: response.data.activeStreaks ?? 0,
          totalCoinsEarned: response.data.totalCoinsEarned ?? 0,
          completedMissions: response.data.completedMissions ?? 0,
          avgStreak: response.data.avgStreak ?? 0,
          topCategory: response.data.topCategory ?? undefined,
        };
      }

      throw new Error(response.message || 'Failed to get stats');
    } catch (error: any) {
      logger.error('[Loyalty] Get stats error:', error.message);
      throw new Error(error.message || 'Failed to get stats');
    }
  }

  /**
   * Get single loyalty user by ID
   */
  async getUser(userId: string): Promise<LoyaltyUser> {
    try {
      logger.info('[Loyalty] Fetching user:', userId);
      const response = await apiClient.get<LoyaltyUser>(`admin/loyalty/${userId}`);

      if (response.success && response.data) {
        return response.data;
      }

      throw new Error(response.message || 'Failed to get user');
    } catch (error: any) {
      logger.error('[Loyalty] Get user error:', error.message);
      throw new Error(error.message || 'Failed to get user');
    }
  }

  /**
   * Add coins to a user's balance
   */
  async addCoins(
    userId: string,
    amount: number,
    reason: string,
    category?: string
  ): Promise<{ success: boolean; message: string }> {
    try {
      logger.info('[Loyalty] Adding coins to user', { userId, amount });
      const response = await apiClient.post<any>(`admin/loyalty/${userId}/add-coins`, {
        amount,
        reason,
        ...(category && { category }),
      });

      return {
        success: response.success,
        message: response.message || 'Coins added successfully',
      };
    } catch (error: any) {
      logger.error('[Loyalty] Add coins error:', error.message);
      throw new Error(error.message || 'Failed to add coins');
    }
  }

  /**
   * Reset a user's streak
   */
  async resetStreak(userId: string): Promise<{ success: boolean; message: string }> {
    try {
      logger.info('[Loyalty] Resetting streak for user:', userId);
      const response = await apiClient.post<any>(`admin/loyalty/${userId}/reset-streak`, {});

      return {
        success: response.success,
        message: response.message || 'Streak reset successfully',
      };
    } catch (error: any) {
      logger.error('[Loyalty] Reset streak error:', error.message);
      throw new Error(error.message || 'Failed to reset streak');
    }
  }

  /**
   * Reset a user's missions
   */
  async resetMissions(
    userId: string,
    category?: string
  ): Promise<{ success: boolean; message: string }> {
    try {
      logger.info('[Loyalty] Resetting missions for user:', userId);
      const response = await apiClient.post<any>(`admin/loyalty/${userId}/reset-missions`, {
        ...(category && { category }),
      });

      return {
        success: response.success,
        message: response.message || 'Missions reset successfully',
      };
    } catch (error: any) {
      logger.error('[Loyalty] Reset missions error:', error.message);
      throw new Error(error.message || 'Failed to reset missions');
    }
  }
}

export const loyaltyService = new LoyaltyService();
export default loyaltyService;
