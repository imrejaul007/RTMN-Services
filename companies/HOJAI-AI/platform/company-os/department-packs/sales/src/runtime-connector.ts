/**
 * Sales Department Pack - Runtime Connector
 *
 * This connector delegates to the actual Sales OS service (5055).
 * Provides CRM and sales functionality for Company OS tenants.
 */

import axios, { AxiosInstance } from 'axios';

export interface SalesConfig {
  salesOsUrl: string;
  tenantId: string;
  apiKey?: string;
}

export interface Lead {
  id: string;
  name: string;
  email: string;
  phone: string;
  company?: string;
  source: string;
  status: 'new' | 'contacted' | 'qualified' | 'proposal' | 'won' | 'lost';
  score?: number;
  assignedTo?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Contact {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  title?: string;
  company?: string;
  accountId?: string;
  ownerId?: string;
  createdAt: string;
}

export interface Account {
  id: string;
  name: string;
  industry?: string;
  size?: 'startup' | 'smb' | 'mid-market' | 'enterprise';
  website?: string;
  phone?: string;
  address?: string;
  ownerId?: string;
  createdAt: string;
}

export interface Opportunity {
  id: string;
  name: string;
  accountId: string;
  value: number;
  currency: string;
  stage: string;
  probability: number;
  closeDate: string;
  ownerId?: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Deal {
  id: string;
  title: string;
  value: number;
  currency: string;
  stage: 'discovery' | 'proposal' | 'negotiation' | 'closed-won' | 'closed-lost';
  probability: number;
  expectedCloseDate: string;
  ownerId?: string;
  contactId?: string;
  notes?: string;
}

export class SalesRuntimeConnector {
  private client: AxiosInstance;
  private tenantId: string;

  constructor(config: SalesConfig) {
    this.tenantId = config.tenantId;
    this.client = axios.create({
      baseURL: config.salesOsUrl,
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
        'X-Tenant-ID': config.tenantId,
        ...(config.apiKey && { 'Authorization': `Bearer ${config.apiKey}` }),
      },
    });
  }

  // ============================================
  // LEADS
  // ============================================

  async listLeads(filters?: { status?: string; source?: string }): Promise<Lead[]> {
    const params = new URLSearchParams();
    if (filters?.status) params.append('status', filters.status);
    if (filters?.source) params.append('source', filters.source);

    const response = await this.client.get(`/api/leads?${params.toString()}`);
    return response.data.leads || [];
  }

  async getLead(id: string): Promise<Lead | null> {
    try {
      const response = await this.client.get(`/api/leads/${id}`);
      return response.data.lead || null;
    } catch {
      return null;
    }
  }

  async createLead(data: Partial<Lead>): Promise<Lead> {
    const response = await this.client.post('/api/leads', data);
    return response.data.lead;
  }

  async updateLead(id: string, data: Partial<Lead>): Promise<Lead> {
    const response = await this.client.put(`/api/leads/${id}`, data);
    return response.data.lead;
  }

  async deleteLead(id: string): Promise<boolean> {
    try {
      await this.client.delete(`/api/leads/${id}`);
      return true;
    } catch {
      return false;
    }
  }

  async convertLead(id: string): Promise<{ contact: Contact; account: Account; opportunity?: Opportunity }> {
    const response = await this.client.post(`/api/leads/${id}/convert`);
    return response.data;
  }

  // ============================================
  // CONTACTS
  // ============================================

  async listContacts(filters?: { accountId?: string }): Promise<Contact[]> {
    const params = new URLSearchParams();
    if (filters?.accountId) params.append('accountId', filters.accountId);

    const response = await this.client.get(`/api/contacts?${params.toString()}`);
    return response.data.contacts || [];
  }

  async getContact(id: string): Promise<Contact | null> {
    try {
      const response = await this.client.get(`/api/contacts/${id}`);
      return response.data.contact || null;
    } catch {
      return null;
    }
  }

  async createContact(data: Partial<Contact>): Promise<Contact> {
    const response = await this.client.post('/api/contacts', data);
    return response.data.contact;
  }

