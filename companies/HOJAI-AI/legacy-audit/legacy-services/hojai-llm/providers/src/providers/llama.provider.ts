/**
 * HOJAI LLM Providers - Llama Provider Adapter
 * Version: 1.0.0 | Date: June 2, 2026
 * Purpose: Meta Llama integration via OpenAI-compatible API
 *
 * API Options:
 * - Ollama (local): http://localhost:11434
 * - Replicate (cloud): https://api.replicate.com/v1
 * - Fireworks AI (cloud): https://api.fireworks.ai/inference/v1
 * - Groq (cloud): https://api.groq.com/openai/v1
 *
 * Key Features:
 * - Llama 3.1 405B, 70B, 8B variants
 * - Excellent open-source performance
 * - Cost-effective for local deployment
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

const logger = createLogger('llama-provider');

// ============================================================================
// Configuration
// ============================================================================

interface LlamaProviderConfig {
  apiKey?: string;
  baseURL?: string;
  defaultModel?: string;
  timeout?: number;
}

// Environment variable helper
const getEnv = (key: string): string | undefined => process.env[key];

// Map message role to OpenAI format
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
 * Llama Provider - Meta Llama family models
 *
 * Supports multiple backends via OpenAI-compatible API:
 * - Ollama (local)
 * - Replicate
 * - Fireworks AI
 * - Groq
 * - Any other OpenAI-compatible Llama endpoint
 */
export class LlamaProvider implements LLMProvider {
  public readonly name = 'llama';
  public readonly type = 'llama' as const;
  public readonly defaultModel: string;
  public readonly supportedModels: string[];

  private client: OpenAI;
  private config: LlamaProviderConfig;
  private available: boolean = false;

  constructor(config: LlamaProviderConfig = {}) {
    this.config = {
      defaultModel: 'llama-3.3-70b-instruct',
      timeout: 180000, // Longer timeout for local/slower endpoints
      ...config,
    };

    // Default base URL - prefer Groq for production (fastest free tier)
    // Falls back to Ollama for local development
    const defaultBaseURL = this.detectDefaultBaseURL();

    this.defaultModel = this.config.defaultModel || 'llama-3.3-70b-instruct';

    this.supportedModels = [
      // Llama 4 (latest)
      'llama-4-scout',
      'llama-4-maverick',
      // Llama 3.3 (most capable)
      'llama-3.3-70b-instruct',
      'llama-3.3-70b-instruct-fp8',
      // Llama 3.2
      'llama-3.2-90b-vision-instruct',
      'llama-3.2-11b-vision-instruct',
      'llama-3.2-3b-instruct',
      'llama-3.2-1b-instruct',
      // Llama 3.1
      'llama-3.1-405b-instruct',
      'llama-3.1-70b-instruct',
      'llama-3.1-8b-instruct',
      // Llama 3
      'llama-3-70b-instruct',
      'llama-3-8b-instruct',
      // Code Llama
      'codellama-34b-instruct',
      'codellama-13b-instruct',
      'codellama-7b-instruct',
      // Ollama local models
      'llama3.3:latest',
      'llama3.2-vision:latest',
      'llama3.2:latest',
      'llama3:latest',
      'codellama:latest',
    ];

    this.client = new OpenAI({
      apiKey: this.config.apiKey || getEnv('LLAMA_API_KEY') || 'not-required',
      baseURL: this.config.baseURL || defaultBaseURL,
      timeout: this.config.timeout,
    });

    logger.info('llama_provider_initialized', {
      defaultModel: this.defaultModel,
      hasApiKey: !!(this.config.apiKey || getEnv('LLAMA_API_KEY')),
      baseURL: this.config.baseURL || defaultBaseURL,
    });
  }

  /**
   * Detect default base URL based on environment
   */
  private detectDefaultBaseURL(): string {
    // Check for explicit configuration
    if (getEnv('OLLAMA_BASE_URL')) {
      return getEnv('OLLAMA_BASE_URL')!;
    }
    if (getEnv('GROQ_BASE_URL')) {
      return getEnv('GROQ_BASE_URL')!;
    }
    if (getEnv('REPLICATE_BASE_URL')) {
      return getEnv('REPLICATE_BASE_URL')!;
    }

    // For local development, prefer Ollama
    const nodeEnv = getEnv('NODE_ENV') || 'development';
    if (nodeEnv === 'development') {
      // Default to Ollama for local dev
      return 'http://localhost:11434/v1';
    }

    // Production default: Groq (fastest free tier)
    return 'https://api.groq.com/openai/v1';
  }

