import { apiClient } from './apiClient';
import { logger } from '../../utils/logger';
import {
  validateResponse,
  MerchantsListResponseSchema,
  MerchantSchema,
  MerchantWalletSchema,
} from '../../utils/schemas/api-schemas';

// Canonical types: @rez/shared-types — migrate imports when package is published
export interface Merchant {
  _id: string;
  userId: string;
  businessName: string;
  businessType: string;
  email: string;
  phoneNumber: string;
  status: 'pending' | 'approved' | 'rejected' | 'suspended';
  verificationStatus: 'pending' | 'verified' | 'rejected';
  stores: Array<{
    _id: string;
    name: string;
    status: string;
    isProgramMerchant?: boolean;
    baseCashbackPercent?: number;
    estimatedPrepMinutes?: number;
  }>;
  bankDetails?: {
    accountNumber: string;
    ifscCode: string;
    accountHolderName: string;
    isVerified: boolean;
  };
  documents?: Array<{
    type: string;
    url: string;
    status: string;
  }>;
  createdAt: string;
  updatedAt: string;
}

export interface MerchantWallet {
  _id: string;
  merchant: string;
  balance: {
    total: number;
    available: number;
    pending: number;
    withdrawn: number;
    held: number;
  };
  statistics: {
    totalSales: number;
    totalPlatformFees: number;
    netSales: number;
    totalOrders: number;
    averageOrderValue: number;
    totalRefunds: number;
    totalWithdrawals: number;
  };
  bankDetails?: {
    accountNumber: string;
    ifscCode: string;
    accountHolderName: string;
    bankName: string;
    isVerified: boolean;
  };
  isActive: boolean;
  createdAt: string;
}

export interface MerchantWalletSummary {
  merchantId: string;
  businessName: string;
  balance: {
    total: number;
    available: number;
    pending: number;
    withdrawn: number;
  };
  statistics: {
    totalSales: number;
    totalPlatformFees: number;
    netSales: number;
    totalOrders: number;
  };
}

export interface WithdrawalRequest {
  _id: string;
  merchantId: string;
  amount: number;
  // Canonical withdrawal statuses (aligned with backend withdrawal lifecycle)
  status: 'pending' | 'approved' | 'rejected' | 'completed';
  bankDetails: {
    accountNumber: string;
    ifscCode: string;
    accountHolderName: string;
    bankName: string;
  };
  requestedAt: string;
  processedAt?: string;
  processedBy?: string;
  rejectionReason?: string;
}

export interface PendingWithdrawalTransaction {
  _id: string;
  type: string;
  amount: number;
  description: string;
  status: string;
  withdrawalDetails?: {
    bankAccount?: string;
    ifscCode?: string;
    upiId?: string;
    transactionId?: string;
    processedAt?: string;
  };
  createdAt: string;
}

export interface PendingWithdrawalItem {
  merchantId: any; // populated user object
  store: any; // populated store object
  pendingAmount: number;
  pendingTransactions: PendingWithdrawalTransaction[];
}

