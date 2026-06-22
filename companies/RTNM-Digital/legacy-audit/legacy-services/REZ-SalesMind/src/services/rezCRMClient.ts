/**
 * REZ CRM Hub Integration Client
 *
 * Connected Services:
 * - REZ Identity Hub (4702): Unified identity (CorpID)
 * - REZ CRM Hub (4056): Unified CRM data
 * - REZ Merchant (4100): Business data
 * - REZ Consumer (4200): Consumer profiles
 */

import axios, { AxiosError } from 'axios';

const INTERNAL_TOKEN = process.env.INTERNAL_SERVICE_TOKEN || '';

const getAuthHeaders = () => ({
  ...(INTERNAL_TOKEN ? { 'X-Internal-Token': INTERNAL_TOKEN } : {}),
});

const REZ_CRM_CONFIG = {
  identityHub: process.env.REZ_IDENTITY_HUB || 'http://localhost:4702',
  merchant: process.env.REZ_MERCHANT || 'http://localhost:4100',
  consumer: process.env.REZ_CONSUMER || 'http://localhost:4200',
  crmHub: process.env.REZ_CRM_HUB || 'http://localhost:4056',
};

export interface Lead {
  id: string;
  name: string;
  email: string;
  phone?: string;
  company?: string;
  title?: string;
  source: string;
  stage: 'new' | 'contacted' | 'qualified' | 'proposal' | 'negotiation' | 'closed';
  score: number;
  owner?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Deal {
  id: string;
  title: string;
  value: number;
  currency: string;
  stage: 'discovery' | 'proposal' | 'negotiation' | 'closed_won' | 'closed_lost';
  probability: number;
  contactId: string;
  ownerId: string;
  expectedClose: Date;
  notes?: string;
}

export interface Activity {
  id: string;
  type: 'call' | 'email' | 'meeting' | 'note' | 'task';
  subject: string;
  description?: string;
  contactId: string;
  userId: string;
  timestamp: Date;
  duration?: number;
}

export class REZCRMClient {
  private identityClient = axios.create({ baseURL: REZ_CRM_CONFIG.identityHub, timeout: 5000, headers: getAuthHeaders() });
  private merchantClient = axios.create({ baseURL: REZ_CRM_CONFIG.merchant, timeout: 5000, headers: getAuthHeaders() });
  private consumerClient = axios.create({ baseURL: REZ_CRM_CONFIG.consumer, timeout: 5000, headers: getAuthHeaders() });
  private crmClient = axios.create({ baseURL: REZ_CRM_CONFIG.crmHub, timeout: 5000, headers: getAuthHeaders() });

  /**
   * Get unified identity for a person
   */
  async getIdentity(personId: string): Promise<{ data: any; error: string | null }> {
    try {
      const response = await this.identityClient.get('/api/identity/' + personId);
      return { data: response.data, error: null };
    } catch (error) {
      const message = error instanceof AxiosError ? error.message : 'REZ Identity Hub unavailable';
      console.warn('REZ CRM Client - Identity:', message);
      return { data: null, error: message };
    }
  }

  /**
   * Get merchant profile
   */
  async getMerchantProfile(merchantId: string): Promise<{ data: any; error: string | null }> {
    try {
      const response = await this.merchantClient.get('/api/merchants/' + merchantId);
      return { data: response.data, error: null };
    } catch (error) {
      const message = error instanceof AxiosError ? error.message : 'REZ Merchant unavailable';
      console.warn('REZ CRM Client - Merchant:', message);
      return { data: null, error: message };
    }
  }

  /**
   * Get consumer profile
   */
  async getConsumerProfile(consumerId: string): Promise<{ data: any; error: string | null }> {
    try {
      const response = await this.consumerClient.get('/api/profiles/' + consumerId);
      return { data: response.data, error: null };
    } catch (error) {
      const message = error instanceof AxiosError ? error.message : 'REZ Consumer unavailable';
      console.warn('REZ CRM Client - Consumer:', message);
      return { data: null, error: message };
    }
  }

  /**
   * Get leads from CRM
   */
  async getLeads(filters?: { stage?: string; owner?: string }): Promise<{ data: Lead[]; error: string | null }> {
    try {
      const response = await this.crmClient.get('/api/contacts', { params: filters });
      // Map CRM Hub response to Lead interface
      const contacts = response.data.contacts || response.data || [];
      const leads: Lead[] = contacts.map((c: any) => ({
        id: c.id || c.externalId,
        name: `${c.firstName || ''} ${c.lastName || ''}`.trim(),
        email: c.email || c.emails?.[0],
        phone: c.phone?.number || c.phones?.[0]?.number,
        company: c.company,
        title: c.jobTitle,
        source: c.leadSource || 'crm',
        stage: this.mapContactToStage(c),
        score: c.score || 50,
        owner: c.owner || c.linkedRezUserId,
        createdAt: c.createdAt || new Date(),
        updatedAt: c.updatedAt || new Date(),
      }));
      return { data: leads, error: null };
    } catch (error) {
      const message = error instanceof AxiosError ? error.message : 'REZ CRM Hub unavailable';
      console.warn('REZ CRM Client - Leads:', message);
      return { data: [], error: message };
    }
  }

