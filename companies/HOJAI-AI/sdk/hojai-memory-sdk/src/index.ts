/**
 * HOJAI MemoryOS Unified SDK
 * Access all 26 memory services through a single interface
 */

import axios, { AxiosInstance } from 'axios';

// ============ TYPES ============

export interface MemoryConfig {
  apiKey?: string;
  baseUrl?: string;
  timeout?: number;
  retries?: number;
}

export interface MemoryResponse<T = unknown> {
  data: T | null;
  success: boolean;
  error?: string;
}

export interface MemoryOptions {
  [key: string]: unknown;
}

// ============ BASE CLIENT ============

class BaseClient {
  protected client: AxiosInstance;

  constructor(config: MemoryConfig) {
    const baseURL = config.baseUrl || 'http://localhost:4703';

    this.client = axios.create({
      baseURL,
      timeout: config.timeout || 30000,
      headers: {
        'Content-Type': 'application/json',
        ...(config.apiKey && { 'Authorization': `Bearer ${config.apiKey}` }),
      },
    });

    // Response interceptor for consistent error handling
    this.client.interceptors.response.use(
      (response) => response,
      (error) => {
        console.error(`[MemorySDK Error] ${error.message}`);
        return Promise.reject(error);
      }
    );
  }

  protected async get<T = unknown>(path: string, params?: Record<string, unknown>): Promise<MemoryResponse<T>> {
    try {
      const config = params ? { params } : undefined;
      const response = await this.client.get(path, config);
      return { data: response.data as T, success: true };
    } catch (error: unknown) {
      const err = error as Error;
      return { data: null, success: false, error: err.message };
    }
  }

  protected async post<T = unknown>(path: string, data?: unknown): Promise<MemoryResponse<T>> {
    try {
      const response = await this.client.post(path, data);
      return { data: response.data as T, success: true };
    } catch (error: unknown) {
      const err = error as Error;
      return { data: null, success: false, error: err.message };
    }
  }

  protected async patch<T = unknown>(path: string, data?: unknown): Promise<MemoryResponse<T>> {
    try {
      const response = await this.client.patch(path, data);
      return { data: response.data as T, success: true };
    } catch (error: unknown) {
      const err = error as Error;
      return { data: null, success: false, error: err.message };
    }
  }

  protected async del<T = unknown>(path: string): Promise<MemoryResponse<T>> {
    try {
      const response = await this.client.delete(path);
      return { data: response.data as T, success: true };
    } catch (error: unknown) {
      const err = error as Error;
      return { data: null, success: false, error: err.message };
    }
  }
}

// ============ CORE SERVICES ============

export class MemoryOSClient extends BaseClient {
  async store(options: {
    userId: string;
    content: string;
    type?: string;
    metadata?: Record<string, unknown>;
  }): Promise<MemoryResponse<{ id: string }>> {
    return this.post('/api/memories', options);
  }

  async search(options: {
    query: string;
    userId?: string;
    limit?: number;
  }): Promise<MemoryResponse<{ memories: unknown[] }>> {
    return this.get('/api/memories/search', options);
  }

  async getById(memoryId: string): Promise<MemoryResponse<unknown>> {
    return this.get(`/api/memories/${memoryId}`);
  }

  async delete(memoryId: string): Promise<MemoryResponse<unknown>> {
    return this.del(`/api/memories/${memoryId}`);
  }

  async list(userId: string, options?: { limit?: number; offset?: number }): Promise<MemoryResponse<{ memories: unknown[] }>> {
    return this.get(`/api/memories/user/${userId}`, options);
  }
}

export class MemoryConfidenceClient extends BaseClient {
  async getConfidence(factId: string): Promise<MemoryResponse<{ score: number; breakdown: unknown }>> {
    return this.get(`/api/confidence/${factId}`);
  }

  async updateReliability(factId: string, reliability: number): Promise<MemoryResponse<unknown>> {
    return this.patch(`/api/confidence/${factId}`, { reliability });
  }

  async getTruthScore(factId: string): Promise<MemoryResponse<{ score: number; sources: unknown[] }>> {
    return this.get(`/api/confidence/${factId}/truth`);
  }
}

export class MemoryContextClient extends BaseClient {
  async getContext(options: {
    query: string;
    userId?: string;
    limit?: number;
  }): Promise<MemoryResponse<{ context: unknown[]; confidence: number }>> {
    return this.post('/api/context', options);
  }

