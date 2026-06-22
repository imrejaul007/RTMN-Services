/**
 * OpenAI provider adapter.
 *
 * Uses the Chat Completions API directly. Set OPENAI_API_KEY in env.
 */

import { calculateCost } from '../cost.js';

export class OpenAIProvider {
  static defaultModel = 'gpt-5-mini';
  static envKey = () => process.env.OPENAI_API_KEY;

  constructor({ model, apiKey, baseUrl, timeoutMs = 30000 }) {
    this.model = model || OpenAIProvider.defaultModel;
    this.apiKey = apiKey;
    this.baseUrl = baseUrl || 'https://api.openai.com';
    this.timeoutMs = timeoutMs;
  }

  async complete(messages, options = {}) {
    if (!this.apiKey) throw new Error('OpenAIProvider: OPENAI_API_KEY not set');

    const body = {
      model: this.model,
      messages,
      max_tokens: options.maxTokens ?? 1024,
      temperature: options.temperature ?? 0.7,
    };

    if (options.stopSequences) body.stop = options.stopSequences;
    if (options.response_format) body.response_format = options.response_format;
    if (options.tools) body.tools = options.tools;

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const res = await fetch(`${this.baseUrl}/v1/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      if (!res.ok) {
        const errText = await res.text();
        throw new Error(`OpenAI API ${res.status}: ${errText.slice(0, 500)}`);
      }

      const data = await res.json();
      const choice = data.choices?.[0];
      const usage = data.usage || { prompt_tokens: 0, completion_tokens: 0 };
      const cost = calculateCost(this.model, usage.prompt_tokens, usage.completion_tokens);

      return {
        text: choice?.message?.content || '',
        usage: {
          inputTokens: usage.prompt_tokens,
          outputTokens: usage.completion_tokens,
          totalTokens: usage.total_tokens || (usage.prompt_tokens + usage.completion_tokens),
        },
        cost,
        model: data.model || this.model,
        finishReason: choice?.finish_reason,
      };
    } finally {
      clearTimeout(timer);
    }
  }

  async *stream(messages, options = {}) {
    const result = await this.complete(messages, options);
    const chunks = result.text.match(/.{1,40}/g) || [result.text];
    for (const c of chunks) yield { type: 'content', text: c };
    yield { type: 'done', metadata: result };
  }

  async health() {
    return Boolean(this.apiKey);
  }
}