/**
 * Hojai LLM Adapter - OpenAI API Integration
 *
 * Provides OpenAI API integration with retry logic, streaming, and error handling
 */

import OpenAI from 'openai';
import { v4 as uuid } from 'uuid';
import {
  ChatMessage,
  LLMRequestOptions,
  LLMResponse,
  StreamingChunk,
  TokenUsage,
  OpenAIModel,
  LLMProvider,
  MessageRole
} from './types/index.js';
import {
  AuthenticationError,
  RateLimitError,
  TokenLimitError,
  EmptyResponseError,
  isRetryableError,
  sleep
} from './errors.js';

// ============================================================================
// OPENAI ADAPTER
// ============================================================================

export interface OpenAIAdapterConfig {
  apiKey: string;
  organization?: string;
  baseURL?: string;
  timeout?: number;
  maxRetries?: number;
  defaultModel?: OpenAIModel;
  defaultMaxTokens?: number;
}

interface InternalOpenAIConfig {
  apiKey: string;
  organization?: string;
  baseURL: string;
  timeout: number;
  maxRetries: number;
  defaultModel: OpenAIModel;
  defaultMaxTokens: number;
}

export class OpenAIAdapter {
  private client: OpenAI;
  private config: InternalOpenAIConfig;
  private readonly logger: Console;

  constructor(config: OpenAIAdapterConfig, logger?: Console) {
    this.config = {
      apiKey: config.apiKey,
      organization: config.organization,
      baseURL: config.baseURL || 'https://api.openai.com/v1',
      timeout: config.timeout || 60000,
      maxRetries: config.maxRetries || 3,
      defaultModel: config.defaultModel || OpenAIModel.GPT_4O,
      defaultMaxTokens: config.defaultMaxTokens || 4096
    };

    this.client = new OpenAI({
      apiKey: this.config.apiKey,
      organization: this.config.organization,
      baseURL: this.config.baseURL,
      timeout: this.config.timeout
    });

    this.logger = logger || console;
  }

  /**
   * Get the provider name
   */
  get provider(): string {
    return 'openai';
  }

