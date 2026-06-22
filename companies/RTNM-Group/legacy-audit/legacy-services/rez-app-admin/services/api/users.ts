import { apiClient } from './apiClient';
import { logger } from '../../utils/logger';

// Canonical types: @rez/shared-types — migrate imports when package is published
export interface User {
  _id: string;
  phoneNumber: string;
  email?: string;
  profile?: {
    firstName?: string;
    lastName?: string;
    avatar?: string;
  };
  // Canonical role enum: 7 values (user, consumer, merchant, admin, support, operator, super_admin)
  role: 'user' | 'consumer' | 'merchant' | 'admin' | 'support' | 'operator' | 'super_admin';
  status?: 'active' | 'suspended';
  isSuspended?: boolean;
  // isActive is the canonical field on the User model (false = suspended).
  // Some endpoints return isActive instead of isSuspended — both are checked in UI.
  isActive?: boolean;
  isVerified: boolean;
  lastLogin?: string;
  createdAt: string;
  updatedAt: string;
  coinBalance?: number;
  // Canonical loyalty tiers: bronze, silver, gold, platinum, diamond
  tier?: 'bronze' | 'silver' | 'gold' | 'platinum' | 'diamond';
  segment?:
    | 'normal'
    | 'verified_student'
    | 'verified_employee'
    | 'verified_defence'
    | 'verified_healthcare'
    | 'verified_teacher'
    | 'verified_senior'
    | 'verified_government'
    | 'verified_differentlyAbled';
  featureLevel?: number;
  verificationStatus?: 'none' | 'provisional' | 'pending' | 'verified';
  isFlagged?: boolean;
  flagReason?: string;
  // Sprint 14: User detail stats
  stats?: {
    lifetimeCoinsEarned?: number;
    coinsRedeemed?: number;
    totalCheckIns?: number;
    currentStreak?: number;
    lastActive?: string;
  };
  achievements?: Array<{
    _id: string;
    title: string;
    description?: string;
    unlockedAt: string;
  }>;
}

export interface FraudFlaggedUser {
  _id: string;
  name?: string;
  email?: string;
  phoneNumber?: string;
  earnedLast24h?: number;
  zScore?: number;
  flaggedAt?: string;
  fraudFlags?: {
    coinVelocity?: {
      flaggedAt?: string;
      zScore?: number;
      earnedLast24h?: number;
      cleared?: boolean;
      clearedAt?: string;
    };
  };
  isSuspended?: boolean;
  status?: 'active' | 'suspended';
  reviewStatus?: 'pending' | 'cleared';
  clearedAt?: string;
}

export interface FraudQueueSummary {
  all: number;
  pending: number;
  cleared: number;
  suspended: number;
}

export interface FraudQueueResponse {
  users: FraudFlaggedUser[];
  summary: FraudQueueSummary;
}