  async composePrompt(context: {
    query: string;
    memories: unknown[];
  }): Promise<MemoryResponse<{ prompt: string }>> {
    return this.post('/api/context/compose', context);
  }
}

export class MemoryIntelligenceClient extends BaseClient {
  async remember(options: {
    content: string;
    userId: string;
    type?: string;
    metadata?: Record<string, unknown>;
  }): Promise<MemoryResponse<{ id: string; importance: number }>> {
    return this.post('/api/intelligence/remember', options);
  }

  async forget(memoryId: string, reason?: string): Promise<MemoryResponse<unknown>> {
    return this.post(`/api/intelligence/forget/${memoryId}`, { reason });
  }

  async compress(userId: string): Promise<MemoryResponse<{ compressed: number; original: number }>> {
    return this.post(`/api/intelligence/compress/${userId}`);
  }

  async merge(memories: string[]): Promise<MemoryResponse<{ merged: string }>> {
    return this.post('/api/intelligence/merge', { memories });
  }

  async analyzePatterns(userId: string): Promise<MemoryResponse<{ patterns: unknown[] }>> {
    return this.get(`/api/intelligence/patterns/${userId}`);
  }
}

export class MemoryRelationshipsClient extends BaseClient {
  async createRelationship(options: {
    from: string;
    to: string;
    type: string;
    weight?: number;
    metadata?: Record<string, unknown>;
  }): Promise<MemoryResponse<{ id: string }>> {
    return this.post('/api/relationships', options);
  }

  async getRelationships(entityId: string): Promise<MemoryResponse<{ relationships: unknown[] }>> {
    return this.get(`/api/relationships/${entityId}`);
  }

  async findPath(from: string, to: string): Promise<MemoryResponse<{ path: string[]; distance: number }>> {
    return this.get('/api/relationships/path', { from, to });
  }

  async getCommunities(entityId: string): Promise<MemoryResponse<{ communities: unknown[] }>> {
    return this.get(`/api/relationships/communities/${entityId}`);
  }

  async deleteRelationship(relationshipId: string): Promise<MemoryResponse<unknown>> {
    return this.del(`/api/relationships/${relationshipId}`);
  }
}

export class MemoryGovernanceClient extends BaseClient {
  async getConsent(userId: string): Promise<MemoryResponse<{ consents: unknown[] }>> {
    return this.get(`/api/governance/consent/${userId}`);
  }

  async updateConsent(options: {
    userId: string;
    consentType: string;
    granted: boolean;
    metadata?: Record<string, unknown>;
  }): Promise<MemoryResponse<unknown>> {
    return this.post('/api/governance/consent', options);
  }

  async deleteUserData(userId: string, reason?: string): Promise<MemoryResponse<{ deleted: number }>> {
    return this.post('/api/governance/delete', { userId, reason });
  }

  async getAuditLog(userId: string): Promise<MemoryResponse<{ logs: unknown[] }>> {
    return this.get(`/api/governance/audit/${userId}`);
  }

  async getDataRetention(userId: string): Promise<MemoryResponse<{ policies: unknown[] }>> {
    return this.get(`/api/governance/retention/${userId}`);
  }
}

export class MemoryForgettingClient extends BaseClient {
  async scheduleForgetting(options: {
    userId: string;
    memoryId: string;
    scheduledAt: string;
    reason?: string;
  }): Promise<MemoryResponse<{ scheduledId: string }>> {
    return this.post('/api/forgetting/schedule', options);
  }

  async getScheduled(userId: string): Promise<MemoryResponse<{ scheduled: unknown[] }>> {
    return this.get(`/api/forgetting/scheduled/${userId}`);
  }

  async cancelForgetting(scheduledId: string): Promise<MemoryResponse<unknown>> {
    return this.del(`/api/forgetting/schedule/${scheduledId}`);
  }

  async getPolicies(): Promise<MemoryResponse<{ policies: unknown[] }>> {
    return this.get('/api/forgetting/policies');
  }
}

export class MemoryPortabilityClient extends BaseClient {
  async exportData(userId: string): Promise<MemoryResponse<{ exportId: string; status: string }>> {
    return this.post('/api/portability/export', { userId });
  }