export interface MerchantsListResponse {
  merchants: Merchant[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

class MerchantsService {
  /**
   * Get list of merchants
   */
  async getMerchants(
    page: number = 1,
    limit: number = 20,
    status?: string,
    search?: string
  ): Promise<MerchantsListResponse> {
    try {
      let url = `admin/merchants?page=${page}&limit=${limit}`;
      if (status) url += `&status=${status}`;
      if (search) url += `&search=${encodeURIComponent(search)}`;

      logger.info('[Merchants] Fetching merchants list...');
      const response = await apiClient.get<Merchant[]>(url);

      if (response.success) {
        logger.info('[Merchants] Merchants fetched successfully');
        // Backend returns { data: { merchants: [...], pagination: {...} } }
        const nested = response.data as any;
        const normalised = {
          merchants: nested?.merchants || (Array.isArray(nested) ? nested : []),
          pagination: nested?.pagination ||
            response.pagination || { page, limit, total: 0, totalPages: 0 },
        };
        return validateResponse(MerchantsListResponseSchema as any, normalised as any, 'MerchantsService.getMerchants');
      }

      throw new Error(response.message || 'Failed to get merchants');
    } catch (error: any) {
      logger.error('[Merchants] Get merchants error:', error.message);
      throw new Error(error.message || 'Failed to get merchants');
    }
  }

  /**
   * Get single merchant by ID
   */
  async getMerchant(merchantId: string): Promise<Merchant> {
    try {
      logger.info('[Merchants] Fetching merchant:', merchantId);
      const response = await apiClient.get<any>(`admin/merchants/${merchantId}`);

      if (response.success && response.data) {
        // AC2-M1: backend may nest merchant under response.data.merchant or
        // return it flat. Normalise so callers always see merchantId at top level.
        const raw: any = (response.data as any)?.merchant ?? response.data;
        const normalised = {
          ...raw,
          _id: raw._id ?? raw.merchantId ?? merchantId,
          userId: raw.userId ?? raw._id ?? merchantId,
        };
        return validateResponse(MerchantSchema as any, normalised as any, 'MerchantsService.getMerchant');
      }

      throw new Error(response.message || 'Failed to get merchant');
    } catch (error: any) {
      logger.error('[Merchants] Get merchant error:', error.message);
      throw new Error(error.message || 'Failed to get merchant');
    }
  }

  /**
   * Create a new merchant account (admin-initiated, pre-approved)
   * Returns the created merchant and a one-time temporary password.
   */
  async createMerchant(data: {
    name: string;
    email: string;
    phone: string;
    businessName: string;
    businessType?: string;
    storeAddress?: {
      street?: string;
      city?: string;
      state?: string;
      postalCode?: string;
      country?: string;
    };
  }): Promise<{ merchant: Merchant; tempPassword: string }> {
    try {
      logger.info('[Merchants] Creating merchant:', data.businessName);
      // AC2-C3 fix: backend Merchant model uses ownerName (not name) and businessAddress (not storeAddress).
      // Map frontend field names to backend field names before sending.
      const payload = {
        ownerName: data.name,
        email: data.email,
        phone: data.phone,
        businessName: data.businessName,
        businessType: data.businessType,
        businessAddress: data.storeAddress,
      };
      const response = await apiClient.post<any>('admin/merchants', payload);

      if (response.success && response.data) {
        return {
          merchant: response.data.merchant,
          tempPassword: response.data.tempPassword,
        };
      }

      throw new Error(response.message || 'Failed to create merchant');
    } catch (error: any) {
      logger.error('[Merchants] Create merchant error:', error.message);
      throw new Error(error.message || 'Failed to create merchant');
    }
  }

  /**
   * Approve a merchant
   */
  async approveMerchant(merchantId: string): Promise<{ success: boolean; message: string }> {
    try {
      logger.info('[Merchants] Approving merchant:', merchantId);
      const response = await apiClient.post<any>(`admin/merchants/${merchantId}/approve`);

      return {
        success: response.success,
        message: response.message || 'Merchant approved',
      };
    } catch (error: any) {
      logger.error('[Merchants] Approve merchant error:', error.message);
      throw new Error(error.message || 'Failed to approve merchant');
    }
  }

  /**
   * Reject a merchant
   */
  async rejectMerchant(
    merchantId: string,
    reason: string
  ): Promise<{ success: boolean; message: string }> {
    try {
      logger.info('[Merchants] Rejecting merchant:', merchantId);
      const response = await apiClient.post<any>(`admin/merchants/${merchantId}/reject`, {
        reason,
      });

      return {
        success: response.success,
        message: response.message || 'Merchant rejected',
      };
    } catch (error: any) {
      logger.error('[Merchants] Reject merchant error:', error.message);
      throw new Error(error.message || 'Failed to reject merchant');
    }
  }

  /**
   * Suspend a merchant
   */
  async suspendMerchant(
    merchantId: string,
    reason: string
  ): Promise<{ success: boolean; message: string }> {
    try {
      logger.info('[Merchants] Suspending merchant:', merchantId);
      const response = await apiClient.post<any>(`admin/merchants/${merchantId}/suspend`, {
        reason,
      });

      return {
        success: response.success,
        message: response.message || 'Merchant suspended',
      };
    } catch (error: any) {
      logger.error('[Merchants] Suspend merchant error:', error.message);
      throw new Error(error.message || 'Failed to suspend merchant');
    }
  }

  /**
   * Reactivate a suspended merchant
   */
  async reactivateMerchant(merchantId: string): Promise<{ success: boolean; message: string }> {
    try {
      logger.info('[Merchants] Reactivating merchant:', merchantId);
      const response = await apiClient.post<any>(`admin/merchants/${merchantId}/reactivate`);

      return {
        success: response.success,
        message: response.message || 'Merchant reactivated',
      };
    } catch (error: any) {
      logger.error('[Merchants] Reactivate merchant error:', error.message);
      throw new Error(error.message || 'Failed to reactivate merchant');
    }
  }

  // ==================== Merchant Wallet Endpoints ====================

  /**
   * Get all merchant wallets (admin overview)
   */
  async getMerchantWallets(
    page: number = 1,
    limit: number = 20
  ): Promise<{ wallets: MerchantWalletSummary[]; pagination: any }> {
    try {
      logger.info('[Merchants] Fetching merchant wallets...');
      const response = await apiClient.get<MerchantWalletSummary[]>(
        `admin/merchant-wallets?page=${page}&limit=${limit}`
      );

      if (response.success) {
        logger.info('[Merchants] Wallets fetched successfully');
        // Backend returns data: { wallets: [...], pagination: {...} }
        const nested = response.data as any;
        return {
          wallets: nested?.wallets || (Array.isArray(nested) ? nested : []),
          pagination: nested?.pagination ||
            response.pagination || { page, limit, total: 0, totalPages: 0 },
        };
      }

      throw new Error(response.message || 'Failed to get wallets');
    } catch (error: any) {
      logger.error('[Merchants] Get merchant wallets error:', error.message);
      throw new Error(error.message || 'Failed to get merchant wallets');
    }
  }

  /**
   * Get wallet statistics
   */
  async getWalletStats(): Promise<any> {
    try {
      logger.info('[Merchants] Fetching wallet stats...');
      const response = await apiClient.get<any>('admin/merchant-wallets/stats');

      if (response.success && response.data) {
        return response.data;
      }

      throw new Error(response.message || 'Failed to get wallet stats');
    } catch (error: any) {
      logger.error('[Merchants] Get wallet stats error:', error.message);
      throw new Error(error.message || 'Failed to get wallet stats');
    }
  }

  /**
   * Get single merchant wallet
   */
  async getMerchantWallet(merchantId: string): Promise<MerchantWallet> {
    try {
      logger.info('[Merchants] Fetching wallet for merchant:', merchantId);
      const response = await apiClient.get<MerchantWallet>(`admin/merchant-wallets/${merchantId}`);

      if (response.success && response.data) {
        return validateResponse(MerchantWalletSchema, response.data, 'MerchantsService.getMerchantWallet') as MerchantWallet;
      }

      throw new Error(response.message || 'Failed to get wallet');
    } catch (error: any) {
      logger.error('[Merchants] Get merchant wallet error:', error.message);
      throw new Error(error.message || 'Failed to get merchant wallet');
    }
  }

  /**
   * Get merchant wallet transactions
   */
  async getWalletTransactions(
    merchantId: string,
    page: number = 1,
    limit: number = 20
  ): Promise<{ transactions: any[]; pagination: any }> {
    try {
      logger.info('[Merchants] Fetching wallet transactions for:', merchantId);
      const response = await apiClient.get<any[]>(
        `admin/merchant-wallets/${merchantId}/transactions?page=${page}&limit=${limit}`
      );

      if (response.success) {
        return {
          transactions: response.data || [],
          pagination: response.pagination || { page, limit, total: 0, totalPages: 0 },
        };
      }

      throw new Error(response.message || 'Failed to get transactions');
    } catch (error: any) {
      logger.error('[Merchants] Get wallet transactions error:', error.message);
      throw new Error(error.message || 'Failed to get wallet transactions');
    }
  }

  /**
   * Get pending withdrawal requests
   */
  async getPendingWithdrawals(
    page: number = 1,
    limit: number = 20
  ): Promise<{ withdrawals: PendingWithdrawalItem[]; pagination: any }> {
    try {
      logger.info('[Merchants] Fetching pending withdrawals...');
      const response = await apiClient.get<any>(
        `admin/merchant-wallets/pending-withdrawals?page=${page}&limit=${limit}`
      );

      if (response.success) {
        return {
          withdrawals: response.data || [],
          pagination: response.pagination || { page, limit, total: 0, totalPages: 0 },
        };
      }

      throw new Error(response.message || 'Failed to get withdrawals');
    } catch (error: any) {
      logger.error('[Merchants] Get pending withdrawals error:', error.message);
      throw new Error(error.message || 'Failed to get pending withdrawals');
    }
  }

  /**
   * Process (approve) a withdrawal request
   */
  async processWithdrawal(
    merchantId: string,
    transactionId: string,
    transactionReference: string
  ): Promise<{ success: boolean; message: string }> {
    try {
      logger.info('[Merchants] Processing withdrawal for merchant:', merchantId);
      const response = await apiClient.post<any>(
        `admin/merchant-wallets/${merchantId}/process-withdrawal`,
        { transactionId, transactionReference }
      );

      return {
        success: response.success,
        message: response.message || 'Withdrawal processed successfully',
      };
    } catch (error: any) {
      logger.error('[Merchants] Process withdrawal error:', error.message);
      throw new Error(error.message || 'Failed to process withdrawal');
    }
  }

  /**
   * Update store display settings (estimatedPrepMinutes, etc.)
   */
  async updateStoreSettings(
    storeId: string,
    settings: { estimatedPrepMinutes?: number }
  ): Promise<{ success: boolean; message: string }> {
    try {
      logger.info('[Merchants] Updating store settings:', { storeId, settings });
      const response = await apiClient.patch<any>(`admin/stores/${storeId}/settings`, settings);
      return {
        success: response.success,
        message: response.message || 'Store settings updated',
      };
    } catch (error: any) {
      logger.error('[Merchants] Update store settings error:', error.message);
      throw new Error(error.message || 'Failed to update store settings');
    }
  }

  /**
   * Toggle REZ Program membership for a store
   */
  async toggleStoreProgram(
    storeId: string,
    isProgramMerchant: boolean,
    baseCashbackPercent: number = 5
  ): Promise<{ success: boolean; message: string }> {
    try {
      logger.info('[Merchants] Toggling program for store:', { storeId, isProgramMerchant });
      const response = await apiClient.patch<any>(`admin/stores/${storeId}/program`, {
        isProgramMerchant,
        baseCashbackPercent,
      });

      return {
        success: response.success,
        message:
          response.message ||
          (isProgramMerchant ? 'Store enrolled in REZ Program' : 'Store removed from REZ Program'),
      };
    } catch (error: any) {
      logger.error('[Merchants] Toggle store program error:', error.message);
      throw new Error(error.message || 'Failed to update store program status');
    }
  }

  /**
   * Reject a withdrawal request
   */
  async rejectWithdrawal(
    merchantId: string,
    transactionId: string,
    reason: string
  ): Promise<{ success: boolean; message: string }> {
    try {
      logger.info('[Merchants] Rejecting withdrawal for merchant:', merchantId);
      const response = await apiClient.post<any>(
        `admin/merchant-wallets/${merchantId}/reject-withdrawal`,
        { transactionId, reason }
      );

      return {
        success: response.success,
        message: response.message || 'Withdrawal rejected',
      };
    } catch (error: any) {
      logger.error('[Merchants] Reject withdrawal error:', error.message);
      throw new Error(error.message || 'Failed to reject withdrawal');
    }
  }
}

export const merchantsService = new MerchantsService();
export default merchantsService;
