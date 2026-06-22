# Model Registry (4773)

> **Status:** ✅ Production-ready v1.0.0 (in-memory, 877 lines)
> **Owner:** HOJAI AI Platform team
> **Last updated:** June 19, 2026

---

## Purpose

The **catalog of record** for every AI model available to HOJAI AI. Internal models, fine-tunes, third-party hosted models — all in one place with versioning, deployment status, capability tags, and benchmark scores. Distinct from **inference-gateway (4770)** which routes live requests; this is the metadata layer that knows what *should* be deployed.

## Why this exists

Without a registry:
- Every consumer of LLMs has to hardcode model lists and version dates
- No central place to mark a model deprecated
- No way to find "what's our best budget-tier embedding model right now?"
- Benchmark scores live in spreadsheets that go stale

With the registry, you can:
```javascript
// Find the cheapest model with vision + tools capabilities
const rec = await fetch('http://localhost:4773/api/recommend', {
  method: 'POST',
  body: JSON.stringify({
    requiredCapabilities: ['vision', 'tools'],
    maxCost: 0.005
  })
});
// → ranked list of models

// Mark gpt-4o-mini-2024-07-18 as live
await fetch('http://localhost:4773/api/models/gpt-4o-mini/versions/2024-07-18/deploy', { method: 'POST' });

// Retire an old version
await fetch('http://localhost:4773/api/models/gpt-4o-mini/versions/2024-07-18', {
  method: 'PATCH',
  body: JSON.stringify({ retiredDate: '2026-12-31' })
});
```

## Endpoint inventory

### Model CRUD
- `POST /api/models` — register model
- `GET /api/models` — list with filters (`?type=llm&owner=openai&capability=vision&status=stable&tag=premium`)
- `GET /api/models/:idOrSlug`
- `PATCH /api/models/:idOrSlug`
- `DELETE /api/models/:idOrSlug`

### Versioning
- `POST /api/models/:idOrSlug/versions` — add version
- `GET /api/models/:idOrSlug/versions`
- `GET /api/models/:idOrSlug/versions/:version`
- `PATCH /api/models/:idOrSlug/versions/:version`
- `POST /api/models/:idOrSlug/versions/:version/deploy` — mark as live
- `GET /api/models/:idOrSlug/live` — currently deployed version

### Discovery
- `GET /api/search?q=...`
- `GET /api/capabilities/:capability`
- `POST /api/recommend` — body `{requiredCapabilities, maxCost?, minContextWindow?, preferOwner?}`
- `GET /api/owners` / `GET /api/types`

### Compare
- `POST /api/compare` — side-by-side

### Stats & audit
- `GET /api/stats` / `GET /api/audit`
- `GET /api/health` (and `/health` redirect)

## Pre-seeded data

8 models seeded:
- claude-3-5-sonnet, claude-3-haiku (Anthropic)
- gpt-4o, gpt-4o-mini, o1-preview, text-embedding-3-small, whisper-1 (OpenAI)
- gemini-1-5-pro (Google)

Each with realistic version metadata, deployment info (cost, latency, region), benchmark scores (MMLU, HumanEval, GSM8K), and safety settings.

## Integration with inference-gateway (4770)

The inference-gateway's MODEL_CATALOG is a static inline copy. In production this should be **dynamically fetched** from the registry's `/api/models` endpoint at startup, then refreshed periodically. This way adding a new model in the registry automatically makes it available for routing without redeploying the gateway.

## See also

- [services/inference-gateway/](../inference-gateway/) — runtime routing
- [services/prompt-manager/](../prompt-manager/) — model hints
- [services/evaluation-harness/](../evaluation-harness/) — generates benchmark scores that go here
- [Division 7 — Training & Model Platform](../companies/HOJAI-AI/divisions/07-training-model-platform/CLAUDE.md)
