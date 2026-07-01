/**
 * Marketing Department Pack - Runtime Connector
 *
 * This connector delegates to the actual Marketing OS service (5500).
 * Provides marketing automation for Company OS tenants.
 */

import axios, { AxiosInstance } from 'axios';

export interface MarketingConfig {
  marketingOsUrl: string;
  tenantId: string;
  apiKey?: string;
}

export interface Campaign {
  id: string;
  name: string;
  type: 'email' | 'sms' | 'whatsapp' | 'push' | 'social' | 'multi-channel';
  status: 'draft' | 'scheduled' | 'running' | 'completed' | 'paused';
  budget?: number;
  startDate?: string;
  endDate?: string;
  audienceId?: string;
  createdAt: string;
}

export interface Audience {
  id: string;
  name: string;
  description?: string;
  filters: any;
  size: number;
  createdAt: string;
}

export interface Journey {
  id: string;
  name: string;
  status: 'active' | 'inactive' | 'draft';
  trigger: {
    type: 'event' | 'schedule' | 'manual';
    config: any;
  };
  steps: JourneyStep[];
  createdAt: string;
}

export interface JourneyStep {
  id: string;
  type: 'email' | 'sms' | 'whatsapp' | 'delay' | 'condition' | 'webhook';
  config: any;
  next?: string[];
}

export interface Content {
  id: string;
  title: string;
  type: 'email' | 'sms' | 'social' | 'blog' | 'landing-page';
  content: string;
  status: 'draft' | 'published';
  createdAt: string;
}

export interface Brand {
  id: string;
  name: string;
  logo?: string;
  colors: {
    primary: string;
    secondary: string;
    accent: string;
  };
  fonts: {
    heading: string;
    body: string;
  };
  tagline?: string;
}

export class MarketingRuntimeConnector {
  private client: AxiosInstance;
  private tenantId: string;

