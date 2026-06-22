/**
 * Hojai LLM Adapter
 *
 * A unified adapter for connecting AI employees to Claude and OpenAI
 *
 * @example
 * ```typescript
 * import {
 *   createClaudeAdapter,
 *   createOpenAIAdapter,
 *   createModelRouter,
 *   createContextBuilder,
 *   UnifiedLLMClient
 * } from '@hojai/llm';
 *
 * // Create adapters
 * const claude = createClaudeAdapter({ apiKey: process.env.ANTHROPIC_API_KEY! });
 * const openai = createOpenAIAdapter({ apiKey: process.env.OPENAI_API_KEY! });
 *
 * // Create router and context builder
 * const router = createModelRouter();
 * const contextBuilder = createContextBuilder();
 *
 * // Create unified client
 * const client = new UnifiedLLMClient({
 *   claude,
 *   openai,
 *   router,
 *   contextBuilder
 * });
 *
 * // Use the client
 * const response = await client.chat({
 *   messages: [{ role: 'user', content: 'Hello!' }],
 *   employeeContext: { id, tenantId, name, role }
 * });
 * ```
 */

// ============================================================================
// TYPES
// ============================================================================

export {
  LLMProvider,
  ClaudeModel,
  OpenAIModel,
  TaskType,
  MessageRole,
  EmployeeRole,
  type ChatMessage,
  type StreamingChunk,
  type TokenUsage,
  type LLMRequestOptions,
  type LLMResponse,
  type EmployeeCapability,
  type EmployeeKnowledge,
  type EmployeeMemory,
  type EmployeeContext,
  type ModelConfig,
  type ModelRoutingRule,
  type QueryAnalysisRequest,
  type QueryAnalysisResponse,
  type DocumentAnalysisRequest,
  type DocumentAnalysisResponse,
  type TextGenerationRequest,
  type TextGenerationResponse
} from './types/index.js';

export {
  LLMRequestOptionsSchema,
  EmployeeContextSchema,
  ModelConfigSchema,
  ChatMessageSchema
} from './types/index.js';

// ============================================================================
// ERRORS
// ============================================================================

export {
  LLMError,
  AuthenticationError,
  RateLimitError,
  TokenLimitError,
  ModelNotFoundError,
  ContextWindowError,
  InvalidRequestError,
  EmptyResponseError,
  ResponseParseError,
  StreamingError,
  TimeoutError,
  RetryExhaustedError,
  ProviderUnavailableError,
  ConfigurationError,
  isRetryableError,
  getErrorMessage,
  withErrorHandling,
  retryWithBackoff,
  sleep
} from './errors.js';

// ============================================================================
// ADAPTERS
// ============================================================================

export {
  ClaudeAdapter,
  createClaudeAdapter,
  type ClaudeAdapterConfig
} from './claudeAdapter.js';

export {
  OpenAIAdapter,
  createOpenAIAdapter,
  type OpenAIAdapterConfig
} from './openaiAdapter.js';

// ============================================================================
// ROUTER
// ============================================================================

export {
  ModelRouter,
  createModelRouter,
  DEFAULT_ROUTING_RULES,
  getModelContextWindow,
  fitsInContext,
  type ModelRouterConfig
} from './modelRouter.js';

// ============================================================================
// CONTEXT BUILDER
// ============================================================================

export {
  ContextBuilder,
  createContextBuilder,
  buildSalesContext,
  buildSupportContext,
  buildAnalystContext,
  type ContextBuilderOptions,
  type BuiltContext
} from './contextBuilder.js';

// ============================================================================
// PROMPT TEMPLATES
// ============================================================================

export {
  promptTemplates
} from './promptTemplates.js';

// ============================================================================
// UNIFIED CLIENT
// ============================================================================