  /**
   * Get lead by ID
   */
  async getLead(leadId: string): Promise<{ data: Lead | null; error: string | null }> {
    try {
      const response = await this.crmClient.get('/api/contacts/' + leadId);
      const c = response.data;
      const lead: Lead = {
        id: c.id || c.externalId,
        name: `${c.firstName || ''} ${c.lastName || ''}`.trim(),
        email: c.email || c.emails?.[0],
        phone: c.phone?.number || c.phones?.[0]?.number,
        company: c.company,
        title: c.jobTitle,
        source: c.leadSource || 'crm',
        stage: this.mapContactToStage(c),
        score: c.score || 50,
        owner: c.owner || c.linkedRezUserId,
        createdAt: c.createdAt || new Date(),
        updatedAt: c.updatedAt || new Date(),
      };
      return { data: lead, error: null };
    } catch (error) {
      const message = error instanceof AxiosError ? error.message : 'REZ CRM Hub unavailable';
      console.warn('REZ CRM Client - Get Lead:', message);
      return { data: null, error: message };
    }
  }

  /**
   * Create a new lead
   */
  async createLead(leadData: Partial<Lead>): Promise<{ data: Lead | null; error: string | null }> {
    try {
      const payload = {
        firstName: leadData.name?.split(' ')[0] || '',
        lastName: leadData.name?.split(' ').slice(1).join(' ') || '',
        email: leadData.email,
        phone: leadData.phone ? { number: leadData.phone, type: 'work' } : undefined,
        company: leadData.company,
        jobTitle: leadData.title,
        leadSource: leadData.source,
      };
      const response = await this.crmClient.post('/api/contacts', payload);
      return { data: response.data, error: null };
    } catch (error) {
      const message = error instanceof AxiosError ? error.message : 'Failed to create lead';
      console.error('REZ CRM Client - Create Lead:', message);
      return { data: null, error: message };
    }
  }

  /**
   * Update lead stage
   */
  async updateLeadStage(leadId: string, stage: Lead['stage']): Promise<{ success: boolean; error: string | null }> {
    try {
      // Map our stage to CRM Hub lifecycle stage
      const lifecycleStage = this.mapStageToLifecycle(stage);
      await this.crmClient.patch('/api/contacts/' + leadId, { lifecycleStage });
      return { success: true, error: null };
    } catch (error) {
      const message = error instanceof AxiosError ? error.message : 'Failed to update lead stage';
      console.error('REZ CRM Client - Update Stage:', message);
      return { success: false, error: message };
    }
  }

  /**
   * Get deals from CRM
   */
  async getDeals(filters?: { stage?: string; owner?: string }): Promise<{ data: Deal[]; error: string | null }> {
    try {
      const response = await this.crmClient.get('/api/deals', { params: filters });
      const deals: Deal[] = (response.data.deals || response.data || []).map((d: any) => ({
        id: d.id || d.externalId,
        title: d.title,
        value: d.amount || 0,
        currency: d.currency || 'USD',
        stage: this.mapDealStage(d.stage),
        probability: d.probability || 50,
        contactId: d.contactId,
        ownerId: d.ownerId || d.owner,
        expectedClose: d.closeDate ? new Date(d.closeDate) : new Date(),
        notes: d.description,
      }));
      return { data: deals, error: null };
    } catch (error) {
      const message = error instanceof AxiosError ? error.message : 'REZ CRM Hub unavailable';
      console.warn('REZ CRM Client - Deals:', message);
      return { data: [], error: message };
    }
  }

  /**
   * Get deal by ID
   */
  async getDeal(dealId: string): Promise<{ data: Deal | null; error: string | null }> {
    try {
      const response = await this.crmClient.get('/api/deals/' + dealId);
      const d = response.data;
      const deal: Deal = {
        id: d.id || d.externalId,
        title: d.title,
        value: d.amount || 0,
        currency: d.currency || 'USD',
        stage: this.mapDealStage(d.stage),
        probability: d.probability || 50,
        contactId: d.contactId,
        ownerId: d.ownerId || d.owner,
        expectedClose: d.closeDate ? new Date(d.closeDate) : new Date(),
        notes: d.description,
      };
      return { data: deal, error: null };
    } catch (error) {
      const message = error instanceof AxiosError ? error.message : 'REZ CRM Hub unavailable';
      console.warn('REZ CRM Client - Get Deal:', message);
      return { data: null, error: message };
    }
  }

