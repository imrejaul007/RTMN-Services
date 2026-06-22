/**
 * @rtmn/shared/lib/llm — LLM Provider Abstraction Layer
 *
 * Provides a unified interface for calling any LLM (Claude, OpenAI, Google,
 * local Llama). Lets you:
 *
 *   - Swap providers without touching call sites
 *   - Use structured output (JSON schema) for intent extraction
 *   - Use tools / function calling for agent workflows
 *   - Stream responses
 *   - Track cost + latency per call
 *
 * Design principle: **the LLM is a replaceable component, not the architecture.**
 * This module makes that principle enforceable in code.
 *
 * Usage:
 *
 *   import { createLLMClient, withStructuredOutput } from '@rtmn/shared/lib/llm';
 *
 *   // Pick provider via env (default: anthropic)
 *   const llm = createLLMClient({
 *     provider: process.env.LLM_PROVIDER || 'anthropic',
 *     model: process.env.LLM_MODEL || 'claude-haiku-4-5-20251001',
 *     apiKey: process.env.LLM_API_KEY,
 *   });
 *
 *   // Plain text
 *   const { text, usage, cost } = await llm.complete({
 *     messages: [{ role: 'user', content: 'Summarize this calendar' }],
 *     maxTokens: 200,
 *   });
 *
 *   // Structured output (JSON schema)
 *   const intent = await withStructuredOutput(llm, intentSchema, {
 *     messages: [{ role: 'user', content: question }],
 *   });
 *   // intent = { intent: 'calendar.schedule', entities: { ... }, confidence: 0.97 }
 *
 * Provider-specific notes:
 *   - anthropic: uses Messages API + tool_use for structured output
 *   - openai: uses Chat Completions + response_format=json_schema
 *   - google: uses Gemini generateContent + responseSchema
 *   - ollama: uses local /api/chat (HTTP) — no API key, no cost
 *
 * Cost tracking (USD per 1M tokens) is hard-coded per model in providers/.
 * Override via env LLM_COST_OVERRIDE_USD_PER_1M_TOKENS=3.00 (input),15.00 (output).
 */

export { createLLMClient } from './client.js';
export { withStructuredOutput } from './structured.js';
export { calculateCost } from './cost.js';

// Re-export provider classes so consumers can introspect
export { AnthropicProvider } from './providers/anthropic.js';
export { OpenAIProvider } from './providers/openai.js';
export { GoogleProvider } from './providers/google.js';
export { OllamaProvider } from './providers/ollama.js';