/**
 * Mock LLM Provider for Testing
 *
 * Provides a comprehensive mock implementation of the LLM provider interface
 * for use in unit tests without making actual API calls.
 *
 * @example
 * ```typescript
 * import { createMockLLMProvider, createMockWithErrors } from './mocks/llmProvider';
 *
 * describe('My LLM Tests', () => {
 *   it('should handle chat responses', async () => {
 *     const provider = createMockLLMProvider();
 *     const response = await provider.chat([{ role: 'user', content: 'Hello' }]);
 *     expect(response.content).toBe('Mock response from LLM');
 *   });
 * });
 * ```
 */

import { vi, SpyInstance } from 'vitest';
import type {
  ChatMessage,
  LLMResponse,
  LLMProvider as LLMProviderType,
  TokenUsage,
  StreamingChunk,
  MessageRole,
  LLMProvider,
} from '../../packages/hojai-llm/src/types/index.js';

// ============================================================================
// TYPES
// ============================================================================

/**
 * Configuration options for mock LLM provider
 */
export interface MockLLMProviderConfig {
  /** Default response content */
  responseContent?: string;
  /** Default token usage */
  tokenUsage?: Partial<TokenUsage>;
  /** Default model name */
  model?: string;
  /** Simulate errors */
  shouldThrow?: boolean;
  /** Error to throw */
  errorToThrow?: Error;
  /** Response delay in ms */
  delayMs?: number;
  /** Custom chat implementation */
  customChat?: (messages: ChatMessage[]) => Promise<LLMResponse>;
  /** Custom embed implementation */
  customEmbed?: (text: string) => Promise<number[]>;
  /** Custom classify implementation */
  customClassify?: (text: string) => Promise<string>;
}

/**
 * Mock LLM provider instance
 */
export interface MockLLMProvider extends LLMProviderType {
  /** Spy on chat calls */
  chatSpy: SpyInstance;
  /** Spy on embed calls */
  embedSpy: SpyInstance;
  /** Spy on classify calls */
  classifySpy: SpyInstance;
  /** Reset all mocks */
  reset: () => void;
  /** Set new response */
  setResponse: (content: string) => void;
  /** Get call count */
  getCallCount: () => { chat: number; embed: number; classify: number };
}

// ============================================================================
// DEFAULT VALUES
// ============================================================================

const DEFAULT_RESPONSE = 'Mock response from LLM';
const DEFAULT_MODEL = 'mock-gpt-4';
const DEFAULT_TOKEN_USAGE: TokenUsage = {
  inputTokens: 100,
  outputTokens: 50,
  totalTokens: 150,
  cachedTokens: 0,
};

// ============================================================================
// FACTORY FUNCTIONS
// ============================================================================

/**
 * Create a mock LLM provider with configurable responses
 */
