/**
 * Anthropic Claude provider adapter.
 *
 * Uses the Messages API directly (no SDK dep — keeps the shared lib dependency-light).
 * Endpoint: https://api.anthropic.com/v1/messages
 *
 * Set ANTHROPIC_API_KEY in env.
 */

import { calculateCost } from '../cost.js';

export class AnthropicProvider {
  static defaultModel = 'claude-haiku-4-5-20251001';
  static envKey = () => process.env.ANTHROPIC_API_KEY;

  constructor({ model, apiKey, baseUrl, timeoutMs = 30000 }) {
    this.model = model || AnthropicProvider.defaultModel;
    this.apiKey = apiKey;
    this.baseUrl = baseUrl || 'https://api.anthropic.com';
    this.timeoutMs = timeoutMs;
  }

  async complete(messages, options = {}) {
    if (!this.apiKey) throw new Error('AnthropicProvider: ANTHROPIC_API_KEY not set');

    // Separate system message from the rest (Anthropic API convention)
    const systemMsg = messages.find(m => m.role === 'system');
    const convoMessages = messages.filter(m => m.role !== 'system');

    const body = {
      model: this.model,
      max_tokens: options.maxTokens ?? 1024,
      temperature: options.temperature ?? 0.7,
      messages: convoMessages.map(m => ({
        role: m.role,
        content: m.content,
      })),
    };

    if (systemMsg) body.system = systemMsg.content;
    if (options.stopSequences) body.stop_sequences = options.stopSequences;
    if (options.tools) body.tools = options.tools.map(t => ({
      name: t.name,
      description: t.description,
      input_schema: t.input_schema || t.parameters,
    }));
    if (options.tool_choice) body.tool_choice = options.tool_choice;

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const res = await fetch(`${this.baseUrl}/v1/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      if (!res.ok) {
        const errText = await res.text();
        throw new Error(`Anthropic API ${res.status}: ${errText.slice(0, 500)}`);
      }

      const data = await res.json();
      const usage = data.usage || { input_tokens: 0, output_tokens: 0 };
      const cost = calculateCost(this.model, usage.input_tokens, usage.output_tokens);

      // Extract text from content blocks
      let text = '';
      for (const block of data.content || []) {
        if (block.type === 'text') text += block.text;
      }

      return {
        text,
        usage: {
          inputTokens: usage.input_tokens,
          outputTokens: usage.output_tokens,
          totalTokens: usage.input_tokens + usage.output_tokens,
        },
        cost,
        model: data.model || this.model,
        finishReason: data.stop_reason,
      };
    } finally {
      clearTimeout(timer);
    }
  }

  async *stream(messages, options = {}) {
    // Anthropic SSE streaming. For brevity, we accumulate and yield in chunks.
    // In production, parse SSE events properly.
    const result = await this.complete(messages, options);
    const chunks = result.text.match(/.{1,40}/g) || [result.text];
    for (const c of chunks) yield { type: 'content', text: c };
    yield { type: 'done', metadata: result };
  }

  async health() {
    return Boolean(this.apiKey);
  }
}