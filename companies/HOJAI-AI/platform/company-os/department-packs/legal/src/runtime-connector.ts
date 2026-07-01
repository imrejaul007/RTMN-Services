/**
 * Legal Department Pack - Runtime Connector
 *
 * This connector delegates to the actual Legal OS service (5035).
 * Provides legal management for Company OS tenants.
 */

import axios, { AxiosInstance } from 'axios';

export interface LegalConfig {
  legalOsUrl: string;
  tenantId: string;
  apiKey?: string;
}

export interface Contract {
  id: string;
  title: string;
  type: 'nda' | 'employment' | 'vendor' | 'customer' | 'partnership' | 'lease' | 'license' | 'other';
  status: 'draft' | 'pending-signature' | 'active' | 'expired' | 'terminated' | 'renewed';
  parties: Party[];
  startDate?: string;
  endDate?: string;
  value?: number;
  currency?: string;
  renewalTerms?: string;
  createdAt: string;
  signedAt?: string;
}

export interface Party {
  name: string;
  email: string;
  role: 'signatory' | 'witness' | 'legal-rep';
  signed?: boolean;
  signedAt?: string;
}

export interface Clause {
  id: string;
  contractId: string;
  title: string;
  content: string;
  category: 'indemnity' | 'liability' | 'termination' | 'confidentiality' | 'payment' | 'other';
  riskLevel: 'low' | 'medium' | 'high';
  isStandard: boolean;
  createdAt: string;
}

export interface LegalCase {
  id: string;
  title: string;
  type: 'litigation' | 'arbitration' | 'mediation' | 'regulatory' | 'ip' | 'employment' | 'other';
  status: 'open' | 'in-progress' | 'pending' | 'resolved' | 'closed';
  description?: string;
  opposingParty?: string;
  estimatedValue?: number;
  assignedTo?: string;
  court?: string;
  caseNumber?: string;
  filedDate?: string;
  nextHearing?: string;
  createdAt: string;
}

export interface ComplianceItem {
  id: string;
  requirement: string;
  category: 'data-privacy' | 'financial' | 'labor' | 'environmental' | 'industry-specific' | 'other';
  status: 'compliant' | 'non-compliant' | 'in-progress' | 'not-applicable';
  dueDate?: string;
  completedDate?: string;
  evidence?: string;
  notes?: string;
  createdAt: string;
}

export interface IntellectualProperty {
  id: string;
  type: 'trademark' | 'patent' | 'copyright' | 'design' | 'trade-secret';
  title: string;
  registrationNumber?: string;
  jurisdiction?: string;
  status: 'filed' | 'pending' | 'registered' | 'expired' | 'renewed';
  filingDate?: string;
  expirationDate?: string;
  owner?: string;
  createdAt: string;
}

export class LegalRuntimeConnector {
  private client: AxiosInstance;
  private tenantId: string;

