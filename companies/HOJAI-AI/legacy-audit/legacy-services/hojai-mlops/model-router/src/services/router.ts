/**
 * Hojai Model Router - Router Service
 * Intelligent LLM Provider Routing
 */

import config from '../config';
import {
  TaskType,
  LLMProvider,
  RouteRequest,
  RouteResponse,
  FallbackRequest,
  FallbackResponse,
  ProviderInfo,
  CostEstimate,
  RouterStats,
} from '../types';
import { ServiceUnavailableError } from '../middleware/error';
import { modelRegistryService } from './registry';

// Provider model mappings
const MODEL_MAPPINGS: Record<TaskType, Record<LLMProvider, string>> = {
  chat: {
    openai: 'gpt-4o-mini',
    anthropic: 'claude-3-5-haiku-20241022',
    google: 'gemini-1.5-flash',
    meta: 'llama-3-8b-instruct',
  },
  embed: {
    openai: 'text-embedding-3-small',
    anthropic: '', // Anthropic doesn't have embedding models
    google: 'embedding-001',
    meta: '', // Meta doesn't have embedding models
  },
  classify: {
    openai: 'gpt-4o-mini',
    anthropic: 'claude-3-5-sonnet-20241022',
    google: 'gemini-1.5-flash',
    meta: 'llama-3-8b-instruct',
  },
  complete: {
    openai: 'gpt-4o-mini',
    anthropic: 'claude-3-5-haiku-20241022',
    google: 'gemini-1.5-flash',
    meta: 'llama-3-8b-instruct',
  },
};

// Cost per 1M tokens (USD)
const MODEL_COSTS: Record<string, { input: number; output: number }> = {
  // OpenAI
  'gpt-4o-mini': { input: 0.15, output: 0.60 },
  'gpt-4o': { input: 2.50, output: 10.00 },
  'text-embedding-3-small': { input: 0.02, output: 0 }, // Embeddings are one-way
  // Anthropic
  'claude-3-5-sonnet-20241022': { input: 3.00, output: 15.00 },
  'claude-3-5-haiku-20241022': { input: 0.80, output: 4.00 },
  // Google
  'gemini-1.5-flash': { input: 0.075, output: 0.30 },
  'gemini-1.5-pro': { input: 1.25, output: 5.00 },
  // Meta (via Groq)
  'llama-3-8b-instruct': { input: 0.05, output: 0.05 },
};

// Priority order for fallback
const PROVIDER_PRIORITY: LLMProvider[] = ['openai', 'anthropic', 'google', 'meta'];

class ModelRouterService {
  private stats: RouterStats = {
    totalRequests: 0,
    requestsByTask: { chat: 0, embed: 0, classify: 0, complete: 0 },
    requestsByProvider: { openai: 0, anthropic: 0, google: 0, meta: 0 },
    averageLatencyMs: { openai: 0, anthropic: 0, google: 0, meta: 0 },
    errorsByProvider: { openai: 0, anthropic: 0, google: 0, meta: 0 },
    totalCostByProvider: { openai: 0, anthropic: 0, google: 0, meta: 0 },
  };

  /**
   * Route request to appropriate model based on task type
   */
  async route(request: RouteRequest): Promise<RouteResponse> {
    const { task, input, options } = request;
    const startTime = Date.now();

    // Determine the best provider for this task
    const provider = this.selectProvider(task);
    const model = MODEL_MAPPINGS[task][provider];

    console.log(`[Router] Routing ${task} task to ${provider}/${model}`);

    try {
      // Call the actual LLM provider
      const response = await this.callProvider(provider, model, input, options);

      const latencyMs = Date.now() - startTime;
      const cost = this.calculateCost(model, input);

      // Update stats
      this.updateStats(provider, task, latencyMs, cost);

      return {
        provider,
        model,
        response,
        latencyMs,
        cost,
      };
    } catch (error) {
      this.stats.errorsByProvider[provider]++;
      throw error;
    }
  }

