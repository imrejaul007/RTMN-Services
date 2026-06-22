/**
 * LLM Instrumentation for OpenTelemetry
 *
 * Provides specialized spans for tracking LLM calls with provider-specific
 * attributes and metrics.
 *
 * @module hojai-tracing/instrumentations/llm
 */

import {
  Span,
  SpanKind,
  SpanStatusCode,
  context,
  trace,
  Tracer,
} from '@opentelemetry/api';

/**
 * Supported LLM providers
 */
export type LLMProvider = 'openai' | 'anthropic' | 'google' | 'mistral' | 'ollama' | 'custom';

/**
 * LLM operation types
 */
export type LLMOperation = 'chat' | 'completion' | 'embedding' | 'moderation' | 'image';

/**
 * Standard LLM span attributes
 */
export interface LLMCallAttributes {
  /** The model identifier */
  'llm.model': string;
  /** The provider name */
  'llm.provider': LLMProvider;
  /** The operation type */
  'llm.operation': LLMOperation;
  /** Number of input tokens */
  'llm.input_tokens': number;
  /** Number of output tokens */
  'llm.output_tokens'?: number;
  /** Total tokens used */
  'llm.total_tokens'?: number;
  /** Latency in milliseconds */
  'llm.latency_ms'?: number;
  /** Estimated cost in USD */
  'llm.cost_usd'?: number;
  /** Reason for completion */
  'llm.finish_reason'?: string;
  /** Streaming response */
  'llm.streaming'?: boolean;
  /** API endpoint called */
  'llm.endpoint'?: string;
  /** API version used */
  'llm.api_version'?: string;
  /** Request ID from provider */
  'llm.request_id'?: string;
}

/**
 * LLM call configuration
 */
export interface LLMCallConfig {
  model: string;
  provider: LLMProvider;
  operation: LLMOperation;
  streaming?: boolean;
  endpoint?: string;
  apiVersion?: string;
  systemPrompt?: string;
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  stopSequences?: string[];
}

/**
 * LLM call result
 */
export interface LLMCallResult {
  content: string;
  usage?: {
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
  };
  finishReason?: string;
  requestId?: string;
  model?: string;
  provider?: string;
}

/**
 * Message types for chat completions
 */
export interface LLMMessage {
  role: 'system' | 'user' | 'assistant' | 'function';
  content: string;
  name?: string;
  functionCall?: {
    name: string;
    arguments: string;
  };
}

/**
 * LLM Instrumentation class
 *
 * Provides methods for creating and managing LLM spans with proper attributes
 * and error handling.
 *
 * @example
 * ```typescript
 * import { LLMInstrumentation } from './llm';
 *
 * const llmInstrument = new LLMInstrumentation('hojai');
 *
 * const span = llmInstrument.startLLMSpan({
 *   model: 'gpt-4',
 *   provider: 'openai',
 *   operation: 'chat',
 * });
 *
 * try {
 *   const result = await callLLM(messages);
 *   llmInstrument.endLLMSpan(span, { content: result });
 * } catch (error) {
 *   llmInstrument.recordError(span, error);
 * }
 * ```
 */
export class LLMInstrumentation {
  private tracer: Tracer;

  /**
   * Create a new LLM instrumentation instance
   *
   * @param serviceName - Name of the service using LLM
   * @param version - Version of the service
   */
  constructor(serviceName: string = 'hojai', version: string = '1.0.0') {
    this.tracer = trace.getTracer(serviceName, version);
  }

  /**
   * Get the tracer instance
   */
  getTracer(): Tracer {
    return this.tracer;
  }

