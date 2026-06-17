import axios, { AxiosInstance } from 'axios';
import { v4 as uuidv4 } from 'uuid';

/**
 * CustomerOpsBridge - Bridge service connecting AdBazaar products to Customer Operations
 * Routes data between CRM Hub, Lead Intelligence, WhatsApp, and Customer Operations
 */
export class CustomerOpsBridge {
  private httpClient: AxiosInstance;
  private customerOpsUrl: string;
  private logger: any;

  constructor(logger: any) {
    this.logger = logger;
    this.customerOpsUrl = process.env.CUSTOMER_OPS_URL || 'http://localhost:4000';
    this.httpClient = axios.create({
      baseURL: this.customerOpsUrl,
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
        'X-Service': 'adbazaar-integration'
      }
    });
  }

  /**
   * Sync a profile to Customer Operations
   */
  async syncProfileToCustomerOps(data: {
    source: string;
    profile: {
      externalId?: string;
      name?: string;
      email?: string;
      phone?: string;
      company?: string;
      tags?: string[];
      customFields?: Record<string, any>;
    };
  }): Promise<any> {
    try {
      const response = await this.httpClient.post('/api/customer/profiles', {
        id: uuidv4(),
        source: data.source,
        externalId: data.profile.externalId,
        name: data.profile.name,
        email: data.profile.email,
        phone: data.profile.phone,
        company: data.profile.company,
        tags: data.profile.tags,
        customFields: data.profile.customFields,
        syncedAt: new Date().toISOString()
      });

      return response.data;
    } catch (error) {
      this.logger.error('Failed to sync profile to Customer Ops', { error, data });
      throw error;
    }
  }

  /**
   * Sync a lead to Customer Operations
   */
  async syncLeadToCustomerOps(data: {
    source: string;
    lead: {
      externalId?: string;
      name?: string;
      email?: string;
      phone?: string;
      company?: string;
      jobTitle?: string;
      industry?: string;
      score?: number;
      status?: string;
      priority?: string;
      tags?: string[];
    };
  }): Promise<any> {
    try {
      const response = await this.httpClient.post('/api/customer/leads', {
        id: uuidv4(),
        source: data.source,
        externalId: data.lead.externalId,
        name: data.lead.name,
        email: data.lead.email,
        phone: data.lead.phone,
        company: data.lead.company,
        jobTitle: data.lead.jobTitle,
        industry: data.lead.industry,
        leadScore: data.lead.score,
        status: data.lead.status,
        priority: data.lead.priority,
        tags: data.lead.tags,
        syncedAt: new Date().toISOString()
      });

      return response.data;
    } catch (error) {
      this.logger.error('Failed to sync lead to Customer Ops', { error, data });
      throw error;
    }
  }

  /**
   * Notify Customer Operations of an event
   */
  async notifyCustomerOps(event: string, data: any): Promise<any> {
    try {
      const response = await this.httpClient.post('/api/events', {
        event,
        source: 'adbazaar-integration',
        data,
        timestamp: new Date().toISOString()
      });

      return response.data;
    } catch (error) {
      this.logger.error('Failed to notify Customer Ops', { error, event, data });
      // Don't throw - notifications shouldn't break the flow
      return null;
    }
  }

  /**
   * Send activity to Customer Operations
   */
  async sendActivityToCustomerOps(data: {
    profileId: string;
    source: string;
    activityType: string;
    metadata?: Record<string, any>;
    timestamp: string;
  }): Promise<any> {
    try {
      const response = await this.httpClient.post('/api/customer/activities', {
        id: uuidv4(),
        profileId: data.profileId,
        source: data.source,
        type: data.activityType,
        metadata: data.metadata,
        timestamp: data.timestamp,
        syncedAt: new Date().toISOString()
      });

      return response.data;
    } catch (error) {
      this.logger.error('Failed to send activity to Customer Ops', { error, data });
      throw error;
    }
  }

  /**
   * Get engagement data from Customer Operations
   */
  async getEngagementFromCustomerOps(profileId: string): Promise<any> {
    try {
      const response = await this.httpClient.get(`/api/customer/profiles/${profileId}/engagement`);
      return response.data;
    } catch (error) {
      this.logger.error('Failed to get engagement from Customer Ops', { error, profileId });
      return { engagementScore: 0, lastActivity: null };
    }
  }

  /**
   * Sync a segment to Customer Operations
   */
  async syncSegmentToCustomerOps(data: {
    segmentId: string;
    name: string;
    criteria?: Record<string, any>;
    profileCount: number;
  }): Promise<any> {
    try {
      const response = await this.httpClient.post('/api/customer/segments', {
        id: data.segmentId,
        source: 'adbazaar',
        name: data.name,
        criteria: data.criteria,
        profileCount: data.profileCount,
        syncedAt: new Date().toISOString()
      });

      return response.data;
    } catch (error) {
      this.logger.error('Failed to sync segment to Customer Ops', { error, data });
      throw error;
    }
  }

  /**
   * Send WhatsApp message via Customer Operations
   */
  async sendWhatsAppMessage(data: {
    to: string;
    message: string;
    type?: string;
    templateId?: string;
    campaignId?: string;
    messageId: string;
    metadata?: Record<string, any>;
  }): Promise<any> {
    try {
      const response = await this.httpClient.post('/api/whatsapp/send', {
        id: data.messageId,
        to: data.to,
        message: data.message,
        type: data.type,
        templateId: data.templateId,
        campaignId: data.campaignId,
        metadata: data.metadata,
        sentAt: new Date().toISOString()
      });

      return response.data;
    } catch (error) {
      this.logger.error('Failed to send WhatsApp message via Customer Ops', { error, data });
      throw error;
    }
  }

  /**
   * Send WhatsApp conversation to Customer Operations
   */
  async sendWhatsAppToCustomerOps(data: {
    source: string;
    message: any;
    customerId?: string;
  }): Promise<any> {
    try {
      const response = await this.httpClient.post('/api/whatsapp/messages', {
        source: data.source,
        ...data.message,
        customerId: data.customerId,
        syncedAt: new Date().toISOString()
      });

      return response.data;
    } catch (error) {
      this.logger.error('Failed to send WhatsApp to Customer Ops', { error, data });
      throw error;
    }
  }

  /**
   * Get WhatsApp message status
   */
  async getWhatsAppMessageStatus(messageId: string): Promise<any> {
    try {
      const response = await this.httpClient.get(`/api/whatsapp/messages/${messageId}/status`);
      return response.data;
    } catch (error) {
      this.logger.error('Failed to get WhatsApp message status', { error, messageId });
      return { status: 'unknown' };
    }
  }

  /**
   * Get WhatsApp conversation history
   */
  async getWhatsAppConversation(phone: string, options: { limit: number; offset: number }): Promise<any> {
    try {
      const response = await this.httpClient.get(`/api/whatsapp/conversations/${phone}`, {
        params: options
      });
      return response.data;
    } catch (error) {
      this.logger.error('Failed to get WhatsApp conversation', { error, phone });
      return { messages: [] };
    }
  }

  /**
   * Register WhatsApp template
   */
  async registerWhatsAppTemplate(template: any): Promise<any> {
    try {
      const response = await this.httpClient.post('/api/whatsapp/templates', {
        source: 'adbazaar',
        ...template,
        syncedAt: new Date().toISOString()
      });

      return response.data;
    } catch (error) {
      this.logger.error('Failed to register WhatsApp template', { error });
      throw error;
    }
  }

  /**
   * Get WhatsApp template
   */
  async getWhatsAppTemplate(templateId: string): Promise<any> {
    try {
      const response = await this.httpClient.get(`/api/whatsapp/templates/${templateId}`);
      return response.data;
    } catch (error) {
      this.logger.error('Failed to get WhatsApp template', { error, templateId });
      throw error;
    }
  }

  /**
   * Sync campaign audience
   */
  async syncCampaignAudience(data: {
    campaignId: string;
    audienceIds?: string[];
    segmentId?: string;
  }): Promise<any> {
    try {
      const response = await this.httpClient.post('/api/campaigns/audience', {
        campaignId: data.campaignId,
        audienceIds: data.audienceIds,
        segmentId: data.segmentId,
        source: 'adbazaar',
        syncedAt: new Date().toISOString()
      });

      return response.data;
    } catch (error) {
      this.logger.error('Failed to sync campaign audience', { error, data });
      throw error;
    }
  }

  /**
   * Track campaign event
   */
  async trackCampaignEvent(data: {
    campaignId: string;
    eventType: string;
    profileId?: string;
    metadata?: Record<string, any>;
    timestamp: string;
  }): Promise<any> {
    try {
      const response = await this.httpClient.post('/api/campaigns/events', {
        id: uuidv4(),
        campaignId: data.campaignId,
        eventType: data.eventType,
        profileId: data.profileId,
        metadata: data.metadata,
        source: 'adbazaar',
        timestamp: data.timestamp,
        syncedAt: new Date().toISOString()
      });

      return response.data;
    } catch (error) {
      this.logger.error('Failed to track campaign event', { error, data });
      throw error;
    }
  }

  /**
   * Send DOOH data to Journey Intelligence
   */
  async sendToJourneyIntelligence(data: {
    type: string;
    data: any;
  }): Promise<any> {
    try {
      const journeyUrl = process.env.JOURNEY_INTELLIGENCE_URL || 'http://localhost:4761';
      const response = await axios.post(`${journeyUrl}/api/journey/events`, {
        source: 'adbazaar-dooh',
        ...data,
        syncedAt: new Date().toISOString()
      });

      return response.data;
    } catch (error) {
      this.logger.error('Failed to send to Journey Intelligence', { error, data });
      throw error;
    }
  }

  /**
   * Check service health
   */
  async checkServiceHealth(serviceName: string): Promise<any> {
    try {
      const response = await this.httpClient.get('/health', { timeout: 3000 });
      return { status: 'healthy', response: response.data };
    } catch (error) {
      return { status: 'unhealthy', error: String(error) };
    }
  }
}