  /**
   * Handle fallback when primary provider fails
   */
  async handleFallback(request: FallbackRequest): Promise<FallbackResponse> {
    const { originalRequest, failedProvider, error: _error, attempt = 1 } = request;
    const maxAttempts = config.routing.fallbackAttempts;

    console.log(`[Router] Fallback attempt ${attempt}/${maxAttempts} for ${failedProvider}`);

    // Get remaining providers in priority order
    const failedIndex = PROVIDER_PRIORITY.indexOf(failedProvider);
    const fallbackProviders = PROVIDER_PRIORITY.slice(failedIndex + 1);

    if (fallbackProviders.length === 0 || attempt >= maxAttempts) {
      throw new ServiceUnavailableError(
        `All providers failed. Last error: ${_error}. Tried ${attempt} providers.`
      );
    }

    // Try each fallback provider
    for (const provider of fallbackProviders) {
      const model = MODEL_MAPPINGS[originalRequest.task][provider];

      // Skip if no model available for this task
      if (!model) continue;

      try {
        const startTime = Date.now();
        const response = await this.callProvider(
          provider,
          model,
          originalRequest.input,
          originalRequest.options
        );

        const latencyMs = Date.now() - startTime;
        const cost = this.calculateCost(model, originalRequest.input);

        this.updateStats(provider, originalRequest.task, latencyMs, cost);

        return {
          provider,
          model,
          response,
          latencyMs,
          cost,
          attempts: attempt + 1,
          successful: true,
        };
      } catch (fallbackError) {
        console.error(`[Router] Fallback to ${provider} failed:`, fallbackError);
        this.stats.errorsByProvider[provider]++;
        continue;
      }
    }

    // All fallbacks exhausted
    throw new ServiceUnavailableError(
      `All ${fallbackProviders.length + 1} providers failed for ${originalRequest.task} task`
    );
  }

  /**
   * Get available providers
   */
  getProviders(): ProviderInfo[] {
    const providers: ProviderInfo[] = [];

    for (const [name, settings] of Object.entries(config.providers)) {
      const provider = name as LLMProvider;
      const models = this.getProviderModels(provider);

      providers.push({
        name: provider,
        displayName: this.getProviderDisplayName(provider),
        models,
        enabled: settings.enabled && !!settings.apiKey,
        priority: PROVIDER_PRIORITY.indexOf(provider),
      });
    }

    return providers.sort((a, b) => a.priority - b.priority);
  }

  /**
   * Get cost estimates for a task
   */
  getCostEstimates(task: TaskType, inputLength: number): CostEstimate[] {
    const estimates: CostEstimate[] = [];
    const inputTokens = Math.ceil(inputLength / 4); // Rough token estimation
    const outputTokens = Math.ceil(inputTokens * 0.5); // Assume 50% output

    for (const provider of PROVIDER_PRIORITY) {
      const model = MODEL_MAPPINGS[task][provider];

      if (!model) continue;

      const costs = MODEL_COSTS[model] || { input: 0, output: 0 };
      const inputCost = (inputTokens / 1000000) * costs.input;
      const outputCost = (outputTokens / 1000000) * costs.output;

      estimates.push({
        provider,
        model,
        estimatedInputTokens: inputTokens,
        estimatedOutputTokens: outputTokens,
        estimatedInputCost: Math.round(inputCost * 1000000) / 1000000,
        estimatedOutputCost: Math.round(outputCost * 1000000) / 1000000,
        totalCost: Math.round((inputCost + outputCost) * 1000000) / 1000000,
      });
    }

    return estimates;
  }

  /**
   * Get router statistics
   */
  getStats(): RouterStats {
    return { ...this.stats };
  }

  /**
   * Reset statistics
   */
  resetStats(): void {
    this.stats = {
      totalRequests: 0,
      requestsByTask: { chat: 0, embed: 0, classify: 0, complete: 0 },
      requestsByProvider: { openai: 0, anthropic: 0, google: 0, meta: 0 },
      averageLatencyMs: { openai: 0, anthropic: 0, google: 0, meta: 0 },
      errorsByProvider: { openai: 0, anthropic: 0, google: 0, meta: 0 },
      totalCostByProvider: { openai: 0, anthropic: 0, google: 0, meta: 0 },
    };
  }

  /**
   * Select the best provider for a task
   */
  private selectProvider(task: TaskType): LLMProvider {
    // Check if model registry has a preferred model
    const preferredModel = modelRegistryService.getPreferredModel(task);

    if (preferredModel) {
      return preferredModel;
    }

    // Default routing logic
    switch (task) {
      case 'chat':
        return 'openai'; // Cost optimized GPT-4o-mini
      case 'embed':
        return 'openai'; // OpenAI embeddings
      case 'classify':
        return 'anthropic'; // Claude 3.5 for analysis
      case 'complete':
        return 'openai'; // GPT-4o-mini
      default:
        return 'openai';
    }
  }

