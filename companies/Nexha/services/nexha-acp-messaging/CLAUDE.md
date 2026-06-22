# nexha-acp-messaging — Service Guide

> **nexha-acp-messaging** — Per-tenant Agent Commerce Protocol with persistent negotiation state, message logs, and full state-machine semantics.
> **ADR:** [0010 — Multi-Tenant Federation](../../../../docs/adr/0010-MULTI-TENANT-FEDERATION.md) (Phase 4)
> **Status:** ✅ Done — 59 vitest tests, 0 failures
> **Port:** `4340`
> **Path:** `companies/Nexha/services/nexha-acp-messaging/`
> **Started:** 2026-06-22

---

## What this service does

`nexha-acp-messaging` is the canonical home for ACP (Agent Commerce Protocol) message exchange in the Nexha network. It implements all 8 ACP message types from `HOJAI-AI/sutar-os/agents/acp-protocol/SPEC.md`:

```
QUERY → QUOTE → COUNTER → ACCEPT → ORDER → TRACK → [DISPUTE]
   ↓      ↓        ↓        ↓
  REJECT (terminal anywhere)
```

Every negotiation is persisted in MongoDB with strict per-tenant isolation. Cross-tenant reads are not possible — they require the internal-token path and an explicit `x-tenant-id` header.

This service complements the existing single-tenant `sutar-acp-protocol` in HOJAI-AI: `sutar-acp-protocol` is the reference impl / spec holder; `nexha-acp-messaging` is the multi-tenant durable store for the Nexha network.

---

## Architecture

```
                ┌──────────────────────────────────────────┐
                │      nexha-acp-messaging  (port 4340)     │
                ├──────────────────────────────────────────┤
   HTTP ──►     │  helmet + cors + compression + morgan    │
                │  requireAuth (JWT | x-internal-token)    │
                │  Zod body validation                     │
                │  ↓                                       │
                │  stateMachine.appendMessage()            │
                │  ├─ validateMessageBody(type, body)      │
                │  ├─ isValidTransition(currentType, type) │
                │  ├─ Negotiation.create / findOne         │
                │  └─ Message.create                       │
                │  ↓                                       │
                │  Mongoose (MongoDB)                      │
                └──────────────────────────────────────────┘
                            │
                            ▼
                ┌──────────────────────────┐
                │  MongoDB collections     │
                │  ├─ negotiations         │
                │  └─ messages             │
                └──────────────────────────┘
```

The state machine is a single file (`src/services/stateMachine.js`) so the rules are easy to audit and modify. Routes are thin — they just translate HTTP into state-machine calls.

---

## File map

```
nexha-acp-messaging/
├── package.json
├── vitest.config.js
├── README.md                                 (full API doc)
├── CLAUDE.md                                 (this file)
├── src/
│   ├── index.js                              Express app entry; only auto-starts when run directly
│   ├── models/
│   │   ├── Message.js                        8 message types + transition table
│   │   └── Negotiation.js                    6 statuses, computed from message type
│   ├── services/
│   │   └── stateMachine.js                   StateTransitionError + ValidationError + all the rules
│   ├── middleware/
│   │   └── auth.js                           JWT (RS256) + x-internal-token
│   └── routes/
│       └── index.js                          Zod-validated routes
└── __tests__/
    ├── helpers/
    │   └── db.js                             mongodb-memory-server setup
    └── unit/
        ├── stateMachine.test.js              37 tests
        └── routes.test.js                    22 tests
```

---

## State machine rules (the contract)

| Current | Next valid |
|---|---|
| _start_ | `QUERY` |
| `QUERY` | `QUOTE`, `REJECT` |
| `QUOTE` | `COUNTER`, `ACCEPT`, `REJECT` |
| `COUNTER` | `COUNTER`, `ACCEPT`, `REJECT`, `QUOTE` |
| `ACCEPT` | `ORDER`, `REJECT` |
| `REJECT` | _(terminal — no further messages accepted)_ |
| `ORDER` | `TRACK`, `DISPUTE` |
| `TRACK` | `TRACK`, `DISPUTE`, `ORDER` |
| `DISPUTE` | `REJECT`, `ACCEPT`, `TRACK` |

Status mapping:

| Status | Set when |
|---|---|
| `ACTIVE` | mid-conversation |
| `ACCEPTED` | `ACCEPT` received (waiting for `ORDER`) |
| `REJECTED` | `REJECT` received (terminal) |
| `COMPLETED` | `ORDER` received after `ACCEPT` |
| `DISPUTED` | `DISPUTE` received |
| `EXPIRED` | admin-driven only (not auto-set) |

Note: `COMPLETED` does **not** freeze the negotiation. Per the ACP spec, `ORDER → TRACK` is a valid flow (e.g., "where's my order?"). The state machine allows `TRACK`, `DISPUTE`, and even `ORDER` after `COMPLETED`. Only `REJECTED` is terminal.

---

## API surface

| Method | Path | Auth | Purpose |
|---|---|---|---|
| `GET`  | `/` | none | Service info + endpoint list |
| `GET`  | `/health` | none | Liveness |
| `POST` | `/api/validate` | none | Lint a message body without persisting |
| `POST` | `/api/negotiations` | required | Create new negotiation (first message must be `QUERY`) |
| `GET`  | `/api/negotiations` | required | List tenant's negotiations (filters: `status`, `agent`, `limit`) |
| `GET`  | `/api/negotiations/:id` | required | Get one negotiation |
| `GET`  | `/api/negotiations/:id/messages` | required | List messages in conversation order |
| `POST` | `/api/negotiations/:id/messages` | required | Append a message (validates state transition) |
| `GET`  | `/api/stats` | required | Per-tenant counts + by-status + by-type |

### Response codes

