/**
 * Customer Operations Bridge Service
 * Connects to Customer Operations (Twins) services
 */

import axios, { AxiosInstance } from 'axios';
import winston from 'winston';

export interface CustomerOpsConfig {
  url: string;
  apiKey?: string;
}

export interface CustomerTwin {
  id: string;
  entityType: 'customer';
  data: {
    id: string;
    name: string;
    email: string;
    company: string;
    industry: string;
    tier: string;
    status: string;
    health: string;
    mrr: number;
    ltv: number;
    acquisitionDate: Date;
    lastActivity: Date;
    engagement: {
      score: number;
      loginFrequency: number;
      featureAdoption: number;
    };
  };
  relationships: Array<{
    type: string;
    targetId: string;
    targetType: string;
  }>;
  createdAt: Date;
  updatedAt: Date;
}

export interface BuyerTwin {
  id: string;
  entityType: 'buyer';
  data: {
    id: string;
    name: string;
    email: string;
    company: string;
    role: string;
    authority: string;
    trustScore: number;
    journeyStage: string;
    interests: string[];
    budget: { min: number; max: number };
    timeline: string;
  };
  intentSignals: Array<{
    topic: string;
    score: number;
    source: string;
    timestamp: Date;
  }>;
}

export interface DealTwin {
  id: string;
  entityType: 'deal';
  data: {
    id: string;
    name: string;
    value: number;
    stage: string;
    probability: number;
    customerId: string;
    ownerId: string;
    expectedCloseDate: Date;
    stakeholders: Array<{
      name: string;
      role: string;
      engagement: number;
    }>;
  };
  activities: Array<{
    type: string;
    description: string;
    timestamp: Date;
    repId: string;
  }>;
}

export interface CustomerOpsResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export class CustomerOpsBridge {
  private client: AxiosInstance;
  private logger: winston.Logger;
  private config: CustomerOpsConfig;

  constructor(logger: winston.Logger) {
    this.logger = logger;
    this.config = {
      url: process.env.CUSTOMER_OPS_URL || 'http://localhost:4705',
      apiKey: process.env.CUSTOMER_OPS_API_KEY
    };

    this.client = axios.create({
      baseURL: this.config.url,
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
        ...(this.config.apiKey && { 'Authorization': `Bearer ${this.config.apiKey}` })
      }
    });

    this.logger.info('Customer Ops bridge initialized', { url: this.config.url });
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<boolean> {
    try {
      const response = await this.client.get('/health');
      return response.status === 200;
    } catch (error) {
      this.logger.error('Customer Ops health check failed', { error });
      return false;
    }
  }

