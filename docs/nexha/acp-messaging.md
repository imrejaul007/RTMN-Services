# nexha-acp-messaging

> **Per-tenant Agent Commerce Protocol with persistent negotiation state and full state-machine semantics.**
> ADR-0010 Phase 4 — June 22, 2026

The `nexha-acp-messaging` service is the canonical home for ACP (Agent Commerce Protocol) message exchange in the Nexha network. It implements all 8 ACP message types from `HOJAI-AI/sutar-os/agents/acp-protocol/SPEC.md`:

```
QUERY → QUOTE → COUNTER → ACCEPT → ORDER → TRACK → [DISPUTE]
   ↓      ↓        ↓        ↓
  REJECT (terminal anywhere)
```

Every negotiation is persisted in MongoDB with strict per-tenant isolation. Cross-tenant reads are not possible — they require the internal-token path AND an explicit `x-tenant-id` header.

This service complements the existing single-tenant `sutar-acp-protocol` in HOJAI-AI: `sutar-acp-protocol` is the reference impl / spec holder; `nexha-acp-messaging` is the multi-tenant durable store for the Nexha network.

**Path:** `companies/Nexha/services/nexha-acp-messaging/`
**Port:** `4340`
**Auth:** JWT (RS256) + `x-internal-token`
**Storage:** MongoDB via Mongoose

---

## Quick start

```bash
# Local dev
cd companies/Nexha/services/nexha-acp-messaging
npm install
npm test                              # 59 tests

INTERNAL_SERVICE_TOKEN=dev-token \
  MONGODB_URI=mongodb://localhost:27017/nexha-acp-messaging \
  PORT=4340 npm start
```

```bash
# Health check via the Hub
curl http://localhost:4399/api/nexha/nexha-acp-messaging/health
# { "status": "healthy", "service": "nexha-acp-messaging" }

# Validate a message without persisting
curl -X POST http://localhost:4399/api/nexha/nexha-acp-messaging/api/validate \
  -H 'Content-Type: application/json' \
  -d '{
    "type": "QUERY",
    "sender": "agent-buyer-1",
    "receiver": "agent-seller-1",
    "intent": "Source 100 tons of steel",
    "context": { "quantity": 100, "unit": "tons" }
  }'
```

---

## State machine

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
| `COMPLETED` | `ORDER` received after `ACCEPT` |
| `DISPUTED` | `DISPUTE` received |
| `EXPIRED` | (admin-driven; not auto-set) |

`COMPLETED` is informational — `TRACK` and `DISPUTE` are still accepted (per the ACP spec, `ORDER → TRACK` is a valid tracking flow). Only `REJECTED` is terminal.

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

All write endpoints and `/api/stats` go through `requireAuth`. `/api/validate` is public so external integrators can lint messages before sending.

---

## Data model

### `negotiations` collection

```js
{
  tenantId:       't-123',
  negotiationId:  'uuid',
  initiator:      'agent-buyer-1',
  responder:      'agent-seller-1',
  intent:         'Source 100 tons of steel',
  context:        { quantity: 100, unit: 'tons' },
  status:         'ACTIVE' | 'ACCEPTED' | 'REJECTED' | 'COMPLETED' | 'DISPUTED' | 'EXPIRED',
  currentType:    'QUERY' | null,
  messageCount:   0,
  lastActivityAt: Date,
  completedAt:    Date | null,
  metadata:       { ... },
  createdAt:      Date,
  updatedAt:      Date
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
  tenantId:        't-123',
  negotiationId:   'uuid',
  messageId:       'm-abc',   // unique per tenant
  type:            'QUERY',
  sender:          'agent-buyer-1',
  receiver:        'agent-seller-1',
  intent:          '...',
  context:         { ... },
  constraints:     { ... },
  timeline:        { ... },
  attachments:     { ... },
  payload:         { ... },
  parentMessageId: 'm-xyz' | null,
  metadata:        { ... },
  createdAt:       Date
}
```

Indexes:
- `{ tenantId: 1, negotiationId: 1, createdAt: 1 }` — for message-log reads
- `{ tenantId: 1, sender: 1, createdAt: -1 }` — for "what did I send?"
- `{ tenantId: 1, receiver: 1, createdAt: -1 }` — for "what was sent to me?"
- `{ tenantId: 1, messageId: 1 }` (unique)

---

## Design decisions

1. **`negotiationId` is a fresh UUID per negotiation** — not derived from the QUERY's `messageId`. This decouples the two and lets the same `messageId` value be reused across different negotiations within a tenant (e.g., per-test fixtures).

2. **`messageId` and `negotiationId` are unique per tenant**, not globally. This matches the multi-tenant reality — the same identifier may legitimately be used by two different tenants for two different negotiations.

