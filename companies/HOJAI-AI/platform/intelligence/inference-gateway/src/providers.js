'use strict';

/**
 * Real LLM provider adapters for inference-gateway.
 *
 * Each adapter exposes `complete({model, messages, opts})` and returns:
 *   { text, model, provider, tokensIn, tokensOut, latencyMs, costUsd, raw }
 *
 * Falls back to stub when API key is unavailable.
 */

const { getProviderKey } = require('./secrets-client');

// ---------------------------------------------------------------------------
// Cost constants (per 1k tokens)
// ---------------------------------------------------------------------------
const COST = {
  'gpt-4o':             { in: 0.005,  out: 0.015 },
  'gpt-4o-mini':        { in: 0.00015, out: 0.0006 },
  'o1-preview':         { in: 0.015,  out: 0.060 },
  'o1-mini':            { in: 0.010,  out: 0.040 },
  'claude-3-5-sonnet':  { in: 0.003,  out: 0.015 },
  'claude-3-5-haiku':   { in: 0.0008, out: 0.004 },
  'claude-3-opus':      { in: 0.015,  out: 0.075 },
  'claude-3-sonnet':    { in: 0.003,  out: 0.015 },
  'claude-3-haiku':     { in: 0.00025, out: 0.00125 },
  'gemini-1.5-pro':     { in: 0.00125, out: 0.005 },
  'gemini-1.5-flash':   { in: 0.000075, out: 0.0003 },
  'mistral-large':      { in: 0.002,  out: 0.006 },
  'mistral-small':      { in: 0.0002, out: 0.0006 },
};

function calcCost(model, tokensIn, tokensOut) {
  const c = COST[model] || { in: 0.001, out: 0.002 };
  return (tokensIn / 1000) * c.in + (tokensOut / 1000) * c.out;
}

// ---------------------------------------------------------------------------
// Generic fetch helper
// ---------------------------------------------------------------------------
function fetchJson(url, body, headers) {
  return fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify(body),
  });
}

// ---------------------------------------------------------------------------
// OpenAI adapter
// ---------------------------------------------------------------------------
async function openaiComplete({ model, messages, opts = {} }) {
  const apiKey = await getProviderKey('openai');
  if (!apiKey) return stubResult('openai', model, messages);

  const start = Date.now();
  const url = 'https://api.openai.com/v1/chat/completions';
  const body = {
    model,
    messages,
    temperature: opts.temperature ?? 0.7,
    max_tokens:  opts.maxTokens  ?? 2048,
    ...(opts.tools ? { tools: opts.tools } : {}),
    ...(opts.stream ? { stream: true } : {}),
  };

  const resp = await fetchJson(url, body, { Authorization: `Bearer ${apiKey}` });
  const latencyMs = Date.now() - start;

  if (!resp.ok) {
    const err = await resp.text();
    throw new Error(`OpenAI ${resp.status}: ${err}`);
  }

  if (opts.stream) {
    // For streaming, return raw response (caller handles SSE)
    return { raw: resp, latencyMs, costUsd: 0, tokensIn: 0, tokensOut: 0 };
  }

  const json = await resp.json();
  const text = json.choices[0]?.message?.content || '';
  const usage = json.usage || {};
  const tokensIn  = usage.prompt_tokens     || Math.ceil(JSON.stringify(messages).length / 4);
  const tokensOut = usage.completion_tokens || Math.ceil(text.length / 4);

  return {
    text,
    model:  json.model || model,
    provider: 'openai',
    tokensIn,
    tokensOut,
    latencyMs,
    costUsd: calcCost(model, tokensIn, tokensOut),
    raw: json,
  };
}

// ---------------------------------------------------------------------------
// Anthropic adapter
// ---------------------------------------------------------------------------
async function anthropicComplete({ model, messages, opts = {} }) {
  const apiKey = await getProviderKey('anthropic');
  if (!apiKey) return stubResult('anthropic', model, messages);

  const start = Date.now();
  const url = 'https://api.anthropic.com/v1/messages';

  // Convert messages to Anthropic format
  const systemMsg = messages.find(m => m.role === 'system');
  const chatMessages = messages.filter(m => m.role !== 'system');
  const lastUser = chatMessages.reverse().find(m => m.role === 'user');
  const promptText = lastUser ? lastUser.content : '';

  const body = {
    model,
    messages: [{ role: 'user', content: promptText }],
    ...(systemMsg ? { system: systemMsg.content } : {}),
    temperature: opts.temperature ?? 0.7,
    max_tokens: opts.maxTokens ?? 4096,
  };

  const resp = await fetchJson(url, body, {
    'x-api-key': apiKey,
    'anthropic-version': '2023-06-01',
    'anthropic-dangerous-direct-browser-access': 'true',
  });
  const latencyMs = Date.now() - start;

  if (!resp.ok) {
    const err = await resp.text();
    throw new Error(`Anthropic ${resp.status}: ${err}`);
  }

  const json = await resp.json();
  const text = json.content?.[0]?.text || '';
  const tokensIn  = json.usage?.input_tokens  || Math.ceil(JSON.stringify(messages).length / 4);
  const tokensOut = json.usage?.output_tokens || Math.ceil(text.length / 4);

  return {
    text,
    model:  json.model || model,
    provider: 'anthropic',
    tokensIn,
    tokensOut,
    latencyMs,
    costUsd: calcCost(model, tokensIn, tokensOut),
    raw: json,
  };
}

