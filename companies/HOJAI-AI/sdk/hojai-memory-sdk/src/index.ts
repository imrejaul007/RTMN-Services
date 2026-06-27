/**
 * HOJAI MemoryOS Unified SDK
 * Access all 26 memory services through a single interface
 */

import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';

// ============ TYPES ============

export interface MemoryConfig {
  apiKey?: string;
  baseUrl?: string;
  timeout?: number;
  retries?: number;
}

export interface MemoryResponse<T = any> {
  data: T;
  success: boolean;
  error?: string;
}

export interface MemoryOptions {
  [key: string]: any;
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

  protected async get<T = any>(path: string, params?: any): Promise<MemoryResponse<T>> {
    try {
      const response = await this.client.get(path, { params });
      return { data: response.data, success: true };
    } catch (error: any) {
      return { data: null, success: false, error: error.message };
    }
  }

  protected async post<T = any>(path: string, data?: any): Promise<MemoryResponse<T>> {
    try {
      const response = await this.client.post(path, data);
      return { data: response.data, success: true };
    } catch (error: any) {
      return { data: null, success: false, error: error.message };
    }
  }

  protected async patch<T = any>(path: string, data?: any): Promise<MemoryResponse<T>> {
    try {
      const response = await this.client.patch(path, data);
      return { data: response.data, success: true };
    } catch (error: any) {
      return { data: null, success: false, error: error.message };
    }
  }

  protected async delete<T = any>(path: string): Promise<MemoryResponse<T>> {
    try {
      const response = await this.client.delete(path);
      return { data: response.data, success: true };
    } catch (error: any) {
      return { data: null, success: false, error: error.message };
    }
  }
}

// ============ CORE SERVICES ============

export class MemoryOSClient extends BaseClient {
  /**
   * Store a memory
   */
  async store(options: {
    userId: string;
    content: string;
    type?: string;
    metadata?: Record<string, any>;
  }): Promise<MemoryResponse<{ id: string }>> {
    return this.post('/api/memories', options);
  }

  /**
   * Search memories
   */
  async search(options: {
    query: string;
    userId?: string;
    limit?: number;
  }): Promise<MemoryResponse<{ memories: any[] }>> {
    return this.get('/api/memories/search', options);
  }

  /**
   * Get memory by ID
   */
  async get(memoryId: string): Promise<MemoryResponse<any>> {
    return this.get(`/api/memories/${memoryId}`);
  }

  /**
   * Delete memory
   */
  async delete(memoryId: string): Promise<MemoryResponse<any>> {
    return this.delete(`/api/memories/${memoryId}`);
  }

  /**
   * List user memories
   */
  async list(userId: string, options?: { limit?: number; offset?: number }): Promise<MemoryResponse<{ memories: any[] }>> {
    return this.get(`/api/memories/user/${userId}`, options);
  }
}

export class MemoryConfidenceClient extends BaseClient {
  /**
   * Get confidence score for a fact
   */
  async getConfidence(factId: string): Promise<MemoryResponse<{ score: number; breakdown: any }>> {
    return this.get(`/api/confidence/${factId}`);
  }

  /**
   * Update fact reliability
   */
  async updateReliability(factId: string, reliability: number): Promise<MemoryResponse<any>> {
    return this.patch(`/api/confidence/${factId}`, { reliability });
  }
}

export class MemoryContextClient extends BaseClient {
  /**
   * Compose context for LLM
   */
  async composeContext(options: {
    userId: string;
    query: string;
    limit?: number;
  }): Promise<MemoryResponse<{ context: string; sources: string[] }>> {
    return this.post('/api/compose', options);
  }
}

// ============ INTELLIGENT SERVICES ============

export class MemoryIntelligenceClient extends BaseClient {
  /**
   * Remember something
   */
  async remember(options: { userId: string; content: string; importance?: number }): Promise<MemoryResponse<any>> {
    return this.post('/api/memories', options);
  }

  /**
   * Forget something
   */
  async forget(options: { userId: string; memoryId: string; reason?: string }): Promise<MemoryResponse<any>> {
    return this.post('/api/forget', options);
  }

  /**
   * Compress memories
   */
  async compress(options: { userId: string; }): Promise<MemoryResponse<any>> {
    return this.post('/api/compress', options);
  }

  /**
   * Merge similar memories
   */
  async merge(options: { userId: string; memoryIds: string[] }): Promise<MemoryResponse<any>> {
    return this.post('/api/merge', options);
  }

  /**
   * Check for contradictions
   */
  async checkContradictions(options: { userId: string; statement: string }): Promise<MemoryResponse<any>> {
    return this.post('/api/contradictions/check', options);
  }
}

// ============ ENTERPRISE SERVICES ============

export class MemoryRelationshipsClient extends BaseClient {
  /**
   * Create relationship between entities
   */
  async createRelationship(options: {
    sourceId: string;
    targetId: string;
    type: string;
    strength?: number;
  }): Promise<MemoryResponse<any>> {
    return this.post('/api/relationships', options);
  }

