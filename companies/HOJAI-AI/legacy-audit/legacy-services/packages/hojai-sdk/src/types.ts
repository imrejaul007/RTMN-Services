/**
 * HOJAI SDK - Type Definitions
 *
 * TypeScript type definitions for the HOJAI SDK.
 */

// ============================================================================
// CONFIGURATION TYPES
// ============================================================================

/**
 * SDK configuration
 */
export interface HojaiConfig {
  /** Base URL for the API */
  baseUrl?: string;
  /** API key for authentication */
  apiKey?: string;
  /** Tenant ID for multi-tenancy */
  tenantId: string;
}

// ============================================================================
// HEALTH TYPES
// ============================================================================

/**
 * Health check response
 */
export interface HealthResponse {
  status: 'healthy' | 'degraded' | 'unhealthy';
  version: string;
  timestamp: string;
  services?: {
    database: 'up' | 'down';
    cache: 'up' | 'down';
    llm: 'up' | 'down';
  };
}

// ============================================================================
// AGENT TYPES
// ============================================================================

/**
 * Agent status
 */
export enum AgentStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  ARCHIVED = 'archived',
  FAILED = 'failed',
}

/**
 * Agent execution status
 */
export enum ExecutionStatus {
  PENDING = 'pending',
  RUNNING = 'running',
  SUCCESS = 'success',
  FAILED = 'failed',
  TIMEOUT = 'timeout',
}

/**
 * Agent configuration
 */
export interface AgentConfig {
  model?: string;
  temperature?: number;
  maxTokens?: number;
  systemPrompt?: string;
  tools?: string[];
  memoryEnabled?: boolean;
  customSettings?: Record<string, unknown>;
}

/**
 * Agent
 */
export interface Agent {
  id: string;
  agentId: string;
  tenantId: string;
  name: string;
  description?: string;
  type: string;
  status: AgentStatus;
  config: AgentConfig;
  version: number;
  lastExecutionAt?: string;
  executionCount: number;
  successRate: number;
  avgLatencyMs: number;
  totalCost: number;
  createdAt: string;
  updatedAt: string;
}

/**
 * Create agent request
 */
export interface CreateAgentRequest {
  name: string;
  description?: string;
  type: string;
  config?: Partial<AgentConfig>;
}

/**
 * Update agent request
 */
export interface UpdateAgentRequest {
  name?: string;
  description?: string;
  status?: AgentStatus;
  config?: Partial<AgentConfig>;
}

/**
 * Agent execution
 */
