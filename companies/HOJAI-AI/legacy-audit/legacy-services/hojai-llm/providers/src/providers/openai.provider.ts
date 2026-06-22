/**
 * HOJAI LLM Providers - OpenAI Provider Adapter
 * Version: 1.0.0 | Date: May 30, 2026
 * Purpose: OpenAI GPT integration via the official SDK
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

const logger = createLogger('openai-provider');

// ============================================================================
// Configuration
// ============================================================================

interface OpenAIProviderConfig {
  apiKey?: string;
  organization?: string;
  baseURL?: string;
  defaultModel?: string;
  timeout?: number;
}

// Access environment variables safely
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
    // Function messages need to be converted to user or assistant format
    return {
      role: 'user' as const,
      content: msg.content,
      name: msg.name,
    };
  }
  // Default fallback
  return { role: 'user', content: msg.content };
}

/**
 * OpenAI Provider - GPT-4o family models
 */
export class OpenAIProvider implements LLMProvider {
  public readonly name = 'openai';
  public readonly type = 'openai' as const;
  public readonly defaultModel: string;
  public readonly supportedModels: string[];

  private client: OpenAI;
  private config: OpenAIProviderConfig;
  private available: boolean = false;

  constructor(config: OpenAIProviderConfig = {}) {
    this.config = {
      defaultModel: 'gpt-4o-mini',
      timeout: 60000,
      ...config,
    };

    this.defaultModel = this.config.defaultModel || 'gpt-4o-mini';

    this.supportedModels = [
      'gpt-4o',
      'gpt-4o-mini',
      'gpt-4-turbo',
      'gpt-4',
      'gpt-3.5-turbo',
    ];

    this.client = new OpenAI({
      apiKey: this.config.apiKey || getEnv('OPENAI_API_KEY'),
      organization: this.config.organization || getEnv('OPENAI_ORG_ID'),
      baseURL: this.config.baseURL,
      timeout: this.config.timeout,
    });

    logger.info('openai_provider_initialized', {
      defaultModel: this.defaultModel,
      hasApiKey: !!this.config.apiKey || !!getEnv('OPENAI_API_KEY'),
    });
  }

  /**
   * Check if the provider is available
   */
  async isAvailable(): Promise<boolean> {
    if (!this.config.apiKey && !getEnv('OPENAI_API_KEY')) {
      this.available = false;
      return false;
    }

    try {
      // Simple API check
      await this.client.models.list();
      this.available = true;
      return true;
    } catch (error) {
      logger.error('openai_availability_check_failed', {
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
      provider: 'openai',
      inputCostPer1K: 0.15, // gpt-4o-mini
      outputCostPer1K: 0.6, // gpt-4o-mini
      currency: 'USD',
      lastUpdated: '2026-01-01',
      models: [
        {
          model: 'gpt-4o',
          inputCostPer1K: 2.5,
          outputCostPer1K: 10.0,
          contextWindow: 128000,
        },
        {
          model: 'gpt-4o-mini',
          inputCostPer1K: 0.15,
          outputCostPer1K: 0.6,
          contextWindow: 128000,
        },
        {
          model: 'gpt-4-turbo',
          inputCostPer1K: 10.0,
          outputCostPer1K: 30.0,
          contextWindow: 128000,
        },
        {
          model: 'gpt-4',
          inputCostPer1K: 30.0,
          outputCostPer1K: 60.0,
          contextWindow: 8192,
        },
        {
          model: 'gpt-3.5-turbo',
          inputCostPer1K: 0.5,
          outputCostPer1K: 1.5,
          contextWindow: 16385,
        },
        {
          model: 'text-embedding-3-small',
          inputCostPer1K: 0.00002,
          outputCostPer1K: 0,
          contextWindow: 8191,
        },
        {
          model: 'text-embedding-3-large',
          inputCostPer1K: 0.00013,
          outputCostPer1K: 0,
          contextWindow: 8191,
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

    logger.info('openai_chat_request', {
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

      // Handle function calling
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
        throw new Error('No completion returned from OpenAI');
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
      }

      const duration = Date.now() - startTime;
      logger.info('openai_chat_response', {
        model,
        durationMs: duration,
        finishReason: result.finishReason,
        usage: result.usage,
      });

      return result;
    } catch (error) {
      logger.error('openai_chat_error', {
        error: error instanceof Error ? error.message : 'Unknown error',
        model,
      });

      throw this.mapError(error, model);
    }
  }

  /**
   * Generate embeddings for text
   */
  async embed(text: string, embeddingModel?: string): Promise<number[]> {
    const model = embeddingModel || 'text-embedding-3-small';
    const startTime = Date.now();

    logger.info('openai_embed_request', { model, textLength: text.length });

    try {
      const response = await this.client.embeddings.create({
        model,
        input: text,
      });

      const embedding = response.data[0]?.embedding || [];
      const duration = Date.now() - startTime;

      logger.info('openai_embed_response', {
        model,
        dimensions: embedding.length,
        durationMs: duration,
      });

      return embedding;
    } catch (error) {
      logger.error('openai_embed_error', {
        error: error instanceof Error ? error.message : 'Unknown error',
        model,
      });

      throw this.mapError(error, model);
    }
  }

  /**
   * Classify text into categories using chat completion
   */
  async classify(text: string, labels: string[], options: ClassifyOptions = {}): Promise<string> {
    const model = options.model || this.defaultModel;
    const startTime = Date.now();

    logger.info('openai_classify_request', {
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
      logger.info('openai_classify_response', {
        model,
        result: matchedLabel || result,
        durationMs: duration,
      });

      return matchedLabel || result;
    } catch (error) {
      logger.error('openai_classify_error', {
        error: error instanceof Error ? error.message : 'Unknown error',
        model,
      });

      throw this.mapError(error, model);
    }
  }

  /**
   * Map OpenAI finish reason to our format
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
   * Map OpenAI errors to our error format
   */
  private mapError(error: unknown, model: string): LLMProviderError {
    if (error instanceof OpenAI.APIError) {
      const statusCode = error.status || 500;
      let code: string;
      let retryable = false;

      switch (statusCode) {
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
        error.message || 'OpenAI API error',
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
          'Network error connecting to OpenAI',
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
 * Factory function to create OpenAI provider
 */
export function createOpenAIProvider(config?: OpenAIProviderConfig): OpenAIProvider {
  return new OpenAIProvider(config);
}
