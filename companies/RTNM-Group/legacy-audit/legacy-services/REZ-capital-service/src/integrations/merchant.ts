/**
 * Merchant Service Integration for Capital Service
 * Manages connection to the merchant service
 */

import { getMerchantClient, MerchantClient, MerchantHealth } from '../clients/merchantClient';
import logger from '../utils/logger';

export interface MerchantIntegrationConfig {
  serviceUrl: string;
  timeout: number;
  retries: number;
}

const defaultConfig: MerchantIntegrationConfig = {
  serviceUrl: process.env.MERCHANT_SERVICE_URL || 'http://localhost:3004',
  timeout: 10000,
  retries: 3,
};

/**
 * Merchant Integration class
 * Provides high-level integration with the merchant service
 */
export class MerchantIntegration {
  private client: MerchantClient;
  private config: MerchantIntegrationConfig;

  constructor(config: Partial<MerchantIntegrationConfig> = {}) {
    this.config = { ...defaultConfig, ...config };
    this.client = getMerchantClient();
  }

  /**
   * Get the merchant client instance
   */
  getClient(): MerchantClient {
    return this.client;
  }

  /**
   * Health check for the merchant service
   */
  async healthCheck(): Promise<{ healthy: boolean; latency?: number; error?: string }> {
    const start = Date.now();
    try {
      const healthy = await this.client.healthCheck();
      return {
        healthy,
        latency: Date.now() - start,
      };
    } catch (error) {
      return {
        healthy: false,
        latency: Date.now() - start,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Get merchant credit eligibility data
   */
  async getMerchantCreditData(merchantId: string): Promise<{
    eligible: boolean;
    merchant?: {
      id: string;
      name: string;
      active: boolean;
      storeCount: number;
    };
    financials?: {
      monthlyRevenue: number;
      averageOrderValue: number;
      orderCount: number;
      paymentVolume: number;
      refundRate: number;
    };
    health?: MerchantHealth;
    error?: string;
  }> {
    try {
      const merchant = await this.client.getMerchant(merchantId);
      const stores = await this.client.getMerchantStores(merchantId);
      const financials = await this.client.getMerchantFinancials(merchantId);
      const health = await this.client.getMerchantHealth(merchantId);

      return {
        eligible: merchant.isActive,
        merchant: {
          id: merchant.merchantId,
          name: merchant.name,
          active: merchant.isActive,
          storeCount: stores.length,
        },
        financials: {
          monthlyRevenue: financials.monthlyRevenue,
          averageOrderValue: financials.averageOrderValue,
          orderCount: financials.orderCount,
          paymentVolume: financials.paymentProcessingVolume,
          refundRate: financials.refundRate,
        },
        health,
      };
    } catch (error) {
      logger.error('[MerchantIntegration] Error getting merchant credit data', {
        merchantId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return {
        eligible: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Get merchant revenue for risk assessment
   */
  async getMerchantRevenueForRiskAssessment(
    merchantId: string,
    months: number = 6
  ): Promise<{
    revenue: number;
    growth: number;
    stability: number;
    trends: Array<{ month: string; revenue: number }>;
  }> {
    try {
      const endDate = new Date();
      const startDate = new Date();
      startDate.setMonth(startDate.getMonth() - months);

      const history = await this.client.getMerchantRevenueHistory(merchantId, startDate, endDate);

      // Calculate totals and trends
      const totalRevenue = history.reduce((sum, h) => sum + h.revenue, 0);
      const avgRevenue = totalRevenue / (history.length || 1);

      // Calculate growth rate
      let growth = 0;
      if (history.length >= 2) {
        const recent = history.slice(-3).reduce((s, h) => s + h.revenue, 0) / 3;
        const older = history.slice(0, 3).reduce((s, h) => s + h.revenue, 0) / 3;
        growth = older > 0 ? ((recent - older) / older) * 100 : 0;
      }

      // Calculate stability (coefficient of variation)
      const variance = history.reduce((sum, h) => sum + Math.pow(h.revenue - avgRevenue, 2), 0) / (history.length || 1);
      const stdDev = Math.sqrt(variance);
      const stability = avgRevenue > 0 ? Math.max(0, 100 - (stdDev / avgRevenue) * 100) : 0;

      return {
        revenue: totalRevenue,
        growth,
        stability,
        trends: history.map((h) => ({
          month: new Date(h.date).toISOString().slice(0, 7),
          revenue: h.revenue,
        })),
      };
    } catch (error) {
      logger.error('[MerchantIntegration] Error getting revenue for risk assessment', {
        merchantId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return {
        revenue: 0,
        growth: 0,
        stability: 0,
        trends: [],
      };
    }
  }

  /**
   * Verify merchant status
   */
  async verifyMerchant(merchantId: string): Promise<{
    verified: boolean;
    reason?: string;
  }> {
    try {
      const merchant = await this.client.getMerchant(merchantId);

      if (!merchant.isActive) {
        return { verified: false, reason: 'Merchant is not active' };
      }

      const stores = await this.client.getMerchantStores(merchantId);
      const activeStores = stores.filter((s) => s.isActive);

      if (activeStores.length === 0) {
        return { verified: false, reason: 'No active stores' };
      }

      return { verified: true };
    } catch (error) {
      return {
        verified: false,
        reason: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
}

// Singleton instance
let merchantIntegration: MerchantIntegration | null = null;

export function getMerchantIntegration(): MerchantIntegration {
  if (!merchantIntegration) {
    merchantIntegration = new MerchantIntegration();
  }
  return merchantIntegration;
}

export default MerchantIntegration;
