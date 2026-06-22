import { apiClient } from './apiClient';
import { logger } from '../../utils/logger';

export interface Provider {
  _id: string;
  name: string;
  type: string;
  aggregatorCode: string;
  promoCoinsFixed: number;
  promoExpiryDays: number;
  maxRedemptionPercent: number;
  isActive: boolean;
}

export interface Transaction {
  _id: string;
  userId: string;
  provider: string;
  billType: string;
  amount: number;
  status: 'completed' | 'failed' | 'processing' | 'refunded';
  aggregatorRef: string;
  promoCoinsIssued: number;
  createdAt: string;
}

export interface BBPSAnalytics {
  period: string;
  kpi: {
    gmv: number;
    gmvChange: number;
    transactions: number;
    transactionsChange: number;
    failureRate: number;
    failureRateChange: number;
    coinsIssued: number;
    coinsIssuedChange: number;
  };
  dailyGMV: Array<{ day: string; value: number }>;
  byBillType: Record<string, number>;
  coinsMetrics: { issued: number; redeemed: number };
  topProviders: Array<{ name: string; transactions: number; gmv: number; avgValue: number }>;
}

export interface BBPSConfig {
  enabledTypes: string[];
  defaultCoins: Record<string, number>;
  reminderEnabled: boolean;
  reminderDaysBefore: number;
  maxCoinsPerUserPerMonth: number;
  maxPaymentsPerDayPerUser: number;
}

class BBPSService {
  /**
   * Get list of BBPS providers
   */
  async getProviders(): Promise<Provider[]> {
    try {
      logger.info('[BBPS] Fetching providers...');
      const response = await apiClient.get<Provider[]>('admin/bbps/providers');

      if (response.success && response.data) {
        logger.info('[BBPS] Providers fetched successfully');
        // Backend wraps: data: { providers: [...], total: N }
        const providers = (response.data as any).providers ?? response.data;
        return Array.isArray(providers) ? providers : [];
      }

      throw new Error(response.message || 'Failed to get providers');
    } catch (error: any) {
      logger.error('[BBPS] Get providers error:', error.message);
      throw new Error(error.message || 'Failed to get providers');
    }
  }

  /**
   * Create a new BBPS provider
   */
  async createProvider(provider: Omit<Provider, '_id'>): Promise<Provider> {
    try {
      logger.info('[BBPS] Creating provider:', { name: provider.name });
      const response = await apiClient.post<Provider>('admin/bbps/providers', provider);

      if (response.success && response.data) {
        return response.data;
      }

      throw new Error(response.message || 'Failed to create provider');
    } catch (error: any) {
      logger.error('[BBPS] Create provider error:', error.message);
      throw new Error(error.message || 'Failed to create provider');
    }
  }

  /**
   * Update a BBPS provider
   */
  async updateProvider(providerId: string, updates: Partial<Provider>): Promise<Provider> {
    try {
      logger.info('[BBPS] Updating provider:', { providerId });
      const response = await apiClient.put<Provider>(`admin/bbps/providers/${providerId}`, updates);

      if (response.success && response.data) {
        return response.data;
      }

      throw new Error(response.message || 'Failed to update provider');
    } catch (error: any) {
      logger.error('[BBPS] Update provider error:', error.message);
      throw new Error(error.message || 'Failed to update provider');
    }
  }

  /**
   * Toggle provider active status
   */
  async toggleProviderStatus(
    providerId: string
  ): Promise<{ success: boolean; message: string; isActive?: boolean }> {
    try {
      logger.info('[BBPS] Toggling provider status:', { providerId });
      const response = await apiClient.patch<any>(`admin/bbps/providers/${providerId}/toggle`);

      return {
        success: response.success,
        message: response.message || 'Provider status toggled',
        isActive: response.data?.isActive,
      };
    } catch (error: any) {
      logger.error('[BBPS] Toggle provider error:', error.message);
      throw new Error(error.message || 'Failed to toggle provider');
    }
  }