  constructor(config: LegalConfig) {
    this.tenantId = config.tenantId;
    this.client = axios.create({
      baseURL: config.legalOsUrl,
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
        'X-Tenant-ID': config.tenantId,
        ...(config.apiKey && { 'Authorization': `Bearer ${config.apiKey}` }),
      },
    });
  }

  // ============================================
  // CONTRACTS
  // ============================================

  async listContracts(filters?: { type?: string; status?: string }): Promise<Contract[]> {
    const params = new URLSearchParams();
    if (filters?.type) params.append('type', filters.type);
    if (filters?.status) params.append('status', filters.status);

    const response = await this.client.get(`/api/contracts?${params.toString()}`);
    return response.data.contracts || [];
  }

  async getContract(id: string): Promise<Contract | null> {
    try {
      const response = await this.client.get(`/api/contracts/${id}`);
      return response.data.contract || null;
    } catch {
      return null;
    }
  }

  async createContract(data: Partial<Contract>): Promise<Contract> {
    const response = await this.client.post('/api/contracts', data);
    return response.data.contract;
  }

  async updateContract(id: string, data: Partial<Contract>): Promise<Contract> {
    const response = await this.client.put(`/api/contracts/${id}`, data);
    return response.data.contract;
  }

  async signContract(id: string, partyEmail: string): Promise<Contract> {
    const response = await this.client.post(`/api/contracts/${id}/sign`, { partyEmail });
    return response.data.contract;
  }

  async renewContract(id: string, newEndDate: string): Promise<Contract> {
    const response = await this.client.post(`/api/contracts/${id}/renew`, { newEndDate });
    return response.data.contract;
  }

  async terminateContract(id: string, reason: string): Promise<Contract> {
    const response = await this.client.post(`/api/contracts/${id}/terminate`, { reason });
    return response.data.contract;
  }

  // ============================================
  // CLAUSES
  // ============================================

  async listClauses(contractId: string): Promise<Clause[]> {
    const response = await this.client.get(`/api/contracts/${contractId}/clauses`);
    return response.data.clauses || [];
  }

  async addClause(contractId: string, data: Partial<Clause>): Promise<Clause> {
    const response = await this.client.post(`/api/contracts/${contractId}/clauses`, data);
    return response.data.clause;
  }

  async analyzeClause(contractId: string, clauseId: string): Promise<any> {
    const response = await this.client.post(`/api/contracts/${contractId}/clauses/${clauseId}/analyze`);
    return response.data;
  }

  // ============================================
  // LEGAL CASES
  // ============================================

  async listCases(filters?: { type?: string; status?: string }): Promise<LegalCase[]> {
    const params = new URLSearchParams();
    if (filters?.type) params.append('type', filters.type);
    if (filters?.status) params.append('status', filters.status);

    const response = await this.client.get(`/api/cases?${params.toString()}`);
    return response.data.cases || [];
  }

  async getCase(id: string): Promise<LegalCase | null> {
    try {
      const response = await this.client.get(`/api/cases/${id}`);
      return response.data.case || null;
    } catch {
      return null;
    }
  }

  async createCase(data: Partial<LegalCase>): Promise<LegalCase> {
    const response = await this.client.post('/api/cases', data);
    return response.data.case;
  }

  async updateCase(id: string, data: Partial<LegalCase>): Promise<LegalCase> {
    const response = await this.client.put(`/api/cases/${id}`, data);
    return response.data.case;
  }

  async addCaseNote(id: string, note: string): Promise<LegalCase> {
    const response = await this.client.post(`/api/cases/${id}/notes`, { note });
    return response.data.case;
  }

  // ============================================
  // COMPLIANCE
  // ============================================

  async listComplianceItems(filters?: { category?: string; status?: string }): Promise<ComplianceItem[]> {
    const params = new URLSearchParams();
    if (filters?.category) params.append('category', filters.category);
    if (filters?.status) params.append('status', filters.status);

    const response = await this.client.get(`/api/compliance?${params.toString()}`);
    return response.data.items || [];
  }

  async getComplianceItem(id: string): Promise<ComplianceItem | null> {
    try {
      const response = await this.client.get(`/api/compliance/${id}`);
      return response.data.item || null;
    } catch {
      return null;
    }
  }

  async updateComplianceStatus(id: string, status: ComplianceItem['status'], evidence?: string): Promise<ComplianceItem> {
    const response = await this.client.put(`/api/compliance/${id}/status`, { status, evidence });
    return response.data.item;
  }

  async getComplianceDashboard(): Promise<any> {
    const response = await this.client.get('/api/compliance/dashboard');
    return response.data;
  }

  // ============================================
  // INTELLECTUAL PROPERTY
  // ============================================

  async listIP(filters?: { type?: string; status?: string }): Promise<IntellectualProperty[]> {
    const params = new URLSearchParams();
    if (filters?.type) params.append('type', filters.type);
    if (filters?.status) params.append('status', filters.status);

    const response = await this.client.get(`/api/ip?${params.toString()}`);
    return response.data.items || [];
  }

  async registerIP(data: Partial<IntellectualProperty>): Promise<IntellectualProperty> {
    const response = await this.client.post('/api/ip', data);
    return response.data.item;
  }

  async renewIP(id: string, newExpirationDate: string): Promise<IntellectualProperty> {
    const response = await this.client.post(`/api/ip/${id}/renew`, { newExpirationDate });
    return response.data.item;
  }

  // ============================================
  // TEMPLATES
  // ============================================

  async listTemplates(): Promise<any[]> {
    const response = await this.client.get('/api/templates');
    return response.data.templates || [];
  }

  async generateContractFromTemplate(templateId: string, data: any): Promise<Contract> {
    const response = await this.client.post(`/api/templates/${templateId}/generate`, data);
    return response.data.contract;
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

export function createLegalConnector(tenantId: string): LegalRuntimeConnector {
  return new LegalRuntimeConnector({
    legalOsUrl: process.env.LEGAL_OS_URL || 'http://localhost:5035',
    tenantId,
    apiKey: process.env.INTERNAL_SERVICE_TOKEN,
  });
}

export default LegalRuntimeConnector;