export function createMockLLMProvider(config: MockLLMProviderConfig = {}): MockLLMProvider {
  const {
    responseContent = DEFAULT_RESPONSE,
    tokenUsage = {},
    model = DEFAULT_MODEL,
    shouldThrow = false,
    errorToThrow = new Error('Mock LLM error'),
    delayMs = 0,
    customChat,
    customEmbed,
    customClassify,
  } = config;

  // Track call counts
  let callCounts = { chat: 0, embed: 0, classify: 0 };

  // Create spies
  const chatSpy = vi.fn();
  const embedSpy = vi.fn();
  const classifySpy = vi.fn();

  // Default chat implementation
  const defaultChat = async (messages: ChatMessage[]): Promise<LLMResponse> => {
    chatSpy(messages);

    if (shouldThrow) {
      throw errorToThrow;
    }

    // Simulate delay if configured
    if (delayMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }

    return {
      content: responseContent,
      provider: LLMProvider.OPENAI,
      model,
      usage: { ...DEFAULT_TOKEN_USAGE, ...tokenUsage },
      finishReason: 'stop',
      requestId: `mock-request-${Date.now()}`,
      latencyMs: delayMs,
      metadata: {
        messagesCount: messages.length,
        mock: true,
      },
    };
  };

  // Default embed implementation
  const defaultEmbed = async (text: string): Promise<number[]> => {
    embedSpy(text);

    if (shouldThrow) {
      throw errorToThrow;
    }

    // Return a 1536-dimensional embedding vector (OpenAI's standard)
    const embedding = new Array(1536).fill(0).map(() => Math.random() * 2 - 1);
    // Normalize the embedding
    const norm = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0));
    return embedding.map((val) => val / norm);
  };

  // Default classify implementation
  const defaultClassify = async (text: string): Promise<string> => {
    classifySpy(text);

    if (shouldThrow) {
      throw errorToThrow;
    }

    // Simple mock classification based on keywords
    const lowerText = text.toLowerCase();
    if (lowerText.includes('positive') || lowerText.includes('good') || lowerText.includes('great')) {
      return 'positive';
    }
    if (lowerText.includes('negative') || lowerText.includes('bad') || lowerText.includes('terrible')) {
      return 'negative';
    }
    return 'neutral';
  };

  const provider = {
    chat: customChat || defaultChat,
    embed: customEmbed || defaultEmbed,
    classify: customClassify || defaultClassify,

    get chatSpy() { return chatSpy; },
    get embedSpy() { return embedSpy; },
    get classifySpy() { return classifySpy; },

    reset() {
      chatSpy.mockReset();
      embedSpy.mockReset();
      classifySpy.mockReset();
      callCounts = { chat: 0, embed: 0, classify: 0 };
    },

    setResponse(content: string) {
      // This requires recreating the provider with new config
      // For simplicity, we'll just track the change
      Object.defineProperty(provider, 'chat', {
        value: async (messages: ChatMessage[]) => {
          chatSpy(messages);
          return {
            content,
            provider: LLMProvider.OPENAI,
            model,
            usage: { ...DEFAULT_TOKEN_USAGE, ...tokenUsage },
            finishReason: 'stop',
            requestId: `mock-request-${Date.now()}`,
            latencyMs: 0,
            metadata: { messagesCount: messages.length, mock: true },
          };
        },
      });
    },

    getCallCount() {
      return {
        chat: chatSpy.mock.calls.length,
        embed: embedSpy.mock.calls.length,
        classify: classifySpy.mock.calls.length,
      };
    },
  };

  return provider as MockLLMProvider;
}

/**
 * Create a mock that simulates errors
 */
export function createMockWithErrors(
  errors: Array<{ count: number; error: Error }>,
  successContent = 'Success after errors'
): MockLLMProvider {
  let callCount = 0;

  return createMockLLMProvider({
    customChat: async () => {
      callCount++;
      for (const { count, error } of errors) {
        if (callCount === count) {
          throw error;
        }
      }
      return {
        content: successContent,
        provider: LLMProvider.OPENAI,
        model: DEFAULT_MODEL,
        usage: DEFAULT_TOKEN_USAGE,
        finishReason: 'stop',
        requestId: `mock-request-${Date.now()}`,
        latencyMs: 0,
        metadata: { mock: true },
      };
    },
  });
}

/**
 * Create a mock that simulates rate limiting
 */
export function createMockRateLimited(): MockLLMProvider {
  let attempts = 0;
  const maxRetries = 2;

  return createMockLLMProvider({
    customChat: async () => {
      attempts++;
      if (attempts <= maxRetries) {
        const error = new Error('Rate limit exceeded');
        (error as Error & { status?: number }).status = 429;
        throw error;
      }
      return {
        content: 'Success after rate limit retries',
        provider: LLMProvider.OPENAI,
        model: DEFAULT_MODEL,
        usage: DEFAULT_TOKEN_USAGE,
        finishReason: 'stop',
        requestId: `mock-request-${Date.now()}`,
        latencyMs: 0,
        metadata: { mock: true },
      };
    },
  });
}

/**
 * Create a streaming mock LLM provider
 */
export function createMockStreamingProvider(
  chunks: string[] = ['Mock ', 'stream ', 'response']
): MockLLMProvider {
  return createMockLLMProvider({
    customChat: async () => {
      return {
        content: chunks.join(''),
        provider: LLMProvider.OPENAI,
        model: DEFAULT_MODEL,
        usage: DEFAULT_TOKEN_USAGE,
        finishReason: 'stop',
        requestId: `mock-request-${Date.now()}`,
        latencyMs: 0,
        metadata: { mock: true, streaming: true, chunks },
      };
    },
  });
}

/**
 * Create a mock that returns specific embeddings for testing
 */
export function createMockEmbeddingProvider(
  embeddings: Map<string, number[]>
): MockLLMProvider {
  return createMockLLMProvider({
    customEmbed: async (text: string) => {
      const embedding = embeddings.get(text);
      if (embedding) {
        return embedding;
      }
      // Return a default embedding
      return new Array(1536).fill(0).map(() => 0.1);
    },
  });
}

/**
 * Create a mock with realistic conversation context
 */
