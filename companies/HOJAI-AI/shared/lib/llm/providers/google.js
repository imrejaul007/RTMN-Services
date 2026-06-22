/**
 * Google Gemini provider adapter.
 *
 * Uses the generateContent REST API. Set GOOGLE_API_KEY in env.
 */

import { calculateCost } from '../cost.js';

export class GoogleProvider {
  static defaultModel = 'gemini-3-flash';
  static envKey = () => process.env.GOOGLE_API_KEY;

  constructor({ model, apiKey, baseUrl, timeoutMs = 30000 }) {
    this.model = model || GoogleProvider.defaultModel;
    this.apiKey = apiKey;
    this.baseUrl = baseUrl || 'https://generativelanguage.googleapis.com';
    this.timeoutMs = timeoutMs;
  }

  async complete(messages, options = {}) {
    if (!this.apiKey) throw new Error('GoogleProvider: GOOGLE_API_KEY not set');

    // Convert messages to Gemini format
    // Gemini uses 'user' and 'model' roles (not 'assistant'); system messages
    // are passed via systemInstruction.
    const systemInstruction = messages.find(m => m.role === 'system');
    const contents = messages
      .filter(m => m.role !== 'system')
      .map(m => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }],
      }));

    const body = {
      contents,
      generationConfig: {
        maxOutputTokens: options.maxTokens ?? 1024,
        temperature: options.temperature ?? 0.7,
      },
    };

    if (systemInstruction) {
      body.systemInstruction = { parts: [{ text: systemInstruction.content }] };
    }
    if (options.responseSchema) {
      body.generationConfig.responseSchema = options.responseSchema;
      body.generationConfig.responseMimeType = options.responseMimeType || 'application/json';
    }
    if (options.tools) {
      body.tools = options.tools.map(t => ({
        functionDeclarations: [{
          name: t.name,
          description: t.description,
          parameters: t.input_schema || t.parameters,
        }],
      }));
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const url = `${this.baseUrl}/v1beta/models/${this.model}:generateContent?key=${this.apiKey}`;
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      if (!res.ok) {
        const errText = await res.text();
        throw new Error(`Google API ${res.status}: ${errText.slice(0, 500)}`);
      }

      const data = await res.json();
      const candidate = data.candidates?.[0];
      const usage = data.usageMetadata || { promptTokenCount: 0, candidatesTokenCount: 0 };
      const cost = calculateCost(this.model, usage.promptTokenCount, usage.candidatesTokenCount);

      let text = '';
      for (const part of candidate?.content?.parts || []) {
        if (part.text) text += part.text;
      }

      return {
        text,
        usage: {
          inputTokens: usage.promptTokenCount,
          outputTokens: usage.candidatesTokenCount,
          totalTokens: usage.totalTokenCount || (usage.promptTokenCount + usage.candidatesTokenCount),
        },
        cost,
        model: this.model,
        finishReason: candidate?.finishReason,
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