import { ClaudeAdapter, createClaudeAdapter } from './claudeAdapter.js';
import { OpenAIAdapter, createOpenAIAdapter } from './openaiAdapter.js';
import { ModelRouter, createModelRouter, DEFAULT_ROUTING_RULES } from './modelRouter.js';
import { ContextBuilder, createContextBuilder, buildSalesContext, buildSupportContext, buildAnalystContext } from './contextBuilder.js';
import { promptTemplates } from './promptTemplates.js';
import {
  LLMRequestOptions,
  LLMResponse,
  EmployeeContext,
  ChatMessage,
  TaskType,
  LLMProvider
} from './types/index.js';
import {
  LLMError,
  isRetryableError,
  sleep
} from './errors.js';

/**
 * Unified LLM client configuration
 */
export interface UnifiedLLMClientConfig {
  claude: ClaudeAdapter;
  openai: OpenAIAdapter;
  router: ModelRouter;
  contextBuilder: ContextBuilder;
  maxRetries?: number;
}

/**
 * Chat request with employee context
 */
export interface EmployeeChatRequest {
  messages: ChatMessage[];
  employee: EmployeeContext;
  taskType?: TaskType;
  systemPrompt?: string;
  temperature?: number;
  maxTokens?: number;
  stream?: boolean;
}

/**
 * Unified LLM client that routes to appropriate provider
 */
export class UnifiedLLMClient {
  private config: {
    claude: ClaudeAdapter;
    openai: OpenAIAdapter;
    router: ModelRouter;
    contextBuilder: ContextBuilder;
    maxRetries: number;
  };
  private readonly logger: Console;

  constructor(config: UnifiedLLMClientConfig, logger?: Console) {
    this.config = {
      claude: config.claude,
      openai: config.openai,
      router: config.router,
      contextBuilder: config.contextBuilder,
      maxRetries: config.maxRetries || 3
    };
    this.logger = logger || console;
  }

  /**
   * Send a chat request with employee context
   */
  async chat(request: EmployeeChatRequest): Promise<LLMResponse> {
    const { employee, taskType, systemPrompt, temperature, maxTokens, stream } = request;

    // Determine task type if not provided
    const effectiveTaskType = taskType ||
      this.config.router.inferTaskType(
        request.messages[request.messages.length - 1]?.content || '',
        { messageCount: request.messages.length }
      );

    // Get model configuration
    const modelConfig = this.config.router.getModelConfig(effectiveTaskType);

    // Build context
    const context = this.config.contextBuilder.build(employee, request.messages);

    // Merge system prompts
    const finalSystemPrompt = [context.systemPrompt, systemPrompt, modelConfig.systemPrompt]
      .filter(Boolean)
      .join('\n\n');

    // Build request options
    const options: LLMRequestOptions = {
      messages: context.messages,
      systemPrompt: finalSystemPrompt,
      temperature: temperature ?? modelConfig.temperature,
      maxTokens: maxTokens ?? modelConfig.maxTokens,
      stream: stream ?? false
    };

    // Route to appropriate adapter
    let lastError: Error | undefined;

    for (let attempt = 1; attempt <= this.config.maxRetries; attempt++) {
      try {
        if (modelConfig.provider === LLMProvider.CLAUDE) {
          return await this.config.claude.chat(options);
        } else {
          return await this.config.openai.chat(options);
        }
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        // Try fallback if primary fails
        if (attempt === 1 && modelConfig.provider === LLMProvider.CLAUDE) {
          const fallbackConfig = this.config.router.getFallbackConfig(effectiveTaskType);
          if (fallbackConfig) {
            this.logger.warn(`[UnifiedLLMClient] Primary failed, trying fallback: ${fallbackConfig.model}`);
            try {
              if (fallbackConfig.provider === LLMProvider.CLAUDE) {
                return await this.config.claude.chat({
                  ...options,
                  maxTokens: fallbackConfig.maxTokens || options.maxTokens
                });
              } else {
                return await this.config.openai.chat({
                  ...options,
                  maxTokens: fallbackConfig.maxTokens || options.maxTokens
                });
              }
            } catch (fallbackError) {
              lastError = fallbackError instanceof Error ? fallbackError : new Error(String(fallbackError));
            }
          }
        }

        // Check if retryable
        if (!isRetryableError(lastError) || attempt === this.config.maxRetries) {
          throw lastError;
        }

        this.logger.warn(`[UnifiedLLMClient] Attempt ${attempt} failed, retrying...`, {
          error: lastError.message
        });

        await sleep(Math.min(1000 * Math.pow(2, attempt - 1), 30000));
      }
    }

    throw lastError || new LLMError('Chat request failed');
  }

