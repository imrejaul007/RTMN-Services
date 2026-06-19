# Inference Gateway (4770)

> **Status:** ✅ Production-ready v1.0.0 (in-memory, stub-mode by default)
> **Owner:** HOJAI AI Platform team
> **Last updated:** June 19, 2026

---

## Purpose

The **single API for ALL LLM inference** across HOJAI AI. Routes completion requests to the right model across OpenAI / Anthropic / Google / Mistral / local based on capability, cost, latency, and policy. Every HOJAI AI product that needs LLM calls should use this gateway — not call providers directly.

This implements the **Model Serving Gateway + Inference Gateway** priorities from [Division 7 — Training & Model Platform](../companies/HOJAI-AI/divisions/07-training-model-platform/CLAUDE.md).

## Why this exists

Without a gateway, every service that wants to use an LLM has to:
- Hard-code multiple SDKs (openai, anthropic, @google/generative-ai, etc.)
- Manage its own API keys (in `.env` files)
- Re-implement retry, fallback, cost tracking, latency logging
- Re-implement routing logic when you want to try a different model

With the gateway, every service does:
```javascript
const result = await fetch('http://localhost:4770/api/complete', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    messages: [{ role: 'user', content: 'Hello' }],
    options: { preferredTier: 'budget', maxLatencyMs: 500 }
  })
});
```

## Models supported

9 models pre-seeded across 5 providers:

| Model | Provider | Tier | Context | $ in/1k | $ out/1k |
|-------|----------|------|---------|---------|----------|
| gpt-4o | openai | premium | 128k | 0.005 | 0.015 |
| gpt-4o-mini | openai | budget | 128k | 0.00015 | 0.0006 |
| o1-preview | openai | premium | 128k | 0.015 | 0.06 |
| claude-3-5-sonnet | anthropic | premium | 200k | 0.003 | 0.015 |
| claude-3-haiku | anthropic | budget | 200k | 0.00025 | 0.00125 |
| gemini-1.5-pro | google | premium | 1M | 0.00125 | 0.005 |
| gemini-1.5-flash | google | budget | 1M | 0.000075 | 0.0003 |
| mistral-large | mistral | premium | 128k | 0.004 | 0.012 |
| hojai-llama-3-70b | local | free | 8k | 0.0 | 0.0 |

## Endpoint inventory

### Catalog
- `GET /api/models` — list all models
- `GET /api/models/:modelId` — get one model
- `GET /api/health` (and `/health` redirect)

### Routing
- `POST /api/route` — body `{requestedModel?, options?}`. Returns which model would be selected without actually calling it.
- `POST /api/complete` — the main call. Body `{messages, model?, options?, stream?}`. Returns `{text, model, provider, usage, latencyMs, stubbed, fallback, fallbackChain}`. On failure of the selected model, walks the `fallbackChain` until one succeeds.

### Stats
- `GET /api/stats` — total requests, tokens, cost, latency, by provider/tier/model, fallback rate, stub rate
- `POST /api/stats/reset`
- `GET /api/audit` — last N requests with full metadata

## Routing options

```javascript
{
  preferredTier: 'premium' | 'budget' | 'free' | 'any',  // default 'premium'
  preferProvider: 'openai' | 'anthropic' | 'google' | 'mistral' | 'local' | null,
  fallbackChain: ['claude-3-5-sonnet', 'gpt-4o', 'gemini-1.5-pro', ...],
  maxCostUsd: null,           // optional per-request cost cap
  maxLatencyMs: null,         // optional latency cap
  requireCapability: null,    // e.g. 'vision' or 'tools'
  timeoutMs: 30000,
  retries: 1
}
```

Selection algorithm:
1. If `requestedModel` is set and exists → use it
2. Filter catalog by tier, provider, capability, cost cap, latency cap
3. Pick the cheapest of the filtered set

If no model matches → `400 NO_MODEL_MATCHES_CRITERIA`. If all in the fallback chain fail → `502 ALL_PROVIDERS_FAILED`.

## Stub mode

**Default behavior today**: this service runs in **stub mode** — it returns deterministic demo responses (`[openai/gpt-4o] (stub) You said: "..."`) without making real API calls. This is so the rest of the platform can be developed, tested, and demoed without burning real provider credits.

When real provider keys are present (stored in Secrets Manager under `openai-api-key`, `anthropic-api-key`, etc.), the gateway automatically upgrades to real calls. The `stubbed` field in responses tells you which mode was used.

## Production checklist (what's next)

1. **Wire real adapters** — replace `callStubProvider` in `src/index.js` with real SDK calls per provider. Each adapter takes `{model, messages, opts}` and returns the same shape.
2. **Streaming** — add SSE support for `POST /api/complete?stream=true`
3. **Batch** — `POST /api/complete/batch` for bulk async completions
4. **Cost attribution** — tag requests with `tenantId` / `feature` / `userId` for per-customer cost reports
5. **Async queue** — for long-running prompts, return job IDs and notify on completion
6. **Persistent stats** — move counters and audit log to Redis so multiple gateway instances can share state
7. **Token-by-token cancellation** — for streaming responses

## Integration with other HOJAI AI services

- **HOJAI Intelligence (4881)** — when an "intent" or "sentiment" agent needs an LLM, it should call this gateway instead of a provider directly.
- **Genie suite** — every Genie service that does LLM work should route here.
- **Prompt Manager (4771)** — the gateway can honor model hints from the prompt template (`preferredTier`, `preferProvider`).
- **Semantic Cache (4772)** — the gateway should call `POST /api/lookup` BEFORE the LLM and short-circuit on hit.
- **AI Safety (4774)** — the gateway should call `POST /api/check/input` and `POST /api/check/output` around every call.
- **Micro Intelligence (4753)** — every provider adapter should be behind a circuit breaker.

The ideal call flow is:

```
App → Inference Gateway → AI Safety (input check) → Semantic Cache (lookup)
       → [if miss] Provider → AI Safety (output check) → Semantic Cache (store) → App
```

## See also

- [services/prompt-manager/](../prompt-manager/) — prompt versioning
- [services/semantic-cache/](../semantic-cache/) — caching layer
- [services/model-registry/](../model-registry/) — model catalog of record
- [services/ai-safety/](../ai-safety/) — input/output safety
- [services/evaluation-harness/](../evaluation-harness/) — quality control
- [services/micro-intelligence/](../micro-intelligence/) — circuit breaker pattern
- [Division 7 — Training & Model Platform](../companies/HOJAI-AI/divisions/07-training-model-platform/CLAUDE.md)
