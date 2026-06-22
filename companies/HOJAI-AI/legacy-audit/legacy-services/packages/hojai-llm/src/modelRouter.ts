/**
 * Hojai LLM Adapter - Model Router
 *
 * Routes requests to appropriate LLM model based on task type
 */

import {
  LLMProvider,
  TaskType,
  ModelConfig,
  ModelRoutingRule,
  ClaudeModel,
  OpenAIModel
} from './types/index.js';

// ============================================================================
// MODEL ROUTING RULES
// ============================================================================

/**
 * Default routing rules for different task types
 */
export const DEFAULT_ROUTING_RULES: ModelRoutingRule[] = [
  // Complex reasoning tasks - use Claude Sonnet for better reasoning
  {
    taskType: TaskType.REASONING,
    primary: { provider: LLMProvider.CLAUDE, model: ClaudeModel.CLAUDE_3_5_SONNET },
    fallback: { provider: LLMProvider.OPENAI, model: OpenAIModel.GPT_4O },
    maxTokens: 4096,
    temperature: 0.3
  },
  // Creative tasks - balanced between creativity and coherence
  {
    taskType: TaskType.CREATIVE,
    primary: { provider: LLMProvider.CLAUDE, model: ClaudeModel.CLAUDE_3_5_SONNET },
    fallback: { provider: LLMProvider.OPENAI, model: OpenAIModel.GPT_4O },
    maxTokens: 2048,
    temperature: 0.9
  },
  // Classification tasks - need consistency
  {
    taskType: TaskType.CLASSIFICATION,
    primary: { provider: LLMProvider.CLAUDE, model: ClaudeModel.CLAUDE_3_5_SONNET },
    fallback: { provider: LLMProvider.OPENAI, model: OpenAIModel.GPT_4O },
    maxTokens: 512,
    temperature: 0.1
  },
  // Extraction tasks - need precision
  {
    taskType: TaskType.EXTRACTION,
    primary: { provider: LLMProvider.CLAUDE, model: ClaudeModel.CLAUDE_3_5_SONNET },
    fallback: { provider: LLMProvider.OPENAI, model: OpenAIModel.GPT_4_TURBO },
    maxTokens: 1024,
    temperature: 0.1
  },
  // Summarization - balanced
  {
    taskType: TaskType.SUMMARIZATION,
    primary: { provider: LLMProvider.CLAUDE, model: ClaudeModel.CLAUDE_3_5_SONNET },
    fallback: { provider: LLMProvider.OPENAI, model: OpenAIModel.GPT_4O },
    maxTokens: 1024,
    temperature: 0.4
  },
  // Conversation - natural, engaging
  {
    taskType: TaskType.CONVERSATION,
    primary: { provider: LLMProvider.CLAUDE, model: ClaudeModel.CLAUDE_3_5_SONNET },
    fallback: { provider: LLMProvider.OPENAI, model: OpenAIModel.GPT_4O },
    maxTokens: 2048,
    temperature: 0.7
  },
  // Code tasks - use Sonnet for better code understanding
  {
    taskType: TaskType.CODE,
    primary: { provider: LLMProvider.CLAUDE, model: ClaudeModel.CLAUDE_3_5_SONNET },
    fallback: { provider: LLMProvider.OPENAI, model: OpenAIModel.GPT_4O },
    maxTokens: 4096,
    temperature: 0.2
  },
  // Document analysis - thorough
  {
    taskType: TaskType.DOCUMENT,
    primary: { provider: LLMProvider.CLAUDE, model: ClaudeModel.CLAUDE_3_5_SONNET },
    fallback: { provider: LLMProvider.OPENAI, model: OpenAIModel.GPT_4_TURBO },
    maxTokens: 2048,
    temperature: 0.3
  }
];

// ============================================================================
// MODEL ROUTER
// ============================================================================

