/**
 * HOJAI SDK - Client Implementation
 *
 * Main client for interacting with HOJAI AI services.
 *
 * @example
 * ```typescript
 * import { HojaiClient } from '@hojai/sdk';
 *
 * const client = new HojaiClient({
 *   baseUrl: 'https://api.hojai.ai',
 *   apiKey: process.env.HOJAI_API_KEY!,
 *   tenantId: 'my-tenant'
 * });
 *
 * // Health check
 * await client.health();
 *
 * // Create and use an agent
 * const agent = await client.agents.create({ name: 'My Agent', type: 'assistant' });
 * const response = await client.agents.chat(agent.id, { message: 'Hello!' });
 * ```
 */

import type {
  HojaiConfig,
  HealthResponse,
  Agent,
  CreateAgentRequest,
  UpdateAgentRequest,
  AgentExecution,
  Memory,
  CreateMemoryRequest,
  SearchMemoriesRequest,
  Workflow,
  CreateWorkflowRequest,
  ExecuteWorkflowRequest,
  LLMRequest,
  LLMResponse,
  EmbeddingRequest,
  EmbeddingResponse,
  RAGQuery,
  RAGResponse,
} from './types.js';

// ============================================================================
// ERROR TYPES
// ============================================================================

/**
 * HOJAI API Error
 */
export class HojaiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly statusText?: string,
    public readonly code?: string
  ) {
    super(message);
    this.name = 'HojaiError';
  }

  static fromResponse(response: Response, body?: unknown): HojaiError {
    const code = (body as { code?: string } | undefined)?.code;
    return new HojaiError(
      response.status,
      response.statusText || `HTTP ${response.status}`,
      response.statusText,
      code
    );
  }

  get isUnauthorized(): boolean {
    return this.status === 401;
  }

  get isForbidden(): boolean {
    return this.status === 403;
  }

  get isNotFound(): boolean {
    return this.status === 404;
  }

  get isRateLimited(): boolean {
    return this.status === 429;
  }

  get isServerError(): boolean {
    return this.status >= 500;
  }
}

// ============================================================================
// CLIENT IMPLEMENTATION
// ============================================================================

/**
 * Main HOJAI client
 */
export class HojaiClient {
  private readonly baseUrl: string;
  private readonly apiKey: string;
  private readonly tenantId: string;
  private readonly headers: HeadersInit;

  // Sub-clients
  public readonly agents: AgentClient;
  public readonly memory: MemoryClient;
  public readonly workflows: WorkflowClient;
  public readonly llm: LLMClient;
  public readonly embeddings: EmbeddingClient;
  public readonly rag: RAGClient;

  constructor(config: HojaiConfig) {
    this.baseUrl = config.baseUrl || 'https://api.hojai.ai';
    this.apiKey = config.apiKey || '';
    this.tenantId = config.tenantId;

    this.headers = {
      'Content-Type': 'application/json',
      'X-Tenant-Id': this.tenantId,
      ...(this.apiKey && { Authorization: `Bearer ${this.apiKey}` }),
    };

    // Initialize sub-clients
    this.agents = new AgentClient(this);
    this.memory = new MemoryClient(this);
    this.workflows = new WorkflowClient(this);
    this.llm = new LLMClient(this);
    this.embeddings = new EmbeddingClient(this);
    this.rag = new RAGClient(this);
  }

  /**
   * Make an HTTP request
   */
  async request<T>(
    method: string,
    path: string,
    body?: unknown,
    options?: RequestInit
  ): Promise<T> {
    const url = `${this.baseUrl}${path}`;

    const response = await fetch(url, {
      method,
      headers: this.headers,
      body: body ? JSON.stringify(body) : undefined,
      ...options,
    });

    if (!response.ok) {
      let bodyText: string | undefined;
      try {
        bodyText = await response.text();
        const bodyJson = bodyText ? JSON.parse(bodyText) : undefined;
        throw HojaiError.fromResponse(response, bodyJson);
      } catch (error) {
        if (error instanceof HojaiError) {
          throw error;
        }
        throw new HojaiError(
          response.status,
          bodyText || response.statusText,
          response.statusText
        );
      }
    }

    // Handle empty responses
    const text = await response.text();
    if (!text) {
      return {} as T;
    }

    return JSON.parse(text) as T;
  }

  /**
   * Health check
   */
  async health(): Promise<HealthResponse> {
    return this.request<HealthResponse>('GET', '/health');
  }

  /**
   * Get client configuration info
   */
  getConfig(): { baseUrl: string; tenantId: string; hasApiKey: boolean } {
    return {
      baseUrl: this.baseUrl,
      tenantId: this.tenantId,
      hasApiKey: !!this.apiKey,
    };
  }
}

