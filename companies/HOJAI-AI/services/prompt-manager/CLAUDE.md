# Prompt Manager (4771)

> **Status:** ✅ Production-ready v1.0.0 (in-memory, 1200 lines)
> **Owner:** HOJAI AI Platform team
> **Last updated:** June 19, 2026

---

## Purpose

The **single source of truth for every prompt** used across HOJAI AI. Every prompt is a versioned template with metadata. A/B experiments let you compare two versions in production. Together this is the foundation for safely iterating on prompt quality without breaking what already works.

This implements the **Prompt Management + Versioning** priority from [Division 7 — Training & Model Platform](../companies/HOJAI-AI/divisions/07-training-model-platform/CLAUDE.md).

## Why this exists

Without a prompt manager:
- Prompts are scattered in service source code (`const prompt = "Translate this: ..."`)
- No way to version, rollback, or A/B test
- Every code change requires a deploy to change a prompt
- No way to measure which prompt version converts better

With the prompt manager:
```javascript
// 1. Render a versioned template with variable substitution
const result = await fetch('http://localhost:4771/api/templates/welcome-message/render', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ variables: { name: 'Alice', company: 'Acme' } })
});
// → { rendered: "Hi Alice, welcome to Acme!", version: 2, missingVariables: [] }

// 2. A/B test two versions in production
const exp = await fetch('http://localhost:4771/api/experiments', { ... });
await fetch(`http://localhost:4771/api/experiments/${exp.id}/event`, {
  method: 'POST',
  body: JSON.stringify({ variantVersion: 2, eventType: 'conversion', latencyMs: 350 })
});
```

## Template syntax

Variables use `{{varName}}` syntax. Default values: `{{varName|defaultValue}}`.

Example:
```
Hi {{firstName|there}},

Welcome to {{company}}! Your account is ready at {{url}}.

{{#if tier === "premium"}}
As a premium member, you have access to priority support.
{{/if}}
```

## Endpoint inventory

### Template CRUD
- `POST /api/templates` — create template
- `GET /api/templates` — list (filter by category, tag)
- `GET /api/templates/:idOrSlug`
- `PATCH /api/templates/:idOrSlug`
- `DELETE /api/templates/:idOrSlug`

### Versioning
- `POST /api/templates/:idOrSlug/versions` — add a new version
- `GET /api/templates/:idOrSlug/versions` — version history
- `GET /api/templates/:idOrSlug/versions/:version` — get one
- `POST /api/templates/:idOrSlug/rollback` — body `{version}` to set as current

### Render (the main endpoint)
- `POST /api/templates/:idOrSlug/render` — body `{variables, version?, experimentId?}`. Substitutes variables, validates required ones, returns `{rendered, modelHints, version, missingVariables}`. If `experimentId` provided, picks variant per experiment weights.
- `POST /api/render` — render any ad-hoc template string

### Experiments
- `POST /api/experiments` — create AB experiment
- `GET /api/experiments` / `GET /api/experiments/:id`
- `PATCH /api/experiments/:id`
- `POST /api/experiments/:id/event` — record impression or conversion

### Search & status
- `GET /api/search?q=...` — full-text search
- `GET /api/stats` — totals
- `GET /api/audit` — change log
- `GET /api/health` (and `/health` redirect)

## Pre-seeded data

- 3 templates: `welcome-message`, `sales-cold-email`, `customer-support-response`
- 4 versions across them (welcome-message has 2 versions for AB testing)
- 1 running experiment comparing 2 versions of welcome-message 50/50

## Integration with inference-gateway (4770)

The `modelHints` returned by `render` should be passed to `inference-gateway` as the `options` for `/api/complete`:

```javascript
const { rendered, modelHints } = await fetch(`${PROMPT_URL}/api/templates/foo/render`, ...).then(r => r.json());
const result = await fetch(`${INFERENCE_URL}/api/complete`, {
  method: 'POST',
  body: JSON.stringify({
    messages: [{ role: 'user', content: rendered }],
    options: modelHints   // {preferredTier, preferProvider, maxTokens, temperature}
  })
});
```

This way changing a prompt's model preferences doesn't require touching call sites.

## See also

- [services/inference-gateway/](../inference-gateway/) — what consumes these prompts
- [services/evaluation-harness/](../evaluation-harness/) — quality control for prompt changes
- [Division 7 — Training & Model Platform](../companies/HOJAI-AI/divisions/07-training-model-platform/CLAUDE.md)