  /**
   * Check if the API is healthy
   */
  async healthCheck(): Promise<boolean> {
    try {
      await this.client.models.list();
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Send a chat request to OpenAI
   */
  async chat(options: LLMRequestOptions): Promise<LLMResponse> {
    const startTime = Date.now();
    const requestId = uuid();

    this.logger.debug(`[OpenAIAdapter] chat request ${requestId}`, {
      messageCount: options.messages.length,
      systemPromptLength: options.systemPrompt?.length || 0
    });

    // Build messages array
    const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [];

    // Add system prompt if provided
    if (options.systemPrompt) {
      messages.push({
        role: 'system',
        content: options.systemPrompt
      });
    }

    // Add conversation messages
    for (const msg of options.messages) {
      if (msg.role === 'user' || msg.role === 'assistant') {
        messages.push({
          role: msg.role,
          content: msg.content,
          ...(msg.name && { name: msg.name })
        });
      }
    }

    let lastError: Error | undefined;

    for (let attempt = 1; attempt <= this.config.maxRetries; attempt++) {
      try {
        const response = await this.executeChat({
          model: this.config.defaultModel,
          messages,
          temperature: options.temperature,
          max_tokens: options.maxTokens || this.config.defaultMaxTokens,
          top_p: options.topP,
          stop: options.stopSequences
        });

        const latencyMs = Date.now() - startTime;

        // Validate response
        if (!response.choices || response.choices.length === 0) {
          throw new EmptyResponseError();
        }

        const choice = response.choices[0];
        const content = choice.message?.content || '';

        if (!content) {
          throw new EmptyResponseError();
        }

        return {
          content,
          provider: LLMProvider.OPENAI,
          model: response.model,
          usage: {
            inputTokens: response.usage?.prompt_tokens || 0,
            outputTokens: response.usage?.completion_tokens || 0,
            totalTokens: response.usage?.total_tokens || 0
          },
          finishReason: choice.finish_reason || 'stop',
          requestId,
          latencyMs
        };
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        // Handle specific errors
        if (error instanceof AuthenticationError ||
            error instanceof TokenLimitError ||
            error instanceof EmptyResponseError) {
          throw error;
        }

        // Rate limit handling
        if (lastError instanceof OpenAI.RateLimitError) {
          throw new RateLimitError(
            `OpenAI rate limit exceeded: ${lastError.message}`,
            { limitType: 'requests', originalError: lastError }
          );
        }

        // Authentication error
        if (lastError instanceof OpenAI.AuthenticationError) {
          throw new AuthenticationError(
            `OpenAI authentication failed: ${lastError.message}`,
            lastError
          );
        }

        // Check if retryable
        if (!isRetryableError(lastError) || attempt === this.config.maxRetries) {
          this.logger.error(`[OpenAIAdapter] Non-retryable error: ${lastError.message}`);
          throw lastError;
        }

        this.logger.warn(
          `[OpenAIAdapter] Attempt ${attempt} failed, retrying...`,
          { error: lastError.message }
        );

        // Exponential backoff
        await sleep(Math.min(1000 * Math.pow(2, attempt - 1), 30000));
      }
    }

    throw lastError;
  }

  /**
   * Execute chat with raw API call
   */
  private async executeChat(params: {
    model: string;
    messages: OpenAI.Chat.ChatCompletionMessageParam[];
    temperature?: number;
    max_tokens?: number;
    top_p?: number;
    stop?: string[];
  }): Promise<OpenAI.Chat.ChatCompletion> {
    const response = await this.client.chat.completions.create({
      model: params.model,
      messages: params.messages,
      temperature: params.temperature,
      max_tokens: params.max_tokens,
      top_p: params.top_p,
      stop: params.stop
    });

    return response;
  }

  /**
   * Stream chat response from OpenAI
   */
  async *streamChat(
    options: LLMRequestOptions
  ): AsyncGenerator<StreamingChunk, void, unknown> {
    const requestId = uuid();
    let totalUsage: TokenUsage = {
      inputTokens: 0,
      outputTokens: 0,
      totalTokens: 0
    };
    let chunkCount = 0;

    this.logger.debug(`[OpenAIAdapter] stream request ${requestId}`);

    // Build messages array
    const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [];

    if (options.systemPrompt) {
      messages.push({
        role: 'system',
        content: options.systemPrompt
      });
    }

    for (const msg of options.messages) {
      if (msg.role === 'user' || msg.role === 'assistant') {
        messages.push({
          role: msg.role,
          content: msg.content
        });
      }
    }

    try {
      const stream = await this.client.chat.completions.create({
        model: this.config.defaultModel,
        messages,
        temperature: options.temperature,
        max_tokens: options.maxTokens || this.config.defaultMaxTokens,
        top_p: options.topP,
        stream: true
      });

      for await (const chunk of stream) {
        chunkCount++;

        const choice = chunk.choices[0];
        if (choice.delta?.content) {
          totalUsage.outputTokens++;
          yield {
            type: 'content',
            content: choice.delta.content,
            delta: choice.delta.content
          };
        }

        // Update usage from final chunk
        if (chunk.usage) {
          totalUsage.inputTokens = chunk.usage.prompt_tokens;
          totalUsage.outputTokens = chunk.usage.completion_tokens;
          totalUsage.totalTokens = chunk.usage.total_tokens;
        }

        // Check for completion
        if (choice.finish_reason) {
          yield {
            type: 'done',
            usage: totalUsage,
            content: undefined
          };
        }
      }
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      yield {
        type: 'error',
        error: err.message
      };
    }
  }

  /**
   * Analyze a query with context
   */
  async analyze(
    query: string,
    context?: {
      recentConversations?: ChatMessage[];
      relevantFacts?: string[];
      userIntent?: string;
    }
  ): Promise<LLMResponse> {
    const systemPrompt = `You are an expert query analyzer. Analyze the user's query and provide structured insights.

Return a JSON response with:
- intent: The primary intent of the query
- entities: Key entities mentioned (people, organizations, products)
- sentiment: positive, neutral, or negative
- complexity: simple, moderate, or complex
- suggested_task: Recommended task type (reasoning, creative, classification, extraction, summarization, conversation, code, document)

Format your response as valid JSON only.`;

    const contextSection = context?.relevantFacts?.length
      ? `\n\nRelevant facts:\n${context.relevantFacts.map(f => `- ${f}`).join('\n')}`
      : '';

    const conversationSection = context?.recentConversations?.length
      ? `\n\nRecent conversation:\n${context.recentConversations.slice(-4).map(m => `${m.role}: ${m.content}`).join('\n')}`
      : '';

    return this.chat({
      messages: [
        {
          role: MessageRole.USER,
          content: `Analyze this query:${contextSection}${conversationSection}\n\nQuery: ${query}`
        }
      ],
      systemPrompt,
      temperature: 0.3,
      maxTokens: 500
    });
  }

  /**
   * Generate text from a prompt
   */
  async generateText(
    prompt: string,
    options?: {
      systemPrompt?: string;
      temperature?: number;
      maxTokens?: number;
      stopSequences?: string[];
    }
  ): Promise<LLMResponse> {
    return this.chat({
      messages: [{ role: MessageRole.USER, content: prompt }],
      systemPrompt: options?.systemPrompt,
      temperature: options?.temperature,
      maxTokens: options?.maxTokens,
      stopSequences: options?.stopSequences
    });
  }

  /**
   * Analyze a document
   */
  async analyzeDocument(
    content: string,
    documentType: string,
    options?: {
      extractFields?: string[];
      summaryLength?: 'short' | 'medium' | 'long';
    }
  ): Promise<LLMResponse> {
    const summaryLengthMap = {
      short: '2-3 sentences',
      medium: '1 paragraph',
      long: '2-3 paragraphs'
    };

    const systemPrompt = `You are an expert document analyzer. Analyze the provided ${documentType} and provide structured insights.

Provide the following:
1. A ${summaryLengthMap[options?.summaryLength || 'medium']} summary
2. Key points (bullet list)
3. Sentiment (positive, neutral, or negative)
4. Any notable entities (people, organizations, dates, amounts)

${
  options?.extractFields?.length
    ? `5. Extract these specific fields:\n${options.extractFields.map(f => `- ${f}`).join('\n')}`
    : ''
}

Format your response clearly with sections.`;

    return this.chat({
      messages: [{ role: MessageRole.USER, content: content }],
      systemPrompt,
      temperature: 0.3,
      maxTokens: 2000
    });
  }

  /**
   * Count tokens for a message (approximate)
   */
  async countTokens(text: string): Promise<number> {
    // OpenAI uses ~4 chars per token on average
    return Math.ceil(text.length / 4);
  }

  /**
   * Update API key at runtime
   */
  updateApiKey(apiKey: string): void {
    this.config.apiKey = apiKey;
    this.client = new OpenAI({
      apiKey: this.config.apiKey,
      organization: this.config.organization,
      baseURL: this.config.baseURL,
      timeout: this.config.timeout
    });
  }
}

// ============================================================================
// DEFAULT EXPORT
// ============================================================================

export function createOpenAIAdapter(config: OpenAIAdapterConfig, logger?: Console): OpenAIAdapter {
  return new OpenAIAdapter(config, logger);
}
