/**
 * HOJAI LLM Providers - Google Gemini Provider Adapter
 * Version: 1.0.0 | Date: June 2, 2026
 * Purpose: Google Gemini integration via the official SDK
 *
 * API: https://generativelanguage.googleapis.com/v1beta/models
 * Key Features:
 * - Gemini Pro, Gemini Pro Vision, Gemini Ultra
 * - Native multimodal (text, images, code)
 * - 128K context window
 */

import OpenAI from 'openai';
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

const logger = createLogger('gemini-provider');

// ============================================================================
// Configuration
// ============================================================================

interface GeminiProviderConfig {
  apiKey?: string;
  baseURL?: string;
  defaultModel?: string;
  timeout?: number;
}

// Access environment variables safely
const getEnv = (key: string): string | undefined => process.env[key];

// Map message role to Gemini format (uses OpenAI-compatible API)
function toOpenAIMessage(msg: Message): OpenAI.Chat.ChatCompletionMessageParam {
  if (msg.role === 'system') {
    return { role: 'system', content: msg.content };
  }
  if (msg.role === 'user') {
    return { role: 'user', content: msg.content };
  }
  if (msg.role === 'assistant') {
    return { role: 'assistant', content: msg.content };
  }
  if (msg.role === 'function') {
    return {
      role: 'user' as const,
      content: msg.content,
      name: msg.name,
    };
  }
  return { role: 'user', content: msg.content };
}

/**
 * Gemini Provider - Gemini Pro/Ultra family models
 *
 * Uses OpenAI-compatible API endpoint via Google AI Gateway
 */
export class GeminiProvider implements LLMProvider {
  public readonly name = 'gemini';
  public readonly type = 'gemini' as const;
  public readonly defaultModel: string;
  public readonly supportedModels: string[];

  private client: OpenAI;
  private config: GeminiProviderConfig;
  private available: boolean = false;

  constructor(config: GeminiProviderConfig = {}) {
    this.config = {
      defaultModel: 'gemini-2.0-flash',
      timeout: 120000,
      ...config,
    };

    // Default base URL for Gemini API (OpenAI-compatible endpoint)
    const defaultBaseURL = 'https://generativelanguage.googleapis.com/v1beta/openai';

    this.defaultModel = this.config.defaultModel || 'gemini-2.0-flash';

    this.supportedModels = [
      'gemini-2.5-pro-preview-06-05',
      'gemini-2.0-flash',
      'gemini-2.0-flash-thinking',
      'gemini-2.0-flash-exp',
      'gemini-1.5-pro',
      'gemini-1.5-flash',
      'gemini-1.5-flash-8b',
      'gemini-pro',
      'gemini-pro-vision',
    ];

    this.client = new OpenAI({
      apiKey: this.config.apiKey || getEnv('GEMINI_API_KEY'),
      baseURL: this.config.baseURL || defaultBaseURL,
      timeout: this.config.timeout,
      defaultQuery: {
        'key': this.config.apiKey || getEnv('GEMINI_API_KEY'),
      },
    });

    logger.info('gemini_provider_initialized', {
      defaultModel: this.defaultModel,
      hasApiKey: !!this.config.apiKey || !!getEnv('GEMINI_API_KEY'),
      baseURL: this.config.baseURL || defaultBaseURL,
    });
  }