  constructor(config: MarketingConfig) {
    this.tenantId = config.tenantId;
    this.client = axios.create({
      baseURL: config.marketingOsUrl,
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
        'X-Tenant-ID': config.tenantId,
        ...(config.apiKey && { 'Authorization': `Bearer ${config.apiKey}` }),
      },
    });
  }

  // ============================================
  // CAMPAIGNS
  // ============================================

  async listCampaigns(filters?: { status?: string; type?: string }): Promise<Campaign[]> {
    const params = new URLSearchParams();
    if (filters?.status) params.append('status', filters.status);
    if (filters?.type) params.append('type', filters.type);

    const response = await this.client.get(`/api/campaigns?${params.toString()}`);
    return response.data.campaigns || [];
  }

  async getCampaign(id: string): Promise<Campaign | null> {
    try {
      const response = await this.client.get(`/api/campaigns/${id}`);
      return response.data.campaign || null;
    } catch {
      return null;
    }
  }

  async createCampaign(data: Partial<Campaign>): Promise<Campaign> {
    const response = await this.client.post('/api/campaigns', data);
    return response.data.campaign;
  }

  async updateCampaign(id: string, data: Partial<Campaign>): Promise<Campaign> {
    const response = await this.client.put(`/api/campaigns/${id}`, data);
    return response.data.campaign;
  }

  async launchCampaign(id: string): Promise<Campaign> {
    const response = await this.client.post(`/api/campaigns/${id}/launch`);
    return response.data.campaign;
  }

  async pauseCampaign(id: string): Promise<Campaign> {
    const response = await this.client.post(`/api/campaigns/${id}/pause`);
    return response.data.campaign;
  }

  async getCampaignAnalytics(id: string): Promise<any> {
    const response = await this.client.get(`/api/campaigns/${id}/analytics`);
    return response.data;
  }

  // ============================================
  // AUDIENCES
  // ============================================

  async listAudiences(): Promise<Audience[]> {
    const response = await this.client.get('/api/audiences');
    return response.data.audiences || [];
  }

  async getAudience(id: string): Promise<Audience | null> {
    try {
      const response = await this.client.get(`/api/audiences/${id}`);
      return response.data.audience || null;
    } catch {
      return null;
    }
  }

  async createAudience(data: Partial<Audience>): Promise<Audience> {
    const response = await this.client.post('/api/audiences', data);
    return response.data.audience;
  }

  async updateAudience(id: string, data: Partial<Audience>): Promise<Audience> {
    const response = await this.client.put(`/api/audiences/${id}`, data);
    return response.data.audience;
  }

  async refreshAudience(id: string): Promise<Audience> {
    const response = await this.client.post(`/api/audiences/${id}/refresh`);
    return response.data.audience;
  }

  // ============================================
  // JOURNEYS
  // ============================================

  async listJourneys(): Promise<Journey[]> {
    const response = await this.client.get('/api/journeys');
    return response.data.journeys || [];
  }

  async getJourney(id: string): Promise<Journey | null> {
    try {
      const response = await this.client.get(`/api/journeys/${id}`);
      return response.data.journey || null;
    } catch {
      return null;
    }
  }

  async createJourney(data: Partial<Journey>): Promise<Journey> {
    const response = await this.client.post('/api/journeys', data);
    return response.data.journey;
  }

  async updateJourney(id: string, data: Partial<Journey>): Promise<Journey> {
    const response = await this.client.put(`/api/journeys/${id}`, data);
    return response.data.journey;
  }

  async activateJourney(id: string): Promise<Journey> {
    const response = await this.client.post(`/api/journeys/${id}/activate`);
    return response.data.journey;
  }

  async deactivateJourney(id: string): Promise<Journey> {
    const response = await this.client.post(`/api/journeys/${id}/deactivate`);
    return response.data.journey;
  }

  // ============================================
  // CONTENT
  // ============================================

  async listContent(filters?: { type?: string; status?: string }): Promise<Content[]> {
    const params = new URLSearchParams();
    if (filters?.type) params.append('type', filters.type);
    if (filters?.status) params.append('status', filters.status);

    const response = await this.client.get(`/api/content?${params.toString()}`);
    return response.data.content || [];
  }

  async createContent(data: Partial<Content>): Promise<Content> {
    const response = await this.client.post('/api/content', data);
    return response.data.content;
  }

  async updateContent(id: string, data: Partial<Content>): Promise<Content> {
    const response = await this.client.put(`/api/content/${id}`, data);
    return response.data.content;
  }

  // ============================================
  // BRAND MANAGEMENT
  // ============================================

  async getBrand(): Promise<Brand | null> {
    try {
      const response = await this.client.get('/api/brand');
      return response.data.brand || null;
    } catch {
      return null;
    }
  }

  async updateBrand(data: Partial<Brand>): Promise<Brand> {
    const response = await this.client.put('/api/brand', data);
    return response.data.brand;
  }

  // ============================================
  // ANALYTICS
  // ============================================

  async getDashboard(): Promise<any> {
    const response = await this.client.get('/api/dashboard');
    return response.data;
  }

  async getROI(): Promise<any> {
    const response = await this.client.get('/api/analytics/roi');
    return response.data;
  }

  // ============================================
  // HEALTH CHECK
  // ============================================

  async healthCheck(): Promise<boolean> {
    try {
      const response = await this.client.get('/health');
      return response.data.status === 'healthy';
    } catch {
      return false;
    }
  }
}

// ============================================
// DEFAULT EXPORT
// ============================================

export function createMarketingConnector(tenantId: string): MarketingRuntimeConnector {
  return new MarketingRuntimeConnector({
    marketingOsUrl: process.env.MARKETING_OS_URL || 'http://localhost:5500',
    tenantId,
    apiKey: process.env.INTERNAL_SERVICE_TOKEN,
  });
}

export default MarketingRuntimeConnector;