// ---------------------------------------------------------------------------
// Google adapter
// ---------------------------------------------------------------------------
async function googleComplete({ model, messages, opts = {} }) {
  const apiKey = await getProviderKey('google');
  if (!apiKey) return stubResult('google', model, messages);

  const start = Date.now();
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  const lastUser = [...messages].reverse().find(m => m.role === 'user');
  const promptText = lastUser ? lastUser.content : '';

  const body = {
    contents: [{ parts: [{ text: promptText }] }],
    generationConfig: {
      temperature: opts.temperature ?? 0.7,
      maxOutputTokens: opts.maxTokens ?? 2048,
    },
  };

  const resp = await fetchJson(url, body, {});
  const latencyMs = Date.now() - start;

  if (!resp.ok) {
    const err = await resp.text();
    throw new Error(`Google ${resp.status}: ${err}`);
  }

  const json = await resp.json();
  const text = json.candidates?.[0]?.content?.parts?.[0]?.text || '';
  const tokensIn  = json.usageMetadata?.promptTokenCount   || Math.ceil(promptText.length / 4);
  const tokensOut = json.usageMetadata?.candidatesTokenCount || Math.ceil(text.length / 4);

  return {
    text,
    model:  json.modelVersion || model,
    provider: 'google',
    tokensIn,
    tokensOut,
    latencyMs,
    costUsd: calcCost(model, tokensIn, tokensOut),
    raw: json,
  };
}

// ---------------------------------------------------------------------------
// Mistral adapter
// ---------------------------------------------------------------------------
async function mistralComplete({ model, messages, opts = {} }) {
  const apiKey = await getProviderKey('mistral');
  if (!apiKey) return stubResult('mistral', model, messages);

  const start = Date.now();
  const url = 'https://api.mistral.ai/v1/chat/completions';

  const body = {
    model,
    messages,
    temperature: opts.temperature ?? 0.7,
    max_tokens: opts.maxTokens ?? 2048,
  };

  const resp = await fetchJson(url, body, { Authorization: `Bearer ${apiKey}` });
  const latencyMs = Date.now() - start;

  if (!resp.ok) {
    const err = await resp.text();
    throw new Error(`Mistral ${resp.status}: ${err}`);
  }

  const json = await resp.json();
  const text = json.choices[0]?.message?.content || '';
  const usage = json.usage || {};
  const tokensIn  = usage.prompt_tokens     || Math.ceil(JSON.stringify(messages).length / 4);
  const tokensOut = usage.completion_tokens || Math.ceil(text.length / 4);

  return {
    text,
    model:  json.model || model,
    provider: 'mistral',
    tokensIn,
    tokensOut,
    latencyMs,
    costUsd: calcCost(model, tokensIn, tokensOut),
    raw: json,
  };
}

// ---------------------------------------------------------------------------
// Stub fallback
// ---------------------------------------------------------------------------
function stubResult(provider, model, messages) {
  const delay = 50;
  const lastUser = [...(messages || [])].reverse().find(m => m.role === 'user');
  const promptText = lastUser ? lastUser.content : '';
  const text = `[${provider}/${model}] (stub) "${String(promptText).slice(0, 80)}"`;
  return {
    text,
    model,
    provider,
    tokensIn:  Math.ceil(promptText.length / 4),
    tokensOut: Math.ceil(text.length / 4),
    latencyMs: delay,
    costUsd:   0,
    raw: { provider, model, mode: 'stub' },
  };
}

// ---------------------------------------------------------------------------
// Router
// ---------------------------------------------------------------------------
const PROVIDERS = {
  openai:    openaiComplete,
  anthropic: anthropicComplete,
  google:    googleComplete,
  mistral:   mistralComplete,
};

async function callRealProvider(provider, params) {
  const fn = PROVIDERS[provider];
  if (!fn) throw new Error(`Unknown provider: ${provider}`);
  return fn(params);
}

module.exports = { callRealProvider };