  /**
   * Start a new LLM span
   */
  startLLMSpan(config: LLMCallConfig, parentSpan?: Span): Span {
    const attributes: Partial<LLMCallAttributes> = {
      'llm.model': config.model,
      'llm.provider': config.provider,
      'llm.operation': config.operation,
      'llm.streaming': config.streaming ?? false,
      'llm.endpoint': config.endpoint,
      'llm.input_tokens': 0,
    };

    if (config.apiVersion) {
      attributes['llm.api_version'] = config.apiVersion;
    }

    const span = this.tracer.startSpan(
      `llm.${config.operation}`,
      {
        kind: SpanKind.CLIENT,
        attributes,
        parent: parentSpan ? trace.setSpan(context.active(), parentSpan) : undefined,
      }
    );

    // Add generation config as span events
    if (config.temperature !== undefined) {
      span.addEvent('llm.generation_config', {
        temperature: config.temperature,
        max_tokens: config.maxTokens,
        top_p: config.topP,
        stop_sequences: config.stopSequences,
      });
    }

    if (config.systemPrompt) {
      // Truncate system prompt for logging
      const truncatedPrompt = config.systemPrompt.slice(0, 500);
      span.addEvent('llm.system_prompt', {
        'system_prompt.length': config.systemPrompt.length,
        'system_prompt.preview': truncatedPrompt,
      });
    }

    return span;
  }

  /**
   * End an LLM span with result data
   */
  endLLMSpan(
    span: Span,
    result: LLMCallResult,
    startTime?: number
  ): void {
    const latencyMs = startTime ? Date.now() - startTime : undefined;

    span.setAttributes({
      'llm.output_tokens': result.usage?.outputTokens ?? 0,
      'llm.total_tokens': result.usage?.totalTokens ?? 0,
      'llm.finish_reason': result.finishReason ?? 'stop',
      'llm.request_id': result.requestId ?? '',
      'llm.latency_ms': latencyMs ?? 0,
    });

    // Add response preview event (truncated)
    const responsePreview = result.content.slice(0, 200);
    span.addEvent('llm.response', {
      'response.length': result.content.length,
      'response.preview': responsePreview,
    });

    span.setStatus({ code: SpanStatusCode.OK });
    span.end();
  }

  /**
   * Record an error on an LLM span
   */
  recordError(span: Span, error: Error): void {
    span.setStatus({
      code: SpanStatusCode.ERROR,
      message: error.message,
    });
    span.recordException(error);
    span.end();
  }

  /**
   * Execute an LLM call within a traced span
   *
   * @example
   * ```typescript
   * const result = await llmInstrument.traceLLMCall(
   *   {
   *     model: 'gpt-4',
   *     provider: 'openai',
   *     operation: 'chat',
   *   },
   *   async (messages) => {
   *     return openai.chat.completions.create({
   *       model: 'gpt-4',
   *       messages,
   *     });
   *   }
   * );
   * ```
   */
  async traceLLMCall<T extends LLMCallResult>(
    config: LLMCallConfig,
    fn: (messages: LLMMessage[]) => Promise<T>,
    messages?: LLMMessage[],
    parentSpan?: Span
  ): Promise<T> {
    const span = this.startLLMSpan(config, parentSpan);
    const startTime = Date.now();

    // Record input tokens estimate
    if (messages) {
      const inputTokens = this.estimateTokens(messages);
      span.setAttribute('llm.input_tokens', inputTokens);
    }

    try {
      const result = await context.with(
        trace.setSpan(context.active(), span),
        () => fn(messages || [])
      );

      this.endLLMSpan(span, result, startTime);
      return result;
    } catch (error) {
      if (error instanceof Error) {
        this.recordError(span, error);
      } else {
        span.setStatus({ code: SpanStatusCode.ERROR, message: 'Unknown error' });
        span.end();
      }
      throw error;
    }
  }

  /**
   * Estimate token count for messages
   *
   * Uses a simple heuristic: ~4 chars per token for English text.
   * For more accurate counting, integrate with tiktoken or similar.
   */
  private estimateTokens(messages: LLMMessage[]): number {
    return messages.reduce((total, msg) => {
      // Rough estimate: 1 token ≈ 4 characters for English
      const charCount = msg.content.length + (msg.name?.length ?? 0);
      return total + Math.ceil(charCount / 4);
    }, 0);
  }