  /**
   * Get transactions with pagination
   */
  async getTransactions(
    page: number = 1,
    limit: number = 20
  ): Promise<{ transactions: Transaction[]; pagination: any }> {
    try {
      logger.info('[BBPS] Fetching transactions...');
      const response = await apiClient.get<{ transactions: Transaction[]; total: number }>(
        `admin/bbps/transactions?page=${page}&limit=${limit}`
      );

      if (response.success && response.data) {
        return {
          transactions: response.data.transactions || [],
          pagination: {
            page,
            limit,
            total: response.data.total || 0,
            totalPages: Math.ceil((response.data.total || 0) / limit),
          },
        };
      }

      throw new Error(response.message || 'Failed to get transactions');
    } catch (error: any) {
      logger.error('[BBPS] Get transactions error:', error.message);
      throw new Error(error.message || 'Failed to get transactions');
    }
  }

  /**
   * Refund a transaction
   */
  async refundTransaction(transactionId: string): Promise<{ success: boolean; message: string }> {
    try {
      logger.info('[BBPS] Refunding transaction:', { transactionId });
      const response = await apiClient.post<any>(`admin/bbps/transactions/${transactionId}/refund`);

      return {
        success: response.success,
        message: response.message || 'Refund processed',
      };
    } catch (error: any) {
      logger.error('[BBPS] Refund transaction error:', error.message);
      throw new Error(error.message || 'Failed to refund transaction');
    }
  }

  /**
   * Get BBPS analytics
   * NOTE: Backend does not have a dedicated /admin/bbps/analytics endpoint.
   * The available backend endpoint is /admin/bbps/stats — use that instead.
   */
  async getAnalytics(period: string = '30d'): Promise<BBPSAnalytics> {
    try {
      logger.info('[BBPS] Fetching stats (analytics) for period:', { period });
      // Backend serves stats at /admin/bbps/stats (no period filter supported)
      const response = await apiClient.get<any>(`admin/bbps/stats`);

      if (response.success && response.data) {
        // Map backend stats shape to expected BBPSAnalytics shape
        const data = response.data;
        return {
          period,
          kpi: {
            gmv: data.overview?.totalVolume ?? 0,
            gmvChange: 0,
            transactions: data.overview?.totalTransactions ?? 0,
            transactionsChange: 0,
            failureRate: 0,
            failureRateChange: 0,
            coinsIssued: data.overview?.totalCoinsIssued ?? 0,
            coinsIssuedChange: 0,
          },
          dailyGMV: [],
          byBillType:
            data.byType?.reduce((acc: Record<string, number>, t: any) => {
              acc[t._id] = t.volume ?? 0;
              return acc;
            }, {}) ?? {},
          coinsMetrics: { issued: data.overview?.totalCoinsIssued ?? 0, redeemed: 0 },
          topProviders: [],
        } as BBPSAnalytics;
      }

      throw new Error(response.message || 'Failed to get analytics');
    } catch (error: any) {
      logger.error('[BBPS] Get analytics error:', error.message);
      throw new Error(error.message || 'Failed to get analytics');
    }
  }

  /**
   * Get BBPS configuration
   * Calls GET /admin/bbps/config. Returns a structured error if the endpoint
   * is not yet available on the backend (404).
   */
  async getConfig(): Promise<BBPSConfig | { success: false; error: string }> {
    try {
      logger.info('[BBPS] Fetching config...');
      const response = await apiClient.get<BBPSConfig>('admin/bbps/config');

      if (response.success && response.data) {
        return response.data;
      }

      return {
        success: false,
        error: response.message || 'Failed to load BBPS configuration.',
      };
    } catch (error: any) {
      logger.error('[BBPS] Get config error:', error.message);
      return {
        success: false,
        error: error.message || 'Failed to load BBPS configuration.',
      };
    }
  }

  /**
   * Update BBPS configuration
   * Calls PUT /admin/bbps/config. Returns a structured error if the endpoint
   * is not yet available on the backend (404).
   */
  async updateConfig(
    config: Partial<BBPSConfig>
  ): Promise<BBPSConfig | { success: false; error: string }> {
    try {
      logger.info('[BBPS] Updating config...');
      const response = await apiClient.put<BBPSConfig>('admin/bbps/config', config);

      if (response.success && response.data) {
        return response.data;
      }

      return {
        success: false,
        error: response.message || 'Failed to update BBPS configuration.',
      };
    } catch (error: any) {
      logger.error('[BBPS] Update config error:', error.message);
      return {
        success: false,
        error: error.message || 'Failed to update BBPS configuration.',
      };
    }
  }
}

export const bbpsService = new BBPSService();
export default bbpsService;