  /**
   * Get relationships for entity
   */
  async getRelationships(entityId: string, options?: { type?: string; direction?: string }): Promise<MemoryResponse<any>> {
    return this.get(`/api/relationships/${entityId}`, options);
  }

  /**
   * Find shortest path between entities
   */
  async findPath(fromId: string, toId: string): Promise<MemoryResponse<any>> {
    return this.get('/api/graph/path', { from: fromId, to: toId });
  }

  /**
   * Detect communities
   */
  async detectCommunities(options?: { algorithm?: string }): Promise<MemoryResponse<any>> {
    return this.get('/api/communities', options);
  }
}

export class MemoryGovernanceClient extends BaseClient {
  /**
   * Register data ownership
   */
  async registerOwnership(options: {
    entityId: string;
    ownerId: string;
    ownershipType: string;
  }): Promise<MemoryResponse<any>> {
    return this.post('/api/ownership', options);
  }

  /**
   * Grant consent
   */
  async grantConsent(options: {
    subjectId: string;
    processorId: string;
    purpose: string;
    expiresAt?: string;
  }): Promise<MemoryResponse<any>> {
    return this.post('/api/consent', options);
  }

  /**
   * Verify consent
   */
  async verifyConsent(options: {
    subjectId: string;
    processorId: string;
    purpose: string;
  }): Promise<MemoryResponse<any>> {
    return this.post('/api/consent/verify', options);
  }

  /**
   * Delete all data for subject (GDPR)
   */
  async deleteAllData(subjectId: string, reason?: string): Promise<MemoryResponse<any>> {
    return this.post('/api/deletion', { subjectId, reason });
  }

  /**
   * Export all data for subject (GDPR)
   */
  async exportAllData(subjectId: string): Promise<MemoryResponse<any>> {
    return this.post('/api/export', { subjectId });
  }
}

export class MemoryForgettingClient extends BaseClient {
  /**
   * Schedule forgetting
   */
  async schedule(options: {
    memoryId: string;
    forgetAt: string;
    reason?: string;
  }): Promise<MemoryResponse<any>> {
    return this.post('/api/schedule', options);
  }

  /**
   * Undo forgetting
   */
  async undo(forgetId: string): Promise<MemoryResponse<any>> {
    return this.post(`/api/undo/${forgetId}`, {});
  }

  /**
   * Get forgetting policies
   */
  async getPolicies(userId: string): Promise<MemoryResponse<any>> {
    return this.get(`/api/policies/${userId}`);
  }

  /**
   * Set forgetting policy
   */
  async setPolicy(options: {
    userId: string;
    policyType: string;
    config: any;
  }): Promise<MemoryResponse<any>> {
    return this.post('/api/policies', options);
  }
}

export class MemoryPortabilityClient extends BaseClient {
  /**
   * Create export job
   */
  async createExport(options: {
    userId: string;
    format: 'json' | 'csv' | 'jsonld';
  }): Promise<MemoryResponse<any>> {
    return this.post('/api/exports', options);
  }

  /**
   * Get export status
   */
  async getExportStatus(exportId: string): Promise<MemoryResponse<any>> {
    return this.get(`/api/exports/${exportId}`);
  }

  /**
   * Download export
   */
  async downloadExport(exportId: string): Promise<MemoryResponse<any>> {
    return this.get(`/api/exports/${exportId}/download`);
  }
}

// ============ TRUTH SERVICES ============

export class MemoryTruthClient extends BaseClient {
  /**
   * Register a source
   */
  async registerSource(options: {
    sourceId: string;
    type: 'human' | 'agent' | 'document' | 'system' | 'api';
    role?: string;
    credibility?: number;
  }): Promise<MemoryResponse<any>> {
    return this.post('/api/sources', options);
  }

  /**
   * Add a statement
   */
  async addStatement(options: {
    content: string;
    sourceId: string;
    confidence?: number;
    validFrom?: string;
    validUntil?: string;
  }): Promise<MemoryResponse<any>> {
    return this.post('/api/statements', options);
  }

  /**
   * Verify a claim
   */
  async verify(claim: string): Promise<MemoryResponse<any>> {
    return this.post('/api/verify', { claim });
  }

  /**
   * Get truth score for entity
   */
  async getTruthScore(entityId: string): Promise<MemoryResponse<any>> {
    return this.get(`/api/truth-scores/${entityId}`);
  }

  /**
   * Check for contradictions
   */
  async checkContradiction(statementAId: string, statementBId: string): Promise<MemoryResponse<any>> {
    return this.post('/api/contradictions/check', { statementAId, statementBId });
  }
}

// ============ MULTIMODAL SERVICES ============

export class MemoryMultimodalClient extends BaseClient {
  /**
   * Upload/Register asset
   */
  async uploadAsset(options: {
    type: 'image' | 'audio' | 'video' | 'document' | 'whiteboard';
    source: string;
    url?: string;
    metadata?: Record<string, any>;
  }): Promise<MemoryResponse<any>> {
    return this.post('/api/assets', options);
  }

