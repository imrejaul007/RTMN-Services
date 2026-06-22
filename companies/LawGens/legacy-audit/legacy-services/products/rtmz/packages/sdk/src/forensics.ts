/**
 * RTMZ Forensics Client - TypeScript client for forensics services
 */

import { RTMZClient } from './index.js';

// Forensics configuration
export interface ForensicsConfig {
  gatewayUrl: string;
  evidenceUrl?: string;
  deepfakeUrl?: string;
  custodyUrl?: string;
  forensicsUrl?: string;
  socialUrl?: string;
  financialUrl?: string;
  locationUrl?: string;
  reportsUrl?: string;
}

// Investigation types
export interface Investigation {
  id: string;
  title: string;
  description?: string;
  type: InvestigationType;
  status: InvestigationStatus;
  priority: InvestigationPriority;
  query: string;
  results?: Record<string, unknown>;
  mcpResults?: Record<string, unknown>;
  reportId?: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export type InvestigationType = 'evidence' | 'deepfake' | 'osint' | 'financial' | 'location' | 'full';
export type InvestigationStatus = 'pending' | 'in_progress' | 'completed' | 'failed';
export type InvestigationPriority = 'low' | 'medium' | 'high' | 'critical';

// Evidence types
export interface Evidence {
  id: string;
  type: EvidenceType;
  filename: string;
  fileSize: number;
  mimeType: string;
  sha256Hash: string;
  metadata?: Record<string, unknown>;
  source: string;
  importedBy: string;
  investigationId?: string;
  createdAt: string;
}

export type EvidenceType = 'whatsapp' | 'email' | 'cctv' | 'document' | 'image' | 'video' | 'audio' | 'other';

// Deepfake types
export interface DeepfakeAnalysis {
  id: string;
  fileId: string;
  fileType: string;
  analysisType: string;
  confidence: number;
  verdict: string;
  details?: Record<string, unknown>;
  examinedBy: string;
  examinedAt: string;
}

// Chain of Custody types
export interface CustodyChain {
  evidenceId: string;
  chain: CustodyTransfer[];
  isIntact: boolean;
  createdAt: string;
}

export interface CustodyTransfer {
  id: string;
  evidenceId: string;
  fromCustodian: string;
  toCustodian: string;
  purpose: string;
  hashVerified: boolean;
  transferredAt: string;
  notes?: string;
}

// Financial types
export interface FinancialAnalysis {
  id: string;
  caseId: string;
  analysisType: string;
  findings: FinancialFinding[];
  anomalies: FinancialAnomaly[];
  summary?: string;
  createdAt: string;
}

export interface FinancialFinding {
  type: string;
  description: string;
  severity: string;
  details?: Record<string, unknown>;
}

export interface FinancialAnomaly {
  type: string;
  description: string;
  confidence: number;
  affectedTransactions?: number;
}

// Social/OSINT types
export interface SocialProfile {
  identifier: string;
  platform?: string;
  profileData?: Record<string, unknown>;
  riskScore?: number;
  lastUpdated?: string;
}

export interface SocialConnection {
  identifier: string;
  platform?: string;
  relationship?: string;
  strength: number;
}

// Location types
export interface LocationData {
  identifier: string;
  type: string;
  coordinates?: { lat: number; lng: number };
  address?: string;
  confidence: number;
  timestamp?: string;
  metadata?: Record<string, unknown>;
}

// Forensics tool
export interface ForensicsTool {
  name: string;
  description: string;
  endpoint: string;
  capabilities: string[];
  mcpPort: number;
}

// Forensics Client class
export class ForensicsClient {
  private gatewayUrl: string;
  private token?: string;

  constructor(config: ForensicsConfig) {
    this.gatewayUrl = config.gatewayUrl;
  }

  setToken(token: string): void {
    this.token = token;
  }

