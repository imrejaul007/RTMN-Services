/**
 * HOJAI AI - Model Router Service
 * Version: 1.0.0 | Date: June 2, 2026
 * Purpose: Intelligent routing of LLM requests to the optimal model provider
 *
 * Features:
 * - Intent-based routing (chat, code, reasoning, creative, etc.)
 * - Cost optimization with fallback chains
 * - Latency-aware model selection
 * - Budget enforcement per tenant
 * - Provider health monitoring
 */

import { createLogger } from './utils/logger.js';

// ============================================================================
// Types
// ============================================================================

/**
 * Intent types for task classification
 */
export type IntentType =
  | 'chat'
  | 'code'
  | 'creative'
  | 'reasoning'
  | 'fast'
  | 'analysis'
  | 'embedding'
  | 'multimodal';

/**
 * Supported provider types
 */
export type ProviderType = 'openai' | 'anthropic' | 'gemini' | 'llama' | 'mistral';

/**
 * Routing configuration for a specific intent
 */
export interface RoutingRule {
  intent: IntentType;
  provider: ProviderType;
  model: string;
  fallbackProvider?: ProviderType;
  fallbackModel?: string;
  temperature?: number;
  maxTokens?: number;
  maxCostPer1K?: number;
}

/**
 * Context for routing decisions
 */
export interface RoutingContext {
  tenantId?: string;
  remainingBudget?: number;
  latencyBudget?: number;
  preferredProvider?: ProviderType;
  forceProvider?: ProviderType;
}

/**
 * Routing decision result
 */
export interface RoutingDecision {
  provider: ProviderType;
  model: string;
  intent: IntentType;
  estimatedLatencyMs: number;
  estimatedCostPer1K: number;
  fallbackAvailable: boolean;
}

/**
 * Provider health status
 */
export interface ProviderHealth {
  provider: ProviderType;
  available: boolean;
  latencyMs: number;
  lastChecked: Date;
  errorCount: number;
}

/**
 * Chat request options
 */
export interface RouterChatOptions {
  intent?: IntentType;
  context?: RoutingContext;
  temperature?: number;
  maxTokens?: number;
  forceProvider?: ProviderType;
}

/**
 * Router configuration
 */
export interface RouterConfig {
  enableFallback: boolean;
  enableCostOptimization: boolean;
  enableLatencyOptimization: boolean;
  healthCheckIntervalMs: number;
  maxRetries: number;
}

// ============================================================================
// Default Routing Rules
// ============================================================================

const DEFAULT_ROUTING_RULES: RoutingRule[] = [
  // Fast responses - prioritize Gemini for speed
  {
    intent: 'fast',
    provider: 'gemini',
    model: 'gemini-2.0-flash',
    fallbackProvider: 'openai',
    fallbackModel: 'gpt-4o-mini',
    temperature: 0.7,
    maxTokens: 2048,
    maxCostPer1K: 0.001,
  },
  // Code generation - prioritize quality
  {
    intent: 'code',
    provider: 'anthropic',
    model: 'claude-sonnet-4-20250514',
    fallbackProvider: 'openai',
    fallbackModel: 'gpt-4o',
    temperature: 0.3,
    maxTokens: 8192,
    maxCostPer1K: 0.01,
  },
  // Reasoning and analysis - prioritize accuracy
  {
    intent: 'reasoning',
    provider: 'anthropic',
    model: 'claude-sonnet-4-20250514',
    fallbackProvider: 'gemini',
    fallbackModel: 'gemini-2.0-flash',
    temperature: 0.2,
    maxTokens: 16384,
    maxCostPer1K: 0.02,
  },
  // Creative tasks - balance quality and cost
  {
    intent: 'creative',
    provider: 'openai',
    model: 'gpt-4o',
    fallbackProvider: 'gemini',
    fallbackModel: 'gemini-2.0-flash',
    temperature: 0.9,
    maxTokens: 4096,
    maxCostPer1K: 0.01,
  },
  // General chat - default to fast/cheap
  {
    intent: 'chat',
    provider: 'gemini',
    model: 'gemini-2.0-flash',
    fallbackProvider: 'openai',
    fallbackModel: 'gpt-4o-mini',
    temperature: 0.7,
    maxTokens: 4096,
    maxCostPer1K: 0.001,
  },
  // Analysis - prioritize Claude for complex analysis
  {
    intent: 'analysis',
    provider: 'anthropic',
    model: 'claude-sonnet-4-20250514',
    fallbackProvider: 'openai',
    fallbackModel: 'gpt-4o',
    temperature: 0.3,
    maxTokens: 8192,
    maxCostPer1K: 0.015,
  },
  // Embeddings - only OpenAI
  {
    intent: 'embedding',
    provider: 'openai',
    model: 'text-embedding-3-small',
    temperature: 0,
    maxTokens: 8191,
    maxCostPer1K: 0.00002,
  },
  // Multimodal - prefer Gemini or OpenAI
  {
    intent: 'multimodal',
    provider: 'gemini',
    model: 'gemini-2.0-flash',
    fallbackProvider: 'openai',
    fallbackModel: 'gpt-4o',
    temperature: 0.4,
    maxTokens: 8192,
    maxCostPer1K: 0.005,
  },
];

