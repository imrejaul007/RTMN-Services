/**
 * Nexha Business Directory Client
 *
 * Wraps nexha-business-directory: register companies, list agents,
 * search by capability, fetch trust linkages.
 */

import type { HojaiConfig } from './foundation-config.js';
import { request } from './utils.js';

export interface Company {
  id: string;
  tenantId: string;
  name: string;
  description?: string;
  capabilities: string[];
  industries: string[];
  contact?: Record<string, unknown>;
  trustEntityId?: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface CompanyInput {
  tenantId?: string;
  name: string;
  description?: string;
  capabilities?: string[];
  industries?: string[];
  contact?: Record<string, unknown>;
  trustEntityId?: string;
  metadata?: Record<string, unknown>;
}

export interface DirectoryAgent {
  id: string;
  agentId: string;
  companyId: string;
  name: string;
  role: string;
  capabilities: string[];
  metadata?: Record<string, unknown>;
  status: 'active' | 'inactive';
  createdAt: string;
}

export interface AgentInput {
  companyId: string;
  name: string;
  role: string;
  capabilities?: string[];
  metadata?: Record<string, unknown>;
}

export class DirectoryClient {
  constructor(private config: HojaiConfig) {}

  async registerCompany(input: CompanyInput): Promise<Company> {
    return request<Company>(this.config, 'POST', '/api/v1/companies', input);
  }

  async listCompanies(options: { tenantId?: string; industry?: string; capability?: string; limit?: number } = {}): Promise<Company[]> {
    const params = new URLSearchParams();
    if (options.tenantId) params.set('tenantId', options.tenantId);
    if (options.industry) params.set('industry', options.industry);
    if (options.capability) params.set('capability', options.capability);
    if (options.limit) params.set('limit', String(options.limit));
    return request<Company[]>(this.config, 'GET', `/api/v1/companies?${params.toString()}`);
  }

  async getCompany(companyId: string): Promise<Company> {
    return request<Company>(this.config, 'GET', `/api/v1/companies/${encodeURIComponent(companyId)}`);
  }

  async updateCompany(companyId: string, patch: Partial<CompanyInput>): Promise<Company> {
    return request<Company>(this.config, 'PATCH', `/api/v1/companies/${encodeURIComponent(companyId)}`, patch);
  }

  async deleteCompany(companyId: string): Promise<{ deleted: boolean }> {
    return request<{ deleted: boolean }>(this.config, 'DELETE', `/api/v1/companies/${encodeURIComponent(companyId)}`);
  }

  async registerAgent(input: AgentInput): Promise<DirectoryAgent> {
    return request<DirectoryAgent>(this.config, 'POST', `/api/v1/companies/${encodeURIComponent(input.companyId)}/agents`, input);
  }

  async listAgents(companyId: string): Promise<DirectoryAgent[]> {
    return request<DirectoryAgent[]>(this.config, 'GET', `/api/v1/companies/${encodeURIComponent(companyId)}/agents`);
  }

  async getAgent(agentId: string): Promise<DirectoryAgent> {
    return request<DirectoryAgent>(this.config, 'GET', `/api/v1/agents/${encodeURIComponent(agentId)}`);
  }

  async searchByCapability(input: { capability: string; industry?: string; limit?: number }): Promise<Company[]> {
    return request<Company[]>(this.config, 'GET', `/api/v1/capabilities?capability=${encodeURIComponent(input.capability)}&industry=${encodeURIComponent(input.industry || '')}&limit=${input.limit || 50}`);
  }

  async getTrustLinkage(companyIds: string[]): Promise<{ trustGraph: Record<string, { score: number; relationships: string[] }> }> {
    return request(this.config, 'POST', '/api/v1/trust', { companyIds });
  }
}