// ============================================================================
// AGENT CLIENT
// ============================================================================

/**
 * Client for agent operations
 */
export class AgentClient {
  constructor(private client: HojaiClient) {}

  /**
   * Create a new agent
   */
  async create(request: CreateAgentRequest): Promise<Agent> {
    return this.client.request<Agent>('POST', '/api/agents', request);
  }

  /**
   * Get agent by ID
   */
  async get(agentId: string): Promise<Agent> {
    return this.client.request<Agent>('GET', `/api/agents/${agentId}`);
  }

  /**
   * Update an agent
   */
  async update(agentId: string, request: UpdateAgentRequest): Promise<Agent> {
    return this.client.request<Agent>('PATCH', `/api/agents/${agentId}`, request);
  }

  /**
   * List agents
   */
  async list(options?: {
    status?: string;
    type?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ agents: Agent[]; total: number }> {
    const params = new URLSearchParams();
    if (options?.status) params.set('status', options.status);
    if (options?.type) params.set('type', options.type);
    if (options?.limit) params.set('limit', String(options.limit));
    if (options?.offset) params.set('offset', String(options.offset));

    const query = params.toString();
    return this.client.request<{ agents: Agent[]; total: number }>(
      'GET',
      `/api/agents${query ? `?${query}` : ''}`
    );
  }

  /**
   * Delete an agent
   */
  async delete(agentId: string): Promise<void> {
    await this.client.request('DELETE', `/api/agents/${agentId}`);
  }

  /**
   * Chat with an agent
   */
  async chat(
    agentId: string,
    request: { message: string; sessionId?: string; metadata?: Record<string, unknown> }
  ): Promise<{ response: string; sessionId: string; metadata?: Record<string, unknown> }> {
    return this.client.request(
      'POST',
      `/api/agents/${agentId}/chat`,
      request
    );
  }

  /**
   * Get agent executions
   */
  async getExecutions(
    agentId: string,
    options?: { limit?: number; status?: string }
  ): Promise<AgentExecution[]> {
    const params = new URLSearchParams();
    if (options?.limit) params.set('limit', String(options.limit));
    if (options?.status) params.set('status', options.status);

    const query = params.toString();
    return this.client.request<AgentExecution[]>(
      'GET',
      `/api/agents/${agentId}/executions${query ? `?${query}` : ''}`
    );
  }

  /**
   * Get agent analytics
   */
  async getAnalytics(agentId: string, days = 7): Promise<{
    totalExecutions: number;
    successRate: number;
    avgLatencyMs: number;
    totalCost: number;
  }> {
    return this.client.request(
      'GET',
      `/api/agents/${agentId}/analytics?days=${days}`
    );
  }
}

// ============================================================================
// MEMORY CLIENT
// ============================================================================

/**
 * Client for memory operations
 */
export class MemoryClient {
  constructor(private client: HojaiClient) {}

  /**
   * Add a memory
   */
  async add(request: CreateMemoryRequest): Promise<Memory> {
    return this.client.request<Memory>('POST', '/api/memories', request);
  }

  /**
   * Get memory by ID
   */
  async get(memoryId: string): Promise<Memory> {
    return this.client.request<Memory>('GET', `/api/memories/${memoryId}`);
  }

  /**
   * Search memories
   */
  async search(request: SearchMemoriesRequest): Promise<{ memories: Memory[]; total: number }> {
    return this.client.request<{ memories: Memory[]; total: number }>(
      'POST',
      '/api/memories/search',
      request
    );
  }

  /**
   * Get memories by entity
   */
  async getByEntity(
    entityId: string,
    options?: { type?: string; limit?: number }
  ): Promise<Memory[]> {
    const params = new URLSearchParams();
    if (options?.type) params.set('type', options.type);
    if (options?.limit) params.set('limit', String(options.limit));

    const query = params.toString();
    return this.client.request<Memory[]>(
      'GET',
      `/api/memories/entity/${entityId}${query ? `?${query}` : ''}`
    );
  }

  /**
   * Update a memory
   */
  async update(memoryId: string, updates: Partial<Memory>): Promise<Memory> {
    return this.client.request<Memory>('PATCH', `/api/memories/${memoryId}`, updates);
  }

  /**
   * Delete a memory
   */
  async delete(memoryId: string): Promise<void> {
    await this.client.request('DELETE', `/api/memories/${memoryId}`);
  }

