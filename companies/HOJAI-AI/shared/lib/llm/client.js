/**
 * LLM Client — provider-agnostic interface.
 *
 * The single entry point for calling any LLM. Wraps the provider-specific
 * adapters and normalizes responses so call sites don't care which provider
 * they're using.
 *
 * Usage:
 *   const llm = createLLMClient({ provider: 'anthropic', model: 'claude-haiku-4-5-20251001', apiKey: '...' });
 *   const { text, usage, cost, latencyMs, model } = await llm.complete({ messages: [...] });
 */

import { AnthropicProvider } from './providers/anthropic.js';
import { OpenAIProvider } from './providers/openai.js';
import { GoogleProvider } from './providers/google.js';
import { OllamaProvider } from './providers/ollama.js';

const PROVIDERS = {
  anthropic: AnthropicProvider,
  openai: OpenAIProvider,
  google: GoogleProvider,
  ollama: OllamaProvider,
};

export function createLLMClient(opts = {}) {
  const {
    provider = process.env.LLM_PROVIDER || 'anthropic',
    model,
    apiKey,
    baseUrl,
    timeoutMs = 30000,
    maxRetries = 2,
    ...rest
  } = opts;

  const ProviderClass = PROVIDERS[provider];
  if (!ProviderClass) {
    throw new Error(
      `Unknown LLM provider "${provider}". Supported: ${Object.keys(PROVIDERS).join(', ')}`
    );
  }

  const adapter = new ProviderClass({
    model: model || ProviderClass.defaultModel,
    apiKey: apiKey || ProviderClass.envKey(),
    baseUrl,
    timeoutMs,
    ...rest,
  });

  return {
    provider,
    model: adapter.model,

    /**
     * Complete a conversation. Returns normalized { text, usage, cost, latencyMs, model }.
     *
     * messages: [{ role: 'system'|'user'|'assistant', content: '...' }, ...]
     * options:
     *   - temperature (default 0.7)
     *   - maxTokens (default 1024)
     *   - stopSequences
     *   - tools (for function calling; provider-specific)
     *   - systemPrompt (alternative to passing a system message)
     */
    async complete({ messages, ...options } = {}) {
      if (!Array.isArray(messages) || messages.length === 0) {
        throw new Error('messages must be a non-empty array');
      }

      const start = Date.now();
      const result = await adapter.complete(messages, options);
      const latencyMs = Date.now() - start;

      return {
        text: result.text,
        usage: result.usage,        // { inputTokens, outputTokens, totalTokens }
        cost: result.cost,          // { inputUsd, outputUsd, totalUsd }
        latencyMs,
        model: result.model,
        provider,
        finishReason: result.finishReason,
      };
    },

    /**
     * Stream a completion. Yields text chunks.
     * Returns the same final metadata as complete().
     */
    async *stream({ messages, ...options } = {}) {
      const start = Date.now();
      let finalMetadata = null;

      for await (const chunk of adapter.stream(messages, options)) {
        if (chunk.type === 'content') {
          yield { type: 'content', text: chunk.text };
        } else if (chunk.type === 'done') {
          finalMetadata = chunk.metadata;
        }
      }

      return {
        usage: finalMetadata?.usage,
        cost: finalMetadata?.cost,
        latencyMs: Date.now() - start,
        model: finalMetadata?.model,
        provider,
      };
    },

    /**
     * Health check — returns true if the provider can be reached.
     * For cloud providers: lightweight API call (or just key check).
     * For ollama: GET /api/tags.
     */
    async health() {
      return adapter.health();
    },
  };
}