  private getHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    };
    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }
    return headers;
  }

  private async request<T>(path: string, options?: RequestInit): Promise<T> {
    const response = await fetch(`${this.gatewayUrl}${path}`, {
      ...options,
      headers: { ...this.getHeaders(), ...((options?.headers as Record<string, string>) || {}) }
    });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    return response.json();
  }

  // ===== INVESTIGATION METHODS =====

  async startInvestigation(input: {
    query: string;
    type?: InvestigationType;
    priority?: InvestigationPriority;
    title?: string;
    description?: string;
    mcpServices?: string[];
  }): Promise<Investigation> {
    return this.request<Investigation>('/api/investigation', {
      method: 'POST',
      body: JSON.stringify(input)
    });
  }

  async getInvestigation(id: string): Promise<Investigation | null> {
    try {
      return await this.request<Investigation>(`/api/investigation/${id}`);
    } catch {
      return null;
    }
  }

  async listInvestigations(params?: {
    status?: InvestigationStatus;
    type?: InvestigationType;
    priority?: InvestigationPriority;
    page?: number;
    limit?: number;
  }): Promise<{ items: Investigation[]; total: number; page: number; limit: number; hasMore: boolean }> {
    const query = new URLSearchParams();
    if (params?.status) query.append('status', params.status);
    if (params?.type) query.append('type', params.type);
    if (params?.priority) query.append('priority', params.priority);
    if (params?.page) query.append('page', String(params.page));
    if (params?.limit) query.append('limit', String(params.limit));

    return this.request(`/api/investigations?${query.toString()}`);
  }

  async runFullInvestigation(query: string, priority?: InvestigationPriority): Promise<Investigation> {
    return this.startInvestigation({ query, type: 'full', priority });
  }

  // ===== EVIDENCE METHODS =====

  async ingestEvidence(input: {
    type: EvidenceType;
    filename: string;
    fileData: string;
    source: string;
    metadata?: Record<string, unknown>;
    investigationId?: string;
  }): Promise<Evidence> {
    return this.request<Evidence>('/api/evidence', {
      method: 'POST',
      body: JSON.stringify(input)
    });
  }

  async getEvidence(id: string): Promise<Evidence | null> {
    try {
      return await this.request<Evidence>(`/api/evidence/${id}`);
    } catch {
      return null;
    }
  }

  async getEvidenceByHash(hash: string): Promise<Evidence | null> {
    try {
      return await this.request<Evidence>(`/api/evidence/by-hash/${hash}`);
    } catch {
      return null;
    }
  }

  async verifyEvidence(hash: string): Promise<Evidence> {
    return this.request<Evidence>('/api/evidence/verify', {
      method: 'POST',
      body: JSON.stringify({ hash })
    });
  }

  // ===== DEEPFAKE METHODS =====

  async analyzeDeepfake(input: {
    fileId: string;
    fileType: string;
    analysisType?: string;
  }): Promise<DeepfakeAnalysis> {
    return this.request<DeepfakeAnalysis>('/api/deepfake/analyze', {
      method: 'POST',
      body: JSON.stringify(input)
    });
  }

  async getDeepfakeAnalysis(id: string): Promise<DeepfakeAnalysis | null> {
    try {
      return await this.request<DeepfakeAnalysis>(`/api/deepfake/${id}`);
    } catch {
      return null;
    }
  }

  // ===== CHAIN OF CUSTODY METHODS =====

  async createCustodyChain(evidenceId: string): Promise<CustodyChain> {
    return this.request<CustodyChain>('/api/custody/chain', {
      method: 'POST',
      body: JSON.stringify({ evidenceId })
    });
  }

  async getCustodyChain(evidenceId: string): Promise<CustodyChain | null> {
    try {
      return await this.request<CustodyChain>(`/api/custody/chain/${evidenceId}`);
    } catch {
      return null;
    }
  }

  async transferCustody(input: {
    evidenceId: string;
    fromCustodian: string;
    toCustodian: string;
    purpose: string;
    notes?: string;
  }): Promise<CustodyTransfer> {
    return this.request<CustodyTransfer>('/api/custody/transfer', {
      method: 'POST',
      body: JSON.stringify(input)
    });
  }

  async verifyChain(evidenceId: string): Promise<CustodyChain> {
    return this.request<CustodyChain>(`/api/custody/chain/${evidenceId}/verify`, {
      method: 'POST'
    });
  }

  // ===== FINANCIAL METHODS =====

  async analyzeFinancial(input: {
    caseId: string;
    analysisType: string;
    transactionData?: Record<string, unknown>;
  }): Promise<FinancialAnalysis> {
    return this.request<FinancialAnalysis>('/api/financial/analyze', {
      method: 'POST',
      body: JSON.stringify(input)
    });
  }

  async getFinancialAnalysis(id: string): Promise<FinancialAnalysis | null> {
    try {
      return await this.request<FinancialAnalysis>(`/api/financial/${id}`);
    } catch {
      return null;
    }
  }

  // ===== SOCIAL/OSINT METHODS =====

  async lookupSocialProfile(identifier: string, platform?: string): Promise<SocialProfile> {
    return this.request<SocialProfile>('/api/social/profile', {
      method: 'POST',
      body: JSON.stringify({ identifier, platform })
    });
  }

  async analyzeSocialConnections(identifier: string): Promise<SocialConnection[]> {
    return this.request<SocialConnection[]>('/api/social/connections', {
      method: 'POST',
      body: JSON.stringify({ identifier })
    });
  }

  // ===== LOCATION METHODS =====

  async lookupLocation(input: {
    type: string;
    identifier: string;
  }): Promise<LocationData> {
    return this.request<LocationData>('/api/location/lookup', {
      method: 'POST',
      body: JSON.stringify(input)
    });
  }

  // ===== REPORT METHODS =====

  async generateReport(investigationId: string, type: string, format?: string): Promise<{
    reportId: string;
    downloadUrl?: string;
  }> {
    return this.request('/api/report/generate', {
      method: 'POST',
      body: JSON.stringify({ investigationId, type, format })
    });
  }

  // ===== TOOLS =====

  async getTools(): Promise<ForensicsTool[]> {
    return this.request<ForensicsTool[]>('/api/tools');
  }
}

// Factory function
export function createForensicsClient(config: ForensicsConfig): ForensicsClient {
  return new ForensicsClient(config);
}

// Extend RTMZClient with forensics methods
declare module './index.js' {
  interface RTMZClient {
    forensics: ForensicsClient;
  }
}

export function attachForensicsToClient(client: RTMZClient, config: ForensicsConfig): void {
  (client as RTMZClient & { forensics: ForensicsClient }).forensics = new ForensicsClient(config);
}