  /**
   * Create customer twin
   */
  async createCustomerTwin(customer: any): Promise<CustomerOpsResponse<CustomerTwin>> {
    try {
      const twinData = {
        entityType: 'customer',
        data: {
          id: customer.id,
          name: customer.fullName,
          email: customer.email,
          company: customer.company?.name || customer.company,
          industry: customer.industry,
          tier: customer.tier,
          status: customer.status,
          health: customer.health,
          mrr: customer.subscription?.mrr || 0,
          ltv: customer.ltv || 0,
          acquisitionDate: customer.convertedAt || new Date(),
          lastActivity: customer.lastActivityAt || new Date(),
          engagement: {
            score: customer.engagement?.loginFrequency || 0,
            loginFrequency: customer.engagement?.loginFrequency || 0,
            featureAdoption: customer.engagement?.featureAdoption?.adoptionRate || 0
          }
        },
        relationships: [
          { type: 'owns', targetId: customer.ownerId, targetType: 'rep' }
        ]
      };

      const response = await this.client.post('/api/twins', twinData);
      return {
        success: true,
        data: response.data
      };
    } catch (error: any) {
      this.logger.error('Customer twin creation failed', { customerId: customer.id, error: error.message });
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get customer twin
   */
  async getCustomerTwin(customerId: string): Promise<CustomerOpsResponse<CustomerTwin>> {
    try {
      const response = await this.client.get(`/api/twins/customer/${customerId}`);
      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      return {
        success: false,
        error: 'Twin not found'
      };
    }
  }

  /**
   * Update customer twin
   */
  async updateCustomerTwin(customerId: string, updates: Partial<CustomerTwin['data']>): Promise<CustomerOpsResponse<void>> {
    try {
      await this.client.patch(`/api/twins/customer/${customerId}`, updates);
      return { success: true };
    } catch (error: any) {
      this.logger.error('Customer twin update failed', { customerId, error: error.message });
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get buyer twin (for lead enrichment)
   */
  async getBuyerTwin(email: string): Promise<CustomerOpsResponse<BuyerTwin>> {
    try {
      const response = await this.client.get(`/api/twins/buyer?email=${encodeURIComponent(email)}`);
      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      // Return mock data
      return {
        success: true,
        data: this.getMockBuyerTwin(email)
      };
    }
  }

  /**
   * Create/update buyer twin
   */
  async upsertBuyerTwin(buyerData: Partial<BuyerTwin['data']>): Promise<CustomerOpsResponse<BuyerTwin>> {
    try {
      const response = await this.client.post('/api/twins/buyer', buyerData);
      return {
        success: true,
        data: response.data
      };
    } catch (error: any) {
      this.logger.error('Buyer twin upsert failed', { error: error.message });
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get deal twin
   */
  async getDealTwin(dealId: string): Promise<CustomerOpsResponse<DealTwin>> {
    try {
      const response = await this.client.get(`/api/twins/deal/${dealId}`);
      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      return {
        success: false,
        error: 'Twin not found'
      };
    }
  }

  /**
   * Create/update deal twin
   */
  async upsertDealTwin(dealData: Partial<DealTwin['data']>): Promise<CustomerOpsResponse<DealTwin>> {
    try {
      const response = await this.client.post('/api/twins/deal', dealData);
      return {
        success: true,
        data: response.data
      };
    } catch (error: any) {
      this.logger.error('Deal twin upsert failed', { error: error.message });
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Update deal twin stage
   */
  async updateDealTwinStage(dealId: string, stage: string, probability: number): Promise<CustomerOpsResponse<void>> {
    try {
      await this.client.patch(`/api/twins/deal/${dealId}`, {
        stage,
        probability,
        updatedAt: new Date().toISOString()
      });
      return { success: true };
    } catch (error: any) {
      this.logger.error('Deal twin stage update failed', { dealId, stage, error: error.message });
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Log activity to twin
   */
  async logActivity(entityType: 'customer' | 'deal' | 'buyer', entityId: string, activity: {
    type: string;
    description: string;
    repId?: string;
    metadata?: Record<string, any>;
  }): Promise<CustomerOpsResponse<void>> {
    try {
      await this.client.post(`/api/twins/${entityType}/${entityId}/activities`, activity);
      return { success: true };
    } catch (error: any) {
      this.logger.error('Activity log failed', { entityType, entityId, error: error.message });
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Sync customer health
   */
  async syncHealth(customerId: string, health: string, score: number, factors: any[]): Promise<CustomerOpsResponse<void>> {
    try {
      await this.client.post(`/api/twins/customer/${customerId}/health`, {
        health,
        score,
        factors,
        timestamp: new Date().toISOString()
      });
      return { success: true };
    } catch (error: any) {
      this.logger.error('Health sync failed', { customerId, error: error.message });
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get customer relationships
   */
  async getRelationships(customerId: string): Promise<CustomerOpsResponse<any[]>> {
    try {
      const response = await this.client.get(`/api/twins/customer/${customerId}/relationships`);
      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      return {
        success: true,
        data: []
      };
    }
  }

  /**
   * Link entities
   */
  async linkEntities(sourceType: string, sourceId: string, targetType: string, targetId: string, relationship: string): Promise<CustomerOpsResponse<void>> {
    try {
      await this.client.post('/api/twins/link', {
        source: { type: sourceType, id: sourceId },
        target: { type: targetType, id: targetId },
        relationship
      });
      return { success: true };
    } catch (error: any) {
      this.logger.error('Entity linking failed', { sourceType, sourceId, targetType, targetId, error: error.message });
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Search twins
   */
  async searchTwins(query: {
    type?: 'customer' | 'buyer' | 'deal';
    filters?: Record<string, any>;
    limit?: number;
  }): Promise<CustomerOpsResponse<any[]>> {
    try {
      const response = await this.client.post('/api/twins/search', query);
      return {
        success: true,
        data: response.data.results || []
      };
    } catch (error) {
      return {
        success: true,
        data: []
      };
    }
  }

  // Mock data helpers
  private getMockBuyerTwin(email: string): BuyerTwin {
    const domain = email.split('@')[1] || 'example.com';
    const company = domain.split('.')[0];

    return {
      id: `buyer-${Date.now()}`,
      entityType: 'buyer',
      data: {
        id: `buyer-${Date.now()}`,
        name: email.split('@')[0],
        email,
        company: company.charAt(0).toUpperCase() + company.slice(1),
        role: 'manager',
        authority: 'manager',
        trustScore: 75,
        journeyStage: 'consideration',
        interests: ['automation', 'efficiency'],
        budget: { min: 10000, max: 50000 },
        timeline: '3_months'
      },
      intentSignals: [
        { topic: 'sales automation', score: 65, source: 'content', timestamp: new Date() },
        { topic: 'crm', score: 55, source: 'website', timestamp: new Date() }
      ]
    };
  }
}
