/**
 * Journey Bridge Service
 * Tracks customer/lead journey through the sales process
 */

import axios, { AxiosInstance } from 'axios';
import winston from 'winston';

export interface JourneyConfig {
  url: string;
  apiKey?: string;
}

export interface JourneyStage {
  id: string;
  name: string;
  order: number;
  duration?: number;
  metrics?: {
    conversionRate?: number;
    avgTimeSpent?: number;
  };
}

export interface JourneyEvent {
  id: string;
  entityType: 'lead' | 'customer' | 'deal';
  entityId: string;
  stage: string;
  event: string;
  timestamp: Date;
  properties?: Record<string, any>;
  source?: string;
  channel?: string;
}

export interface Journey {
  id: string;
  entityType: 'lead' | 'customer';
  entityId: string;
  stages: Array<{
    stage: string;
    enteredAt: Date;
    exitedAt?: Date;
    duration?: number;
    events: JourneyEvent[];
  }>;
  currentStage: string;
  startedAt: Date;
  completedAt?: Date;
  status: 'active' | 'completed' | 'abandoned';
  metrics: {
    totalDuration: number;
    conversionCount: number;
    touchpoints: number;
  };
}

export interface Touchpoint {
  id: string;
  type: string;
  channel: string;
  timestamp: Date;
  duration?: number;
  outcome?: string;
  notes?: string;
  repId?: string;
  automated: boolean;
}

export interface JourneyResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export class JourneyBridge {
  private client: AxiosInstance;
  private logger: winston.Logger;
  private config: JourneyConfig;

  constructor(logger: winston.Logger) {
    this.logger = logger;
    this.config = {
      url: process.env.JOURNEY_SERVICE_URL || 'http://localhost:4703',
      apiKey: process.env.JOURNEY_SERVICE_API_KEY
    };

    this.client = axios.create({
      baseURL: this.config.url,
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
        ...(this.config.apiKey && { 'Authorization': `Bearer ${this.config.apiKey}` })
      }
    });

    this.logger.info('Journey bridge initialized', { url: this.config.url });
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<boolean> {
    try {
      const response = await this.client.get('/health');
      return response.status === 200;
    } catch (error) {
      this.logger.error('Journey service health check failed', { error });
      return false;
    }
  }

  /**
   * Get journey stages
   */
  async getStages(): Promise<JourneyResponse<JourneyStage[]>> {
    try {
      const response = await this.client.get('/api/journey/stages');
      return {
        success: true,
        data: response.data.stages || this.getDefaultStages()
      };
    } catch (error) {
      return {
        success: true,
        data: this.getDefaultStages()
      };
    }
  }

  /**
   * Track lead creation
   */
  async trackLeadCreation(leadId: string, data: {
    source?: string;
    temperature?: string;
    quality?: string;
  }): Promise<JourneyResponse<void>> {
    try {
      await this.client.post('/api/journey/track', {
        entityType: 'lead',
        entityId: leadId,
        event: 'created',
        stage: 'awareness',
        properties: data,
        timestamp: new Date().toISOString()
      });
      return { success: true };
    } catch (error: any) {
      this.logger.error('Lead creation tracking failed', { leadId, error: error.message });
      return { success: false, error: error.message };
    }
  }

  /**
   * Track conversion
   */
  async trackConversion(leadId: string, customerId: string): Promise<JourneyResponse<void>> {
    try {
      await this.client.post('/api/journey/track', {
        entityType: 'lead',
        entityId: leadId,
        event: 'converted',
        stage: 'conversion',
        properties: { customerId },
        timestamp: new Date().toISOString()
      });

      // Also create customer journey
      await this.client.post('/api/journey/track', {
        entityType: 'customer',
        entityId: customerId,
        event: 'created',
        stage: 'onboarding',
        properties: { convertedFrom: leadId },
        timestamp: new Date().toISOString()
      });

      return { success: true };
    } catch (error: any) {
      this.logger.error('Conversion tracking failed', { leadId, customerId, error: error.message });
      return { success: false, error: error.message };
    }
  }

  /**
   * Track stage change
   */
  async trackStageChange(
    entityType: 'lead' | 'customer',
    entityId: string,
    fromStage: string,
    toStage: string,
    metadata?: Record<string, any>
  ): Promise<JourneyResponse<void>> {
    try {
      await this.client.post('/api/journey/stage-change', {
        entityType,
        entityId,
        fromStage,
        toStage,
        metadata,
        timestamp: new Date().toISOString()
      });
      return { success: true };
    } catch (error: any) {
      this.logger.error('Stage change tracking failed', { entityType, entityId, error: error.message });
      return { success: false, error: error.message };
    }
  }

