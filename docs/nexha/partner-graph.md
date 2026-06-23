# Partner Graph (ADR-0010 Phase 7)

> **Status:** ✅ Complete (2026-06-22)
> **Service:** `nexha-partner-graph` (port 4363)
> **Repo:** `companies/Nexha/services/nexha-partner-graph/`
> **Tests:** 67 vitest + 23 client tests = **90 total**

The Partner Graph is the per-tenant partnership tracking layer of the Nexha Commerce Network. Every interaction a tenant has with another business or agent (a transaction, a negotiation, a mission, a contract, a review, an inquiry) updates a computed **strength score** for that partner. The graph powers recommendations: given a role context (`supplier`, `customer`, `partner`), the service returns the best candidates ranked by combined strength + trust + recency.

## Why this exists

Before Phase 7, the RTMN ecosystem had no canonical way to ask:

- "Who are my best suppliers?"
- "How strong is my relationship with partner X?"
- "Which customers should I prioritize for retention?"
- "Given a new mission that needs logistics, which suppliers have I worked with most + most recently + highest rated?"

Without a structured graph, every service re-derived this from raw events (or didn't). The Partner Graph centralizes the model so:

1. **Mission Planner** (Phase 6) can pick assignees by partner strength, not random sampling.
2. **Business Directory** (Phase 3) can rank candidates per tenant, not just globally.
3. **Commerce Runtime** (Phase 8) can surface trusted partners at checkout.

## Strength formula

```
strength = 0.30 · score(count) + 0.30 · score(gmv) + 0.20 · score(rating) + 0.20 · score(recency)
where:
  score(count)  = min(log10(count+1) / 2, 1)   — caps at ~100 transactions
  score(gmv)    = min(log10(gmv+1) / 5, 1)     — caps at ~$100k cumulative
  score(rating) = rating / 5  (or 0.5 if no rating)
  score(recency)= 1 - daysSinceLast / 365 (or 0 if never)
```

Output: 0–1 score, comparable across tenants.

### Why log-scaled?

Linear scaling would let one whale partner dominate everything (1000 txns vs 100 txns → 10× score, which would dwarf rating/recency). Log-scaling puts every metric on the same 0–1 scale with diminishing returns past ~100 txns / ~$100k GMV. The four components then combine cleanly with weights.

### Why 30/30/20/20?

Volume and GMV (the "we do real business" signal) get the most weight (60% combined), but rating and recency keep the score from being purely about money — a brand-new 5-star partner still outranks a stale 1-star whale.

## Recommendation formula

```
score = 0.40 · strength + 0.30 · trustScore + 0.30 · recencyScore
```

`trustScore` is set externally (e.g. by `sada-trust-engine` or a manual override) and defaults to 0.5. `recencyScore` is recomputed at query time (not stored) so a stale partner naturally drops in rank.

## API surface

All routes are tenant-scoped. Auth via JWT (`Authorization: Bearer <token>`) or internal token (`x-internal-token: <token>` + `X-Tenant-Id: <tenant>`).

### Record an interaction

```http
POST /api/nexha/nexha-partner-graph/api/interactions
{
  "partnerRef": "supplier-42",
  "partnerName": "Acme Logistics",
  "partnerType": "business",
  "type": "transaction",
  "direction": "outgoing",
  "value": 5000,
  "currency": "USD",
  "rating": 4.5,
  "source": "nexha-commerce-runtime",
  "sourceRef": "order-9001",
  "relationshipType": "supplier",
  "metadata": { "category": "logistics" }
}
```

Response: `{ ok: true, interaction, partnership }`.

### Recommend partners

```http
POST /api/nexha/nexha-partner-graph/api/recommend
{
  "relationshipType": "supplier",
  "capability": "logistics",
  "limit": 5
}
```

Response:
```json
{
  "recommendations": [
    { "partnerRef": "supplier-42", "partnerName": "Acme Logistics",
      "strength": 0.87, "trustScore": 0.9, "score": 0.88,
      "transactionCount": 47, "totalGmv": 85000,
      "lastInteractionAt": "2026-06-21T..." }
  ]
}
```

### Tenant stats

```http
GET /api/nexha/nexha-partner-graph/api/stats
```

```json
{
  "partners": 23,
  "interactions": 154,
  "totalGmv": 412000,
  "byType": { "supplier": 12, "customer": 8, "partner": 3 }
}
```

## Cross-service use

| Consumer | How it uses Partner Graph |
|---|---|
| Mission Planner (Phase 6) | At plan-time, scores candidate agents by strength before assignment. |
| Business Directory (Phase 3) | Per-tenant ranking layer above global ranking. |
| Commerce Runtime (Phase 8, upcoming) | Surfaces trusted partners at checkout. |
| HOJAI SUTAR (multi-tenant) | Trust inputs feed `trustScore` to break ties between equally-strong partners. |

## Operational notes

- **MongoDB**: shared cluster with other Nexha services, separate DB (`nexha_partner_graph`).
- **Indexes**: `(tenantId, partnerRef)` unique; `(tenantId, relationshipType, strength desc)`; `(tenantId, lastInteractionAt desc)`.
- **Rate limits**: standard (100 req/min default via `@hojai/middleware`).
- **Backfill**: a one-off script can replay historical transactions into `POST /api/interactions` if a tenant wants to bootstrap the graph.

## See also

- [Service CLAUDE.md](../../companies/Nexha/services/nexha-partner-graph/CLAUDE.md)
- [PHASE-LOG.md Phase 7 section](./PHASE-LOG.md#phase-7--partner-graph-2026-06-22-)
- [ADR-0010 Multi-Tenant Federation](./../ADR/0010-MULTI-TENANT-FEDERATION.md)