export interface AgentExecution {
  id: string;
  executionId: string;
  agentId: string;
  tenantId: string;
  status: ExecutionStatus;
  input: Record<string, unknown>;
  output?: Record<string, unknown>;
  error?: {
    message: string;
    stack?: string;
    code?: string;
  };
  latencyMs: number;
  tokensUsed?: {
    input: number;
    output: number;
    total: number;
  };
  cost: number;
  startedAt: string;
  completedAt?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Tool definition
 */
export interface ToolDefinition {
  name: string;
  description: string;
  parameters?: Record<string, unknown>;
}

// ============================================================================
// MEMORY TYPES
// ============================================================================

/**
 * Memory type
 */
export enum MemoryType {
  INTERACTION = 'interaction',
  FACT = 'fact',
  PREFERENCE = 'preference',
  DECISION = 'decision',
  KNOWLEDGE = 'knowledge',
  CONTEXT = 'context',
}

/**
 * Memory
 */
export interface Memory {
  id: string;
  memoryId: string;
  tenantId: string;
  entityId: string;
  entityType: 'user' | 'agent' | 'session';
  type: MemoryType;
  content: string;
  importance: number;
  tags?: string[];
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

/**
 * Create memory request
 */
export interface CreateMemoryRequest {
  tenantId: string;
  entityId: string;
  entityType: 'user' | 'agent' | 'session';
  type: MemoryType;
  content: string;
  importance?: number;
  tags?: string[];
  metadata?: Record<string, unknown>;
}

/**
 * Search memories request
 */
export interface SearchMemoriesRequest {
  tenantId: string;
  entityId?: string;
  query?: string;
  type?: MemoryType;
  limit?: number;
  offset?: number;
}

/**
 * Conversation message
 */
export interface ConversationMessage {
  id: string;
  messageId: string;
  sessionId: string;
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string;
  tokens?: number;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

// ============================================================================
// WORKFLOW TYPES
// ============================================================================

/**
 * Workflow status
 */
export enum WorkflowStatus {
  DRAFT = 'draft',
  ACTIVE = 'active',
  PAUSED = 'paused',
  ARCHIVED = 'archived',
}

/**
 * Workflow step type
 */
export enum WorkflowStepType {
  AGENT = 'agent',
  CONDITION = 'condition',
  DELAY = 'delay',
  WEBHOOK = 'webhook',
  TRANSFORM = 'transform',
}

/**
 * Workflow step
 */
export interface WorkflowStep {
  id: string;
  type: WorkflowStepType;
  name: string;
  config: Record<string, unknown>;
  next?: string;
  branches?: Array<{
    condition: string;
    next: string;
  }>;
}

/**
 * Workflow
 */
export interface Workflow {
  id: string;
  workflowId: string;
  tenantId: string;
  name: string;
  description?: string;
  status: WorkflowStatus;
  steps: WorkflowStep[];
  variables?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

/**
 * Create workflow request
 */
export interface CreateWorkflowRequest {
  name: string;
  description?: string;
  steps: WorkflowStep[];
  variables?: Record<string, unknown>;
}

/**
 * Execute workflow request
 */
export interface ExecuteWorkflowRequest {
  input: Record<string, unknown>;
  variables?: Record<string, unknown>;
}

// ============================================================================
// LLM TYPES
// ============================================================================

/**
 * Message role
 */
export enum MessageRole {
  SYSTEM = 'system',
  USER = 'user',
  ASSISTANT = 'assistant',
  TOOL = 'tool',
}

/**
 * Chat message
 */
export interface Message {
  role: MessageRole;
  content: string;
  name?: string;
}

/**
 * LLM request
 */
export interface LLMRequest {
  messages: Message[];
  model?: string;
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  stopSequences?: string[];
  systemPrompt?: string;
  stream?: boolean;
}

/**
 * Token usage
 */
export interface TokenUsage {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  cachedTokens?: number;
}

/**
 * LLM response
 */
export interface LLMResponse {
  content: string;
  model: string;
  usage: TokenUsage;
  finishReason: string;
  requestId: string;
  latencyMs: number;
}

/**
 * LLM provider
 */
export enum LLMProvider {
  CLAUDE = 'claude',
  OPENAI = 'openai',
  GEMINI = 'gemini',
  LLAMA = 'llama',
  MISTRAL = 'mistral',
}

// ============================================================================
// EMBEDDING TYPES
// ============================================================================

/**
 * Embedding request
 */
export interface EmbeddingRequest {
  texts: string[];
  model?: string;
  normalize?: boolean;
}

/**
 * Embedding response
 */
export interface EmbeddingResponse {
  embeddings: number[][];
  model: string;
  usage: {
    tokens: number;
  };
}

// ============================================================================
// RAG TYPES
// ============================================================================

/**
 * RAG query request
 */
export interface RAGQuery {
  query: string;
  namespace?: string;
  topK?: number;
  filters?: Record<string, unknown>;
  includeMetadata?: boolean;
  rerank?: boolean;
  hybridSearch?: boolean;
}

/**
 * RAG citation
 */
export interface RAGCitation {
  chunkId: string;
  text: string;
  source?: string;
  page?: number;
  score: number;
}

/**
 * RAG query response
 */
export interface RAGResponse {
  answer: string;
  citations: RAGCitation[];
  sources: string[];
  metadata?: {
    chunksRetrieved: number;
    contextTokens: number;
    model: string;
  };
}

// ============================================================================
// COMPLIANCE TYPES
// ============================================================================

/**
 * Data export request
 */
export interface DataExportRequest {
  tenantId: string;
  entityId: string;
  entityType: 'user' | 'agent';
  formats?: ('json' | 'csv')[];
}

/**
 * Data export response
 */
export interface DataExportResponse {
  exportId: string;
  status: 'pending' | 'ready' | 'failed';
  downloadUrl?: string;
  expiresAt?: string;
}

/**
 * Consent type
 */
export enum ConsentType {
  DATA_PROCESSING = 'data_processing',
  MARKETING = 'marketing',
  ANALYTICS = 'analytics',
  THIRD_PARTY = 'third_party',
}

/**
 * Consent status
 */
export interface ConsentStatus {
  type: ConsentType;
  granted: boolean;
  timestamp: string;
  source?: string;
}

// ============================================================================
// TRUST TYPES
// ============================================================================

/**
 * Agent trust score
 */
export interface AgentTrustScore {
  agentId: string;
  overall: number;
  dimensions: {
    accuracy: number;
    helpfulness: number;
    safety: number;
    coherence: number;
    efficiency: number;
  };
  totalInteractions: number;
  period: '7d' | '30d' | 'all';
  lastUpdated: string;
}

/**
 * User trust level
 */
export interface UserTrustLevel {
  userId: string;
  level: 'trusted' | 'standard' | 'restricted';
  score: number;
  flags: string[];
  lastUpdated: string;
}

// ============================================================================
// PAGINATION TYPES
// ============================================================================

/**
 * Pagination params
 */
export interface PaginationParams {
  limit?: number;
  offset?: number;
  cursor?: string;
}

/**
 * Paginated response
 */
export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  limit: number;
  offset: number;
  hasMore: boolean;
  nextCursor?: string;
}

// ============================================================================
// ERROR TYPES
// ============================================================================

/**
 * API error response
 */
export interface APIError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
  requestId?: string;
}

/**
 * Error codes
 */
export enum ErrorCode {
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
  NOT_FOUND = 'NOT_FOUND',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  RATE_LIMITED = 'RATE_LIMITED',
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  SERVICE_UNAVAILABLE = 'SERVICE_UNAVAILABLE',
  LLM_ERROR = 'LLM_ERROR',
  TIMEOUT = 'TIMEOUT',
}

// ============================================================================
// WEBHOOK TYPES
// ============================================================================

/**
 * Webhook event types
 */
export enum WebhookEventType {
  AGENT_CREATED = 'agent.created',
  AGENT_UPDATED = 'agent.updated',
  AGENT_DELETED = 'agent.deleted',
  AGENT_EXECUTION_STARTED = 'agent.execution.started',
  AGENT_EXECUTION_COMPLETED = 'agent.execution.completed',
  AGENT_EXECUTION_FAILED = 'agent.execution.failed',
  WORKFLOW_STARTED = 'workflow.started',
  WORKFLOW_COMPLETED = 'workflow.completed',
  WORKFLOW_FAILED = 'workflow.failed',
}

/**
 * Webhook payload
 */
export interface WebhookPayload {
  event: WebhookEventType;
  timestamp: string;
  data: Record<string, unknown>;
  tenantId: string;
}

// ============================================================================
// ANALYTICS TYPES
// ============================================================================

/**
 * Usage metrics
 */
export interface UsageMetrics {
  period: string;
  totalRequests: number;
  totalTokens: number;
  totalCost: number;
  avgLatencyMs: number;
  byModel: Record<string, {
    requests: number;
    tokens: number;
    cost: number;
  }>;
}

/**
 * Agent analytics
 */
export interface AgentAnalytics {
  agentId: string;
  period: string;
  totalExecutions: number;
  successfulExecutions: number;
  failedExecutions: number;
  successRate: number;
  avgLatencyMs: number;
  totalCost: number;
  totalTokensUsed: number;
  executionsByDay: Array<{
    date: string;
    count: number;
    successRate: number;
  }>;
}