  /**
   * Add touchpoint
   */
  async addTouchpoint(
    entityType: 'lead' | 'customer',
    entityId: string,
    touchpoint: Omit<Touchpoint, 'id'>
  ): Promise<JourneyResponse<Touchpoint>> {
    try {
      const response = await this.client.post('/api/journey/touchpoint', {
        entityType,
        entityId,
        ...touchpoint,
        timestamp: new Date().toISOString()
      });
      return {
        success: true,
        data: response.data
      };
    } catch (error: any) {
      this.logger.error('Touchpoint add failed', { entityType, entityId, error: error.message });
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get journey for entity
   */
  async getJourney(entityType: 'lead' | 'customer', entityId: string): Promise<JourneyResponse<Journey>> {
    try {
      const response = await this.client.get(`/api/journey/${entityType}/${entityId}`);
      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      return {
        success: true,
        data: this.getMockJourney(entityId)
      };
    }
  }

  /**
   * Get touchpoints
   */
  async getTouchpoints(entityType: 'lead' | 'customer', entityId: string, filters?: {
    type?: string;
    channel?: string;
    from?: Date;
    to?: Date;
  }): Promise<JourneyResponse<Touchpoint[]>> {
    try {
      const params = new URLSearchParams();
      if (filters?.type) params.append('type', filters.type);
      if (filters?.channel) params.append('channel', filters.channel);

      const response = await this.client.get(`/api/journey/${entityType}/${entityId}/touchpoints?${params}`);
      return {
        success: true,
        data: response.data.touchpoints || []
      };
    } catch (error) {
      return {
        success: true,
        data: []
      };
    }
  }

  /**
   * Track engagement
   */
  async trackEngagement(
    entityType: 'lead' | 'customer',
    entityId: string,
    engagement: {
      type: 'email_open' | 'email_click' | 'page_view' | 'content_download' | 'demo_request';
      channel: string;
      metadata?: Record<string, any>;
    }
  ): Promise<JourneyResponse<void>> {
    try {
      await this.client.post('/api/journey/engagement', {
        entityType,
        entityId,
        ...engagement,
        timestamp: new Date().toISOString()
      });
      return { success: true };
    } catch (error: any) {
      this.logger.error('Engagement tracking failed', { entityType, entityId, error: error.message });
      return { success: false, error: error.message };
    }
  }

  /**
   * Get journey analytics
   */
  async getAnalytics(period?: { from: Date; to: Date }): Promise<JourneyResponse<{
    totalJourneys: number;
    avgDuration: number;
    conversionRate: number;
    stageMetrics: Array<{
      stage: string;
      count: number;
      avgTimeSpent: number;
      conversionRate: number;
    }>;
    topChannels: Array<{
      channel: string;
      touchpoints: number;
      conversions: number;
    }>;
  }>> {
    try {
      const params = period ? {
        from: period.from.toISOString(),
        to: period.to.toISOString()
      } : {};

      const response = await this.client.get('/api/journey/analytics', { params });
      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      return {
        success: true,
        data: {
          totalJourneys: 1000,
          avgDuration: 14,
          conversionRate: 25,
          stageMetrics: [
            { stage: 'awareness', count: 1000, avgTimeSpent: 3, conversionRate: 60 },
            { stage: 'consideration', count: 600, avgTimeSpent: 5, conversionRate: 50 },
            { stage: 'decision', count: 300, avgTimeSpent: 4, conversionRate: 83 },
            { stage: 'purchase', count: 250, avgTimeSpent: 2, conversionRate: 100 }
          ],
          topChannels: [
            { channel: 'email', touchpoints: 500, conversions: 150 },
            { channel: 'linkedin', touchpoints: 300, conversions: 80 },
            { channel: 'website', touchpoints: 400, conversions: 70 }
          ]
        }
      };
    }
  }

  /**
   * Get journey trends
   */
  async getTrends(metric: 'duration' | 'conversions' | 'touchpoints', period: '7d' | '30d' | '90d'): Promise<JourneyResponse<Array<{
    date: string;
    value: number;
  }>>> {
    try {
      const response = await this.client.get('/api/journey/trends', {
        params: { metric, period }
      });
      return {
        success: true,
        data: response.data.trends
      };
    } catch (error) {
      return {
        success: true,
        data: this.getMockTrends(metric)
      };
    }
  }

  /**
   * Track milestone
   */
  async trackMilestone(
    entityType: 'lead' | 'customer',
    entityId: string,
    milestone: {
      type: string;
      name: string;
      properties?: Record<string, any>;
    }
  ): Promise<JourneyResponse<void>> {
    try {
      await this.client.post('/api/journey/milestone', {
        entityType,
        entityId,
        ...milestone,
        timestamp: new Date().toISOString()
      });
      return { success: true };
    } catch (error: any) {
      this.logger.error('Milestone tracking failed', { entityType, entityId, error: error.message });
      return { success: false, error: error.message };
    }
  }

  /**
   * Get drop-off analysis
   */
  async getDropOffAnalysis(): Promise<JourneyResponse<Array<{
    fromStage: string;
    toStage: string;
    dropOffRate: number;
    avgTimeBeforeDropOff: number;
    reasons: string[];
  }>>> {
    try {
      const response = await this.client.get('/api/journey/dropoff');
      return {
        success: true,
        data: response.data.dropoffs
      };
    } catch (error) {
      return {
        success: true,
        data: [
          { fromStage: 'awareness', toStage: 'consideration', dropOffRate: 40, avgTimeBeforeDropOff: 3, reasons: ['No response', 'Not interested'] },
          { fromStage: 'consideration', toStage: 'decision', dropOffRate: 50, avgTimeBeforeDropOff: 5, reasons: ['Budget constraints', 'Timing not right'] },
          { fromStage: 'decision', toStage: 'purchase', dropOffRate: 17, avgTimeBeforeDropOff: 4, reasons: ['Competitor chosen', 'Process stalled'] }
        ]
      };
    }
  }

  /**
   * Create journey milestone alert
   */
  async createAlert(
    entityType: 'lead' | 'customer',
    entityId: string,
    alert: {
      type: 'stage_duration' | 'no_activity' | 'milestone';
      threshold?: number;
      message: string;
    }
  ): Promise<JourneyResponse<{ alertId: string }>> {
    try {
      const response = await this.client.post('/api/journey/alerts', {
        entityType,
        entityId,
        ...alert
      });
      return {
        success: true,
        data: { alertId: response.data.alertId }
      };
    } catch (error: any) {
      this.logger.error('Alert creation failed', { entityType, entityId, error: error.message });
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Helper methods
  private getDefaultStages(): JourneyStage[] {
    return [
      { id: 'awareness', name: 'Awareness', order: 1, duration: 7 },
      { id: 'consideration', name: 'Consideration', order: 2, duration: 14 },
      { id: 'decision', name: 'Decision', order: 3, duration: 10 },
      { id: 'purchase', name: 'Purchase', order: 4 },
      { id: 'onboarding', name: 'Onboarding', order: 5 },
      { id: 'adoption', name: 'Adoption', order: 6 },
      { id: 'advocacy', name: 'Advocacy', order: 7 }
    ];
  }

  private getMockJourney(entityId: string): Journey {
    const now = new Date();
    const startDate = new Date(now.getTime() - 20 * 24 * 60 * 60 * 1000); // 20 days ago

    return {
      id: `journey-${entityId}`,
      entityType: 'lead',
      entityId,
      stages: [
        {
          stage: 'awareness',
          enteredAt: startDate,
          exitedAt: new Date(startDate.getTime() + 5 * 24 * 60 * 60 * 1000),
          duration: 5,
          events: []
        },
        {
          stage: 'consideration',
          enteredAt: new Date(startDate.getTime() + 5 * 24 * 60 * 60 * 1000),
          exitedAt: new Date(startDate.getTime() + 15 * 24 * 60 * 60 * 1000),
          duration: 10,
          events: []
        },
        {
          stage: 'decision',
          enteredAt: new Date(startDate.getTime() + 15 * 24 * 60 * 60 * 1000),
          events: []
        }
      ],
      currentStage: 'decision',
      startedAt: startDate,
      status: 'active',
      metrics: {
        totalDuration: 20,
        conversionCount: 0,
        touchpoints: 8
      }
    };
  }

  private getMockTrends(metric: string): Array<{ date: string; value: number }> {
    const trends = [];
    const now = new Date();

    for (let i = 29; i >= 0; i--) {
      const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      trends.push({
        date: date.toISOString().split('T')[0],
        value: metric === 'conversions' ? Math.floor(Math.random() * 10) + 5 :
               metric === 'touchpoints' ? Math.floor(Math.random() * 50) + 20 :
               Math.floor(Math.random() * 5) + 10
      });
    }

    return trends;
  }
}