  /**
   * Check if the provider is available
   */
  async isAvailable(): Promise<boolean> {
    if (!this.config.apiKey && !getEnv('GEMINI_API_KEY')) {
      this.available = false;
      return false;
    }

    try {
      // Test with a minimal request
      const response = await this.client.chat.completions.create({
        model: this.defaultModel,
        messages: [{ role: 'user', content: 'ping' }],
        max_tokens: 1,
      });

      this.available = response.choices.length > 0;
      return this.available;
    } catch (error) {
      logger.error('gemini_availability_check_failed', {
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
      provider: 'gemini',
      inputCostPer1K: 0.0, // Gemini API is free tier with quotas
      outputCostPer1K: 0.0,
      currency: 'USD',
      lastUpdated: '2026-06-01',
      models: [
        {
          model: 'gemini-2.5-pro-preview-06-05',
          inputCostPer1K: 0.0,
          outputCostPer1K: 0.0,
          contextWindow: 1000000,
        },
        {
          model: 'gemini-2.0-flash',
          inputCostPer1K: 0.0,
          outputCostPer1K: 0.0,
          contextWindow: 1000000,
        },
        {
          model: 'gemini-2.0-flash-thinking',
          inputCostPer1K: 0.0,
          outputCostPer1K: 0.0,
          contextWindow: 1000000,
        },
        {
          model: 'gemini-1.5-pro',
          inputCostPer1K: 0.0,
          outputCostPer1K: 0.0,
          contextWindow: 2000000,
        },
        {
          model: 'gemini-1.5-flash',
          inputCostPer1K: 0.0,
          outputCostPer1K: 0.0,
          contextWindow: 1000000,
        },
        {
          model: 'gemini-1.5-flash-8b',
          inputCostPer1K: 0.0,
          outputCostPer1K: 0.0,
          contextWindow: 1000000,
        },
        {
          model: 'gemini-pro',
          inputCostPer1K: 0.0,
          outputCostPer1K: 0.0,
          contextWindow: 30720,
        },
        {
          model: 'gemini-pro-vision',
          inputCostPer1K: 0.0,
          outputCostPer1K: 0.0,
          contextWindow: 12288,
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

    logger.info('gemini_chat_request', {
      model,
      messageCount: messages.length,
      maxTokens: options.maxTokens,
      temperature: options.temperature,
    });

    try {
      // Build OpenAI-compatible messages
      const openAIMessages = messages.map(toOpenAIMessage);

      // Build request options
      const requestOptions: OpenAI.Chat.ChatCompletionCreateParams = {
        model,
        messages: openAIMessages,
        max_tokens: options.maxTokens,
        temperature: options.temperature,
        top_p: options.topP,
        stop: options.stop,
        frequency_penalty: options.frequencyPenalty,
        presence_penalty: options.presencePenalty,
      };

      // Handle function calling (tools)
      if (options.functions && options.functions.length > 0) {
        requestOptions.tools = options.functions.map((fn) => ({
          type: 'function' as const,
          function: {
            name: fn.name,
            description: fn.description,
            parameters: fn.parameters,
          },
        }));

        if (options.functionCall) {
          requestOptions.tool_choice = options.functionCall as OpenAI.Chat.ChatCompletionToolChoiceOption;
        }
      }

      const response = await this.client.chat.completions.create(requestOptions);

      const completion = response.choices[0];
      if (!completion) {
        throw new Error('No completion returned from Gemini');
      }

      const message = completion.message;

      const result: ChatResponse = {
        content: message.content || '',
        role: 'assistant',
        finishReason: this.mapFinishReason(completion.finish_reason),
        usage: response.usage
          ? {
              promptTokens: response.usage.prompt_tokens,
              completionTokens: response.usage.completion_tokens,
              totalTokens: response.usage.total_tokens,
            }
          : undefined,
        model,
        provider: this.name,
        raw: response,
      };

      // Handle function call response
      if (message.tool_calls && message.tool_calls.length > 0) {
        result.content = JSON.stringify({
          toolCalls: message.tool_calls.map((tc) => ({
            id: tc.id,
            name: tc.function.name,
            arguments: tc.function.arguments,
          })),
        });
        result.finishReason = 'function_call';
      }

      const duration = Date.now() - startTime;
      logger.info('gemini_chat_response', {
        model,
        durationMs: duration,
        finishReason: result.finishReason,
        usage: result.usage,
      });

      return result;
    } catch (error) {
      logger.error('gemini_chat_error', {
        error: error instanceof Error ? error.message : 'Unknown error',
        model,
      });

      throw this.mapError(error, model);
    }
  }

  /**
   * Generate embeddings for text
   * Uses Gemini's embedding API via OpenAI-compatible endpoint
   */
  async embed(text: string, _embeddingModel?: string): Promise<number[]> {
    const startTime = Date.now();
    const model = 'gemini-embedding-exp';

    logger.info('gemini_embed_request', { model, textLength: text.length });

    try {
      // Use the embeddings endpoint (OpenAI-compatible)
      const response = await this.client.embeddings.create({
        model: model,
        input: text,
      });

      const embedding = response.data[0]?.embedding || [];
      const duration = Date.now() - startTime;

      logger.info('gemini_embed_response', {
        model,
        dimensions: embedding.length,
        durationMs: duration,
      });

      return embedding;
    } catch (error) {
      logger.error('gemini_embed_error', {
        error: error instanceof Error ? error.message : 'Unknown error',
        model,
      });

      throw this.mapError(error, 'embedding');
    }
  }

  /**
   * Classify text into categories using chat completion
   */
  async classify(text: string, labels: string[], options: ClassifyOptions = {}): Promise<string> {
    const model = options.model || this.defaultModel;
    const startTime = Date.now();

    logger.info('gemini_classify_request', {
      model,
      labelCount: labels.length,
      textLength: text.length,
    });

    try {
      // Build classification prompt
      const labelsText = labels.map((l, i) => `${i + 1}. ${l}`).join('\n');
      const instruction = options.instruction || 'Classify the following text into one of the given categories.';

      const messages: Message[] = [
        {
          role: 'system',
          content: `You are a text classification assistant. ${instruction}

Available categories:
${labelsText}

Respond with ONLY the category name that best matches. Do not include any explanation.`,
        },
        {
          role: 'user',
          content: `Text to classify: "${text}"`,
        },
      ];

      const response = await this.chat(messages, {
        model,
        temperature: options.temperature ?? 0.1,
        maxTokens: options.maxTokens ?? 50,
      });

      // Parse the classification result
      const result = response.content.trim();
      const matchedLabel = labels.find(
        (l) => l.toLowerCase() === result.toLowerCase() || result.toLowerCase().includes(l.toLowerCase())
      );

      const duration = Date.now() - startTime;
      logger.info('gemini_classify_response', {
        model,
        result: matchedLabel || result,
        durationMs: duration,
      });

      return matchedLabel || result;
    } catch (error) {
      logger.error('gemini_classify_error', {
        error: error instanceof Error ? error.message : 'Unknown error',
        model,
      });

      throw this.mapError(error, model);
    }
  }

  /**
   * Map finish reason to our format
   */
  private mapFinishReason(reason: string | null): ChatResponse['finishReason'] {
    switch (reason) {
      case 'stop':
        return 'stop';
      case 'length':
        return 'length';
      case 'function_call':
        return 'function_call';
      case 'content_filter':
        return 'content_filter';
      default:
        return 'stop';
    }
  }

  /**
   * Map Gemini errors to our error format
   */
  private mapError(error: unknown, model: string): LLMProviderError {
    if (error instanceof OpenAI.APIError) {
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
        default:
          code = LLMErrorCodes.UNKNOWN_ERROR;
      }

      return new LLMProviderError(
        error.message || 'Gemini API error',
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
          'Network error connecting to Gemini',
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
 * Factory function to create Gemini provider
 */
export function createGeminiProvider(config?: GeminiProviderConfig): GeminiProvider {
  return new GeminiProvider(config);
}
