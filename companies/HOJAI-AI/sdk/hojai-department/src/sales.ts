/**
 * Sales OS SDK client (port 5055)
 *
 * CRM, leads, deals, accounts, contacts, pipelines, activities.
 * Powers the enterprise revenue engine — 22 AI agents behind the scenes.
 */

import type { HojaiConfig } from './foundation-config.js';
import { request, buildQueryString } from './utils.js';
import type { Money } from './types.js';

export type LeadStatus = 'new' | 'contacted' | 'qualified' | 'unqualified' | 'converted' | 'lost';
export type LeadSource = 'web' | 'referral' | 'campaign' | 'cold-outreach' | 'event' | 'partner' | 'other';
export type DealStage = 'prospecting' | 'qualification' | 'proposal' | 'negotiation' | 'closed-won' | 'closed-lost';

export interface Lead {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  company?: string;
  source: LeadSource;
  status: LeadStatus;
  /** 0-100 lead score from AI */
  score?: number;
  ownerId?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Deal {
  id: string;
  name: string;
  leadId?: string;
  accountId?: string;
  value: Money;
  stage: DealStage;
  probability: number; // 0-100
  expectedCloseDate?: string;
  ownerId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Account {
  id: string;
  name: string;
  industry?: string;
  size?: 'startup' | 'smb' | 'mid-market' | 'enterprise';
  website?: string;
  ownerId?: string;
  createdAt: string;
}

export interface Activity {
  id: string;
  type: 'call' | 'email' | 'meeting' | 'note' | 'task';
  leadId?: string;
  dealId?: string;
  accountId?: string;
  description: string;
  dueAt?: string;
  completedAt?: string;
  ownerId?: string;
}

export class SalesClient {
  public readonly config: HojaiConfig;

  constructor(config: HojaiConfig) {
    this.config = { ...config, baseUrl: `http://localhost:5055` };
  }

  // ─── Leads ───

  async listLeads(input: { status?: LeadStatus; source?: LeadSource; ownerId?: string; limit?: number } = {}): Promise<Lead[]> {
    return request<Lead[]>(this.config, 'GET', `/api/leads${buildQueryString(input as unknown as Record<string, unknown>)}`);
  }

  async getLead(id: string): Promise<Lead> {
    return request<Lead>(this.config, 'GET', `/api/leads/${encodeURIComponent(id)}`);
  }

  async createLead(input: { name: string; email?: string; phone?: string; company?: string; source: LeadSource; notes?: string }): Promise<Lead> {
    return request<Lead>(this.config, 'POST', '/api/leads', input);
  }

  async updateLead(id: string, patch: Partial<Lead>): Promise<Lead> {
    return request<Lead>(this.config, 'PATCH', `/api/leads/${encodeURIComponent(id)}`, patch);
  }

  async deleteLead(id: string): Promise<{ deleted: boolean; id: string }> {
    return request<{ deleted: boolean; id: string }>(this.config, 'DELETE', `/api/leads/${encodeURIComponent(id)}`);
  }

  /** Mark a lead as qualified (with optional score). */
  async qualifyLead(id: string, input: { score?: number; status?: 'qualified' | 'unqualified'; notes?: string }): Promise<Lead> {
    return request<Lead>(this.config, 'POST', `/api/leads/${encodeURIComponent(id)}/qualify`, input);
  }

  // ─── Deals ───

  async listDeals(input: { stage?: DealStage; ownerId?: string; leadId?: string; limit?: number } = {}): Promise<Deal[]> {
    return request<Deal[]>(this.config, 'GET', `/api/deals${buildQueryString(input as unknown as Record<string, unknown>)}`);
  }

  async getDeal(id: string): Promise<Deal> {
    return request<Deal>(this.config, 'GET', `/api/deals/${encodeURIComponent(id)}`);
  }

  async createDeal(input: { name: string; leadId?: string; accountId?: string; value: Money; stage?: DealStage; expectedCloseDate?: string }): Promise<Deal> {
    return request<Deal>(this.config, 'POST', '/api/deals', input);
  }

  async updateDeal(id: string, patch: Partial<Deal>): Promise<Deal> {
    return request<Deal>(this.config, 'PATCH', `/api/deals/${encodeURIComponent(id)}`, patch);
  }

  async advanceDealStage(id: string, stage: DealStage): Promise<Deal> {
    return request<Deal>(this.config, 'POST', `/api/deals/${encodeURIComponent(id)}/stage`, { stage });
  }

  // ─── Accounts ───

  async listAccounts(input: { industry?: string; size?: Account['size']; limit?: number } = {}): Promise<Account[]> {
    return request<Account[]>(this.config, 'GET', `/api/accounts${buildQueryString(input as unknown as Record<string, unknown>)}`);
  }

  async createAccount(input: { name: string; industry?: string; size?: Account['size']; website?: string }): Promise<Account> {
    return request<Account>(this.config, 'POST', '/api/accounts', input);
  }

  // ─── Activities ───

  async listActivities(input: { type?: Activity['type']; leadId?: string; dealId?: string; completed?: boolean; limit?: number } = {}): Promise<Activity[]> {
    return request<Activity[]>(this.config, 'GET', `/api/activities${buildQueryString(input as unknown as Record<string, unknown>)}`);
  }

  async logActivity(input: Omit<Activity, 'id'>): Promise<Activity> {
    return request<Activity>(this.config, 'POST', '/api/activities', input);
  }
}