  async updateContact(id: string, data: Partial<Contact>): Promise<Contact> {
    const response = await this.client.put(`/api/contacts/${id}`, data);
    return response.data.contact;
  }

  // ============================================
  // ACCOUNTS
  // ============================================

  async listAccounts(filters?: { industry?: string; size?: string }): Promise<Account[]> {
    const params = new URLSearchParams();
    if (filters?.industry) params.append('industry', filters.industry);
    if (filters?.size) params.append('size', filters.size);

    const response = await this.client.get(`/api/accounts?${params.toString()}`);
    return response.data.accounts || [];
  }

  async getAccount(id: string): Promise<Account | null> {
    try {
      const response = await this.client.get(`/api/accounts/${id}`);
      return response.data.account || null;
    } catch {
      return null;
    }
  }

  async createAccount(data: Partial<Account>): Promise<Account> {
    const response = await this.client.post('/api/accounts', data);
    return response.data.account;
  }

  async updateAccount(id: string, data: Partial<Account>): Promise<Account> {
    const response = await this.client.put(`/api/accounts/${id}`, data);
    return response.data.account;
  }

  // ============================================
  // OPPORTUNITIES
  // ============================================

  async listOpportunities(filters?: { stage?: string; ownerId?: string }): Promise<Opportunity[]> {
    const params = new URLSearchParams();
    if (filters?.stage) params.append('stage', filters.stage);
    if (filters?.ownerId) params.append('ownerId', filters.ownerId);

    const response = await this.client.get(`/api/opportunities?${params.toString()}`);
    return response.data.opportunities || [];
  }

  async getOpportunity(id: string): Promise<Opportunity | null> {
    try {
      const response = await this.client.get(`/api/opportunities/${id}`);
      return response.data.opportunity || null;
    } catch {
      return null;
    }
  }

  async createOpportunity(data: Partial<Opportunity>): Promise<Opportunity> {
    const response = await this.client.post('/api/opportunities', data);
    return response.data.opportunity;
  }

  async updateOpportunity(id: string, data: Partial<Opportunity>): Promise<Opportunity> {
    const response = await this.client.put(`/api/opportunities/${id}`, data);
    return response.data.opportunity;
  }

  async closeOpportunity(id: string, won: boolean): Promise<Opportunity> {
    const response = await this.client.post(`/api/opportunities/${id}/close`, { won });
    return response.data.opportunity;
  }

  // ============================================
  // DEALS
  // ============================================

  async listDeals(filters?: { stage?: string }): Promise<Deal[]> {
    const params = new URLSearchParams();
    if (filters?.stage) params.append('stage', filters.stage);

    const response = await this.client.get(`/api/deals?${params.toString()}`);
    return response.data.deals || [];
  }

  async getDeal(id: string): Promise<Deal | null> {
    try {
      const response = await this.client.get(`/api/deals/${id}`);
      return response.data.deal || null;
    } catch {
      return null;
    }
  }

  async createDeal(data: Partial<Deal>): Promise<Deal> {
    const response = await this.client.post('/api/deals', data);
    return response.data.deal;
  }

  async updateDeal(id: string, data: Partial<Deal>): Promise<Deal> {
    const response = await this.client.put(`/api/deals/${id}`, data);
    return response.data.deal;
  }

  async moveDealStage(id: string, stage: Deal['stage']): Promise<Deal> {
    const response = await this.client.put(`/api/deals/${id}/stage`, { stage });
    return response.data.deal;
  }

  // ============================================
  // ANALYTICS
  // ============================================

  async getSalesPipeline(): Promise<any> {
    const response = await this.client.get('/api/analytics/pipeline');
    return response.data;
  }

  async getRevenueForecast(): Promise<any> {
    const response = await this.client.get('/api/analytics/forecast');
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

export function createSalesConnector(tenantId: string): SalesRuntimeConnector {
  return new SalesRuntimeConnector({
    salesOsUrl: process.env.SALES_OS_URL || 'http://localhost:5055',
    tenantId,
    apiKey: process.env.INTERNAL_SERVICE_TOKEN,
  });
}

export default SalesRuntimeConnector;
