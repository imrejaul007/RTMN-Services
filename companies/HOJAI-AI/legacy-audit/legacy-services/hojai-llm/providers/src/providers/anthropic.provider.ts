/**
 * HOJAI LLM Providers - Anthropic Provider Adapter
 * Version: 1.0.0 | Date: May 30, 2026
 * Purpose: Anthropic Claude integration via the official SDK
 */

import Anthropic from '@anthropic-ai/sdk';
import type {
  LLMProvider,
  Message,
  ChatOptions,
  ChatResponse,
  ClassifyOptions,
  ProviderCostInfo,
} from '../types/index.js';
import { LLMProviderError, LLMErrorCodes } from '../types/index.js';
import { createLogger } from '../utils/logger.js';

const logger = createLogger('anthropic-provider');

// ============================================================================
// Configuration
// ============================================================================

interface AnthropicProviderConfig {
  apiKey?: string;
  baseURL?: string;
  defaultModel?: string;
  maxRetries?: number;
  timeout?: number;
}

// Access environment variables safely
const getEnv = (key: string): string | undefined => process.env[key];

/**
 * Anthropic Provider - Claude 3.5 family models
 */
export class AnthropicProvider implements LLMProvider {
  public readonly name = 'anthropic';
  public readonly type = 'anthropic' as const;
  public readonly defaultModel: string;
  public readonly supportedModels: string[];

  private client: Anthropic;
  private config: AnthropicProviderConfig;
  private available: boolean = false;

  constructor(config: AnthropicProviderConfig = {}) {
    this.config = {
      defaultModel: 'claude-3-5-sonnet-20241022',
      maxRetries: 3,
      timeout: 120000,
      ...config,
    };

    this.defaultModel = this.config.defaultModel || 'claude-3-5-sonnet-20241022';

    this.supportedModels = [
      'claude-opus-4-20250514',
      'claude-sonnet-4-20250514',
      'claude-3-5-sonnet-20241022',
      'claude-3-5-haiku-20241022',
      'claude-3-opus-20240229',
      'claude-3-sonnet-20240229',
      'claude-3-haiku-20240307',
    ];

    this.client = new Anthropic({
      apiKey: this.config.apiKey || getEnv('ANTHROPIC_API_KEY'),
      baseURL: this.config.baseURL,
      maxRetries: this.config.maxRetries,
      timeout: this.config.timeout,
    });

    logger.info('anthropic_provider_initialized', {
      defaultModel: this.defaultModel,
      hasApiKey: !!this.config.apiKey || !!getEnv('ANTHROPIC_API_KEY'),
    });
  }