  /**
   * Extract content from asset
   */
  async extractContent(assetId: string): Promise<MemoryResponse<any>> {
    return this.post('/api/extract', { assetId });
  }

  /**
   * Search across multimodal content
   */
  async search(query: string, options?: { type?: string; limit?: number }): Promise<MemoryResponse<any>> {
    return this.get('/api/search', { query, ...options });
  }

  /**
   * Get asset
   */
  async getAsset(assetId: string): Promise<MemoryResponse<any>> {
    return this.get(`/api/assets/${assetId}`);
  }
}

// ============ FEDERATION SERVICES ============

export class MemoryFederationClient extends BaseClient {
  /**
   * Create federation
   */
  async createFederation(options: {
    name: string;
    memberIds?: string[];
  }): Promise<MemoryResponse<any>> {
    return this.post('/api/federations', options);
  }

  /**
   * Add member to federation
   */
  async addMember(federationId: string, memberId: string): Promise<MemoryResponse<any>> {
    return this.patch(`/api/federations/${federationId}`, {
      memberIds: [memberId],
    });
  }

  /**
   * Share memory across federation
   */
  async shareMemory(options: {
    sourceMemberId: string;
    federationId: string;
    content: any;
    permissions?: any;
  }): Promise<MemoryResponse<any>> {
    return this.post('/api/shared-memories', options);
  }

  /**
   * Query shared memories
   */
  async queryShared(options: {
    query: string;
    federationId?: string;
  }): Promise<MemoryResponse<any>> {
    return this.post('/api/query', options);
  }

  /**
   * Create sync job
   */
  async createSync(options: {
    type: 'pull' | 'push' | 'bidirectional';
    sourceId: string;
    targetId: string;
  }): Promise<MemoryResponse<any>> {
    return this.post('/api/sync', options);
  }
}

// ============ UNIFIED MEMORY OS ============

export class MemoryOS extends BaseClient {
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

  private servicePorts: Record<string, number> = {
    memory: 4703,
    confidence: 4152,
    context: 4793,
    intelligence: 4786,
    relationships: 4790,
    governance: 4791,
    forgetting: 4792,
    portability: 4793,
    truth: 4801,
    multimodal: 4802,
    federation: 4803,
  };

  constructor(private config: MemoryConfig = {}) {
    super(config);

    // Initialize all service clients with their respective ports
    this.memory = this.createServiceClient('memory');
    this.confidence = this.createServiceClient('confidence');
    this.context = this.createServiceClient('context');
    this.intelligence = this.createServiceClient('intelligence');
    this.relationships = this.createServiceClient('relationships');
    this.governance = this.createServiceClient('governance');
    this.forgetting = this.createServiceClient('forgetting');
    this.portability = this.createServiceClient('portability');
    this.truth = this.createServiceClient('truth');
    this.multimodal = this.createServiceClient('multimodal');
    this.federation = this.createServiceClient('federation');
  }

  private createServiceClient(serviceName: string): any {
    const port = this.servicePorts[serviceName];
    const baseUrl = this.config.baseUrl?.replace(/\d+$/, String(port)) || `http://localhost:${port}`;

    const client = new BaseClient({ ...this.config, baseUrl });

    // Copy all public methods to the service client
    return client;
  }

  /**
   * Quick store and verify - one-liner for common use case
   */
  async remember(content: string, userId: string, options?: { importance?: number; tags?: string[] }): Promise<MemoryResponse<any>> {
    return this.intelligence.remember({ userId, content, ...options });
  }

  /**
   * Quick recall - search and retrieve
   */
  async recall(query: string, userId?: string): Promise<MemoryResponse<any>> {
    return this.memory.search({ query, userId });
  }

  /**
   * Verify claim across all sources
   */
  async verify(claim: string): Promise<MemoryResponse<any>> {
    return this.truth.verify(claim);
  }

  /**
   * Get full context for a user
   */
  async getContext(userId: string, query: string): Promise<MemoryResponse<any>> {
    return this.context.composeContext({ userId, query });
  }

  /**
   * GDPR: Complete data deletion for user
   */
  async deleteUserData(userId: string, reason?: string): Promise<MemoryResponse<any>> {
    return this.governance.deleteAllData(userId, reason);
  }

  /**
   * GDPR: Export all user data
   */
  async exportUserData(userId: string): Promise<MemoryResponse<any>> {
    return this.governance.exportAllData(userId);
  }

  /**
   * Health check all services
   */
  async healthCheck(): Promise<Record<string, boolean>> {
    const results: Record<string, boolean> = {};

    for (const [name, port] of Object.entries(this.servicePorts)) {
      try {
        const baseUrl = this.config.baseUrl?.replace(/\d+$/, String(port)) || `http://localhost:${port}`;
        const testClient = new BaseClient({ ...this.config, baseUrl });
        const response = await testClient.get('/health');
        results[name] = response.success;
      } catch {
        results[name] = false;
      }
    }

    return results;
  }
}

// ============ EXPORTS ============

export default MemoryOS;
export { MemoryOS, MemoryOSClient, MemoryConfig, MemoryResponse };