export function createMockConversationalProvider(): MockLLMProvider {
  const responses: string[] = [
    "Hello! I'm here to help you with your questions.",
    "That's a great question. Let me explain...",
    "Based on what you've shared, I would recommend...",
    "Is there anything else you'd like to know?",
  ];

  let messageIndex = 0;

  return createMockLLMProvider({
    customChat: async (messages: ChatMessage[]) => {
      const lastMessage = messages[messages.length - 1];
      let response = responses[Math.min(messageIndex, responses.length - 1)];

      // Add context awareness
      if (lastMessage.content.toLowerCase().includes('hello')) {
        response = responses[0];
        messageIndex = 0;
      } else if (lastMessage.content.toLowerCase().includes('explain')) {
        response = responses[1];
        messageIndex = 1;
      } else if (lastMessage.content.toLowerCase().includes('recommend')) {
        response = responses[2];
        messageIndex = 2;
      } else if (lastMessage.content.toLowerCase().includes('bye')) {
        response = responses[3];
        messageIndex = 3;
      } else {
        messageIndex = (messageIndex + 1) % responses.length;
      }

      return {
        content: response,
        provider: LLMProvider.OPENAI,
        model: DEFAULT_MODEL,
        usage: {
          ...DEFAULT_TOKEN_USAGE,
          inputTokens: lastMessage.content.length,
        },
        finishReason: 'stop',
        requestId: `mock-request-${Date.now()}`,
        latencyMs: 0,
        metadata: { mock: true, messageIndex },
      };
    },
  });
}

// ============================================================================
// STREAMING HELPERS
// ============================================================================

/**
 * Create a mock streaming response generator
 */
export async function* createMockStreamingResponse(
  text: string,
  chunkSize = 10
): AsyncGenerator<StreamingChunk, void, unknown> {
  for (let i = 0; i < text.length; i += chunkSize) {
    const delta = text.slice(i, i + chunkSize);
    yield {
      type: 'content',
      delta,
      content: delta,
    };
  }

  yield {
    type: 'done',
    usage: DEFAULT_TOKEN_USAGE,
  };
}

/**
 * Collect streaming chunks into a single response
 */
export async function collectStreamingResponse(
  stream: AsyncGenerator<StreamingChunk, void, unknown>
): Promise<string> {
  const chunks: string[] = [];
  for await (const chunk of stream) {
    if (chunk.delta) {
      chunks.push(chunk.delta);
    }
  }
  return chunks.join('');
}

// ============================================================================
// ASSERTION HELPERS
// ============================================================================

/**
 * Assert that the provider was called with specific messages
 */
export function assertChatCalledWith(
  spy: SpyInstance,
  expectedContent: string,
  role: MessageRole = MessageRole.USER
): void {
  expect(spy).toHaveBeenCalled();
  const calls = spy.mock.calls;
  const lastCall = calls[calls.length - 1] as [ChatMessage[]];
  const messages = lastCall[0];
  const lastMessage = messages[messages.length - 1];
  expect(lastMessage.role).toBe(role);
  expect(lastMessage.content).toBe(expectedContent);
}

/**
 * Assert that the provider was called exactly N times
 */
export function assertCallCount(spy: SpyInstance, expectedCount: number): void {
  expect(spy).toHaveBeenCalledTimes(expectedCount);
}

/**
 * Assert valid embedding dimensions
 */
export function assertValidEmbedding(embedding: number[], dimensions = 1536): void {
  expect(embedding).toHaveLength(dimensions);
  // Check if normalized (magnitude ≈ 1)
  const magnitude = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0));
  expect(magnitude).toBeCloseTo(1, 1);
}

/**
 * Assert valid LLM response structure
 */
export function assertValidLLMResponse(response: LLMResponse): void {
  expect(response).toHaveProperty('content');
  expect(typeof response.content).toBe('string');
  expect(response).toHaveProperty('provider');
  expect(response).toHaveProperty('model');
  expect(response).toHaveProperty('usage');
  expect(response.usage).toHaveProperty('inputTokens');
  expect(response.usage).toHaveProperty('outputTokens');
  expect(response.usage).toHaveProperty('totalTokens');
  expect(response).toHaveProperty('finishReason');
  expect(response).toHaveProperty('requestId');
}

// ============================================================================
// EXPORTS
// ============================================================================

export default {
  createMockLLMProvider,
  createMockWithErrors,
  createMockRateLimited,
  createMockStreamingProvider,
  createMockEmbeddingProvider,
  createMockConversationalProvider,
  createMockStreamingResponse,
  collectStreamingResponse,
  assertChatCalledWith,
  assertCallCount,
  assertValidEmbedding,
  assertValidLLMResponse,
};
