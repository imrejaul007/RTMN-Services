/**
 * HOJAI LLM Providers - Task Router
 * Version: 1.0.0 | Date: May 30, 2026
 * Purpose: Intelligent routing based on task type with fallback support
 */

import type {
  LLMProvider,
  Message,
  ChatOptions,
  ChatResponse,
  ProviderType,
  RouterConfig,
  TaskType,
  TaskRouting,
  TaskAnalyzer,
  ProviderInfo,
  ProviderStatus,
} from '../types/index.js';
import {
  DEFAULT_ROUTER_CONFIG,
  LLMProviderError,
  LLMErrorCodes,
} from '../types/index.js';
import { createLogger } from '../utils/logger.js';

const logger = createLogger('llm-router');

// ============================================================================
// Task Analyzer
// ============================================================================

/**
 * Analyzes conversation to determine the best task type
 */
class ConversationTaskAnalyzer implements TaskAnalyzer {
  /**
   * Analyze messages to determine the task type
   */
  analyzeTask(messages: Message[]): TaskType {
    // Get the last user message for context
    const lastUserMessage = messages
      .filter((m) => m.role === 'user')
      .pop()?.content.toLowerCase() || '';

    // Analyze system message for hints
    const systemMessage = messages
      .filter((m) => m.role === 'system')
      .map((m) => m.content.toLowerCase())
      .join(' ');

    // Check for explicit task hints in the conversation
    if (this.containsKeywords(lastUserMessage, ['classify', 'categorize', 'label', 'which category'])) {
      return 'classification';
    }

    if (this.containsKeywords(lastUserMessage, ['summarize', 'summary', 'brief', 'key points'])) {
      return 'summarization';
    }

    if (this.containsKeywords(lastUserMessage, ['extract', 'find all', 'identify', 'pull out'])) {
      return 'extraction';
    }

    if (this.containsKeywords(lastUserMessage, ['write code', 'function', 'debug', 'refactor', 'code'])) {
      return 'code';
    }

    if (this.containsKeywords(lastUserMessage, ['think', 'reason', 'analyze', 'compare', 'evaluate', 'explain why'])) {
      return 'reasoning';
    }

    if (this.containsKeywords(lastUserMessage, ['creative', 'story', 'poem', 'song', 'write', 'invent'])) {
      return 'creative';
    }

    // Check system message for hints
    if (this.containsKeywords(systemMessage, ['analysis', 'analyze', 'compare', 'evaluate'])) {
      return 'analysis';
    }

    if (this.containsKeywords(systemMessage, ['classification', 'categorize', 'classify'])) {
      return 'classification';
    }

    if (this.containsKeywords(systemMessage, ['reasoning', 'think step by step', 'logical'])) {
      return 'reasoning';
    }

    if (this.containsKeywords(systemMessage, ['code', 'programming', 'function', 'debug'])) {
      return 'code';
    }

    if (this.containsKeywords(systemMessage, ['creative', 'story', 'write', 'imagine'])) {
      return 'creative';
    }

    if (this.containsKeywords(systemMessage, ['summarization', 'summarize', 'brief'])) {
      return 'summarization';
    }

    // Default to general chat
    return 'general';
  }

  /**
   * Check if text contains any of the keywords
   */
  private containsKeywords(text: string, keywords: string[]): boolean {
    return keywords.some((keyword) => text.includes(keyword));
  }
}

// ============================================================================
// LLM Router
// ============================================================================

interface RouterProvider {
  type: ProviderType;
  provider: LLMProvider;
}

/**
 * LLM Router - Routes requests to the best provider based on task
 */
export class LLMRouter {
  private providers: Map<ProviderType, LLMProvider> = new Map();
  private config: RouterConfig;
  private analyzer: TaskAnalyzer;
  private providerStatus: Map<ProviderType, ProviderStatus> = new Map();

  constructor(
    providerList: RouterProvider[],
    config: RouterConfig = DEFAULT_ROUTER_CONFIG
  ) {
    this.config = config;
    this.analyzer = new ConversationTaskAnalyzer();

    // Register providers
    for (const { type, provider } of providerList) {
      this.providers.set(type, provider);
    }

    // Initialize provider status
    for (const type of this.providers.keys()) {
      this.providerStatus.set(type, {
        name: type,
        type,
        available: false,
        lastChecked: new Date().toISOString(),
      });
    }

    logger.info('llm_router_initialized', {
      providers: Array.from(this.providers.keys()),
      defaultProvider: this.config.defaultProvider,
    });
  }

