# nexha-partner-graph

Per-tenant partnership tracking + recommendation engine for the Nexha Commerce Network. Records interactions (transactions, negotiations, missions, contracts, reviews) and computes a strength score per partner to power recommendations.

## Quick start

```bash
npm install
npm start          # listens on :4363
npm test           # runs the 67-test suite
```

## Endpoints (all tenant-scoped)

| Method | Path | Purpose |
|---|---|---|
| `POST` | `/api/interactions` | Record an interaction; updates the partnership |
| `GET` | `/api/interactions` | List interactions |
| `GET` | `/api/partners` | List partnerships |
| `GET` | `/api/partners/:ref` | Get one partnership |
| `GET` | `/api/partners/by-type/:type` | List partnerships of a type (by strength) |
| `POST` | `/api/recommend` | Recommend partners |
| `GET` | `/api/stats` | Tenant summary |
| `GET` | `/health` | Liveness |
| `GET` | `/ready` | Readiness |

## Example

```bash
# Record a transaction (outgoing $5000 to supplier-42)
curl -X POST http://localhost:4363/api/interactions \
  -H 'Authorization: Bearer <jwt>' \
  -H 'Content-Type: application/json' \
  -d '{"partnerRef":"supplier-42","type":"transaction","direction":"outgoing","value":5000}'

# Get recommendations for the 'supplier' role
curl -X POST http://localhost:4363/api/recommend \
  -H 'Authorization: Bearer <jwt>' \
  -H 'Content-Type: application/json' \
  -d '{"relationshipType":"supplier","limit":5}'
```

## Architecture

```
HTTP layer  →  src/routes/index.js  (Zod-validated)
Service     →  src/services/partnerService.js (computeStrength + recordInteraction + recommend)
Models      →  src/models/Partnership.js, Interaction.js
MongoDB     →  mongoose
Auth        →  src/middleware/auth.js  (JWT + x-internal-token)
```

See [CLAUDE.md](./CLAUDE.md) for the full reference (data model, formulas, env vars, hub wiring).

## Status

✅ Phase 7 of ADR-0010 — complete (2026-06-22). 67 vitest tests passing.