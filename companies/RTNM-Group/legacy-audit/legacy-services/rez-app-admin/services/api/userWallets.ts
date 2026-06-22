import { apiClient } from './apiClient';
import { logger } from '../../utils/logger';

export interface UserWalletItem {
  user: {
    _id: string;
    phoneNumber: string;
    fullName: string;
    email?: string;
    profile?: { avatar?: string };
  };
  wallet: {
    _id: string;
    balance: {
      total: number;
      available: number;
      pending: number;
      cashback: number;
    };
    coins?: Array<{
      type: 'rez' | 'prive' | 'branded' | 'promo';
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
    currency?: string;
    isFrozen: boolean;
    frozenReason?: string;
    lastTransactionAt?: string;
  } | null;
}

export interface AuditLogItem {
  _id: string;
  userId: string;
  walletId: string;
  operation: string;
  amount: number;
  balanceBefore: {
    total: number;
    available: number;
    pending: number;
    cashback: number;
  };
  balanceAfter: {
    total: number;
    available: number;
    pending: number;
    cashback: number;
  };
  reference: {
    type: string;
    description?: string;
  };
  metadata?: {
    source?: string;
    adminUserId?: string;
  };
  createdAt: string;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

interface SearchUsersResponse {
  users: UserWalletItem[];
  pagination: Pagination;
}

interface AuditTrailResponse {
  auditLogs: AuditLogItem[];
  pagination: Pagination;
}

class UserWalletsService {
  async searchUsers(
    search?: string,
    page: number = 1,
    limit: number = 20
  ): Promise<SearchUsersResponse> {
    try {
      let url = `admin/user-wallets?page=${page}&limit=${limit}`;
      if (search) url += `&search=${encodeURIComponent(search)}`;

      logger.info('[UserWallets] Searching users...');
      const response = await apiClient.get<SearchUsersResponse>(url);

      if (response.success && response.data) {
        // MED-11 FIX: Validate response shape before returning
        if (!response.data?.users || !Array.isArray(response.data.users)) {
          throw new Error('Invalid response: expected users array');
        }
        logger.info('[UserWallets] Users fetched successfully');
        return response.data;
      }

      throw new Error(response.message || 'Failed to search users');
    } catch (error: any) {
      logger.error('[UserWallets] Search users error:', error.message);
      throw new Error(error.message || 'Failed to search users');
    }
  }

  async freezeWallet(userId: string, reason: string): Promise<void> {
    try {
      logger.info('[UserWallets] Freezing wallet for user:', userId);
      // A10-H12 FIX: Idempotency-Key guards against double-processing on retry.
      const idempotencyKey = crypto.randomUUID();
      const response = await apiClient.post(
        `admin/user-wallets/${userId}/freeze`,
        { reason },
        { headers: { 'Idempotency-Key': idempotencyKey } }
      );

      if (response.success) {
        logger.info('[UserWallets] Wallet frozen successfully');
        return;
      }

      throw new Error(response.message || 'Failed to freeze wallet');
    } catch (error: any) {
      logger.error('[UserWallets] Freeze wallet error:', error.message);
      throw new Error(error.message || 'Failed to freeze wallet');
    }
  }

  async unfreezeWallet(userId: string): Promise<void> {
    try {
      logger.info('[UserWallets] Unfreezing wallet for user:', userId);
      // A10-H12 FIX: Idempotency-Key guards against double-processing on retry.
      const idempotencyKey = crypto.randomUUID();
      const response = await apiClient.post(
        `admin/user-wallets/${userId}/unfreeze`,
        undefined,
        { headers: { 'Idempotency-Key': idempotencyKey } }
      );

      if (response.success) {
        logger.info('[UserWallets] Wallet unfrozen successfully');
        return;
      }

      throw new Error(response.message || 'Failed to unfreeze wallet');
    } catch (error: any) {
      logger.error('[UserWallets] Unfreeze wallet error:', error.message);
      throw new Error(error.message || 'Failed to unfreeze wallet');
    }
  }

  async adjustBalance(
    userId: string,
    data: { amount: number; type: 'credit' | 'debit'; reason: string }
  ): Promise<{ status?: number }> {
    try {
      logger.info('[UserWallets] Adjusting balance for user:', userId);
      // A10-H12 FIX: Idempotency-Key guards against double-processing on retry.
      const idempotencyKey = crypto.randomUUID();
      const response = await apiClient.post<{ status?: number }>(
        `admin/user-wallets/${userId}/adjust`,
        data,
        { headers: { 'Idempotency-Key': idempotencyKey } }
      );

      // MED-9 FIX: Check for 202 Accepted (pending approval) via the real HTTP status
      // exposed on the ApiResponse (see apiClient.ts). The previous
      // `response.data?.status` check was dead code because the server does not
      // put the HTTP status into the body.
      if (response.httpStatus === 202) {
        logger.info('[UserWallets] Balance adjustment pending approval');
        const error: Error & { status?: number } = new Error(
          response.message || 'Pending approval'
        );
        error.status = 202;
        throw error;
      }

      if (response.success) {
        logger.info('[UserWallets] Balance adjusted successfully');
        return { status: 200 };
      }

      throw new Error(response.message || 'Failed to adjust balance');
    } catch (error: any) {
      logger.error('[UserWallets] Adjust balance error:', error.message);
      throw error;
    }
  }

  async reverseCashback(
    userId: string,
    data: { amount: number; originalTransactionId?: string; reason: string }
  ): Promise<{ amount: number; newBalance: any; reversalTransactionId?: string }> {
    try {
      logger.info('[UserWallets] Reversing cashback for user:', userId);
      // A10-H12 FIX: Idempotency-Key guards against double-processing on retry.
      const idempotencyKey = crypto.randomUUID();
      const response = await apiClient.post<{
        amount: number;
        newBalance: any;
        reversalTransactionId?: string;
      }>(
        `admin/user-wallets/${userId}/reverse-cashback`,
        data,
        { headers: { 'Idempotency-Key': idempotencyKey } }
      );

      // MED-9 FIX: 202 Accepted (pending approval) — check the real HTTP status
      // from the apiClient, not `response.data?.status` (dead code).
      if (response.httpStatus === 202) {
        logger.info('[UserWallets] Cashback reversal pending approval');
        const error: Error & { status?: number } = new Error(
          response.message || 'Pending approval'
        );
        error.status = 202;
        throw error;
      }

      if (response.success && response.data) {
        logger.info('[UserWallets] Cashback reversed successfully');
        return response.data;
      }

      throw new Error(response.message || 'Failed to reverse cashback');
    } catch (error: any) {
      logger.error('[UserWallets] Reverse cashback error:', error.message);
      throw error;
    }
  }

  async getAuditTrail(
    userId: string,
    page: number = 1,
    limit: number = 20
  ): Promise<AuditTrailResponse> {
    try {
      logger.info('[UserWallets] Fetching audit trail for user:', userId);
      const response = await apiClient.get<AuditTrailResponse>(
        `admin/user-wallets/${userId}/audit-trail?page=${page}&limit=${limit}`
      );

      if (response.success && response.data) {
        logger.info('[UserWallets] Audit trail fetched successfully');
        return response.data;
      }

      throw new Error(response.message || 'Failed to get audit trail');
    } catch (error: any) {
      logger.error('[UserWallets] Get audit trail error:', error.message);
      throw new Error(error.message || 'Failed to get audit trail');
    }
  }
}

export const userWalletsService = new UserWalletsService();
export default userWalletsService;
