import axios, { AxiosInstance } from 'axios';

// ============================================================================
// RTNM BRIDGE SERVICE - Integration with RTNM Gateway
// ============================================================================

export interface RTNMConfig {
  gatewayUrl: string;
  internalToken: string;
  serviceName: string;
}

export interface BrandContext {
  brandId: string;
  name: string;
  industry: string;
  sentiment: {
    score: number;
    label: string;
    trend: string;
  };
}

export interface CustomerContext {
  customerId: string;
  loyaltyTier: string;
  sentimentScore: number;
  totalSpending: number;
}

export class RTNMBridgeService {
  private client: AxiosInstance;
  private config: RTNMConfig;

  constructor() {
    const gatewayUrl = process.env.RTNM_GATEWAY_URL || 'http://localhost:4600';
    const internalToken = process.env.INTERNAL_SERVICE_TOKEN || throw new Error("rtnm-bridge.service.ts: INTERNAL_SERVICE_TOKEN env var is required");

    this.config = {
      gatewayUrl,
      internalToken,
      serviceName: 'brandpulse'
    };

    this.client = axios.create({
      baseURL: gatewayUrl,
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
        'X-Internal-Token': internalToken,
        'X-Source': 'brandpulse'
      }
    });

    // Request interceptor
    this.client.interceptors.request.use(
      (config) => {
        console.log(`[RTNM Bridge] ${config.method?.toUpperCase()} ${config.url}`);
        return config;
      },
      (error) => {
        console.error('[RTNM Bridge] Request error:', error);
        return Promise.reject(error);
      }
    );

    // Response interceptor
    this.client.interceptors.response.use(
      (response) => response,
      (error) => {
        console.error('[RTNM Bridge] Response error:', error.response?.data || error.message);
        return Promise.reject(error);
      }
    );
  }

  /**
   * Get brand context from RTNM
   */
  async getBrandContext(brandId: string): Promise<BrandContext | null> {
    try {
      const response = await this.client.get(`/api/brand/${brandId}/context`);
      return response.data;
    } catch (error) {
      console.warn(`[RTNM Bridge] Failed to get brand context: ${brandId}`);
      return null;
    }
  }

  /**
   * Get customer context from RTNM
   */
  async getCustomerContext(customerId: string): Promise<CustomerContext | null> {
    try {
      const response = await this.client.get(`/api/customer/${customerId}/context`);
      return response.data;
    } catch (error) {
      console.warn(`[RTNM Bridge] Failed to get customer context: ${customerId}`);
      return null;
    }
  }

  /**
   * Emit sentiment signal to RTNM
   */
  async emitSentimentSignal(params: {
    brandId: string;
    customerId?: string;
    sentiment: number;
    label: string;
    source: string;
    reviewId?: string;
  }): Promise<boolean> {
    try {
      await this.client.post('/api/signals/sentiment', {
        type: 'sentiment',
        brandId: params.brandId,
        customerId: params.customerId,
        data: {
          sentiment: params.sentiment,
          label: params.label,
          source: params.source,
          reviewId: params.reviewId
        },
        source: 'brandpulse',
        timestamp: new Date().toISOString()
      });

      return true;
    } catch (error) {
      console.error('[RTNM Bridge] Failed to emit sentiment signal');
      return false;
    }
  }

  /**
   * Emit review signal to RTNM
   */
  async emitReviewSignal(params: {
    brandId: string;
    customerId?: string;
    rating: number;
    reviewId: string;
    sentiment: number;
  }): Promise<boolean> {
    try {
      await this.client.post('/api/signals/review', {
        type: 'review',
        brandId: params.brandId,
        customerId: params.customerId,
        data: {
          rating: params.rating,
          reviewId: params.reviewId,
          sentiment: params.sentiment
        },
        source: 'brandpulse',
        timestamp: new Date().toISOString()
      });

      return true;
    } catch (error) {
      console.error('[RTNM Bridge] Failed to emit review signal');
      return false;
    }
  }

  /**
   * Send alert to RTNM
   */
  async sendAlert(params: {
    brandId: string;
    type: 'negative_spike' | 'low_rating' | 'alert';
    severity: 'low' | 'medium' | 'high' | 'critical';
    message: string;
    data?: Record<string, any>;
  }): Promise<boolean> {
    try {
      await this.client.post('/api/alerts', {
        source: 'brandpulse',
        brandId: params.brandId,
        type: params.type,
        severity: params.severity,
        message: params.message,
        data: params.data,
        timestamp: new Date().toISOString()
      });

      return true;
    } catch (error) {
      console.error('[RTNM Bridge] Failed to send alert');
      return false;
    }
  }

  /**
   * Sync brand data with RTNM
   */
  async syncBrand(params: {
    brandId: string;
    name: string;
    industry: string;
    sentimentScore: number;
    totalReviews: number;
    averageRating: number;
  }): Promise<boolean> {
    try {
      await this.client.post('/api/brand/sync', {
        source: 'brandpulse',
        ...params,
        timestamp: new Date().toISOString()
      });

      return true;
    } catch (error) {
      console.error('[RTNM Bridge] Failed to sync brand');
      return false;
    }
  }

  /**
   * Get loyalty integration settings
   */
  async getLoyaltyIntegration(brandId: string): Promise<{
    enabled: boolean;
    rewardPoints: number;
    tierThresholds: Record<string, number>;
  } | null> {
    try {
      const response = await this.client.get(`/api/brand/${brandId}/loyalty`);
      return response.data;
    } catch (error) {
      return null;
    }
  }

  /**
   * Enroll customer in sentiment rewards
   */
  async enrollInRewards(params: {
    brandId: string;
    customerId: string;
    sentimentContribution: number;
  }): Promise<boolean> {
    try {
      await this.client.post('/api/loyalty/sentiment-reward', {
        brandId: params.brandId,
        customerId: params.customerId,
        sentimentContribution: params.sentimentContribution,
        source: 'brandpulse'
      });

      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Health check with RTNM Gateway
   */
  async healthCheck(): Promise<boolean> {
    try {
      const response = await this.client.get('/health', { timeout: 5000 });
      return response.status === 200;
    } catch {
      return false;
    }
  }
}

export const rtnmBridge = new RTNMBridgeService();