  /**
   * Add tool call information to a span
   */
  addToolCall(
    span: Span,
    toolCall: {
      name: string;
      arguments: Record<string, unknown>;
      result?: string;
      durationMs?: number;
    }
  ): void {
    span.addEvent('llm.tool_call', {
      'tool.name': toolCall.name,
      'tool.arguments': JSON.stringify(toolCall.arguments).slice(0, 500),
      'tool.result_length': toolCall.result?.length ?? 0,
      'tool.duration_ms': toolCall.durationMs ?? 0,
    });
  }

  /**
   * Add streaming chunk to a span
   */
  addStreamingChunk(span: Span, chunk: string, chunkIndex: number): void {
    span.addEvent('llm.streaming_chunk', {
      'chunk.index': chunkIndex,
      'chunk.length': chunk.length,
      'chunk.preview': chunk.slice(0, 50),
    });
  }

  /**
   * Create a span for multi-step LLM interactions
   */
  createConversationSpan(
    conversationId: string,
    messageCount: number,
    parentSpan?: Span
  ): Span {
    return this.tracer.startSpan('llm.conversation', {
      kind: SpanKind.INTERNAL,
      attributes: {
        'llm.conversation.id': conversationId,
        'llm.conversation.message_count': messageCount,
      },
      parent: parentSpan ? trace.setSpan(context.active(), parentSpan) : undefined,
    });
  }

  /**
   * Add citation/grounding information to a span
   */
  addGroundingInfo(
    span: Span,
    info: {
      sourcesRetrieved?: number;
      contextMatches?: number;
      groundingScore?: number;
    }
  ): void {
    span.addEvent('llm.grounding', {
      'grounding.sources_retrieved': info.sourcesRetrieved ?? 0,
      'grounding.context_matches': info.contextMatches ?? 0,
      'grounding.score': info.groundingScore ?? 0,
    });
  }
}

/**
 * Provider-specific configuration
 */
export interface ProviderConfig {
  /** OpenAI configuration */
  openai?: {
    organization?: string;
    apiVersion?: string;
    baseURL?: string;
  };
  /** Anthropic configuration */
  anthropic?: {
    apiVersion?: string;
    baseURL?: string;
  };
  /** Google/Vertex configuration */
  google?: {
    project?: string;
    location?: string;
    apiVersion?: string;
  };
}

/**
 * Parse provider from model name
 */
export function inferProvider(model: string): LLMProvider {
  const modelLower = model.toLowerCase();

  if (modelLower.includes('gpt') || modelLower.includes('openai')) {
    return 'openai';
  }
  if (modelLower.includes('claude') || modelLower.includes('anthropic')) {
    return 'anthropic';
  }
  if (modelLower.includes('gemini') || modelLower.includes('google')) {
    return 'google';
  }
  if (modelLower.includes('mistral')) {
    return 'mistral';
  }
  if (modelLower.includes('ollama') || modelLower.includes('llama')) {
    return 'ollama';
  }

  return 'custom';
}

/**
 * Get standard endpoint for a provider
 */
export function getProviderEndpoint(provider: LLMProvider): string {
  switch (provider) {
    case 'openai':
      return 'https://api.openai.com/v1';
    case 'anthropic':
      return 'https://api.anthropic.com/v1';
    case 'google':
      return 'https://generativelanguage.googleapis.com/v1beta';
    case 'mistral':
      return 'https://api.mistral.ai/v1';
    case 'ollama':
      return process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
    default:
      return '';
  }
}

/**
 * Create a traced LLM provider wrapper
 */
export function createTracedLLMProvider<T>(
  provider: {
    chat: (messages: LLMMessage[]) => Promise<LLMCallResult>;
  },
  config: LLMCallConfig
): {
  chat: (messages: LLMMessage[]) => Promise<LLMCallResult>;
} {
  const instrumentation = new LLMInstrumentation();

  return {
    chat: (messages: LLMMessage[]) => {
      return instrumentation.traceLLMCall(config, () => provider.chat(messages), messages);
    },
  };
}

/**
 * Default LLM instrumentation instance
 */
export const defaultLLMInstrumentation = new LLMInstrumentation();

export default LLMInstrumentation;