  async getExportStatus(exportId: string): Promise<MemoryResponse<{ status: string; downloadUrl?: string }>> {
    return this.get(`/api/portability/export/${exportId}`);
  }

  async importData(options: {
    userId: string;
    data: unknown;
    format: string;
  }): Promise<MemoryResponse<{ imported: number; errors: number }>> {
    return this.post('/api/portability/import', options);
  }

  async getImportStatus(importId: string): Promise<MemoryResponse<{ status: string; progress: number }>> {
    return this.get(`/api/portability/import/${importId}`);
  }
}

export class MemoryTruthClient extends BaseClient {
  async addStatement(options: {
    content: string;
    source: string;
    sourceType?: string;
    metadata?: Record<string, unknown>;
  }): Promise<MemoryResponse<{ id: string }>> {
    return this.post('/api/statements', options);
  }

  async verifyStatement(statementId: string): Promise<MemoryResponse<{ verified: boolean; evidence: unknown[] }>> {
    return this.get(`/api/statements/${statementId}/verify`);
  }

  async detectContradictions(entityId: string): Promise<MemoryResponse<{ contradictions: unknown[] }>> {
    return this.get(`/api/contradictions/${entityId}`);
  }

  async getSourceCredibility(source: string): Promise<MemoryResponse<{ credibility: number; factors: unknown[] }>> {
    return this.get(`/api/credibility/${source}`);
  }
}

export class MemoryMultimodalClient extends BaseClient {
  async processAsset(options: {
    type: 'image' | 'audio' | 'video' | 'document';
    url: string;
    userId: string;
    extractText?: boolean;
  }): Promise<MemoryResponse<{ assetId: string; extractedContent?: string; metadata: unknown }>> {
    return this.post('/api/assets/process', options);
  }

  async searchAssets(options: {
    query: string;
    userId?: string;
    type?: string;
  }): Promise<MemoryResponse<{ assets: unknown[] }>> {
    return this.get('/api/assets/search', options);
  }

  async getAsset(assetId: string): Promise<MemoryResponse<unknown>> {
    return this.get(`/api/assets/${assetId}`);
  }

  async deleteAsset(assetId: string): Promise<MemoryResponse<unknown>> {
    return this.del(`/api/assets/${assetId}`);
  }
}

export class MemoryFederationClient extends BaseClient {
  async createFederation(options: {
    name: string;
    adminUserId: string;
    privacyLevel?: string;
  }): Promise<MemoryResponse<{ federationId: string }>> {
    return this.post('/api/federations', options);
  }

  async inviteMember(options: {
    federationId: string;
    companyId: string;
    role?: string;
  }): Promise<MemoryResponse<{ inviteId: string }>> {
    return this.post('/api/federations/members/invite', options);
  }

  async shareMemory(options: {
    federationId: string;
    memoryId: string;
    recipientIds: string[];
    accessLevel?: string;
  }): Promise<MemoryResponse<{ shareId: string }>> {
    return this.post('/api/federations/share', options);
  }

  async getSharedMemories(federationId: string): Promise<MemoryResponse<{ memories: unknown[] }>> {
    return this.get(`/api/federations/${federationId}/memories`);
  }

  async syncFederation(federationId: string): Promise<MemoryResponse<{ synced: number }>> {
    return this.post(`/api/federations/${federationId}/sync`);
  }
}

// ============ UNIFIED MEMORYOS CLASS ============

export class MemoryOS {
  public memory: MemoryOSClient;
  public confidence: MemoryConfidenceClient;
  public context: MemoryContextClient;
  public intelligence: MemoryIntelligenceClient;
  public relationships: MemoryRelationshipsClient;
  public governance: MemoryGovernanceClient;
  public forgetting: MemoryForgettingClient;
  public portability: MemoryPortabilityClient;
  public truth: MemoryTruthClient;
  public multimodal: MemoryMultimodalClient;
  public federation: MemoryFederationClient;

