/**
 * HOJAI AI SDK - TypeScript Client
 *
 * A comprehensive SDK for interacting with HOJAI AI services.
 *
 * @example
 * ```typescript
 * import { HojaiClient, createAgentBuilder, HojaiError } from '@hojai/sdk';
 *
 * const client = new HojaiClient({
 *   baseUrl: 'https://api.hojai.ai',
 *   tenantId: 'my-tenant',
 *   apiKey: process.env.HOJAI_API_KEY
 * });
 *
 * // Health check
 * const health = await client.health();
 *
 * // Create and use an agent
 * const agent = await client.agents.create({
 *   name: 'My Sales Agent',
 *   type: 'sales'
 * });
 *
 * const response = await client.agents.chat(agent.id, {
 *   message: 'Find me enterprise software companies'
 * });
 * ```
 *
 * @module @hojai/sdk
 */

// ============================================================================
// MAIN EXPORTS
// ============================================================================

export { HojaiClient, HojaiError } from './client.js';

export type { HojaiConfig } from './types.js';

// ============================================================================
// AGENT MODULE
// ============================================================================

export {
  createAgentBuilder,
  defineTool,
  defineTools,
  systemPromptTemplates,
  getSystemPrompt,
  createPredefinedAgent,
  estimateAgentCost,
  validateAgentConfig,
  PredefinedAgentType,
} from './agents.js';

export type {
  AgentBuilder,
  AgentExecutionOptions,
  AgentExecutionResult,
} from './agents.js';

// ============================================================================
// SUB-CLIENT TYPES (re-exported for convenience)
// ============================================================================

export type {
  // Agent types
  Agent,
  AgentStatus,
  AgentConfig,
  AgentExecution,
  CreateAgentRequest,
  UpdateAgentRequest,
  ToolDefinition,

  // Memory types
  Memory,
  MemoryType,
  CreateMemoryRequest,
  SearchMemoriesRequest,
  ConversationMessage,

  // Workflow types
  Workflow,
  WorkflowStatus,
  WorkflowStep,
  WorkflowStepType,
  CreateWorkflowRequest,
  ExecuteWorkflowRequest,

  // LLM types
  Message,
  MessageRole,
  LLMRequest,
  LLMResponse,
  TokenUsage,
  LLMProvider,

  // Embedding types
  EmbeddingRequest,
  EmbeddingResponse,

  // RAG types
  RAGQuery,
  RAGResponse,
  RAGCitation,

  // Compliance types
  DataExportRequest,
  DataExportResponse,
  ConsentType,
  ConsentStatus,

  // Trust types
  AgentTrustScore,
  UserTrustLevel,

  // Pagination types
  PaginationParams,
  PaginatedResponse,

  // Error types
  APIError,
  ErrorCode,

  // Webhook types
  WebhookEventType,
  WebhookPayload,

  // Analytics types
  UsageMetrics,
  AgentAnalytics,
} from './types.js';

// ============================================================================
// DEFAULT EXPORT
// ============================================================================

export default {
  // Main client
  HojaiClient,
  HojaiError,

  // Agent utilities
  createAgentBuilder,
  defineTool,
  defineTools,
  systemPromptTemplates,
  getSystemPrompt,
  createPredefinedAgent,
  estimateAgentCost,
  validateAgentConfig,
  PredefinedAgentType,
};


// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'hojai-sdk',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Liveness probe
app.get('/health/live', (req, res) => {
  res.json({ status: 'alive' });
});

// Readiness probe
app.get('/health/ready', (req, res) => {
  res.json({ status: 'ready' });
});
