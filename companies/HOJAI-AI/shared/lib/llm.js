/**
 * RTMN Shared LLM Helper
 *
 * Single point of LLM access for all services. Routes through the HOJAI
 * inference gateway (:4746 by default) which handles model routing,
 * safety checks, secrets management, and stub fallback.
 *
 * Usage:
 *   import { llmComplete, llmEmbed, isLLMAvailable } from '@rtmn/shared/lib/llm';
 *
 *   if (await isLLMAvailable()) {
 *     const r = await llmComplete({
 *       messages: [{ role: 'user', content: 'Summarize this memory' }],
 *       model: 'claude-3-haiku',
 *     });
 *     console.log(r.text);
 *   } else {
 *     // Fallback to local rule-based logic
 *   }
 *
 * Behavior:
 *   - If INFERENCE_GATEWAY_URL is set and the gateway is reachable → real LLM
 *   - If INFERENCE_STUB_MODE=true OR gateway unreachable → deterministic stub
 *   - Returns { ok, text, model, provider, tokensIn, tokensOut, latencyMs, costUsd, stub }
 */

const INFERENCE_GATEWAY_URL =
  process.env.INFERENCE_GATEWAY_URL || 'http://localhost:4746';
const STUB_MODE = process.env.INFERENCE_STUB_MODE === 'true';
const DEFAULT_MODEL = process.env.LLM_DEFAULT_MODEL || 'claude-3-haiku';
const TIMEOUT_MS = parseInt(process.env.LLM_TIMEOUT_MS || '15000', 10);

/**
 * Check whether the LLM is available (gateway reachable AND not forced stub).
 */
export async function isLLMAvailable() {
  if (STUB_MODE) return false;
  try {
    const r = await fetch(`${INFERENCE_GATEWAY_URL}/api/health`, {
      signal: AbortSignal.timeout(2000),
    });
    return r.ok;
  } catch {
    return false;
  }
}

/**
 * Make a chat completion call.
 *
 * @param {object} opts
 * @param {Array<{role:string,content:string}>} opts.messages
 * @param {string} [opts.model] - e.g. 'claude-3-haiku', 'claude-3-5-sonnet'
 * @param {number} [opts.maxTokens=1024]
 * @param {number} [opts.temperature=0.7]
 * @param {object} [opts.metadata] - tracking metadata (tenant, userId, feature)
 * @returns {Promise<{ok:boolean, text?:string, error?:string, model:string, provider:string, tokensIn:number, tokensOut:number, latencyMs:number, costUsd:number, stub:boolean}>}
 */
export async function llmComplete(opts = {}) {
  const start = Date.now();
  const {
    messages,
    model = DEFAULT_MODEL,
    maxTokens = 1024,
    temperature = 0.7,
    metadata = {},
  } = opts;

  if (!Array.isArray(messages) || messages.length === 0) {
    return {
      ok: false,
      error: 'messages array required',
      model, provider: 'none', tokensIn: 0, tokensOut: 0,
      latencyMs: 0, costUsd: 0, stub: true,
    };
  }

  if (STUB_MODE) {
    return stubResponse(messages, model, start);
  }

  try {
    const r = await fetch(`${INFERENCE_GATEWAY_URL}/api/complete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages,
        model,
        options: { maxTokens, temperature },
        metadata,
      }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });

    if (!r.ok) {
      return {
        ok: false,
        error: `gateway returned ${r.status}`,
        model, provider: 'unknown', tokensIn: 0, tokensOut: 0,
        latencyMs: Date.now() - start, costUsd: 0, stub: true,
      };
    }

    const data = await r.json();
    return {
      ok: true,
      text: data.text || data.content || '',
      model: data.model || model,
      provider: data.provider || 'unknown',
      tokensIn: data.tokensIn || 0,
      tokensOut: data.tokensOut || 0,
      latencyMs: data.latencyMs || Date.now() - start,
      costUsd: data.costUsd || 0,
      stub: false,
    };
  } catch (e) {
    // Gateway unreachable → return stub. Callers can detect via `stub: true`.
    return stubResponse(messages, model, start, e.message);
  }
}

/**
 * Generate an embedding for the given text. Falls back to a deterministic
 * hash-based pseudo-embedding if the gateway is unreachable (so callers
 * always get a usable vector).
 */
export async function llmEmbed(text, model = 'text-embedding-3-small') {
  if (STUB_MODE || !text) {
    return hashEmbedding(text || '');
  }

  try {
    const r = await fetch(`${INFERENCE_GATEWAY_URL}/api/embed`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, model }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });

    if (!r.ok) return hashEmbedding(text);
    const data = await r.json();
    return data.embedding || hashEmbedding(text);
  } catch {
    return hashEmbedding(text);
  }
}

/**
 * Generate a structured JSON object via LLM. The model is instructed to
 * return valid JSON matching the provided schema description. Falls back
 * to a provided default if LLM is unavailable.
 */
export async function llmStructured(opts) {
  const { messages, schema, defaultValue, model = DEFAULT_MODEL } = opts;
  const sysMsg = {
    role: 'system',
    content: `Return ONLY valid JSON matching this schema: ${schema}. No prose, no markdown fences.`,
  };
  const r = await llmComplete({ messages: [sysMsg, ...messages], model, temperature: 0.2 });
  if (!r.ok) return defaultValue;
  try {
    return JSON.parse(r.text);
  } catch {
    return defaultValue;
  }
}

/**
 * Deterministic stub response — used when gateway is unavailable. Returns
 * a structured echo of the last user message so callers always have
 * something to work with. Marked `stub: true` so callers can detect.
 */
function stubResponse(messages, model, start, reason) {
  const lastUser = [...messages].reverse().find((m) => m.role === 'user');
  const userText = lastUser?.content || '';
  return {
    ok: true,
    text: `[stub] You asked: "${userText.slice(0, 200)}". Real LLM not available${reason ? ` (${reason})` : ''} — set INFERENCE_GATEWAY_URL to enable.`,
    model,
    provider: 'stub',
    tokensIn: userText.length,
    tokensOut: 0,
    latencyMs: Date.now() - start,
    costUsd: 0,
    stub: true,
  };
}

/**
 * Hash-based 384-dim pseudo-embedding. Not semantically meaningful but
 * deterministic and useful for dev/test/CI where the real embedding
 * service isn't available. Returns Array of 384 floats in [-1, 1].
 */
function hashEmbedding(text) {
  const dim = 384;
  const vec = new Array(dim).fill(0);
  for (let i = 0; i < text.length; i++) {
    const c = text.charCodeAt(i);
    vec[i % dim] += (c % 97) / 97 - 0.5;
  }
  // Normalize
  const norm = Math.sqrt(vec.reduce((s, v) => s + v * v, 0)) || 1;
  return vec.map((v) => v / norm);
}

export const _internal = { hashEmbedding, stubResponse };