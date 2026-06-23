# nexha-partner-graph (ADR-0010 Phase 7)

> **Per-tenant partnership tracking + recommendation engine.**
> Part of the Nexha Commerce Network. Replaces ad-hoc relationship tracking with a structured graph: every interaction (transaction, negotiation, mission, contract, review) updates a computed **strength score** per partner.

| | |
|---|---|
| **Port** | `4363` |
| **Package** | `@nexha/partner-graph` v1.0.0 |
| **Repo** | `companies/Nexha/` (submodule) |
| **Started** | `node src/index.js` (or `npm start`) |
| **Health** | `GET /health` |
| **Internal** | `GET /internal/sanity` (requires `x-internal-token`) |
| **Hub route** | `/api/nexha/nexha-partner-graph/*` |

---

## What it does

For every tenant, the Partner Graph maintains:

1. **Partnerships** — one document per `(tenantId, partnerRef)` pair with cumulative metrics and a computed **strength** score.
2. **Interactions** — append-only log of events that update the partnership (6 types: transaction, negotiation, mission, contract, review, inquiry).
3. **Recommendations** — given an optional capability context, returns the best candidate partners ranked by 40% existing strength + 30% trust + 30% recency.

### Strength formula

`strength = 0.30 · score(count) + 0.30 · score(gmv) + 0.20 · score(rating) + 0.20 · score(recency)`

Where each `score(x)` is `min(log10(max(x,1)+1) / scale, 1)`:
- count: `log10(transactions+1) / 2` (caps at ~100 txns)
- gmv: `log10(gmv+1) / 5` (caps at ~$100k)
- rating: `rating / 5` (or 0.5 if no rating)
- recency: `1 - daysSinceLast / 365` (or 0 if never)

Result: every partnership has a 0–1 score that is comparable across tenants.

---

## Endpoints

All routes are tenant-scoped via `req.user.tenantId` (JWT) or `X-Tenant-Id` header. `requireAuth` and `optionalAuth` are exported by `src/middleware/auth.js`.

### Interactions

| Method | Path | Purpose |
|---|---|---|
| `POST` | `/api/interactions` | Record an interaction; updates the partnership on both sides |
| `GET` | `/api/interactions` | List interactions for the calling tenant (filterable by partnerRef, type, limit, offset) |

### Partnerships

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/api/partners` | List partnerships (filterable by relationshipType, limit, offset) |
| `GET` | `/api/partners/:partnerRef` | Get one partnership |
| `GET` | `/api/partners/by-type/:type` | List partnerships of a specific type (sorted by strength desc) |
| `POST` | `/api/recommend` | Recommend partners (40% strength + 30% trust + 30% recency) |
| `GET` | `/api/stats` | Tenant-wide summary: partners, interactions, total GMV |

### Operational

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/health` | Service liveness |
| `GET` | `/ready` | Mongo connection check |
| `GET` | `/` | Service info |
| `GET` | `/api/validate` | Lightweight 200 OK |
| `GET` | `/internal/sanity` | Hub health probe (x-internal-token) |

---

## Data model

### Partnership
```js
{
  tenantId,           // string, partition key
  partnerRef,         // string (e.g. business directory ref)
  partnerType,        // 'business' | 'agent' | 'user' | 'unknown'
  partnerName,        // human-readable
  relationshipType,   // 'supplier' | 'customer' | 'partner' | 'competitor' | 'unknown'
  transactionCount,   // int
  totalGmv,           // number (sum of interaction values)
  averageRating,      // 0-5 (null if no ratings)
  trustScore,         // 0-1 (default 0.5; updated by trust inputs)
  lastInteractionAt,  // Date
  tags,               // string[]
  strength,           // 0-1 computed
  metadata,           // free-form
}
```

Compound unique index on `(tenantId, partnerRef)` — same `partnerRef` can exist in different tenants.

### Interaction
```js
{
  tenantId,
  partnerRef,
  type,                // 'transaction'|'negotiation'|'mission'|'contract'|'review'|'inquiry'
  direction,           // 'outgoing'|'incoming'
  value,               // number
  currency,            // string (default 'USD')
  rating,              // 0-5 (optional)
  source,              // free string (e.g. 'nexha-mission-planner')
  sourceRef,           // source document id
  relationshipType,    // for partnership type inference
  tags, metadata,
  occurredAt,          // Date
}
```

### Relationship-type inference
When recording an interaction:
- If `metadata.relationshipType` or `tags` includes a known type → use it.
- Otherwise infer from `type`: `transaction` → `customer`/`supplier` (heuristic), `contract`/`mission` → `partner`, `review`/`inquiry` → `unknown`.

---

## Auth

Dual-mode (same pattern as mission-planner):

- **JWT** (HS256): `Authorization: Bearer <token>`. Verified against `JWT_SECRET` env. Sets `req.user.tenantId`.
- **Internal token**: `x-internal-token: <PARTNER_GRAPH_INTERNAL_TOKEN>`. Bypasses JWT; tenant must be supplied via `X-Tenant-Id` header.

Both modes are tested via `__tests__/unit/routes.test.js`.

---

## Configuration

| Env | Default | Purpose |
|---|---|---|
| `PORT` | `4363` | HTTP port |
| `PARTNER_GRAPH_PORT` | `4363` | Alt alias |
| `MONGODB_URI` | `mongodb://localhost:27017/nexha_partner_graph` | Mongo connection |
| `MONGO_URI` | (alias) | Alt alias |
| `JWT_SECRET` | `dev-secret-change-me` | JWT secret |
| `PARTNER_GRAPH_INTERNAL_TOKEN` | `pg-internal-dev-token` | Internal service token |

---

## Tests

67 vitest tests across two files:

```bash
npm test                  # runs all
npm run test:watch        # watch mode
```

- `__tests__/unit/partnerService.test.js` (33 tests) — model + service layer
- `__tests__/unit/routes.test.js` (34 tests) — HTTP layer (auth, validation, errors)

Uses `mongodb-memory-server` so no real Mongo is required.

---

## Hub integration

Wired in `RABTUL-Technologies/REZ-ecosystem-connector@1.6.0`:

```ts
'nexha-partner-graph': process.env.NEXHA_PARTNER_GRAPH_URL || 'http://localhost:4363',
```

Capabilities added:
- `partner-graph` → `nexha-partner-graph`
- `partner-recommendation` → `nexha-partner-graph`
- `transaction-history` → `nexha-partner-graph`

External callers reach the service at `/api/nexha/nexha-partner-graph/*`.

---

## Client libraries

- **REZ-Workspace** (`@rez/unified-fabric`): `NexhaConnection` has 7 partner-graph methods (recordInteraction, listInteractions, listPartners, getPartner, listPartnersByType, recommendPartners, getPartnerStats).
- **do-app** (TypeScript): `nexha.partnerGraph` exposes the same 7 methods + health.

---

## Future work

- Cross-tenant trust-graph queries (currently only same-tenant)
- Recommendation explainability (which features contributed to the score)
- Decay tuning (currently 365-day linear)
- Time-bucketed aggregations (weekly/monthly rollups)