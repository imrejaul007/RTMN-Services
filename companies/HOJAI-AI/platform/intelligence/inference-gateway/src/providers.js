'use strict';

/**
 * Stub providers.js for inference-gateway
 *
 * The real providers module (with actual OpenAI/Anthropic/Google SDK calls)
 * is planned for a future phase. For now, this stub allows the gateway to
 * load and tests to pass. When real providers are wired up, replace this with
 * the actual implementation that uses provider SDKs.
 */

const { withRetry } = require('./retry');

/**
 * Real provider call — currently stubs since no real providers are wired.
 * @param {string} provider - 'openai' | 'anthropic' | 'google' | 'mistral'
 * @param {object} params - { model, modelMeta, messages, opts }
 * @returns {Promise<{ text, model, provider, tokensIn, tokensOut, latencyMs, costUsd, raw }>}
 */
async function callRealProvider(provider, params) {
  // No real provider SDKs wired yet — fall back to stub
  // This path is only reached when STUB_MODE=false and getProviderKey returns a real key.
  // Until providers are wired, always stub.
  const delay = 50;
  await new Promise(r => setTimeout(r, delay));
  const lastUser = [...(params.messages || [])].reverse().find(m => m.role === 'user');
  const promptText = lastUser ? lastUser.content : '';
  const text = `[${provider}/${params.model}] (provider-stub) You said: "${String(promptText).slice(0, 80)}"`;
  return {
    text,
    model: params.model,
    provider,
    tokensIn: Math.ceil(promptText.length / 4),
    tokensOut: Math.ceil(text.length / 4),
    latencyMs: delay,
    costUsd: 0,
    raw: { provider, model: params.model, mode: 'provider-stub' }
  };
}

module.exports = { callRealProvider };
