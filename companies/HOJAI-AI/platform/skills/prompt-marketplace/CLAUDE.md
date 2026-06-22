# Prompt Marketplace (port 4130)

> **Status:** ✅ Production-ready v1.0.0 (Architecture v2 — June 20, 2026)
> **Role:** Buy/sell prompt templates. Prompt Manager (4771) is the runtime; this is the storefront.
> **Owner:** HOJAI AI Marketplace team

## Mission

Prompts are reusable LLM templates. Today, every team writes their own. **Prompt Marketplace lets prompt engineers publish production-grade prompts** so other teams can buy them instead of rebuilding.

Pairs with [../prompt-manager/CLAUDE.md](../prompt-manager/CLAUDE.md) which holds the canonical versions inside a tenant.

## Endpoints (12)

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/health` | Health + counts |
| POST | `/api/prompts` | Create a prompt (title + model + body + vars + tags + price) |
| GET | `/api/prompts` | List with filters (tag, model, publisher, q, minRating, featured, sort) |
| GET | `/api/prompts/featured` | Featured prompts |
| GET | `/api/prompts/trending` | Top by sales |
| GET | `/api/prompts/:id` | Get one prompt |
| PATCH | `/api/prompts/:id` | Update prompt |
| DELETE | `/api/prompts/:id` | Delete prompt |
| POST | `/api/prompts/:id/versions` | Add a new version (auto-increments version number) |
| GET | `/api/prompts/:id/versions` | List versions |
| GET | `/api/prompts/:id/versions/:version` | Get one version |
| POST | `/api/prompts/:id/versions/:version/render` | **Render** a version with provided vars (substitutes `{{var}}`) |
| POST | `/api/prompts/:id/reviews` | Submit 1-5 star review |
| GET | `/api/prompts/:id/reviews` | List reviews |
| GET | `/api/audit` | Audit log |

## Versioning

Every prompt has `currentVersion` and a `versionCount`. Adding a new version increments both. Each version has:
- `body` — the prompt template with `{{variable}}` placeholders
- `vars` — declared variables
- `sampleIO` — example input/output (optional)
- `changelog` — what changed (optional)

## Render Endpoint

```bash
# Render prompt v1 with values for the declared vars
curl -X POST http://localhost:4130/api/prompts/<id>/versions/1/render \
  -H "Content-Type: application/json" \
  -d '{
    "date": "2026-06-20",
    "partySize": 4,
    "time": "7:30 PM"
  }'
# Returns the body with {{date}}, {{partySize}}, {{time}} substituted
# and a `missingVars` list (vars that weren't provided)
```

## 4 Seeded Prompts

1. **Restaurant Reservation Agent** (gpt-4, featured, $5) — `{{date}}` `{{partySize}}` `{{time}}`
2. **Support Reply Triage** (claude-3-sonnet, featured, $9) — `{{email}}`
3. **Code Review Senior** (gpt-4, $12) — `{{language}}` `{{code}}`
4. **Lead Enrichment** (gpt-3.5-turbo, $7) — `{{name}}` `{{email}}` `{{notes}}`

## Wiring

- **ai-intelligence (4881) `/api/route`** — exposes `promptMarketplace: http://localhost:4130`
- **ai-intelligence (4881) `/api/agents`** — exposes `promptMarketplace` agent
- **unified-os-hub (4399)** — `/api/prompts-market/...` routes to this service

## Next Steps

- Wire to Prompt Manager (4771) — purchased prompts become available for execution
- Add billing via REZ Wallet (4004)
- Add A/B test endpoint (render two versions side-by-side)
- Add analytics (render count, conversion to action)
- Add private prompts (only visible to your tenant)
