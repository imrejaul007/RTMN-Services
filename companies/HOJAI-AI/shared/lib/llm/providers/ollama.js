/**
 * Ollama provider adapter (local Llama).
 *
 * Talks to a local Ollama instance via HTTP. Default: http://localhost:11434.
 * No API key, no cost. Best for dev / privacy-sensitive deployments.
 *
 * Set OLLAMA_BASE_URL to override.
 */

import { calculateCost } from '../cost.js';

export class OllamaProvider {
  static defaultModel = 'llama-3.3-8b';
  static envKey = () => 'local'; // no key needed

  constructor({ model, apiKey, baseUrl, timeoutMs = 60000 }) {
    this.model = model || OllamaProvider.defaultModel;
    this.baseUrl = baseUrl || process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
    this.timeoutMs = timeoutMs;
  }

  async complete(messages, options = {}) {
    const body = {
      model: this.model,
      messages,
      stream: false,
      options: {
        temperature: options.temperature ?? 0.7,
        num_predict: options.maxTokens ?? 1024,
      },
    };
    if (options.stopSequences) body.options.stop = options.stopSequences;
    if (options.format) body.format = options.format;

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const res = await fetch(`${this.baseUrl}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      if (!res.ok) {
        const errText = await res.text();
        throw new Error(`Ollama API ${res.status}: ${errText.slice(0, 500)}`);
      }

      const data = await res.json();
      const usage = {
        inputTokens: data.prompt_eval_count || 0,
        outputTokens: data.eval_count || 0,
      };
      const cost = calculateCost(this.model, usage.inputTokens, usage.outputTokens);

      return {
        text: data.message?.content || '',
        usage: {
          ...usage,
          totalTokens: usage.inputTokens + usage.outputTokens,
        },
        cost,
        model: this.model,
        finishReason: data.done ? 'stop' : 'length',
      };
    } finally {
      clearTimeout(timer);
    }
  }

  async *stream(messages, options = {}) {
    const body = {
      model: this.model,
      messages,
      stream: true,
      options: {
        temperature: options.temperature ?? 0.7,
        num_predict: options.maxTokens ?? 1024,
      },
    };

    const res = await fetch(`${this.baseUrl}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!res.ok || !res.body) {
      throw new Error(`Ollama stream failed: ${res.status}`);
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      // Ollama streams newline-delimited JSON
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (!line.trim()) continue;
        try {
          const chunk = JSON.parse(line);
          if (chunk.message?.content) {
            yield { type: 'content', text: chunk.message.content };
          }
          if (chunk.done) {
            const usage = {
              inputTokens: chunk.prompt_eval_count || 0,
              outputTokens: chunk.eval_count || 0,
            };
            yield {
              type: 'done',
              metadata: {
                usage: { ...usage, totalTokens: usage.inputTokens + usage.outputTokens },
                cost: calculateCost(this.model, usage.inputTokens, usage.outputTokens),
                model: this.model,
              },
            };
          }
        } catch {
          // skip malformed chunk
        }
      }
    }
  }

  async health() {
    try {
      const res = await fetch(`${this.baseUrl}/api/tags`, { signal: AbortSignal.timeout(2000) });
      return res.ok;
    } catch {
      return false;
    }
  }
}