// Canonical types: @rez/shared-types — migrate imports when package is published
export interface UserWallet {
  _id: string;
  user: string;
  balance: {
    total: number;
    available: number;
    pending: number;
    cashback: number;
  };
  // Canonical coin types: 6 values (promo, branded, prive, cashback, referral, rez)
  coins?: Array<{
    type: 'promo' | 'branded' | 'prive' | 'cashback' | 'referral' | 'rez';
    amount: number;
    isActive: boolean;
    expiryDate?: string;
  }>;
  brandedCoins?: Array<{
    merchantId: string;
    merchantName: string;
    amount: number;
    isActive: boolean;
  }>;
  currency: string;
  statistics?: {
    totalEarned: number;
    totalSpent: number;
    totalCashback: number;
    totalRefunds: number;
  };
  isFrozen: boolean;
  frozenReason?: string;
  lastTransactionAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface UsersListResponse {
  users: User[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// Backend response wrapper for GET /admin/users
interface UsersListData {
  users: User[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// Backend response wrapper for GET /admin/users/:id
interface UserData {
  user?: User;
  [key: string]: unknown;
}

// Backend response wrapper for GET /admin/users/:id/transactions
interface UserTransactionsData {
  transactions: Array<{
    _id: string;
    type: string;
    amount: number;
    description: string;
    createdAt: string;
  }>;
  pagination?: {
    page: number;
    limit: number;
    total: number;
  };
}

// Backend response wrapper for GET /admin/fraud-queue
interface FraudQueueData {
  users?: FraudFlaggedUser[];
  summary?: FraudQueueSummary;
  [key: string]: unknown;
}

export interface GetUsersParams {
  page?: number;
  limit?: number;
  role?: 'user' | 'consumer' | 'merchant' | 'admin' | 'support' | 'operator' | 'super_admin';
  status?: 'active' | 'suspended';
  search?: string;
}

class UsersService {
  /**
   * Get list of users with pagination and filters
   */
  async getUsers(params: GetUsersParams = {}): Promise<UsersListResponse> {
    try {
      const { page = 1, limit = 20, role, status, search } = params;

      let url = `admin/users?page=${page}&limit=${limit}`;
      if (role) url += `&role=${role}`;
      if (status) url += `&status=${status}`;
      if (search) url += `&search=${encodeURIComponent(search)}`;

      logger.info('[Users] Fetching users list...');
      const response = await apiClient.get<UsersListData>(url);

      if (response.success) {
        logger.info('[Users] Users fetched successfully');
        // Backend v2 shape: { success, data: { users: [...], pagination: {...} } }
        const nested = response.data as UsersListData;

        const users: User[] = nested?.users ?? [];
        const pagination = nested?.pagination ?? {
          page,
          limit,
          total: users.length,
          totalPages: Math.ceil(users.length / limit) || 1,
        };

        return { users, pagination };
      }

      throw new Error(response.message || 'Failed to get users');
    } catch (error: any) {
      logger.error('[Users] Get users error:', error.message);
      throw new Error(error.message || 'Failed to get users');
    }
  }

  /**
   * Get single user by ID
   */
  async getUser(userId: string): Promise<User> {
    try {
      logger.info('[Users] Fetching user:', userId);
      const response = await apiClient.get<UserData>(`admin/users/${userId}`);

      if (response.success && response.data) {
        // AC2-H3: backend may nest the user under response.data.user or return
        // it flat as response.data. Normalise so callers always get a consistent
        // shape.
        const raw = response.data?.user ?? (response.data as UserData);
        const user = { ...raw } as User;
        return user;
      }

      throw new Error(response.message || 'Failed to get user');
    } catch (error: any) {
      logger.error('[Users] Get user error:', error.message);
      throw new Error(error.message || 'Failed to get user');
    }
  }

  /**
   * Get user wallet balance and details
   */
  async getUserWallet(userId: string): Promise<UserWallet> {
    try {
      logger.info('[Users] Fetching wallet for user:', userId);
      // AC2-C1 fix: backend returns { data: { user, wallet } } not a flat UserWallet.
      // Extract the nested wallet object so callers get the correct shape.
      const response = await apiClient.get<{ user: unknown; wallet: UserWallet }>(
        `admin/users/${userId}/wallet`
      );

      if (response.success && response.data) {
        return response.data.wallet;
      }

      throw new Error(response.message || 'Failed to get user wallet');
    } catch (error: any) {
      logger.error('[Users] Get user wallet error:', error.message);
      throw new Error(error.message || 'Failed to get user wallet');
    }
  }

  /**
   * Suspend a user
   */
  async suspendUser(
    userId: string,
    reason?: string
  ): Promise<{ success: boolean; message: string }> {
    try {
      logger.info('[Users] Suspending user:', userId);
      const response = await apiClient.post<{ success: boolean; message?: string }>(
        `admin/users/${userId}/suspend`,
        { reason }
      );

      return {
        success: response.success,
        message: response.message || 'User suspended',
      };
    } catch (error: any) {
      logger.error('[Users] Suspend user error:', error.message);
      throw new Error(error.message || 'Failed to suspend user');
    }
  }

  /**
   * Unsuspend a user
   */
  async unsuspendUser(userId: string): Promise<{ success: boolean; message: string }> {
    try {
      logger.info('[Users] Unsuspending user:', userId);
      const response = await apiClient.post<{ success: boolean; message?: string }>(
        `admin/users/${userId}/unsuspend`
      );

      return {
        success: response.success,
        message: response.message || 'User unsuspended',
      };
    } catch (error: any) {
      logger.error('[Users] Unsuspend user error:', error.message);
      throw new Error(error.message || 'Failed to unsuspend user');
    }
  }

  async flagUser(userId: string, reason: string): Promise<void> {
    try {
      const response = await apiClient.put(`admin/users/${userId}/flag`, { reason });
      if (!response.success) {
        throw new Error(response.message || 'Failed to flag user');
      }
    } catch (error: any) {
      logger.error('[Users] Flag user error:', error.message);
      throw new Error(error.message || 'Failed to flag user');
    }
  }

  async unflagUser(userId: string): Promise<void> {
    try {
      const response = await apiClient.put(`admin/users/${userId}/unflag`, {});
      if (!response.success) {
        throw new Error(response.message || 'Failed to unflag user');
      }
    } catch (error: any) {
      logger.error('[Users] Unflag user error:', error.message);
      throw new Error(error.message || 'Failed to unflag user');
    }
  }

  /**
   * Suspend or unsuspend a user.
   * Backend has separate POST /:id/suspend and POST /:id/unsuspend endpoints.
   * Sending suspend=false to /suspend does not unsuspend — it must go to /unsuspend.
   */
  async setSuspendStatus(
    userId: string,
    suspend: boolean,
    reason?: string
  ): Promise<{ success: boolean; message: string }> {
    try {
      if (suspend) {
        const response = await apiClient.post<{ success: boolean; message?: string }>(
          `admin/users/${userId}/suspend`,
          { reason }
        );
        return { success: response.success, message: response.message || 'User suspended' };
      } else {
        const response = await apiClient.post<{ success: boolean; message?: string }>(
          `admin/users/${userId}/unsuspend`,
          {}
        );
        return { success: response.success, message: response.message || 'User unsuspended' };
      }
    } catch (error: any) {
      logger.error('[Users] setSuspendStatus error:', error.message);
      throw new Error(error.message || 'Failed to update suspend status');
    }
  }

  /**
   * Reset a user's streak (admin only)
   */
  async resetStreak(userId: string): Promise<void> {
    try {
      const response = await apiClient.post<{ success: boolean; message?: string }>(
        `admin/users/${userId}/reset-streak`,
        {}
      );
      if (!response.success) throw new Error(response.message || 'Failed to reset streak');
    } catch (error: any) {
      logger.error('[Users] resetStreak error:', error.message);
      throw new Error(error.message || 'Failed to reset streak');
    }
  }

  /**
   * Get recent transactions for a user (admin view)
   */
  async getUserTransactions(
    userId: string,
    limit = 10
  ): Promise<
    Array<{ _id: string; type: string; amount: number; description: string; createdAt: string }>
  > {
    try {
      const response = await apiClient.get<UserTransactionsData>(
        `admin/users/${userId}/transactions?limit=${limit}`
      );
      if (response.success) {
        const data = response.data as UserTransactionsData;
        // Backend returns { data: { transactions: [...], pagination: {...} } }
        return data?.transactions || [];
      }
      throw new Error(response.message || 'Failed to load transactions');
    } catch (error: any) {
      logger.error('[Users] getUserTransactions error:', error.message);
      throw new Error(error.message || 'Failed to load transactions');
    }
  }

  /**
   * Get fraud-flagged users queue
   */
  async getFraudQueue(status: 'all' | 'pending' | 'cleared' = 'all'): Promise<FraudQueueResponse> {
    try {
      const response = await apiClient.get<FraudQueueData>(`admin/fraud-queue?status=${status}`);
      if (response.success) {
        const payload = response.data as FraudQueueData;
        const rawUsers = Array.isArray(payload?.users)
          ? payload.users
          : [];

        const users: FraudFlaggedUser[] = rawUsers
          .map((item) => ({
            _id: item?._id || '',
            name: item?.name || '',
            email: item?.email || '',
            phoneNumber: item?.phoneNumber || '',
            earnedLast24h:
              item?.earnedLast24h ?? item?.fraudFlags?.coinVelocity?.earnedLast24h ?? 0,
            zScore: item?.zScore ?? item?.fraudFlags?.coinVelocity?.zScore ?? 0,
            flaggedAt: item?.flaggedAt ?? item?.fraudFlags?.coinVelocity?.flaggedAt,
            clearedAt: item?.clearedAt ?? item?.fraudFlags?.coinVelocity?.clearedAt,
            fraudFlags: item?.fraudFlags,
            isSuspended: Boolean(item?.isSuspended),
            status: item?.status || (item?.isSuspended ? 'suspended' : 'active'),
            reviewStatus:
              item?.reviewStatus ||
              (item?.fraudFlags?.coinVelocity?.cleared ? 'cleared' : 'pending'),
          }))
          .filter((item) => Boolean(item._id));

        const summary: FraudQueueSummary = payload?.summary || {
          all: users.length,
          pending: users.filter((item) => item.reviewStatus !== 'cleared').length,
          cleared: users.filter((item) => item.reviewStatus === 'cleared').length,
          suspended: users.filter((item) => item.isSuspended || item.status === 'suspended').length,
        };

        return { users, summary };
      }
      throw new Error(response.message || 'Failed to load fraud queue');
    } catch (error: any) {
      logger.error('[Users] getFraudQueue error:', error.message);
      throw new Error(error.message || 'Failed to load fraud queue');
    }
  }

  /**
   * Clear fraud flag for a user
   */
  async clearFraudFlag(userId: string): Promise<void> {
    try {
      const response = await apiClient.post<{ success: boolean; message?: string }>(
        `admin/users/${userId}/clear-fraud-flag`,
        {}
      );
      if (!response.success) throw new Error(response.message || 'Failed to clear flag');
    } catch (error: any) {
      logger.error('[Users] clearFraudFlag error:', error.message);
      throw new Error(error.message || 'Failed to clear fraud flag');
    }
  }
}

export const usersService = new UsersService();
export default usersService;