| Code | When |
|---|---|
| `200` | Success (existing negotiation updated) |
| `201` | Success (new negotiation / new message) |
| `400` | Zod / body validation error (`code: ACP_VALIDATION_ERROR`) |
| `401` | Missing/invalid auth (`code: ACP_AUTH_REQUIRED`) |
| `404` | Negotiation not found OR not visible to this tenant |
| `422` | Illegal ACP state transition (`code: ACP_INVALID_TRANSITION`, with `from` and `to` fields) |
| `500` | Unhandled error |

---

## Auth

Two paths, both supported:

1. **Internal service token** — `x-internal-token: <token>` (must match `INTERNAL_SERVICE_TOKEN`).
   - The internal path **does not imply a tenant**. Callers MUST also supply `x-tenant-id` header OR `tenantId` in body. This is intentional — cross-tenant federation jobs should be explicit.
2. **JWT (CorpID)** — `Authorization: Bearer <RS256 JWT>`. Tenant is read from `claims.tenantId` (or `claims.organizationId`).

Env vars are read at request time (not at module load), so tests can swap them with `beforeAll`.

---

## Data model

### `negotiations` collection

```js
{
  tenantId:      't-123',
  negotiationId: 'uuid',
  initiator:     'agent-buyer-1',
  responder:     'agent-seller-1',
  intent:        'Source 100 tons of steel',
  context:       { quantity: 100, unit: 'tons' },
  status:        'ACTIVE' | 'ACCEPTED' | 'REJECTED' | 'COMPLETED' | 'DISPUTED' | 'EXPIRED',
  currentType:   'QUERY' | null,
  messageCount:  0,
  lastActivityAt: Date,
  completedAt:   Date | null,
  metadata:      { ... },
  createdAt:     Date,
  updatedAt:     Date
}
```

Indexes:
- `{ tenantId: 1, status: 1, lastActivityAt: -1 }` — for `?status=` filter
- `{ tenantId: 1, initiator: 1, createdAt: -1 }` — for "what did I initiate?"
- `{ tenantId: 1, responder: 1, createdAt: -1 }` — for "what am I responding to?"
- `{ tenantId: 1, negotiationId: 1 }` (unique)

### `messages` collection

```js
{
  tenantId:         't-123',
  negotiationId:    'uuid',
  messageId:        'm-abc',   // unique per tenant
  type:             'QUERY',
  sender:           'agent-buyer-1',
  receiver:         'agent-seller-1',
  intent:           '...',
  context:          { ... },
  constraints:      { ... },
  timeline:         { ... },
  attachments:      { ... },
  payload:          { ... },
  parentMessageId:  'm-xyz' | null,
  metadata:         { ... },
  createdAt:        Date
}
```

Indexes:
- `{ tenantId: 1, negotiationId: 1, createdAt: 1 }` — for message-log reads
- `{ tenantId: 1, sender: 1, createdAt: -1 }` — for "what did I send?"
- `{ tenantId: 1, receiver: 1, createdAt: -1 }` — for "what was sent to me?"
- `{ tenantId: 1, messageId: 1 }` (unique)

---

## Tests

59 vitest tests, 0 failures. Run with `npm test`.

| File | Count | Coverage |
|---|---:|---|
| `__tests__/unit/stateMachine.test.js` | 37 | isTerminal, isValidTransition (every allowed/forbidden pair), validateMessageBody (every type's required fields), appendMessage (full happy path, terminal states, illegal transitions, tenant isolation, payload preservation), listMessages, getNegotiation, listNegotiations (status, agent, limit), getStats (counts + byStatus + byType, tenant scoping) |
| `__tests__/unit/routes.test.js` | 22 | GET /health, GET /, POST /api/validate, auth gating, POST /api/negotiations, POST /api/negotiations/:id/messages, GET /api/negotiations (list + cross-tenant + status filter), GET /api/negotiations/:id (with cross-tenant 404), GET /api/negotiations/:id/messages, GET /api/stats, 400/401/404/422 error mapping |

Tests use `mongodb-memory-server` — no external Mongo needed.

---

## Environment

| Var | Default | Required? | Purpose |
|---|---|---|---|
| `PORT` | `4340` | no | HTTP port |
| `MONGODB_URI` | `mongodb://localhost:27017/nexha-acp-messaging` | recommended | Mongo connection string |
| `INTERNAL_SERVICE_TOKEN` | _(empty)_ | required to use internal path | Shared secret for `x-internal-token` |
| `JWT_PUBLIC_KEY` | _(empty)_ | required to accept Bearer JWTs | RS256 public key |
| `NODE_ENV` | _(unset)_ | no | If `production`, fail-fast on Mongo failure |
| `ALLOWED_ORIGINS` | `*` | no | Comma-separated CORS allowlist |

---

## Dev quickstart

```bash
cd companies/Nexha/services/nexha-acp-messaging
npm install
npm test

# Run locally
INTERNAL_SERVICE_TOKEN=dev-token \
  MONGODB_URI=mongodb://localhost:27017/nexha-acp-messaging \
  npm start
```

---

## Related

- **HOJAI-AI/sutar-os/agents/acp-protocol/** — the original ACP spec and reference implementation (single-tenant, in-memory). The state machine in `nexha-acp-messaging` follows the same transition rules.
- **nexha-business-directory** (port 4360) — the per-tenant company/agent registry. Agents in ACP messages typically come from this directory.
- **nexha-event-bus** (port 4380) — emits `contract.signed`, `order.placed`, etc. Consumers can subscribe to react to ACP state changes.
- **RTMN Hub** (port 4399) — exposes this service at `/api/nexha/nexha-acp-messaging/*` once Phase 4 wiring is committed.

---

*Last updated: 2026-06-22*