  /**
   * Get a provider by type
   */
  getProvider(type: ProviderType): LLMProvider | undefined {
    return this.providers.get(type);
  }

  /**
   * Get the default provider
   */
  getDefaultProvider(): LLMProvider | undefined {
    return this.providers.get(this.config.defaultProvider);
  }

  /**
   * Check if a provider is available
   */
  async isProviderAvailable(type: ProviderType): Promise<boolean> {
    const provider = this.providers.get(type);
    if (!provider) {
      return false;
    }

    try {
      const available = await provider.isAvailable();
      const status = this.providerStatus.get(type);
      if (status) {
        status.available = available;
        status.lastChecked = new Date().toISOString();
      }
      return available;
    } catch (error) {
      logger.error('provider_availability_check_failed', {
        provider: type,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return false;
    }
  }

  /**
   * Get routing info for a task type
   */
  getTaskRouting(taskType: TaskType): TaskRouting {
    return this.config.taskRouting[taskType] || this.config.taskRouting.general;
  }

  /**
   * Select the best provider for a task
   */
  async selectProvider(
    taskType: TaskType,
    preferredProvider?: ProviderType
  ): Promise<{ provider: LLMProvider; model: string }> {
    // If a specific provider is requested, use it
    if (preferredProvider) {
      const provider = this.providers.get(preferredProvider);
      if (!provider) {
        throw new LLMProviderError(
          `Provider '${preferredProvider}' is not configured`,
          'PROVIDER_NOT_FOUND',
          400
        );
      }

      const isAvailable = await this.isProviderAvailable(preferredProvider);
      if (!isAvailable) {
        throw new LLMProviderError(
          `Provider '${preferredProvider}' is not available`,
          'PROVIDER_NOT_AVAILABLE',
          503
        );
      }

      const routing = this.getTaskRouting(taskType);
      return {
        provider,
        model: routing.preferredModel,
      };
    }

    // Get task-specific routing
    const routing = this.getTaskRouting(taskType);
    const primaryType = routing.preferredProvider;
    const fallbackType = routing.fallbackProvider;

    // Try primary provider
    const primaryProvider = this.providers.get(primaryType);
    if (primaryProvider) {
      const isPrimaryAvailable = await this.isProviderAvailable(primaryType);
      if (isPrimaryAvailable) {
        return {
          provider: primaryProvider,
          model: routing.preferredModel,
        };
      }
    }

    // Try fallback provider
    if (fallbackType && this.config.enableFallback) {
      const fallbackProvider = this.providers.get(fallbackType);
      if (fallbackProvider) {
        const isFallbackAvailable = await this.isProviderAvailable(fallbackType);
        if (isFallbackAvailable) {
          logger.warn('using_fallback_provider', {
            primary: primaryType,
            fallback: fallbackType,
            taskType,
          });
          return {
            provider: fallbackProvider,
            model: routing.fallbackModel || fallbackProvider.defaultModel,
          };
        }
      }
    }

    // Try default provider
    const defaultProvider = this.providers.get(this.config.defaultProvider);
    if (defaultProvider) {
      const isDefaultAvailable = await this.isProviderAvailable(this.config.defaultProvider);
      if (isDefaultAvailable) {
        return {
          provider: defaultProvider,
          model: defaultProvider.defaultModel,
        };
      }
    }

    // No provider available
    throw new LLMProviderError(
      'No LLM provider is available',
      'PROVIDER_NOT_AVAILABLE',
      503
    );
  }

  /**
   * Route a chat request to the best provider
   */
  async chat(
    messages: Message[],
    options: ChatOptions & { provider?: ProviderType; taskType?: TaskType } = {}
  ): Promise<ChatResponse> {
    const taskType = options.taskType || this.analyzer.analyzeTask(messages);
    const startTime = Date.now();

    logger.info('llm_router_chat', {
      taskType,
      messageCount: messages.length,
      requestedProvider: options.provider,
    });

    const { provider, model } = await this.selectProvider(taskType, options.provider);

    const chatOptions: ChatOptions = {
      ...options,
      model: options.model || model,
    };

    try {
      const response = await provider.chat(messages, chatOptions);

      logger.info('llm_router_chat_success', {
        provider: provider.name,
        model: response.model,
        taskType,
        durationMs: Date.now() - startTime,
      });

      return response;
    } catch (error) {
      // If primary fails and fallback is enabled, try fallback
      if (this.config.enableFallback && !options.provider) {
        const routing = this.getTaskRouting(taskType);
        const fallbackType = routing.fallbackProvider;

        if (fallbackType && fallbackType !== options.provider) {
          logger.warn('llm_router_fallback_attempt', {
            taskType,
            fallbackProvider: fallbackType,
          });

          const fallbackProvider = this.providers.get(fallbackType);
          if (fallbackProvider) {
            try {
              const fallbackResponse = await fallbackProvider.chat(messages, {
                ...options,
                model: routing.fallbackModel || fallbackProvider.defaultModel,
              });

              logger.info('llm_router_fallback_success', {
                fallbackProvider: fallbackType,
                durationMs: Date.now() - startTime,
              });

              return fallbackResponse;
            } catch (fallbackError) {
              logger.error('llm_router_fallback_failed', {
                fallbackProvider: fallbackType,
                error: fallbackError instanceof Error ? fallbackError.message : 'Unknown error',
              });
            }
          }
        }
      }

      throw error;
    }
  }

  /**
   * Route an embed request
   */
  async embed(text: string, providerType?: ProviderType): Promise<number[]> {
    // Embeddings are typically done with OpenAI
    const provider = providerType || 'openai';
    const llmProvider = this.providers.get(provider);

    if (!llmProvider) {
      throw new LLMProviderError(
        `Provider '${provider}' is not configured`,
        'PROVIDER_NOT_FOUND',
        400
      );
    }

    const isAvailable = await this.isProviderAvailable(provider);
    if (!isAvailable) {
      throw new LLMProviderError(
        `Provider '${provider}' is not available`,
        'PROVIDER_NOT_AVAILABLE',
        503
      );
    }

    return llmProvider.embed(text);
  }

  /**
   * Route a classify request
   */
  async classify(
    text: string,
    labels: string[],
    providerType?: ProviderType
  ): Promise<string> {
    const provider = providerType || this.config.defaultProvider;
    const llmProvider = this.providers.get(provider);

    if (!llmProvider) {
      throw new LLMProviderError(
        `Provider '${provider}' is not configured`,
        'PROVIDER_NOT_FOUND',
        400
      );
    }

    const isAvailable = await this.isProviderAvailable(provider);
    if (!isAvailable) {
      throw new LLMProviderError(
        `Provider '${provider}' is not available`,
        'PROVIDER_NOT_AVAILABLE',
        503
      );
    }

    return llmProvider.classify(text, labels);
  }

  /**
   * Get information about all providers
   */
  async getProviders(): Promise<ProviderInfo[]> {
    const providers: ProviderInfo[] = [];

    for (const [type, provider] of this.providers) {
      const status = this.providerStatus.get(type);
      const isAvailable = status?.available ?? false;

      providers.push({
        name: provider.name,
        type,
        defaultModel: provider.defaultModel,
        supportedModels: provider.supportedModels,
        isAvailable,
        costInfo: provider.getCostInfo(),
      });
    }

    return providers;
  }

  /**
   * Get status of all providers
   */
  async getProviderStatuses(): Promise<ProviderStatus[]> {
    const statuses: ProviderStatus[] = [];

    for (const [type, provider] of this.providers) {
      const startTime = Date.now();
      let available = false;
      let error: string | undefined;
      let latencyMs: number | undefined;

      try {
        available = await provider.isAvailable();
        latencyMs = Date.now() - startTime;
      } catch (err) {
        error = err instanceof Error ? err.message : 'Unknown error';
      }

      const status: ProviderStatus = {
        name: provider.name,
        type,
        available,
        latencyMs,
        error,
        lastChecked: new Date().toISOString(),
      };

      this.providerStatus.set(type, status);
      statuses.push(status);
    }

    return statuses;
  }

  /**
   * Update router configuration
   */
  updateConfig(config: Partial<RouterConfig>): void {
    this.config = {
      ...this.config,
      ...config,
      taskRouting: {
        ...this.config.taskRouting,
        ...config.taskRouting,
      },
    };

    logger.info('llm_router_config_updated', { config: this.config });
  }

  /**
   * Get current configuration
   */
  getConfig(): RouterConfig {
    return { ...this.config };
  }
}

// ============================================================================
// Factory Function
// ============================================================================

/**
 * Create a router with the configured providers
 */
export function createLLMRouter(
  providers: RouterProvider[],
  config?: RouterConfig
): LLMRouter {
  return new LLMRouter(providers, config);
}