  /**
   * Generate text with simple prompt
   */
  async generateText(
    prompt: string,
    options?: {
      systemPrompt?: string;
      temperature?: number;
      maxTokens?: number;
    }
  ): Promise<LLMResponse> {
    // Use Claude by default
    return this.config.claude.generateText(prompt, options);
  }

  /**
   * Analyze a document
   */
  async analyzeDocument(
    content: string,
    documentType: string,
    employee?: EmployeeContext,
    options?: {
      extractFields?: string[];
      summaryLength?: 'short' | 'medium' | 'long';
    }
  ): Promise<LLMResponse> {
    if (employee) {
      const context = this.config.contextBuilder.buildDocumentContext(
        employee,
        documentType,
        content
      );

      return this.config.claude.chat({
        messages: context.messages,
        systemPrompt: context.systemPrompt,
        maxTokens: 2000,
        temperature: 0.3
      });
    }

    return this.config.claude.analyzeDocument(content, documentType, options);
  }

  /**
   * Analyze a query
   */
  async analyzeQuery(
    query: string,
    context?: {
      recentConversations?: ChatMessage[];
      relevantFacts?: string[];
      userIntent?: string;
    }
  ): Promise<LLMResponse> {
    return this.config.claude.analyze(query, context);
  }

  /**
   * Stream a chat response
   */
  async *streamChat(request: EmployeeChatRequest): AsyncGenerator<string, void, unknown> {
    const response = await this.chat({ ...request, stream: true });

    // For streaming, we'd need to implement actual streaming
    // This is a placeholder that yields the complete response
    yield response.content;
  }

  /**
   * Get health status of all providers
   */
  async getHealthStatus(): Promise<{
    claude: boolean;
    openai: boolean;
  }> {
    const [claudeHealth, openaiHealth] = await Promise.all([
      this.config.claude.healthCheck().catch(() => false),
      this.config.openai.healthCheck().catch(() => false)
    ]);

    return {
      claude: claudeHealth,
      openai: openaiHealth
    };
  }
}

/**
 * Create a unified LLM client
 */
export function createUnifiedLLMClient(
  config: UnifiedLLMClientConfig,
  logger?: Console
): UnifiedLLMClient {
  return new UnifiedLLMClient(config, logger);
}

// ============================================================================
// CONVENIENCE FUNCTIONS
// ============================================================================

/**
 * Create a fully configured LLM client with default settings
 */
export async function createLLMClient(options: {
  anthropicApiKey: string;
  openaiApiKey: string;
  logger?: Console;
}): Promise<UnifiedLLMClient> {
  const { anthropicApiKey, openaiApiKey, logger } = options;

  const claude = createClaudeAdapter({ apiKey: anthropicApiKey }, logger);
  const openai = createOpenAIAdapter({ apiKey: openaiApiKey }, logger);
  const router = createModelRouter({}, logger);
  const contextBuilder = createContextBuilder({}, logger);

  return new UnifiedLLMClient({
    claude,
    openai,
    router,
    contextBuilder
  }, logger);
}

// ============================================================================
// DEFAULT EXPORT
// ============================================================================

export default {
  // Adapters
  ClaudeAdapter,
  OpenAIAdapter,
  createClaudeAdapter,
  createOpenAIAdapter,

  // Router
  ModelRouter,
  createModelRouter,
  DEFAULT_ROUTING_RULES,

  // Context
  ContextBuilder,
  createContextBuilder,
  buildSalesContext,
  buildSupportContext,
  buildAnalystContext,

  // Templates
  promptTemplates,

  // Client
  UnifiedLLMClient,
  createUnifiedLLMClient,
  createLLMClient
};


// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'hojai-llm',
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