  /**
   * Get conversation history
   */
  async getConversation(sessionId: string, options?: { limit?: number }): Promise<{
    messages: Array<{ role: string; content: string; createdAt: string }>;
  }> {
    const params = new URLSearchParams();
    if (options?.limit) params.set('limit', String(options.limit));

    const query = params.toString();
    return this.client.request(
      'GET',
      `/api/memories/conversation/${sessionId}${query ? `?${query}` : ''}`
    );
  }
}

// ============================================================================
// WORKFLOW CLIENT
// ============================================================================

/**
 * Client for workflow operations
 */
export class WorkflowClient {
  constructor(private client: HojaiClient) {}

  /**
   * Create a workflow
   */
  async create(request: CreateWorkflowRequest): Promise<Workflow> {
    return this.client.request<Workflow>('POST', '/api/workflows', request);
  }

  /**
   * Get workflow by ID
   */
  async get(workflowId: string): Promise<Workflow> {
    return this.client.request<Workflow>('GET', `/api/workflows/${workflowId}`);
  }

  /**
   * List workflows
   */
  async list(options?: { limit?: number; offset?: number }): Promise<{
    workflows: Workflow[];
    total: number;
  }> {
    const params = new URLSearchParams();
    if (options?.limit) params.set('limit', String(options.limit));
    if (options?.offset) params.set('offset', String(options.offset));

    const query = params.toString();
    return this.client.request<{ workflows: Workflow[]; total: number }>(
      'GET',
      `/api/workflows${query ? `?${query}` : ''}`
    );
  }

  /**
   * Execute a workflow
   */
  async execute(workflowId: string, request: ExecuteWorkflowRequest): Promise<{
    executionId: string;
    status: string;
    result?: unknown;
    error?: string;
  }> {
    return this.client.request(
      'POST',
      `/api/workflows/${workflowId}/execute`,
      request
    );
  }

  /**
   * Delete a workflow
   */
  async delete(workflowId: string): Promise<void> {
    await this.client.request('DELETE', `/api/workflows/${workflowId}`);
  }
}

// ============================================================================
// LLM CLIENT
// ============================================================================

/**
 * Client for LLM operations
 */
export class LLMClient {
  constructor(private client: HojaiClient) {}

  /**
   * Send a chat request
   */
  async chat(request: LLMRequest): Promise<LLMResponse> {
    return this.client.request<LLMResponse>('POST', '/api/llm/chat', request);
  }

  /**
   * Stream a chat response
   */
  async *streamChat(
    request: LLMRequest
  ): AsyncGenerator<string, void, unknown> {
    const response = await fetch(`${this.client.getConfig().baseUrl}/api/llm/chat/stream`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Tenant-Id': this.client.getConfig().tenantId,
      },
      body: JSON.stringify({ ...request, stream: true }),
    });

    if (!response.ok) {
      throw HojaiError.fromResponse(response);
    }

    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error('Response body is not readable');
    }

    const decoder = new TextDecoder();
    let buffer = '';

    try {
      while (true) {
        const { done, value } = await reader.read();

        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') {
              return;
            }
            try {
              const parsed = JSON.parse(data);
              if (parsed.delta) {
                yield parsed.delta;
              }
            } catch {
              // Skip invalid JSON
            }
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  }
}

// ============================================================================
// EMBEDDING CLIENT
// ============================================================================

/**
 * Client for embedding operations
 */
export class EmbeddingClient {
  constructor(private client: HojaiClient) {}

  /**
   * Generate embeddings
   */
  async generate(request: EmbeddingRequest): Promise<EmbeddingResponse> {
    return this.client.request<EmbeddingResponse>('POST', '/api/embeddings', request);
  }

  /**
   * Generate embedding for a single text
   */
  async embed(text: string): Promise<number[]> {
    const response = await this.generate({ texts: [text] });
    return response.embeddings[0];
  }
}

// ============================================================================
// RAG CLIENT
// ============================================================================

/**
 * Client for RAG operations
 */
export class RAGClient {
  constructor(private client: HojaiClient) {}

  /**
   * Query with RAG
   */
  async query(request: RAGQuery): Promise<RAGResponse> {
    return this.client.request<RAGResponse>('POST', '/api/rag/query', request);
  }

  /**
   * Add documents to RAG
   */
  async addDocuments(request: {
    documents: Array<{ id: string; content: string; metadata?: Record<string, unknown> }>;
    namespace?: string;
  }): Promise<{ inserted: number }> {
    return this.client.request('POST', '/api/rag/documents', request);
  }

  /**
   * Delete documents from RAG
   */
  async deleteDocuments(ids: string[]): Promise<{ deleted: number }> {
    return this.client.request('DELETE', '/api/rag/documents', { ids });
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

export { HojaiError };

export default HojaiClient;