// ============================================================================
// Provider Cost Map
// ============================================================================

const PROVIDER_COSTS: Record<ProviderType, Record<string, { input: number; output: number }>> = {
  openai: {
    'gpt-4o': { input: 2.5, output: 10.0 },
    'gpt-4o-mini': { input: 0.15, output: 0.6 },
    'gpt-4-turbo': { input: 10.0, output: 30.0 },
    'text-embedding-3-small': { input: 0.00002, output: 0 },
  },
  anthropic: {
    'claude-opus-4-20250514': { input: 15.0, output: 75.0 },
    'claude-sonnet-4-20250514': { input: 3.0, output: 15.0 },
    'claude-3-5-sonnet-20241022': { input: 3.0, output: 15.0 },
    'claude-3-5-haiku-20241022': { input: 0.8, output: 4.0 },
  },
  gemini: {
    'gemini-2.0-flash': { input: 0, output: 0 },
    'gemini-2.5-pro-preview-06-05': { input: 0, output: 0 },
    'gemini-1.5-flash': { input: 0, output: 0 },
  },
  llama: {
    'llama-3.3-70b-instruct': { input: 0, output: 0 },
    'llama-3-8b-instruct': { input: 0, output: 0 },
  },
  mistral: {
    'mistral-large-latest': { input: 2.0, output: 6.0 },
    'mistral-small-latest': { input: 0.15, output: 0.15 },
  },
};

// ============================================================================
// Provider Latency Estimates (ms)
// ============================================================================

const PROVIDER_LATENCY: Record<ProviderType, number> = {
  gemini: 500, // Very fast (free tier)
  llama: 800, // Fast on Groq
  openai: 1200,
  mistral: 1500,
  anthropic: 2000, // Slower but more capable
};

// ============================================================================
// Model Router
// ============================================================================

export class ModelRouter {
  private config: RouterConfig;
  private routingRules: Map<IntentType, RoutingRule>;
  private providerHealth: Map<ProviderType, ProviderHealth>;
  private logger: ReturnType<typeof createLogger>;

  constructor(config?: Partial<RouterConfig>) {
    this.config = {
      enableFallback: config?.enableFallback ?? true,
      enableCostOptimization: config?.enableCostOptimization ?? true,
      enableLatencyOptimization: config?.enableLatencyOptimization ?? true,
      healthCheckIntervalMs: config?.healthCheckIntervalMs ?? 60000,
      maxRetries: config?.maxRetries ?? 3,
    };

    this.logger = createLogger('model-router');

    // Initialize routing rules
    this.routingRules = new Map();
    for (const rule of DEFAULT_ROUTING_RULES) {
      this.routingRules.set(rule.intent, rule);
    }

    // Initialize provider health
    this.providerHealth = new Map();
    const providers: ProviderType[] = ['openai', 'anthropic', 'gemini', 'llama', 'mistral'];
    for (const provider of providers) {
      this.providerHealth.set(provider, {
        provider,
        available: true,
        latencyMs: PROVIDER_LATENCY[provider],
        lastChecked: new Date(),
        errorCount: 0,
      });
    }

    this.logger.info('model_router_initialized', {
      rules: this.routingRules.size,
      providers: providers.length,
    });
  }

  /**
   * Get routing decision for an intent
   */
  route(intent: IntentType, context?: RoutingContext): RoutingDecision {
    const rule = this.routingRules.get(intent);

    if (!rule) {
      // Fall back to chat intent
      const chatRule = this.routingRules.get('chat');
      if (!chatRule) {
        throw new Error('No routing rule found for intent: ' + intent);
      }
      return this.makeDecision(chatRule, context);
    }

    return this.makeDecision(rule, context);
  }