  constructor(config: MemoryConfig = {}) {
    // Default ports for each service
    const memoryUrl = config.baseUrl || 'http://localhost:4703';
    const confidenceUrl = config.baseUrl?.replace('4703', '4152') || 'http://localhost:4152';
    const contextUrl = config.baseUrl?.replace('4703', '4793') || 'http://localhost:4793';
    const intelligenceUrl = config.baseUrl?.replace('4703', '4786') || 'http://localhost:4786';
    const relationshipsUrl = config.baseUrl?.replace('4703', '4790') || 'http://localhost:4790';
    const governanceUrl = config.baseUrl?.replace('4703', '4791') || 'http://localhost:4791';
    const forgettingUrl = config.baseUrl?.replace('4703', '4792') || 'http://localhost:4792';
    const portabilityUrl = config.baseUrl?.replace('4703', '4793') || 'http://localhost:4793';
    const truthUrl = config.baseUrl?.replace('4703', '4801') || 'http://localhost:4801';
    const multimodalUrl = config.baseUrl?.replace('4703', '4802') || 'http://localhost:4802';
    const federationUrl = config.baseUrl?.replace('4703', '4803') || 'http://localhost:4803';

    this.memory = new MemoryOSClient({ ...config, baseUrl: memoryUrl });
    this.confidence = new MemoryConfidenceClient({ ...config, baseUrl: confidenceUrl });
    this.context = new MemoryContextClient({ ...config, baseUrl: contextUrl });
    this.intelligence = new MemoryIntelligenceClient({ ...config, baseUrl: intelligenceUrl });
    this.relationships = new MemoryRelationshipsClient({ ...config, baseUrl: relationshipsUrl });
    this.governance = new MemoryGovernanceClient({ ...config, baseUrl: governanceUrl });
    this.forgetting = new MemoryForgettingClient({ ...config, baseUrl: forgettingUrl });
    this.portability = new MemoryPortabilityClient({ ...config, baseUrl: portabilityUrl });
    this.truth = new MemoryTruthClient({ ...config, baseUrl: truthUrl });
    this.multimodal = new MemoryMultimodalClient({ ...config, baseUrl: multimodalUrl });
    this.federation = new MemoryFederationClient({ ...config, baseUrl: federationUrl });
  }

  // Convenient shorthand methods
  async remember(content: string, userId: string, options?: {
    type?: string;
    metadata?: Record<string, unknown>;
  }): Promise<MemoryResponse<{ id: string; importance: number }>> {
    return this.intelligence.remember({ content, userId, ...options });
  }

  async recall(query: string, userId?: string): Promise<MemoryResponse<{ memories: unknown[] }>> {
    return this.memory.search({ query, userId });
  }

  async getContext(query: string, userId?: string): Promise<MemoryResponse<{ context: unknown[]; confidence: number }>> {
    return this.context.getContext({ query, userId });
  }

  async verifyClaim(claim: string): Promise<MemoryResponse<{ verified: boolean; evidence: unknown[] }>> {
    const result = await this.truth.addStatement({ content: claim, source: 'user' });
    if (!result.success || !result.data) {
      return { success: false, data: null, error: result.error };
    }
    return this.truth.verifyStatement(result.data.id);
  }

  async deleteUserData(userId: string, reason?: string): Promise<MemoryResponse<{ deleted: number }>> {
    return this.governance.deleteUserData(userId, reason);
  }

  async exportUserData(userId: string): Promise<MemoryResponse<{ exportId: string; status: string }>> {
    return this.portability.exportData(userId);
  }

  async healthCheck(): Promise<Record<string, boolean>> {
    const services = [
      { name: 'memory', url: 'http://localhost:4703' },
      { name: 'confidence', url: 'http://localhost:4152' },
      { name: 'context', url: 'http://localhost:4793' },
      { name: 'intelligence', url: 'http://localhost:4786' },
      { name: 'relationships', url: 'http://localhost:4790' },
      { name: 'governance', url: 'http://localhost:4791' },
      { name: 'forgetting', url: 'http://localhost:4792' },
      { name: 'portability', url: 'http://localhost:4793' },
      { name: 'truth', url: 'http://localhost:4801' },
      { name: 'multimodal', url: 'http://localhost:4802' },
      { name: 'federation', url: 'http://localhost:4803' },
    ];

    const results: Record<string, boolean> = {};
    await Promise.all(
      services.map(async ({ name, url }) => {
        try {
          const response = await axios.get(`${url}/health`);
          results[name] = response.status === 200;
        } catch {
          results[name] = false;
        }
      })
    );
    return results;
  }
}

// ============ NAMED EXPORTS ============
export { MemoryOS as default };