  /**
   * Create a new deal
   */
  async createDeal(dealData: Partial<Deal>): Promise<{ data: Deal | null; error: string | null }> {
    try {
      const payload = {
        title: dealData.title,
        amount: dealData.value,
        stage: dealData.stage,
        probability: dealData.probability,
        closeDate: dealData.expectedClose,
        contactId: dealData.contactId,
      };
      const response = await this.crmClient.post('/api/deals', payload);
      return { data: response.data, error: null };
    } catch (error) {
      const message = error instanceof AxiosError ? error.message : 'Failed to create deal';
      console.error('REZ CRM Client - Create Deal:', message);
      return { data: null, error: message };
    }
  }

  /**
   * Update deal stage
   */
  async updateDealStage(dealId: string, stage: Deal['stage']): Promise<{ success: boolean; error: string | null }> {
    try {
      await this.crmClient.patch('/api/deals/' + dealId, { stage });
      return { success: true, error: null };
    } catch (error) {
      const message = error instanceof AxiosError ? error.message : 'Failed to update deal stage';
      console.error('REZ CRM Client - Update Deal Stage:', message);
      return { success: false, error: message };
    }
  }

  /**
   * Get activities for a contact
   */
  async getActivities(contactId: string): Promise<{ data: Activity[]; error: string | null }> {
    try {
      // Try the activities endpoint first
      let response;
      try {
        response = await this.crmClient.get('/api/activities', { params: { contactId } });
        return { data: response.data.activities || [], error: null };
      } catch {
        // Fallback: try contacts endpoint for engagement data
        response = await this.crmClient.get('/api/contacts/' + contactId);
        const activities: Activity[] = [];
        return { data: activities, error: null };
      }
    } catch (error) {
      const message = error instanceof AxiosError ? error.message : 'REZ CRM Hub unavailable';
      console.warn('REZ CRM Client - Activities:', message);
      return { data: [], error: message };
    }
  }

  /**
   * Log a new activity
   */
  async logActivity(activityData: Partial<Activity>): Promise<{ data: Activity | null; error: string | null }> {
    try {
      const payload = {
        type: activityData.type,
        subject: activityData.subject,
        description: activityData.description,
        contactId: activityData.contactId,
        timestamp: activityData.timestamp || new Date(),
        duration: activityData.duration,
      };
      const response = await this.crmClient.post('/api/activities', payload);
      return { data: response.data, error: null };
    } catch (error) {
      const message = error instanceof AxiosError ? error.message : 'Failed to log activity';
      console.error('REZ CRM Client - Log Activity:', message);
      return { data: null, error: message };
    }
  }

  /**
   * Get sales pipeline summary
   */
  async getPipelineSummary(): Promise<{ data: any; error: string | null }> {
    try {
      const response = await this.crmClient.get('/api/deals/stats');
      return { data: response.data, error: null };
    } catch (error) {
      const message = error instanceof AxiosError ? error.message : 'REZ CRM Hub unavailable';
      console.warn('REZ CRM Client - Pipeline Summary:', message);
      return { data: null, error: message };
    }
  }

  async healthCheck(): Promise<{ healthy: boolean; error: string | null }> {
    try {
      const response = await this.crmClient.get('/api/health');
      return { healthy: response.status === 200, error: null };
    } catch (error) {
      const message = error instanceof AxiosError ? error.message : 'REZ CRM Hub health check failed';
      return { healthy: false, error: message };
    }
  }

  // Helper: Map CRM Hub lifecycle stage to our stage
  private mapContactToStage(contact: any): Lead['stage'] {
    const lifecycle = contact.lifecycleStage?.toLowerCase() || '';
    if (lifecycle.includes('customer') || lifecycle.includes('closed')) return 'closed';
    if (lifecycle.includes('negotiation') || lifecycle.includes('opportunity')) return 'negotiation';
    if (lifecycle.includes('proposal') || lifecycle.includes('presentation')) return 'proposal';
    if (lifecycle.includes('qualified') || lifecycle.includes('evaluation')) return 'qualified';
    if (lifecycle.includes('meeting') || lifecycle.includes('contacted')) return 'contacted';
    return 'new';
  }

  // Helper: Map our stage to CRM Hub lifecycle stage
  private mapStageToLifecycle(stage: Lead['stage']): string {
    const mapping: Record<string, string> = {
      new: 'subscriber',
      contacted: 'lead',
      qualified: 'marketingqualifiedlead',
      proposal: 'opportunity',
      negotiation: 'opportunity',
      closed: 'customer',
    };
    return mapping[stage] || 'subscriber';
  }

  // Helper: Map CRM Hub deal stage to our deal stage
  private mapDealStage(stage: string): Deal['stage'] {
    const normalized = (stage || '').toLowerCase().replace(/[\s_-]/g, '');
    if (normalized.includes('lost')) return 'closed_lost';
    if (normalized.includes('won') || normalized.includes('closed')) return 'closed_won';
    if (normalized.includes('negotiat')) return 'negotiation';
    if (normalized.includes('proposal')) return 'proposal';
    if (normalized.includes('discovery')) return 'discovery';
    return 'discovery';
  }
}