  /**
   * Make routing decision based on rule and context
   */
  private makeDecision(rule: RoutingRule, context?: RoutingContext): RoutingDecision {
    let provider = rule.provider;
    let model = rule.model;

    // Force provider if specified
    if (context?.forceProvider) {
      provider = context.forceProvider;
      model = this.getModelForProvider(rule, provider);
    }

    // Check budget constraints
    if (context?.remainingBudget !== undefined && rule.maxCostPer1K) {
      if (context.remainingBudget < rule.maxCostPer1K) {
        // Try to find a cheaper alternative
        const cheaper = this.findCheaperAlternative(rule);
        if (cheaper) {
          provider = cheaper.provider;
          model = cheaper.model;
        }
      }
    }

    // Check latency requirements
    if (context?.latencyBudget !== undefined) {
      const estimatedLatency = PROVIDER_LATENCY[provider];
      if (estimatedLatency > context.latencyBudget) {
        const faster = this.findFasterAlternative(provider);
        if (faster) {
          provider = faster;
          model = this.getDefaultModelForProvider(faster);
        }
      }
    }

    // Check provider health
    const health = this.providerHealth.get(provider);
    if (health && !health.available) {
      // Try fallback
      if (rule.fallbackProvider && this.config.enableFallback) {
        provider = rule.fallbackProvider;
        model = rule.fallbackModel || this.getDefaultModelForProvider(provider);
      }
    }

    const estimatedCost = this.getCostForModel(provider, model);
    const estimatedLatency = PROVIDER_LATENCY[provider];

    return {
      provider,
      model,
      intent: rule.intent,
      estimatedLatencyMs: estimatedLatency,
      estimatedCostPer1K: estimatedCost,
      fallbackAvailable: !!(rule.fallbackProvider && this.config.enableFallback),
    };
  }

  /**
   * Analyze message content to determine intent
   */
  analyzeIntent(content: string): IntentType {
    const lowerContent = content.toLowerCase();

    // Code detection
    if (
      lowerContent.includes('function') ||
      lowerContent.includes('code') ||
      lowerContent.includes('implement') ||
      lowerContent.includes('bug') ||
      lowerContent.includes('debug') ||
      lowerContent.includes('class ') ||
      lowerContent.includes('const ') ||
      lowerContent.includes('def ') ||
      /```[\s\S]*```/.test(content)
    ) {
      return 'code';
    }

    // Reasoning/analysis detection
    if (
      lowerContent.includes('analyze') ||
      lowerContent.includes('compare') ||
      lowerContent.includes('evaluate') ||
      lowerContent.includes('explain why') ||
      lowerContent.includes('reasoning') ||
      lowerContent.includes('think through') ||
      lowerContent.includes('step by step')
    ) {
      return 'reasoning';
    }

    // Creative detection
    if (
      lowerContent.includes('write a story') ||
      lowerContent.includes('creative') ||
      lowerContent.includes('imagine') ||
      lowerContent.includes(' brainstorm') ||
      lowerContent.includes('generate ideas') ||
      lowerContent.includes('poem') ||
      lowerContent.includes('song')
    ) {
      return 'creative';
    }

    // Fast/short response detection
    if (content.length < 100) {
      return 'fast';
    }

    // Default to chat
    return 'chat';
  }

  /**
   * Get provider status
   */
  getProviderHealth(provider: ProviderType): ProviderHealth | undefined {
    return this.providerHealth.get(provider);
  }

  /**
   * Get all provider health statuses
   */
  getAllProviderHealth(): ProviderHealth[] {
    return Array.from(this.providerHealth.values());
  }

  /**
   * Update provider health status
   */
  updateProviderHealth(provider: ProviderType, status: Partial<ProviderHealth>): void {
    const current = this.providerHealth.get(provider);
    if (current) {
      this.providerHealth.set(provider, { ...current, ...status });
    }
  }

  /**
   * Add or update a routing rule
   */
  setRoutingRule(rule: RoutingRule): void {
    this.routingRules.set(rule.intent, rule);
    this.logger.info('routing_rule_updated', {
      intent: rule.intent,
      provider: rule.provider,
      model: rule.model,
    });
  }

  /**
   * Get routing rule for an intent
   */
  getRoutingRule(intent: IntentType): RoutingRule | undefined {
    return this.routingRules.get(intent);
  }

  /**
   * Get all routing rules
   */
  getAllRoutingRules(): RoutingRule[] {
    return Array.from(this.routingRules.values());
  }

  /**
   * Get the router configuration
   */
  getConfig(): RouterConfig {
    return { ...this.config };
  }