  /**
   * Check if the provider is available
   */
  async isAvailable(): Promise<boolean> {
    if (!this.config.apiKey && !getEnv('LLAMA_API_KEY')) {
      // For local Ollama, API key is optional
      const baseURL = this.config.baseURL || this.detectDefaultBaseURL();
      if (baseURL.includes('localhost') || baseURL.includes('ollama')) {
        this.available = true;
        return true;
      }
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
      logger.error('llama_availability_check_failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      this.available = false;
      return false;
    }
  }

  /**
   * Get cost information for the provider
   * Note: Costs vary by provider (free on Groq, varies by Replicate/Fireworks)
   */
  getCostInfo(): ProviderCostInfo {
    return {
      provider: 'llama',
      inputCostPer1K: 0.0, // Varies by provider
      outputCostPer1K: 0.0,
      currency: 'USD',
      lastUpdated: '2026-06-01',
      models: [
        {
          model: 'llama-4-scout',
          inputCostPer1K: 0.0,
          outputCostPer1K: 0.0,
          contextWindow: 1000000,
        },
        {
          model: 'llama-4-maverick',
          inputCostPer1K: 0.0,
          outputCostPer1K: 0.0,
          contextWindow: 1000000,
        },
        {
          model: 'llama-3.3-70b-instruct',
          inputCostPer1K: 0.0, // Free on Groq
          outputCostPer1K: 0.0,
          contextWindow: 128000,
        },
        {
          model: 'llama-3.1-405b-instruct',
          inputCostPer1K: 0.0,
          outputCostPer1K: 0.0,
          contextWindow: 128000,
        },
        {
          model: 'llama-3.1-70b-instruct',
          inputCostPer1K: 0.0,
          outputCostPer1K: 0.0,
          contextWindow: 128000,
        },
        {
          model: 'llama-3.1-8b-instruct',
          inputCostPer1K: 0.0,
          outputCostPer1K: 0.0,
          contextWindow: 128000,
        },
        {
          model: 'llama-3-70b-instruct',
          inputCostPer1K: 0.0,
          outputCostPer1K: 0.0,
          contextWindow: 8192,
        },
        {
          model: 'llama-3-8b-instruct',
          inputCostPer1K: 0.0,
          outputCostPer1K: 0.0,
          contextWindow: 8192,
        },
        {
          model: 'codellama-34b-instruct',
          inputCostPer1K: 0.0,
          outputCostPer1K: 0.0,
          contextWindow: 16384,
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

    logger.info('llama_chat_request', {
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
        throw new Error('No completion returned from Llama');
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
      logger.info('llama_chat_response', {
        model,
        durationMs: duration,
        finishReason: result.finishReason,
        usage: result.usage,
      });

      return result;
    } catch (error) {
      logger.error('llama_chat_error', {
        error: error instanceof Error ? error.message : 'Unknown error',
        model,
      });

      throw this.mapError(error, model);
    }
  }

  /**
   * Generate embeddings for text
   * Note: Not all Llama backends support embeddings. Falls back to error.
   */
  async embed(_text: string): Promise<number[]> {
    logger.warn('llama_embed_not_supported', {
      message: 'Llama models do not natively support embeddings. Use OpenAI or dedicated embedding provider.',
    });

    throw new LLMProviderError(
      'Llama models do not support embeddings. Use OpenAI embeddings instead.',
      'PROVIDER_NOT_SUPPORTED',
      400,
      this.name,
      'embed'
    );
  }

  /**
   * Classify text into categories using chat completion
   */
  async classify(text: string, labels: string[], options: ClassifyOptions = {}): Promise<string> {
    const model = options.model || this.defaultModel;
    const startTime = Date.now();

    logger.info('llama_classify_request', {
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
      logger.info('llama_classify_response', {
        model,
        result: matchedLabel || result,
        durationMs: duration,
      });

      return matchedLabel || result;
    } catch (error) {
      logger.error('llama_classify_error', {
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
      case 'model_length':
        return 'length';
      default:
        return 'stop';
    }
  }

  /**
   * Map Llama errors to our error format
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
        case 404:
          code = LLMErrorCodes.MODEL_NOT_FOUND;
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
        error.message || 'Llama API error',
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
          'Network error connecting to Llama endpoint',
          LLMErrorCodes.NETWORK_ERROR,
          503,
          this.name,
          model,
          true
        );
      }

      // Ollama specific errors
      if (error.message.includes('model not found')) {
        return new LLMProviderError(
          'Model not found. Make sure the model is downloaded: ollama pull ' + model,
          LLMErrorCodes.MODEL_NOT_FOUND,
          404,
          this.name,
          model,
          false
        );
      }

      if (error.message.includes('connection refused')) {
        return new LLMProviderError(
          'Ollama is not running. Start it with: ollama serve',
          LLMErrorCodes.SERVICE_UNAVAILABLE,
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
 * Factory function to create Llama provider
 */
export function createLlamaProvider(config?: LlamaProviderConfig): LlamaProvider {
  return new LlamaProvider(config);
}
