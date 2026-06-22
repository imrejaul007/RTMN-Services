/**
 * Hojai LLM Adapter - Claude API Integration
 *
 * Provides Claude API integration with retry logic, streaming, and error handling
 */

import Anthropic from '@anthropic-ai/sdk';
import { v4 as uuid } from 'uuid';
import {
  ChatMessage,
  LLMRequestOptions,
  LLMResponse,
  StreamingChunk,
  TokenUsage,
  ClaudeModel,
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
// CLAUDE ADAPTER
// ============================================================================

export interface ClaudeAdapterConfig {
  apiKey: string;
  baseURL?: string;
  timeout?: number;
  maxRetries?: number;
  defaultModel?: ClaudeModel;
  defaultMaxTokens?: number;
}

export class ClaudeAdapter {
  private client: Anthropic;
  private config: Required<ClaudeAdapterConfig>;
  private readonly logger: Console;

  constructor(config: ClaudeAdapterConfig, logger?: Console) {
    this.config = {
      apiKey: config.apiKey,
      baseURL: config.baseURL || 'https://api.anthropic.com',
      timeout: config.timeout || 60000,
      maxRetries: config.maxRetries || 3,
      defaultModel: config.defaultModel || ClaudeModel.CLAUDE_3_5_SONNET,
      defaultMaxTokens: config.defaultMaxTokens || 4096
    };

    this.client = new Anthropic({
      apiKey: this.config.apiKey,
      baseURL: this.config.baseURL,
      timeout: this.config.timeout
    });

    this.logger = logger || console;
  }

  /**
   * Get the provider name
   */
  get provider(): string {
    return 'claude';
  }

  /**
   * Check if the API is healthy
   */
  async healthCheck(): Promise<boolean> {
    try {
      // Simple API test - make a minimal request
      await this.client.messages.create({
        model: this.config.defaultModel,
        max_tokens: 1,
        messages: [{ role: 'user', content: 'ping' }]
      });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Send a chat request to Claude
   */
  async chat(options: LLMRequestOptions): Promise<LLMResponse> {
    const startTime = Date.now();
    const requestId = uuid();

    this.logger.debug(`[ClaudeAdapter] chat request ${requestId}`, {
      messageCount: options.messages.length,
      systemPromptLength: options.systemPrompt?.length || 0
    });

    // Build messages array - filter to only user/assistant roles
    const messages: Anthropic.MessageParam[] = options.messages
      .filter(msg => msg.role === MessageRole.USER || msg.role === MessageRole.ASSISTANT)
      .map(msg => ({
        role: msg.role === MessageRole.USER ? 'user' : 'assistant',
        content: msg.content,
        ...(msg.name && { name: msg.name })
    }));

    let lastError: Error | undefined;

    for (let attempt = 1; attempt <= this.config.maxRetries; attempt++) {
      try {
        const response = await this.executeChat({
          model: this.config.defaultModel,
          messages,
          system: options.systemPrompt,
          temperature: options.temperature,
          max_tokens: options.maxTokens || this.config.defaultMaxTokens,
          top_p: options.topP,
          stop_sequences: options.stopSequences
        });

        const latencyMs = Date.now() - startTime;

        // Validate response
        if (!response.content || response.content.length === 0) {
          throw new EmptyResponseError();
        }

        const textContent = response.content.find(
          block => block.type === 'text'
        );

        if (!textContent || !('text' in textContent)) {
          throw new EmptyResponseError();
        }

        return {
          content: textContent.text,
          provider: LLMProvider.CLAUDE,
          model: response.model,
          usage: {
            inputTokens: response.usage.input_tokens,
            outputTokens: response.usage.output_tokens,
            totalTokens: response.usage.input_tokens + response.usage.output_tokens,
            cachedTokens: (response.usage as { cache_creation_input_tokens?: number }).cache_creation_input_tokens
          },
          finishReason: response.stop_reason || 'end_turn',
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
        if (error instanceof Anthropic.RateLimitError) {
          const retryAfterMs = (error as unknown as { retryAfter?: number }).retryAfter
            ? ((error as unknown as { retryAfter?: number }).retryAfter || 0) * 1000
            : undefined;
          throw new RateLimitError(
            `Claude rate limit exceeded: ${error.message}`,
            { retryAfterMs, limitType: 'requests', originalError: error }
          );
        }

        // Check if retryable
        if (!isRetryableError(lastError) || attempt === this.config.maxRetries) {
          this.logger.error(`[ClaudeAdapter] Non-retryable error: ${lastError.message}`);
          throw lastError;
        }

        this.logger.warn(
          `[ClaudeAdapter] Attempt ${attempt} failed, retrying...`,
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
    messages: Anthropic.MessageParam[];
    system?: string;
    temperature?: number;
    max_tokens: number;
    top_p?: number;
    stop_sequences?: string[];
  }): Promise<Anthropic.Message> {
    const response = await this.client.messages.create({
      model: params.model,
      messages: params.messages,
      system: params.system,
      temperature: params.temperature,
      max_tokens: params.max_tokens,
      top_p: params.top_p,
      stop_sequences: params.stop_sequences
    });

    return response;
  }

  /**
   * Stream chat response from Claude
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

    this.logger.debug(`[ClaudeAdapter] stream request ${requestId}`);

    const messages: Anthropic.MessageParam[] = options.messages.map(msg => ({
      role: msg.role as 'user' | 'assistant',
      content: msg.content
    }));

    try {
      const stream = await this.client.messages.stream({
        model: this.config.defaultModel,
        messages,
        system: options.systemPrompt,
        temperature: options.temperature,
        max_tokens: options.maxTokens || this.config.defaultMaxTokens,
        top_p: options.topP
      });

      for await (const event of stream) {
        chunkCount++;

        if (event.type === 'message_delta') {
          yield {
            type: 'done',
            usage: totalUsage,
            content: undefined
          };
        }

        if (event.type === 'content_block_delta') {
          if (event.delta.type === 'text_delta') {
            totalUsage.outputTokens++;
            yield {
              type: 'content',
              content: event.delta.text,
              delta: event.delta.text
            };
          }
        }

        if (event.type === 'message_start') {
          totalUsage.inputTokens = event.message.usage.input_tokens;
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
    // Claude uses ~4 chars per token on average
    return Math.ceil(text.length / 4);
  }

  /**
   * Update API key at runtime
   */
  updateApiKey(apiKey: string): void {
    this.config.apiKey = apiKey;
    this.client = new Anthropic({
      apiKey: this.config.apiKey,
      baseURL: this.config.baseURL,
      timeout: this.config.timeout
    });
  }
}

// ============================================================================
// DEFAULT EXPORT
// ============================================================================

export function createClaudeAdapter(config: ClaudeAdapterConfig, logger?: Console): ClaudeAdapter {
  return new ClaudeAdapter(config, logger);
}