  /**
   * Find a cheaper alternative model
   */
  private findCheaperAlternative(rule: RoutingRule): { provider: ProviderType; model: string } | null {
    const costs = PROVIDER_COSTS[rule.provider];
    const currentCost = rule.maxCostPer1K || 0.01;

    // Check fallbacks
    if (rule.fallbackProvider) {
      const fallbackCost = this.getCostForModel(rule.fallbackProvider, rule.fallbackModel || '');
      if (fallbackCost <= currentCost) {
        return {
          provider: rule.fallbackProvider,
          model: rule.fallbackModel || this.getDefaultModelForProvider(rule.fallbackProvider),
        };
      }
    }

    // Check all providers for cheaper options
    for (const [provider, models] of Object.entries(PROVIDER_COSTS)) {
      for (const [model, cost] of Object.entries(models)) {
        const avgCost = (cost.input + cost.output) / 2 / 1000;
        if (avgCost <= currentCost) {
          return { provider: provider as ProviderType, model };
        }
      }
    }

    return null;
  }

  /**
   * Find a faster alternative provider
   */
  private findFasterAlternative(currentProvider: ProviderType): ProviderType | null {
    const currentLatency = PROVIDER_LATENCY[currentProvider];
    let fastest: ProviderType | null = null;
    let fastestLatency = Infinity;

    for (const [provider, latency] of Object.entries(PROVIDER_LATENCY)) {
      if (provider !== currentProvider) {
        const health = this.providerHealth.get(provider as ProviderType);
        if (health?.available && latency < fastestLatency) {
          fastestLatency = latency;
          fastest = provider as ProviderType;
        }
      }
    }

    return fastestLatency < currentLatency ? fastest : null;
  }

  /**
   * Get cost for a specific model
   */
  private getCostForModel(provider: ProviderType, model: string): number {
    const providerCosts = PROVIDER_COSTS[provider];
    if (!providerCosts) return 0;

    const modelCosts = providerCosts[model];
    if (!modelCosts) return 0;

    // Return average cost per 1K tokens
    return (modelCosts.input + modelCosts.output) / 2 / 1000;
  }

  /**
   * Get default model for a provider
   */
  private getDefaultModelForProvider(provider: ProviderType): string {
    const defaults: Record<ProviderType, string> = {
      openai: 'gpt-4o-mini',
      anthropic: 'claude-3-5-sonnet-20241022',
      gemini: 'gemini-2.0-flash',
      llama: 'llama-3.3-70b-instruct',
      mistral: 'mistral-small-latest',
    };
    return defaults[provider] || 'gpt-4o-mini';
  }

  /**
   * Get model for provider, falling back to default
   */
  private getModelForProvider(rule: RoutingRule, provider: ProviderType): string {
    if (rule.provider === provider) {
      return rule.model;
    }
    if (rule.fallbackProvider === provider && rule.fallbackModel) {
      return rule.fallbackModel;
    }
    return this.getDefaultModelForProvider(provider);
  }
}

// ============================================================================
// Intent Keywords for Detection
// ============================================================================

export const INTENT_KEYWORDS: Record<IntentType, string[]> = {
  chat: ['hi', 'hello', 'help', 'what', 'how', 'can you', 'please'],
  code: ['function', 'code', 'implement', 'bug', 'debug', 'class', 'def', 'const', 'return'],
  creative: ['story', 'creative', 'imagine', 'poem', 'song', 'write', 'brainstorm'],
  reasoning: ['analyze', 'compare', 'evaluate', 'explain', 'reasoning', 'think', 'step by step'],
  fast: ['quick', 'brief', 'short', 'simple', 'fast'],
  analysis: ['data', 'insight', 'trend', 'report', 'metrics'],
  embedding: ['embed', 'vector', 'similarity', 'search'],
  multimodal: ['image', 'photo', 'picture', 'visual', 'chart', 'diagram'],
};

// ============================================================================
// Singleton Instance
// ============================================================================

let routerInstance: ModelRouter | null = null;

export function getRouter(): ModelRouter {
  if (!routerInstance) {
    routerInstance = new ModelRouter();
  }
  return routerInstance;
}

export function initializeRouter(config?: Partial<RouterConfig>): ModelRouter {
  routerInstance = new ModelRouter(config);
  return routerInstance;
}

// ============================================================================
// Factory Functions
// ============================================================================

export function createModelRouter(config?: Partial<RouterConfig>): ModelRouter {
  return new ModelRouter(config);
}

export function routeIntent(intent: IntentType, context?: RoutingContext): RoutingDecision {
  return getRouter().route(intent, context);
}

export function analyzeAndRoute(content: string, context?: RoutingContext): RoutingDecision {
  const intent = getRouter().analyzeIntent(content);
  return getRouter().route(intent, context);
}