  /**
   * Call an LLM provider
   */
  private async callProvider(
    provider: LLMProvider,
    model: string,
    input: string,
    options?: RouteRequest['options']
  ): Promise<unknown> {
    const maxTokens = options?.maxTokens || config.routing.defaultMaxTokens;
    const temperature = options?.temperature ?? config.routing.defaultTemperature;

    // In a real implementation, this would make actual API calls
    // For now, we simulate the call
    switch (provider) {
      case 'openai':
        return this.callOpenAI(model, input, maxTokens, temperature);
      case 'anthropic':
        return this.callAnthropic(model, input, maxTokens, temperature);
      case 'google':
        return this.callGoogle(model, input, maxTokens, temperature);
      case 'meta':
        return this.callMeta(model, input, maxTokens, temperature);
      default:
        throw new Error(`Unknown provider: ${provider}`);
    }
  }

  /**
   * Call OpenAI API
   */
  private async callOpenAI(
    model: string,
    input: string,
    maxTokens: number,
    temperature: number
  ): Promise<unknown> {
    const apiKey = config.providers.openai.apiKey;

    if (!apiKey) {
      // Return mock response in dev without API key
      if (process.env['NODE_ENV'] !== 'production') {
        return {
          id: `mock-${Date.now()}`,
          model,
          choices: [
            {
              message: {
                role: 'assistant',
                content: `[Mock OpenAI Response] Processed: ${input.slice(0, 100)}...`,
              },
              finish_reason: 'stop',
            },
          ],
          usage: {
            prompt_tokens: Math.ceil(input.length / 4),
            completion_tokens: Math.ceil(input.length / 8),
            total_tokens: Math.ceil(input.length / 4) + Math.ceil(input.length / 8),
          },
        };
      }
      throw new ServiceUnavailableError('OpenAI API key not configured');
    }

    // Real OpenAI API call
    const url = `${config.providers.openai.baseUrl}/chat/completions`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [{ role: 'user', content: input }],
        max_tokens: maxTokens,
        temperature,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`OpenAI API error: ${response.status} - ${error}`);
    }

    return response.json();
  }

  /**
   * Call Anthropic API
   */
  private async callAnthropic(
    model: string,
    input: string,
    maxTokens: number,
    temperature: number
  ): Promise<unknown> {
    const apiKey = config.providers.anthropic.apiKey;

    if (!apiKey) {
      if (process.env['NODE_ENV'] !== 'production') {
        return {
          id: `mock-${Date.now()}`,
          model,
          content: [
            {
              type: 'text',
              text: `[Mock Anthropic Response] Processed: ${input.slice(0, 100)}...`,
            },
          ],
          usage: {
            input_tokens: Math.ceil(input.length / 4),
            output_tokens: Math.ceil(input.length / 8),
          },
        };
      }
      throw new ServiceUnavailableError('Anthropic API key not configured');
    }

    // Real Anthropic API call
    const url = `${config.providers.anthropic.baseUrl}/v1/messages`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model,
        messages: [{ role: 'user', content: input }],
        max_tokens: maxTokens,
        temperature,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Anthropic API error: ${response.status} - ${error}`);
    }

    return response.json();
  }

  /**
   * Call Google Generative AI API
   */
  private async callGoogle(
    model: string,
    input: string,
    maxTokens: number,
    temperature: number
  ): Promise<unknown> {
    const apiKey = config.providers.google.apiKey;

    if (!apiKey) {
      if (process.env['NODE_ENV'] !== 'production') {
        return {
          candidates: [
            {
              content: {
                parts: [{ text: `[Mock Google Response] Processed: ${input.slice(0, 100)}...` }],
                role: 'model',
              },
              finishReason: 'STOP',
            },
          ],
          usageMetadata: {
            promptTokenCount: Math.ceil(input.length / 4),
            candidatesTokenCount: Math.ceil(input.length / 8),
            totalTokenCount: Math.ceil(input.length / 4) + Math.ceil(input.length / 8),
          },
        };
      }
      throw new ServiceUnavailableError('Google API key not configured');
    }

    // Real Google API call
    const modelName = model === 'gemini-1.5-flash' ? 'gemini-1.5-flash' : 'gemini-1.5-pro';
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{ parts: [{ text: input }] }],
        generationConfig: {
          maxOutputTokens: maxTokens,
          temperature,
        },
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Google API error: ${response.status} - ${error}`);
    }

    return response.json();
  }

  /**
   * Call Meta LLM (via Groq or similar)
   */
  private async callMeta(
    model: string,
    input: string,
    maxTokens: number,
    temperature: number
  ): Promise<unknown> {
    const apiKey = config.providers.meta.apiKey;

    if (!apiKey) {
      if (process.env['NODE_ENV'] !== 'production') {
        return {
          id: `mock-${Date.now()}`,
          model,
          choices: [
            {
              message: {
                role: 'assistant',
                content: `[Mock Meta/LLaMA Response] Processed: ${input.slice(0, 100)}...`,
              },
              finish_reason: 'stop',
            },
          ],
          usage: {
            prompt_tokens: Math.ceil(input.length / 4),
            completion_tokens: Math.ceil(input.length / 8),
            total_tokens: Math.ceil(input.length / 4) + Math.ceil(input.length / 8),
          },
        };
      }
      throw new ServiceUnavailableError('Meta API key not configured');
    }

    // Using Groq API for Meta models
    const url = 'https://api.groq.com/openai/v1/chat/completions';

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [{ role: 'user', content: input }],
        max_tokens: maxTokens,
        temperature,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Meta/Groq API error: ${response.status} - ${error}`);
    }

    return response.json();
  }

  /**
   * Calculate cost for a request
   */
  private calculateCost(model: string, input: string): number {
    const costs = MODEL_COSTS[model];
    if (!costs) return 0;

    const inputTokens = Math.ceil(input.length / 4);
    const outputTokens = Math.ceil(inputTokens * 0.3);

    const inputCost = (inputTokens / 1000000) * costs.input;
    const outputCost = (outputTokens / 1000000) * costs.output;

    return Math.round((inputCost + outputCost) * 1000000) / 1000000; // Round to 6 decimal places
  }

  /**
   * Get models for a provider
   */
  private getProviderModels(provider: LLMProvider): Array<{
    name: string;
    taskType: TaskType;
    contextWindow: number;
    inputCostPer1M: number;
    outputCostPer1M: number;
  }> {
    const models: Array<{
      name: string;
      taskType: TaskType;
      contextWindow: number;
      inputCostPer1M: number;
      outputCostPer1M: number;
    }> = [];

    for (const [task, mapping] of Object.entries(MODEL_MAPPINGS)) {
      const modelName = mapping[provider];
      if (!modelName) continue;

      const costs = MODEL_COSTS[modelName] || { input: 0, output: 0 };

      models.push({
        name: modelName,
        taskType: task as TaskType,
        contextWindow: this.getContextWindow(modelName),
        inputCostPer1M: costs.input,
        outputCostPer1M: costs.output,
      });
    }

    return models;
  }

  /**
   * Get context window for a model
   */
  private getContextWindow(model: string): number {
    const windows: Record<string, number> = {
      'gpt-4o-mini': 128000,
      'gpt-4o': 128000,
      'text-embedding-3-small': 8191,
      'claude-3-5-sonnet-20241022': 200000,
      'claude-3-5-haiku-20241022': 200000,
      'gemini-1.5-flash': 1000000,
      'gemini-1.5-pro': 2000000,
      'llama-3-8b-instruct': 8192,
    };

    return windows[model] || 4096;
  }

  /**
   * Get provider display name
   */
  private getProviderDisplayName(provider: LLMProvider): string {
    const names: Record<LLMProvider, string> = {
      openai: 'OpenAI',
      anthropic: 'Anthropic Claude',
      google: 'Google Gemini',
      meta: 'Meta LLaMA',
    };

    return names[provider];
  }

  /**
   * Update statistics
   */
  private updateStats(
    provider: LLMProvider,
    task: TaskType,
    latencyMs: number,
    cost: number
  ): void {
    this.stats.totalRequests++;
    this.stats.requestsByTask[task]++;
    this.stats.requestsByProvider[provider]++;
    this.stats.totalCostByProvider[provider] += cost;

    // Update rolling average latency
    const currentAvg = this.stats.averageLatencyMs[provider];
    const totalRequests = this.stats.requestsByProvider[provider];
    this.stats.averageLatencyMs[provider] =
      (currentAvg * (totalRequests - 1) + latencyMs) / totalRequests;
  }
}

// Export singleton instance
export const modelRouterService = new ModelRouterService();