  /**
   * Check if the provider is available
   */
  async isAvailable(): Promise<boolean> {
    if (!this.config.apiKey && !getEnv('ANTHROPIC_API_KEY')) {
      this.available = false;
      return false;
    }

    try {
      // Simple API check - make a minimal request
      await this.client.messages.create({
        model: this.defaultModel,
        max_tokens: 1,
        messages: [{ role: 'user', content: 'ping' }],
      });
      this.available = true;
      return true;
    } catch (error) {
      // If we get an auth error, the key is invalid
      if (error instanceof Anthropic.APIError && error.status === 401) {
        logger.error('anthropic_invalid_api_key');
        this.available = false;
        return false;
      }

      logger.error('anthropic_availability_check_failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      this.available = false;
      return false;
    }
  }

  /**
   * Get cost information for the provider
   */
  getCostInfo(): ProviderCostInfo {
    return {
      provider: 'anthropic',
      inputCostPer1K: 3.0, // claude-3-5-sonnet
      outputCostPer1K: 15.0, // claude-3-5-sonnet
      currency: 'USD',
      lastUpdated: '2026-01-01',
      models: [
        {
          model: 'claude-opus-4-20250514',
          inputCostPer1K: 15.0,
          outputCostPer1K: 75.0,
          contextWindow: 200000,
        },
        {
          model: 'claude-sonnet-4-20250514',
          inputCostPer1K: 3.0,
          outputCostPer1K: 15.0,
          contextWindow: 200000,
        },
        {
          model: 'claude-3-5-sonnet-20241022',
          inputCostPer1K: 3.0,
          outputCostPer1K: 15.0,
          contextWindow: 200000,
        },
        {
          model: 'claude-3-5-haiku-20241022',
          inputCostPer1K: 0.8,
          outputCostPer1K: 4.0,
          contextWindow: 200000,
        },
        {
          model: 'claude-3-opus-20240229',
          inputCostPer1K: 15.0,
          outputCostPer1K: 75.0,
          contextWindow: 200000,
        },
        {
          model: 'claude-3-sonnet-20240229',
          inputCostPer1K: 3.0,
          outputCostPer1K: 15.0,
          contextWindow: 200000,
        },
        {
          model: 'claude-3-haiku-20240307',
          inputCostPer1K: 0.25,
          outputCostPer1K: 1.25,
          contextWindow: 200000,
        },
      ],
    };
  }

  /**
   * Generate a chat completion
   */
  async chat(messages: Message[], options: ChatOptions = {}): Promise<ChatResponse> {
    const model = options.model || this.defaultModel;
    const startTime = Date.now();

    logger.info('anthropic_chat_request', {
      model,
      messageCount: messages.length,
      maxTokens: options.maxTokens,
      temperature: options.temperature,
    });

    try {
      // Extract system message
      let systemMessage = '';
      const anthropicMessages: { role: 'user' | 'assistant'; content: string }[] = [];

      for (const msg of messages) {
        if (msg.role === 'system') {
          systemMessage += (systemMessage ? '\n\n' : '') + msg.content;
        } else {
          anthropicMessages.push({
            role: msg.role as 'user' | 'assistant',
            content: msg.content,
          });
        }
      }

      // Build request options
      const requestOptions = {
        model,
        messages: anthropicMessages,
        max_tokens: options.maxTokens || 4096,
        temperature: options.temperature,
        top_p: options.topP,
        stop_sequences: options.stop ? (Array.isArray(options.stop) ? options.stop : [options.stop]) : undefined,
        system: systemMessage || undefined,
      };

      const response = await this.client.messages.create(requestOptions);

      // Process response
      const contentBlock = response.content[0];
      let content = '';
      let finishReason: ChatResponse['finishReason'] = 'stop';

      if (contentBlock && contentBlock.type === 'text') {
        content = contentBlock.text;
        finishReason = 'stop';
      } else if (contentBlock && contentBlock.type === 'tool_use') {
        content = JSON.stringify({
          toolCalls: [
            {
              id: contentBlock.id,
              name: contentBlock.name,
              input: contentBlock.input,
            },
          ],
        });
        finishReason = 'function_call';
      }

      // Calculate token usage
      const usage: ChatResponse['usage'] = {
        promptTokens: response.usage.input_tokens,
        completionTokens: response.usage.output_tokens,
        totalTokens: response.usage.input_tokens + response.usage.output_tokens,
      };

      const result: ChatResponse = {
        content,
        role: 'assistant',
        finishReason,
        usage,
        model,
        provider: this.name,
        raw: response,
      };

      const duration = Date.now() - startTime;
      logger.info('anthropic_chat_response', {
        model,
        durationMs: duration,
        finishReason: result.finishReason,
        usage: result.usage,
      });

      return result;
    } catch (error) {
      logger.error('anthropic_chat_error', {
        error: error instanceof Error ? error.message : 'Unknown error',
        model,
      });

      throw this.mapError(error, model);
    }
  }

  /**
   * Generate embeddings for text
   * Note: Anthropic doesn't have an embeddings API, so we use a fallback
   */
  async embed(_text: string): Promise<number[]> {
    // Anthropic doesn't provide embeddings API
    // In production, you might want to integrate with a dedicated embeddings service
    logger.warn('anthropic_embed_not_supported', {
      message: 'Anthropic does not provide embeddings API. Consider using OpenAI embeddings.',
    });

    throw new LLMProviderError(
      'Anthropic does not support embeddings. Use OpenAI provider instead.',
      'PROVIDER_NOT_SUPPORTED',
      400,
      this.name,
      'embed'
    );
  }

  /**
   * Classify text into categories
   */
  async classify(text: string, labels: string[], options: ClassifyOptions = {}): Promise<string> {
    const model = options.model || this.defaultModel;
    const startTime = Date.now();

    logger.info('anthropic_classify_request', {
      model,
      labelCount: labels.length,
      textLength: text.length,
    });

    try {
      // Build classification prompt
      const labelsText = labels.map((l, i) => `${i + 1}. ${l}`).join('\n');
      const instruction = options.instruction || 'Classify the following text into one of the given categories.';

      const systemPrompt = `You are a text classification assistant. ${instruction}

Available categories:
${labelsText}

Respond with ONLY the category name that best matches. Do not include any explanation.`;

      const response = await this.chat(
        [
          {
            role: 'user',
            content: `Text to classify: "${text}"`,
          },
        ],
        {
          model,
          temperature: options.temperature ?? 0.1,
          maxTokens: options.maxTokens ?? 50,
        }
      );

      // Parse the classification result
      const result = response.content.trim();
      const matchedLabel = labels.find(
        (l) => l.toLowerCase() === result.toLowerCase() || result.toLowerCase().includes(l.toLowerCase())
      );

      const duration = Date.now() - startTime;
      logger.info('anthropic_classify_response', {
        model,
        result: matchedLabel || result,
        durationMs: duration,
      });

      return matchedLabel || result;
    } catch (error) {
      logger.error('anthropic_classify_error', {
        error: error instanceof Error ? error.message : 'Unknown error',
        model,
      });

      throw this.mapError(error, model);
    }
  }

  /**
   * Map Anthropic errors to our error format
   */
  private mapError(error: unknown, model: string): LLMProviderError {
    if (error instanceof Anthropic.APIError) {
      const statusCode = error.status || 500;
      let code: string;
      let retryable = false;

      switch (statusCode) {
        case 400:
          code = LLMErrorCodes.INVALID_REQUEST;
          break;
        case 401:
          code = LLMErrorCodes.AUTHENTICATION_FAILED;
          break;
        case 403:
          code = LLMErrorCodes.AUTHENTICATION_FAILED;
          break;
        case 429:
          code = LLMErrorCodes.RATE_LIMIT_EXCEEDED;
          retryable = true;
          break;
        case 500:
          code = LLMErrorCodes.SERVICE_UNAVAILABLE;
          retryable = true;
          break;
        case 503:
          code = LLMErrorCodes.SERVICE_UNAVAILABLE;
          retryable = true;
          break;
        case 529:
          code = LLMErrorCodes.SERVICE_UNAVAILABLE;
          retryable = true;
          break;
        default:
          code = LLMErrorCodes.UNKNOWN_ERROR;
      }

      // Extract error message safely
      let errorMessage = 'Anthropic API error';
      if (error.error && typeof error.error === 'object' && 'message' in error.error) {
        errorMessage = String((error.error as { message: unknown }).message);
      } else if (typeof error.message === 'string') {
        errorMessage = error.message;
      }

      return new LLMProviderError(
        errorMessage,
        code,
        statusCode,
        this.name,
        model,
        retryable
      );
    }

    if (error instanceof Error) {
      if (error.message.includes('timeout')) {
        return new LLMProviderError(
          'Request timed out',
          LLMErrorCodes.TIMEOUT,
          408,
          this.name,
          model,
          true
        );
      }

      if (error.message.includes('ECONNREFUSED') || error.message.includes('ENOTFOUND')) {
        return new LLMProviderError(
          'Network error connecting to Anthropic',
          LLMErrorCodes.NETWORK_ERROR,
          503,
          this.name,
          model,
          true
        );
      }
    }

    return new LLMProviderError(
      error instanceof Error ? error.message : 'Unknown error',
      LLMErrorCodes.UNKNOWN_ERROR,
      500,
      this.name,
      model,
      false
    );
  }
}

/**
 * Factory function to create Anthropic provider
 */
export function createAnthropicProvider(config?: AnthropicProviderConfig): AnthropicProvider {
  return new AnthropicProvider(config);
}
