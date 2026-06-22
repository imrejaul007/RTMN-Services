/**
 * Merchant Service Client for Capital Service
 * Provides typed access to the merchant service API
 */

import axios, { AxiosInstance } from 'axios';

// Configuration
const MERCHANT_SERVICE_URL = process.env.MERCHANT_SERVICE_URL || 'http://localhost:3004';
const INTERNAL_SERVICE_TOKEN = process.env.INTERNAL_SERVICE_TOKEN || '';

// Types
export interface Merchant {
  _id: string;
  merchantId: string;
  name: string;
  ownerId: string;
  email: string;
  phone?: string;
  stores: string[];
  businessType?: string;
  registrationNumber?: string;
  taxId?: string;
  settings?: Record<string, unknown>;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface MerchantStore {
  _id: string;
  storeId: string;
  name: string;
  merchantId: string;
  address?: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
    coordinates?: { lat: number; lng: number };
  };
  timezone?: string;
  isActive: boolean;
  settings?: Record<string, unknown>;
}

export interface MerchantFinancials {
  merchantId: string;
  monthlyRevenue: number;
  averageOrderValue: number;
  orderCount: number;
  paymentProcessingVolume: number;
  refundRate: number;
  customerCount: number;
  activeDays: number;
  lastActivity: Date;
}

export interface MerchantHealth {
  merchantId: string;
  healthScore: number;
  riskLevel: 'low' | 'medium' | 'high';
  factors: Array<{
    name: string;
    score: number;
    weight: number;
  }>;
  lastUpdated: Date;
}

export class MerchantClient {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: MERCHANT_SERVICE_URL,
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
        'x-internal-token': INTERNAL_SERVICE_TOKEN,
        'x-internal-service': 'rez-capital-service',
      },
    });
  }

  /**
   * Get merchant by ID
   */
  async getMerchant(merchantId: string): Promise<Merchant> {
    const response = await this.client.get(`/merchants/${merchantId}`);
    return response.data;
  }

  /**
   * Get stores for a merchant
   */
  async getMerchantStores(merchantId: string): Promise<MerchantStore[]> {
    const response = await this.client.get(`/merchants/${merchantId}/stores`);
    return response.data.stores || response.data;
  }

  /**
   * Get merchant financial data
   */
  async getMerchantFinancials(merchantId: string): Promise<MerchantFinancials> {
    const response = await this.client.get(`/merchants/${merchantId}/financials`);
    return response.data;
  }

  /**
   * Get merchant health metrics
   */
  async getMerchantHealth(merchantId: string): Promise<MerchantHealth> {
    const response = await this.client.get(`/merchants/${merchantId}/health`);
    return response.data;
  }

  /**
   * Get merchant revenue history
   */
  async getMerchantRevenueHistory(
    merchantId: string,
    startDate: Date,
    endDate: Date
  ): Promise<Array<{ date: Date; revenue: number; orderCount: number }>> {
    const response = await this.client.get(`/merchants/${merchantId}/revenue`, {
      params: {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      },
    });
    return response.data;
  }

  /**
   * Get merchant analytics summary
   */
  async getMerchantAnalytics(merchantId: string): Promise<{
    totalRevenue: number;
    averageOrderValue: number;
    totalOrders: number;
    customerRetention: number;
    growthRate: number;
  }> {
    const response = await this.client.get(`/merchants/${merchantId}/analytics`);
    return response.data;
  }

  /**
   * Get store by ID
   */
  async getStore(storeId: string): Promise<MerchantStore> {
    const response = await this.client.get(`/stores/${storeId}`);
    return response.data;
  }

  /**
   * Verify merchant eligibility for capital
   */
  async verifyMerchantEligibility(merchantId: string): Promise<{
    eligible: boolean;
    reason?: string;
    maxLoanAmount?: number;
    terms?: string;
  }> {
    const response = await this.client.get(`/merchants/${merchantId}/capital/eligibility`);
    return response.data;
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<boolean> {
    try {
      const response = await this.client.get('/health');
      return response.data.status === 'ok' || response.data.status === 'healthy';
    } catch {
      return false;
    }
  }
}

// Singleton instance
let merchantClient: MerchantClient | null = null;

export function getMerchantClient(): MerchantClient {
  if (!merchantClient) {
    merchantClient = new MerchantClient();
  }
  return merchantClient;
}

export default MerchantClient;
