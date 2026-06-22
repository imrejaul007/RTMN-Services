# nexha-acp-messaging

> **Per-tenant Agent Commerce Protocol with persistent negotiation state and full state-machine semantics.**
> ADR-0010 Phase 4 — June 22, 2026

The `nexha-acp-messaging` service is the canonical home for ACP (Agent Commerce Protocol) message exchange in the Nexha network. It implements the 8 ACP message types (`QUERY`, `QUOTE`, `COUNTER`, `ACCEPT`, `REJECT`, `ORDER`, `TRACK`, `DISPUTE`) defined in [`HOJAI-AI/sutar-os/agents/acp-protocol/SPEC.md`](https://github.com/imrejaul007/hojai-ai), and persists every message and negotiation state in MongoDB with strict per-tenant isolation.

**Port:** `4340` (default; override with `PORT`)

---

## Why this service exists

In the federated Nexha world, autonomous agents on different tenants need to negotiate, transact, and dispute. Without a single source of truth, negotiations would be re-interpreted by every consumer, transitions would be inconsistent, and disputes would be unresolvable.

`nexha-acp-messaging` provides:

- A **state machine** that rejects illegal message sequences (e.g., `QUERY → ACCEPT` without a `QUOTE`).
- A **persistent message log** for every negotiation, ordered and immutable.
- **Per-tenant isolation** — every read and write is scoped by `tenantId`. Cross-tenant reads require the internal-token path.
- A **stats endpoint** for per-tenant dashboards.
- A **`/api/validate`** endpoint so integrators can lint messages before sending.

---

## Quick start

```bash
# Install + test
npm install
npm test             # 59 tests (37 state machine + 22 routes)

# Run locally
INTERNAL_SERVICE_TOKEN=dev-token PORT=4340 \
  MONGODB_URI=mongodb://localhost:27017/nexha-acp-messaging \
  npm start
```

```bash
# Health check
curl http://localhost:4340/health
# { "status": "healthy", "service": "nexha-acp-messaging" }

# Validate a message without persisting
curl -X POST http://localhost:4340/api/validate \
  -H 'Content-Type: application/json' \
  -d '{
    "type": "QUERY",
    "sender": "agent-buyer-1",
    "receiver": "agent-seller-1",
    "intent": "Source 100 tons of steel",
    "context": { "quantity": 100, "unit": "tons" }
  }'
# { "valid": true, "cleaned": { ... } }
```

---

## ACP state machine

The full transition table (matches `HOJAI-AI/sutar-os/agents/acp-protocol/SPEC.md`):

| Current | Next valid |
|---|---|
| _start_ | `QUERY` |
| `QUERY` | `QUOTE`, `REJECT` |
| `QUOTE` | `COUNTER`, `ACCEPT`, `REJECT` |
| `COUNTER` | `COUNTER`, `ACCEPT`, `REJECT`, `QUOTE` |
| `ACCEPT` | `ORDER`, `REJECT` |
| `REJECT` | _(terminal)_ |
| `ORDER` | `TRACK`, `DISPUTE` |
| `TRACK` | `TRACK`, `DISPUTE`, `ORDER` |
| `DISPUTE` | `REJECT`, `ACCEPT`, `TRACK` |

A negotiation's `status` is computed from the most recent message:

| Status | Set when |
|---|---|
| `ACTIVE` | mid-conversation |
| `ACCEPTED` | `ACCEPT` received (waiting for `ORDER`) |
| `REJECTED` | `REJECT` received (terminal) |
| `COMPLETED` | `ORDER` after `ACCEPT` |
| `DISPUTED` | `DISPUTE` received |
| `EXPIRED` | (admin-driven; not auto-set) |

`COMPLETED` is informational — `TRACK` and `DISPUTE` are still accepted (per the ACP spec, `ORDER → TRACK` is a valid tracking flow).

---

## Endpoints

All endpoints (except `/health`, `/`, and `/api/validate`) require auth.

| Method | Path | Purpose |
|---|---|---|
| `POST` | `/api/negotiations` | Create a new negotiation (first message must be `QUERY`) |
| `GET`  | `/api/negotiations` | List the tenant's negotiations (filters: `status`, `agent`, `limit`) |
| `GET`  | `/api/negotiations/:id` | Get one negotiation |
| `GET`  | `/api/negotiations/:id/messages` | List messages in conversation order |
| `POST` | `/api/negotiations/:id/messages` | Append a message (validates state transition) |
| `GET`  | `/api/stats` | Per-tenant counts and by-status / by-type breakdowns |
| `POST` | `/api/validate` | Validate a message body without persisting |
| `GET`  | `/health` | Liveness |
| `GET`  | `/` | Service info + endpoint list |

### Response codes

| Code | When |
|---|---|
| `200` | success (existing negotiation updated) |
| `201` | success (new negotiation / new message created) |
| `400` | Zod / body validation error (`ACP_VALIDATION_ERROR`) |
| `401` | missing / invalid auth (`ACP_AUTH_REQUIRED`) |
| `404` | negotiation not found (or not visible to this tenant) |
| `422` | illegal ACP state transition (`ACP_INVALID_TRANSITION`, with `from` and `to` fields) |
| `500` | unhandled error |

---

## Auth

Two patterns, both supported:

1. **Internal service token** — `x-internal-token: <token>` (must match `INTERNAL_SERVICE_TOKEN` env var). The internal path **does not imply a tenant** — callers MUST also supply `x-tenant-id` header or `tenantId` in the body. This is by design, so cross-tenant federation jobs are explicit.
2. **JWT (CorpID)** — `Authorization: Bearer <RS256 JWT>`. The tenant is read from `claims.tenantId` (or `claims.organizationId`).

All write endpoints and `/api/stats` go through `requireAuth`. `/api/validate` and the read endpoints (negotiations list) use the same `requireAuth` middleware. `/health` and `/` are public.

---

## Data model

### `negotiations` collection

```js
{
  tenantId: 't-123',
  negotiationId: 'uuid',
  initiator: 'agent-buyer-1',
  responder: 'agent-seller-1',
  intent: 'Source 100 tons of steel',
  context: { quantity: 100, unit: 'tons' },
  status: 'ACTIVE' | 'ACCEPTED' | 'REJECTED' | 'COMPLETED' | 'DISPUTED' | 'EXPIRED',
  currentType: 'QUERY' | null,
  messageCount: 0,
  lastActivityAt: Date,
  completedAt: Date | null,
  metadata: { ... },
  createdAt: Date,
  updatedAt: Date
}
```

Indexes:
- `{ tenantId: 1, status: 1, lastActivityAt: -1 }`
- `{ tenantId: 1, initiator: 1, createdAt: -1 }`
- `{ tenantId: 1, responder: 1, createdAt: -1 }`
- `{ tenantId: 1, negotiationId: 1 }` (unique)

### `messages` collection

```js
{
  tenantId: 't-123',
  negotiationId: 'uuid',
  messageId: 'm-abc',   // unique per tenant
  type: 'QUERY',
  sender: 'agent-buyer-1',
  receiver: 'agent-seller-1',
  intent: '...',
  context: { ... },
  constraints: { ... },
  timeline: { ... },
  attachments: { ... },
  payload: { ... },
  parentMessageId: 'm-xyz' | null,
  metadata: { ... },
  createdAt: Date
}
```

Indexes:
- `{ tenantId: 1, negotiationId: 1, createdAt: 1 }`
- `{ tenantId: 1, sender: 1, createdAt: -1 }`
- `{ tenantId: 1, receiver: 1, createdAt: -1 }`
- `{ tenantId: 1, messageId: 1 }` (unique)

---

## Environment

| Var | Default | Required? | Purpose |
|---|---|---|---|
| `PORT` | `4340` | no | HTTP port |
| `MONGODB_URI` | `mongodb://localhost:27017/nexha-acp-messaging` | no (recommended to set) | Mongo connection string |
| `INTERNAL_SERVICE_TOKEN` | _(empty)_ | no (required to use the internal path) | Shared secret for the `x-internal-token` auth path |
| `JWT_PUBLIC_KEY` | _(empty)_ | no (required to accept Bearer JWTs) | RS256 public key |
| `NODE_ENV` | _(unset)_ | no | If `production`, the service fails fast on Mongo connection failure |
| `ALLOWED_ORIGINS` | `*` | no | Comma-separated CORS allowlist |

---

## Running the tests

```bash
npm test
```

59 tests across 2 files:

| File | Count | What it covers |
|---|---:|---|
| `__tests__/unit/stateMachine.test.js` | 37 | state machine transitions, message body validation, happy path, illegal transitions, tenant isolation, payload preservation, stats |
| `__tests__/unit/routes.test.js` | 22 | HTTP routes: health, info, validate, create negotiation, append message, list/get, stats, auth gating, tenant isolation, error mapping |

Tests use `mongodb-memory-server` — no external Mongo needed.

---

## Related services

| Service | Where it lives | What it does |
|---|---|---|
| `sutar-acp-protocol` | `HOJAI-AI/sutar-os/agents/acp-protocol/` | The original ACP spec + reference impl (single-tenant, in-memory) |
| `nexha-business-directory` | `companies/Nexha/services/nexha-business-directory/` | Per-tenant company/agent/capability registry |
| `nexha-event-bus` | `companies/Nexha/services/nexha-event-bus/` | Redis Streams pub/sub for federation events |
| RTMN Hub | `RABTUL-Technologies/REZ-ecosystem-connector/` | Exposes this service at `/api/nexha/nexha-acp-messaging/*` |

---

## License

Internal — RTMN ecosystem.