export interface ModelRouterConfig {
  rules?: ModelRoutingRule[];
  defaultProvider?: LLMProvider;
  defaultModel?: string;
  enableFallback?: boolean;
  costOptimization?: boolean;
}

interface ModelRouterInternalConfig extends ModelRouterConfig {
  rules: ModelRoutingRule[];
  defaultProvider: LLMProvider;
  defaultModel: string;
  enableFallback: boolean;
  costOptimization: boolean;
}

export class ModelRouter {
  private rules: Map<TaskType, ModelRoutingRule>;
  private config: ModelRouterInternalConfig;
  private readonly logger: Console;

  constructor(config: ModelRouterConfig = {}, logger?: Console) {
    this.config = {
      rules: config.rules || DEFAULT_ROUTING_RULES,
      defaultProvider: config.defaultProvider || LLMProvider.CLAUDE,
      defaultModel: config.defaultModel || ClaudeModel.CLAUDE_3_5_SONNET,
      enableFallback: config.enableFallback ?? true,
      costOptimization: config.costOptimization ?? false
    };

    this.rules = new Map();
    for (const rule of this.config.rules) {
      this.rules.set(rule.taskType, rule);
    }

    this.logger = logger || console;
  }

  /**
   * Get the best model configuration for a task type
   */
  getModelConfig(taskType: TaskType): ModelConfig {
    const rule = this.rules.get(taskType);

    if (!rule) {
      this.logger.warn(`[ModelRouter] No rule for task type ${taskType}, using defaults`);
      return {
        provider: this.config.defaultProvider,
        model: this.config.defaultModel,
        maxTokens: 2048,
        temperature: 0.7
      };
    }

    // Cost optimization: prefer faster/cheaper models for simple tasks
    if (this.config.costOptimization && taskType === TaskType.CLASSIFICATION) {
      return {
        provider: LLMProvider.OPENAI,
        model: OpenAIModel.GPT_35_TURBO,
        maxTokens: rule.maxTokens || 512,
        temperature: rule.temperature || 0.1
      };
    }

    return {
      provider: rule.primary.provider,
      model: rule.primary.model,
      maxTokens: rule.maxTokens || 2048,
      temperature: rule.temperature || 0.7
    };
  }

  /**
   * Get the fallback model configuration
   */
  getFallbackConfig(taskType: TaskType): ModelConfig | null {
    if (!this.config.enableFallback) {
      return null;
    }

    const rule = this.rules.get(taskType);

    if (!rule?.fallback) {
      // Use default fallback
      return {
        provider: LLMProvider.OPENAI,
        model: OpenAIModel.GPT_4O,
        maxTokens: 2048,
        temperature: 0.7
      };
    }

    return {
      provider: rule.fallback.provider,
      model: rule.fallback.model,
      maxTokens: rule.maxTokens || 2048,
      temperature: rule.temperature || 0.7
    };
  }

  /**
   * Determine task type from query content
   */
  inferTaskType(query: string, context?: {
    hasCode?: boolean;
    hasClassification?: boolean;
    hasCreative?: boolean;
    messageCount?: number;
  }): TaskType {
    const lowerQuery = query.toLowerCase();

    // Check explicit indicators
    if (context?.hasCode ||
        lowerQuery.includes('code') ||
        lowerQuery.includes('function') ||
        lowerQuery.includes('api') ||
        lowerQuery.includes('implement')) {
      return TaskType.CODE;
    }

    if (context?.hasClassification ||
        lowerQuery.includes('classify') ||
        lowerQuery.includes('categorize') ||
        lowerQuery.includes('is this') ||
        lowerQuery.includes('is it') ||
        lowerQuery.includes('spam')) {
      return TaskType.CLASSIFICATION;
    }

    if (context?.hasCreative ||
        lowerQuery.includes('write') ||
        lowerQuery.includes('create') ||
        lowerQuery.includes('generate') ||
        lowerQuery.includes('story') ||
        lowerQuery.includes('brainstorm')) {
      return TaskType.CREATIVE;
    }

    if (lowerQuery.includes('summarize') ||
        lowerQuery.includes('summary') ||
        lowerQuery.includes('tl;dr')) {
      return TaskType.SUMMARIZATION;
    }

    if (lowerQuery.includes('extract') ||
        lowerQuery.includes('find all') ||
        lowerQuery.includes('identify')) {
      return TaskType.EXTRACTION;
    }

    if (lowerQuery.includes('analyze') ||
        lowerQuery.includes('reasoning') ||
        lowerQuery.includes('why') ||
        lowerQuery.includes('how would') ||
        lowerQuery.includes('think about')) {
      return TaskType.REASONING;
    }

    if (lowerQuery.includes('document') ||
        lowerQuery.includes('email') ||
        lowerQuery.includes('contract') ||
        lowerQuery.includes('invoice')) {
      return TaskType.DOCUMENT;
    }

    // Default to conversation for multi-turn
    if ((context?.messageCount || 0) > 1) {
      return TaskType.CONVERSATION;
    }

    return TaskType.REASONING;
  }