3. **`COMPLETED` is not terminal.** Per the ACP spec, `ORDER → TRACK` is valid (e.g., "where's my order?"). The state machine accepts `TRACK`, `DISPUTE`, and even `ORDER` after `COMPLETED`. Only `REJECTED` freezes the conversation.

4. **Env vars are read at request time, not at module load.** This lets tests swap `INTERNAL_SERVICE_TOKEN` with `beforeAll` without re-importing the module.

5. **Auto-start only on direct run.** `src/index.js` checks `import.meta.url === file://${process.argv[1]}` before calling `start()`. This lets `app` be imported by tests without binding port 4340.

6. **All state-machine rules live in one file** (`src/services/stateMachine.js`). This makes the rules easy to audit, modify, and test in isolation. The HTTP routes are thin.

7. **Zod is the source of truth for body shape**, with a custom `safeParse` wrapper that returns 400 + a flat error message. The state machine does its own type-specific field checks (e.g., `DISPUTE` requires `payload.reason`) and throws `ValidationError` (400) on failure.

---

## Tests

59 vitest tests, 0 failures. Run with `npm test`.

| File | Count | Coverage |
|---|---:|---|
| `__tests__/unit/stateMachine.test.js` | 37 | `isTerminal`, `isValidTransition` (every allowed/forbidden pair), `validateMessageBody` (every type's required fields), `appendMessage` (full happy path, terminal states, illegal transitions, tenant isolation, payload preservation), `listMessages`, `getNegotiation`, `listNegotiations` (status, agent, limit), `getStats` (counts + byStatus + byType, tenant scoping) |
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

## Client usage

### do-app (`nexha.acpMessaging`)

```ts
import { nexha } from '../services/hojaiClient.js';

// Start a new negotiation
const out = await nexha.acpMessaging.sendMessage({
  type: 'QUERY', sender: 'agent-buyer-1', receiver: 'agent-seller-1',
  intent: 'Source 100 tons of steel', tenantId: 't-1',
});
console.log(out.negotiation.negotiationId);  // → uuid

// Append a QUOTE
await nexha.acpMessaging.sendMessage({
  type: 'QUOTE', sender: 'agent-seller-1', receiver: 'agent-buyer-1',
  payload: { unitPrice: 1200, currency: 'INR', leadTimeDays: 14 },
  tenantId: 't-1', negotiationId: out.negotiation.negotiationId,
});

// List tenant's ACTIVE negotiations
const list = await nexha.acpMessaging.listNegotiations({ status: 'ACTIVE', tenantId: 't-1' });

// Per-tenant stats
const stats = await nexha.acpMessaging.stats();
```

### REZ-Workspace (`NexhaConnection`)

```js
const c = new NexhaConnection({ token: 'jwt-abc' });

// Send (start or append depending on negotiationId)
const out = await c.sendAcpMessage({
  type: 'QUERY', sender: 'a', receiver: 'b', intent: 'x', tenantId: 't-1',
});

// Validate without persisting
const v = await c.validateAcpMessage({ type: 'QUERY', sender: 'a', receiver: 'b', intent: 'x' });

// Get the message log
const msgs = await c.listAcpMessages(out.negotiation.negotiationId);

// Per-tenant stats
const stats = await c.getAcpStats();
```

### HTTP (direct, e.g. via the Hub)

```bash
# Via the Hub
curl -X POST http://localhost:4399/api/nexha/nexha-acp-messaging/api/negotiations \
  -H 'x-internal-token: dev-token' \
  -H 'x-tenant-id: t-1' \
  -H 'Content-Type: application/json' \
  -d '{"type":"QUERY","sender":"a","receiver":"b","intent":"x"}'

# Direct (bypasses the Hub)
curl -X POST http://localhost:4340/api/negotiations \
  -H 'x-internal-token: dev-token' \
  -H 'x-tenant-id: t-1' \
  -H 'Content-Type: application/json' \
  -d '{"type":"QUERY","sender":"a","receiver":"b","intent":"x"}'
```

---

## Related

| Service | Where it lives | What it does |
|---|---|---|
| `sutar-acp-protocol` | `HOJAI-AI/sutar-os/agents/acp-protocol/` | The original ACP spec + reference impl (single-tenant, in-memory) |
| `nexha-business-directory` | `companies/Nexha/services/nexha-business-directory/` | Per-tenant company/agent registry. Agents in ACP messages typically come from this directory. |
| `nexha-event-bus` | `companies/Nexha/services/nexha-event-bus/` | Redis Streams pub/sub for federation events. Consumers can subscribe to react to ACP state changes (`order.placed`, `dispute.opened`, etc.) |
| RTMN Hub | `RABTUL-Technologies/REZ-ecosystem-connector/` | Exposes this service at `/api/nexha/nexha-acp-messaging/*` (Phase 4 wiring, 2026-06-22) |

---

*Last updated: 2026-06-22*
