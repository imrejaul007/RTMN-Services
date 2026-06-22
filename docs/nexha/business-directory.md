# nexha-business-directory

**Service:** `nexha-business-directory`
**Port:** 4360
**Owner:** `companies/Nexha/`
**Status:** ✅ Production (ADR-0009 Phase 3, 2026-06-22)
**Tests:** 68 / 68 pass

## What it does

The **canonical registry of nexhas** — companies and AI agents registered in the network, plus their capabilities and public trust scores. Every external consumer (do-app, REZ-Workspace, third-party scripts) hits this directory through the Hub to discover real, trusted counterparties.

## Architecture

```
┌────────────────┐
│ do-app (HTTP)  │ ─┐
└────────────────┘  │
                    │  proxy through Hub (4399)
┌────────────────┐  │  /api/nexha/nexha-business-directory/*
│ REZ-Workspace  │ ─┤
└────────────────┘  │
                    ▼
        ┌──────────────────────────┐
        │   nexha-business-dir     │
        │   :4360                  │
        │   ┌──────────────────┐   │
        │   │ routes (Zod)     │   │
        │   ├──────────────────┤   │      ┌──────────────┐
        │   │ auth middleware  │◄──┼──────│ CorpID JWT    │
        │   ├──────────────────┤   │      └──────────────┘
        │   │ directoryService │   │      ┌──────────────┐
        │   ├──────────────────┤   │◄─────┤ SADA /public  │
        │   │ Company + Agent  │   │      └──────────────┘
        │   │   Mongoose models│   │
        │   └──────────────────┘   │
        └─────────────┬────────────┘
                      │
                      ▼
              ┌───────────────┐
              │ MongoDB       │
              │ (text index   │
              │  + compound)  │
              └───────────────┘
```

## Endpoints

All endpoints are reachable via the Hub at `/api/nexha/nexha-business-directory/...`. Direct access on port 4360 is supported for in-process callers and tests.

### Companies

| Method | Path | Purpose |
|---|---|---|
| `POST` | `/companies` | Register a company (requires JWT or internal token) |
| `GET` | `/companies` | List companies (optional `tenantId`, `status`, `capability` query) |
| `GET` | `/companies/:id` | Fetch one company |
| `PATCH` | `/companies/:id` | Update mutable fields |
| `DELETE` | `/companies/:id` | Soft-delete (status → `inactive`) |

### Agents

| Method | Path | Purpose |
|---|---|---|
| `POST` | `/agents` | Register an AI agent linked to a company |
| `GET` | `/agents` | List agents (optional `companyId`, `capability` query) |
| `GET` | `/agents/:id` | Fetch one agent |
| `PATCH` | `/agents/:id` | Update mutable fields |
| `DELETE` | `/agents/:id` | Soft-delete |

### Capabilities

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/capabilities/search?q=<text>` | Free-text + indexed capability search across companies + agents |
| `GET` | `/capabilities/graph` | Capability co-occurrence graph (edges when ≥2 entities share a capability) |

### Trust linkage

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/trust/:entityId` | Aggregated public trust (calls SADA `/public/trust/:entityId`) |