  /**
   * Add or update a routing rule
   */
  addRule(rule: ModelRoutingRule): void {
    this.rules.set(rule.taskType, rule);
  }

  /**
   * Remove a routing rule
   */
  removeRule(taskType: TaskType): boolean {
    return this.rules.delete(taskType);
  }

  /**
   * Get all routing rules
   */
  getRules(): ModelRoutingRule[] {
    return Array.from(this.rules.values());
  }

  /**
   * Estimate cost for a request
   */
  estimateCost(
    taskType: TaskType,
    inputTokens: number,
    outputTokens: number
  ): { provider: string; estimatedCents: number } {
    const config = this.getModelConfig(taskType);

    // Approximate pricing (per 1M tokens, in cents)
    const pricing: Record<string, { input: number; output: number }> = {
      [ClaudeModel.CLAUDE_3_5_SONNET]: { input: 3, output: 15 },
      [ClaudeModel.CLAUDE_3_5_HAIKU]: { input: 0.8, output: 4 },
      [OpenAIModel.GPT_4O]: { input: 5, output: 15 },
      [OpenAIModel.GPT_4_TURBO]: { input: 10, output: 30 },
      [OpenAIModel.GPT_35_TURBO]: { input: 0.5, output: 1.5 }
    };

    const rates = pricing[config.model] || { input: 3, output: 15 };
    const estimatedCents =
      (inputTokens / 1000000) * rates.input +
      (outputTokens / 1000000) * rates.output;

    return {
      provider: config.provider,
      estimatedCents: Math.round(estimatedCents * 100) / 100
    };
  }
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Create a model router with default configuration
 */
export function createModelRouter(config?: ModelRouterConfig, logger?: Console): ModelRouter {
  return new ModelRouter(config, logger);
}

/**
 * Get model context window size
 */
export function getModelContextWindow(model: string): number {
  const contextWindows: Record<string, number> = {
    [ClaudeModel.CLAUDE_3_5_SONNET]: 200000,
    [ClaudeModel.CLAUDE_3_5_HAIKU]: 200000,
    [ClaudeModel.CLAUDE_3_OPUS]: 200000,
    [ClaudeModel.CLAUDE_3_SONNET]: 200000,
    [ClaudeModel.CLAUDE_3_HAIKU]: 200000,
    [OpenAIModel.GPT_4O]: 128000,
    [OpenAIModel.GPT_4_TURBO]: 128000,
    [OpenAIModel.GPT_4]: 8192,
    [OpenAIModel.GPT_35_TURBO]: 16385
  };

  return contextWindows[model] || 4096;
}

/**
 * Check if input fits in context window
 */
export function fitsInContext(
  model: string,
  inputTokens: number,
  reservedOutputTokens: number = 1000
): boolean {
  const contextWindow = getModelContextWindow(model);
  return inputTokens + reservedOutputTokens <= contextWindow;
}