### Health

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/health` | Liveness + MongoDB connectivity |
| `GET` | `/.well-known/ready` | Readiness |

## Data Model

### `Company`

```js
{
  _id: ObjectId,
  tenantId: 't-1',                      // REQUIRED — tenant isolation
  externalId: 'sup-acme-001',          // OPTIONAL — caller-supplied stable id
  name: 'ACME Steel Supply',
  description: 'Hot-rolled steel sheet, structural beams, custom cuts',
  industry: 'manufacturing',
  capabilities: ['steel-supply', 'metal-fabrication', 'custom-cutting'],
  location: { city: 'Pittsburgh', country: 'US', lat: 40.44, lng: -79.99 },
  contact: { email: 'sales@acme.example', phone: '+1-412-555-0100', website: 'https://acme.example' },
  status: 'active',                     // 'active' | 'inactive' | 'pending_verification'
  trustScore: 87,                       // cache, refreshed from SADA
  metadata: { ... },                    // free-form
  createdAt: ISODate,
  updatedAt: ISODate
}
```

Indexes: `tenantId`, `(capabilities, status)` compound, text index on `name + description + industry`.

### `Agent`

```js
{
  _id: ObjectId,
  tenantId: 't-1',
  companyId: ObjectId,                  // FK → Company
  externalId: 'agt-price-bot-01',
  name: 'Price Comparison Bot',
  type: 'AGENT',                        // AGENT | BOT | COPILOT
  category: 'pricing',                  // pricing | sourcing | logistics | support | ...
  capabilities: ['price-compare', 'supplier-rank', 'demand-forecast'],
  status: 'active',
  trustScore: 92,
  metadata: { ... },
  createdAt: ISODate,
  updatedAt: ISODate
}
```

Indexes: `tenantId`, `companyId`, `capabilities`.

## Auth

Three modes (chosen by `authMiddleware` in `src/middleware/auth.js`):

| Mode | Header | Resulting `req.user` |
|---|---|---|
| **JWT** | `Authorization: Bearer <jwt>` | `{ userId, tenantId, organizationId, roles }` |
| **Internal token** | `x-internal-token: <INTERNAL_SERVICE_TOKEN>` | `{ internal: true, tenantId: null }` — caller MUST supply `x-tenant-id` header or `tenantId` body field |
| **None** | (no header) | `req.user = null` — only `GET` endpoints with `optionalAuth` allow this |

Tenant isolation: every write requires `req.user.tenantId === entity.tenantId`. The internal-token path sets `tenantId: null` deliberately so cross-tenant writes (admin tooling, batch jobs) are explicit and audit-loggable.

## Write publishers (today)

| Publisher | Trigger | Method |
|---|---|---|
| `sutar-agent-twin` | every `PUT /twins/:id` where twin is an agent with a businessId | `registerCompanyWithAgents()` from `@rtmn/shared/directory-client` |

Future publishers (planned for Phase 8+):

- `nexha-supplier-network` — when a supplier is verified
- `nexha-pricing-network` — when a market is opened
- `nexha-distribution-network` — when a logistics lane is opened
- do-app — when a user creates a business profile

## Tests (68 total)

| Suite | Count | Coverage |
|---|---|---|
| `directoryService.test.js` | 32 | CRUD, search, capability normalization, trust linkage, seed |
| `auth.test.js` | 11 | JWT, internal token, no-auth, tenant extraction |
| `routes.test.js` | 25 | HTTP integration via supertest, Zod 400s, tenant isolation 403s, soft-delete |

All tests run against `mongodb-memory-server` — no external MongoDB needed in CI.

## Run it

```bash
cd companies/Nexha/services/nexha-business-directory

# Install
npm install

# Run tests (uses mongodb-memory-server, no external DB needed)
npm test

# Run dev server (port 4360, expects MongoDB at MONGODB_URI)
MONGODB_URI=mongodb://localhost:27017/nexha-business-directory \
  INTERNAL_SERVICE_TOKEN=$(openssl rand -hex 32) \
  JWT_PUBLIC_KEY=$(cat ../shared/auth/public.pem) \
  npm run dev

# Verify
curl http://localhost:4360/health

# Try via the Hub
curl http://localhost:4399/api/nexha/capabilities | jq '.capabilities'
```

## Environment

| Var | Required | Default | Purpose |
|---|---|---|---|
| `PORT` | no | `4360` | HTTP port |
| `MONGODB_URI` | yes | `mongodb://localhost:27017/nexha-business-directory` | Mongo connection string |
| `JWT_PUBLIC_KEY` | yes (prod) | — | RS256 public key (PEM) for verifying CorpID JWTs |
| `INTERNAL_SERVICE_TOKEN` | yes (prod) | — | Shared secret for SUTAR / Nexha publishers |
| `SADA_URL` | no | `http://localhost:4190` | Where to read public trust from |
| `SEED_DEMO` | no | `false` | If `true`, seeds 5 demo companies + 5 agents on startup |

## Why this design

1. **One canonical directory, not two.** We considered separate registries for "nexhas" vs "sutar agents". We chose one — agents are *children* of companies. This matches reality (every AI agent belongs to a business) and avoids join gymnastics for the consumer.
2. **MongoDB text index, not ElasticSearch.** Phase 3 doesn't need faceted search or relevance tuning. Text search + capability filter is good enough for ~10k entities. Revisit at 100k+ entities.
3. **Internal token, not service-to-service JWT.** Publishers are *trusted internal* services. A long shared secret with `x-internal-token` is simpler and audit-friendly. JWTs are for *external* users.
4. **Sanitized public trust, not raw SADA data.** The directory calls SADA's `/public/trust/:id` and never touches the raw history. PII stays in SADA.
5. **Capability strings, not enums.** Capabilities are an open vocabulary. New industries add new strings. Normalization (lowercase, dedupe, max 50 per entity) keeps cardinality manageable.

## Open follow-ups

- Add a `/.well-known/openapi.json` for the public endpoints
- Add a small CLI in `bin/cli.js` for backfill / admin operations
- Add a cache layer for `/trust/:entityId` (currently calls SADA on every read; 60s TTL is plenty)
- Decide whether to embed the directory data into the existing RTMN Hub `/api/services` listing for unified discovery
