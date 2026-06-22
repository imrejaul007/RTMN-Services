# RTMN Event Bus — Schema and Operations

> **Phase:** ADR-0009 Phase 2 (June 22, 2026)
> **Status:** ✅ Production-ready
> **Backend:** Redis Streams (`rtmn:events` stream, consumer groups per service)

The RTMN Event Bus is the durable, tenant-scoped, replayable backbone for
cross-service events. It replaces the previous in-memory event-bus at port
4510 with a Redis Streams-backed implementation while keeping the HTTP API
byte-compatible.

---

## Why

Before Phase 2, the event-bus at `platform/observability/event-bus/` used
in-memory `PersistentMap`s. State was lost on restart, replays were
in-process only, and scaling beyond a single node required a manual shim.

Phase 2 swaps the storage backend for Redis Streams. The HTTP API stays
identical so existing publishers (`goal-os`) and subscribers (`agent-teaming`)
keep working unchanged.

---

## Architecture

```
┌─────────────────────┐  XADD    ┌──────────────────────┐
│ sutar-decision-eng  │ ───────► │                      │
│ sutar-trust-engine  │ ───────► │   Redis Streams      │
│ sutar-economy-os    │ ───────► │   rtmn:events        │
│ 7 stub services     │ ───────► │                      │
└─────────────────────┘          │  consumer groups:    │
                                 │  cg:<service>:v1     │
                                 └──────────┬───────────┘
                                            │ XREADGROUP
                                            ▼
                                 ┌──────────────────────┐
                                 │ do-app subscriber    │
                                 │ (push notifications) │
                                 │ platform/observability│
                                 │ /event-bus (HTTP)    │
                                 └──────────────────────┘
```

- **One stream** for all events: `rtmn:events`
- **One consumer group per service** that subscribes: `cg:<service-name>:v1`
- **Per-stream MAXLEN ~ 10000** (configurable via `EVENT_BUS_MAXLEN` env var)
- **Publisher** = `EventBus.publish(type, payload, { tenantId })` from `@rtmn/shared/event-bus`
- **Subscriber** = `EventBus.subscribe(['pattern.*'], handler)` (consumer-group model)

---

## Envelope

Every event on the bus has this exact JSON shape:

```json
{
  "eventId": "8d2b4e88-1c0c-4a8b-b6e3-2c2e2e4a1a98",
  "type": "decision.made",
  "tenantId": "acme",
  "source": "sutar-decision-engine",
  "schemaVersion": "1.0",
  "emittedAt": "2026-06-22T20:00:00.000Z",
  "payload": { ... }
}
```

| Field | Type | Notes |
|---|---|---|
| `eventId` | UUID v4 | unique across all events |
| `type` | string | `<service>.<entity>.<action>` (see naming below) |
| `tenantId` | string \| null | `req.tenant.companyId` for tenant-scoped events; `null` for system events |
| `source` | string | service name (defaults to `SERVICE_NAME` env) |
| `schemaVersion` | string | currently `"1.0"` |
| `emittedAt` | ISO 8601 | when the event was published |
| `payload` | object | free-form; per-type schema documented below |

---

## Type naming convention

`<service-or-domain>.<entity>.<action>`

- `<service-or-domain>`: one of `decision`, `trust`, `transaction`, `payment`, `karma`, `escrow`, `billing`, `earnings`, `contract`, `negotiation`, `offer`, `agent`, `identity`, `memory`, `twin`, `service`, `alert`, `rfq`, `shipment`
- `<entity>`: the noun (e.g. `score`, `transaction`, `agent`, `rule`)
- `<action>`: past-tense verb (e.g. `created`, `updated`, `completed`, `resolved`)

Examples:
- `decision.made`
- `trust.score.calculated`
- `transaction.created`
- `payment.completed`
- `karma.earned`
- `contract.created`
- `contract.signed`
- `negotiation.accepted`
- `agent.capability.added`
- `twin.tag.added`
- `service.health.changed`
- `alert.resolved`

---

## Tenant propagation

Every event carries a `tenantId`. **The publisher is responsible** for reading
`req.tenant.companyId` (set by `createTenantContext` middleware from Phase 1)
and passing it as `options.tenantId`:

```ts
import { EventBus } from '@rtmn/shared/event-bus';

const bus = new EventBus({ serviceName: 'sutar-decision-engine' });
await bus.connect();

// In a route handler:
app.post('/api/v1/decide', async (req, res) => {
  const result = await decide(req.body);
  bus.publishAsync('decision.made', result, {
    tenantId: req.tenant?.companyId ?? null,
  });
  res.json(result);
});
```

`tenantId` is **always** populated when an event was emitted from a
tenant-scoped request. System events (no tenant) explicitly set
`tenantId: null` and are easy to grep for.

---

## Event catalog (Phase 2)

| Service | Type | Payload |
|---|---|---|
| decision-engine | `decision.made` | `{ decisionId, outcome }` |
| decision-engine | `decision.simulated` | `{ decisionId, variations: [...] }` |
| decision-engine | `option.ranked` | `{ winnerId, scores }` |
| decision-engine | `risk.assessed` | `{ entityId, level }` |
| decision-engine | `decision.stats.reset` | `{ tenantId }` |
| trust-engine | `trust.score.calculated` | `{ entityId, score }` |
| trust-engine | `reputation.aggregated` | `{ entityId, score }` |
| trust-engine | `credit.checked` | `{ entityId, limit }` |
| trust-engine | `verification.completed` | `{ entityId, status }` |
| trust-engine | `kyc.completed` | `{ entityId, status }` |
| economy-os | `transaction.created` | `{ txId, amount }` |
| economy-os | `payment.completed` | `{ paymentId }` |
| economy-os | `karma.earned` | `{ entityId, amount }` |
| economy-os | `karma.redeemed` | `{ entityId, amount }` |
| economy-os | `escrow.funded` | `{ escrowId }` |
| economy-os | `escrow.released` | `{ escrowId }` |
| economy-os | `billing.invoice.created` | `{ invoiceId }` |
| economy-os | `earnings.credited` | `{ entityId, amount }` |
| contract-os | `contract.created` | `{ contractId }` |
| contract-os | `contract.signed` | `{ contractId }` |
| contract-os | `contract.executed` | `{ contractId }` |
| contract-os | `contract.breached` | `{ contractId }` |
| contract-os | `template.created` | `{ templateId }` |
| negotiation-engine | `negotiation.created` | `{ negotiationId }` |
| negotiation-engine | `offer.made` | `{ negotiationId, offerId }` |
| negotiation-engine | `offer.countered` | `{ negotiationId, offerId }` |
| negotiation-engine | `negotiation.accepted` | `{ negotiationId }` |
| negotiation-engine | `negotiation.rejected` | `{ negotiationId }` |
| negotiation-engine | `negotiation.cancelled` | `{ negotiationId }` |
| negotiation-engine | `zopa.reached` | `{ negotiationId, price }` |
| agent-id | `agent.created` | `{ agentId }` |
| agent-id | `agent.capability.added` | `{ agentId, capability }` |
| agent-id | `agent.capability.removed` | `{ agentId, capability }` |
| agent-network | `agent.node.registered` | `{ agentId, nodeId }` |
| agent-network | `agent.node.heartbeat` | `{ agentId }` |
| agent-network | `agent.edge.added` | `{ edgeId, from, to }` |
| agent-network | `agent.message.sent` | `{ messageId, from, to }` |
| twin-os | `twin.created` | `{ twinId, type }` |
| twin-os | `twin.tag.added` | `{ twinId, tag }` |
| twin-os | `twin.tag.removed` | `{ twinId, tag }` |
| identity | `identity.created` | `{ identityId }` |
| identity | `identity.verified` | `{ identityId }` |
| memory-bridge | `memory.remembered` | `{ memoryId, partition }` |
| memory-bridge | `memory.recalled` | `{ memoryId, query }` |
| monitoring | `service.probed` | `{ service, status }` |
| monitoring | `alert.rule.created` | `{ ruleId }` |
| monitoring | `alert.rule.removed` | `{ ruleId }` |
| monitoring | `alert.resolved` | `{ alertId }` |
| monitoring | `service.health.changed` | `{ service, from, to }` |

**Total: ~50 distinct event types** across 12 SUTAR services.

---

## Subscribing

```ts
import { EventBus } from '@rtmn/shared/event-bus';

const bus = new EventBus({ serviceName: 'do-app' });
await bus.connect();

// Glob-style patterns: '*' matches one dot-segment
await bus.subscribe(
  ['decision.*', 'trust.score.calculated'],
  async (event) => {
    if (event.type === 'rfq.awarded') {
      await sendPushNotification(event.tenantId, event.payload);
    }
  },
  { from: 'latest' },   // or 'beginning' to backfill
);
```

Patterns:
- `decision.made` — exact match
- `decision.*` — matches `decision.made`, `decision.simulated`, etc.
- `*.calculated` — matches `trust.score.calculated`, `reputation.aggregated.calculated`, etc.
- `*` — matches everything

---

## Replay (ops / debugging)

Use the bundled script:

```bash
# Last 50 events from any service
bash scripts/event-replay.sh

# Last 200, filtered to decision.* and trust.* events
bash scripts/event-replay.sh --count 200 --type 'decision.*|trust.*'

# Only events from tenant 'acme'
bash scripts/event-replay.sh --tenant acme

# Replay events starting after a specific stream id
bash scripts/event-replay.sh --from 1737000000000-0

# Forward all events to a webhook URL (e.g. for incident review)
bash scripts/event-replay.sh --forward https://hooks.example.com/sink

# Tail live events
bash scripts/event-replay.sh --watch
```

---

## Health and stats

```ts
const h = await bus.health();
// { status: 'healthy', latencyMs: 0 }
const s = await bus.stats();
// { stream: 'rtmn:events', length: 12345, groups: [...], lastId: '...' }
```

Exposed at HTTP endpoints in the `:4510` event-bus service:
- `GET /health`
- `GET /api/stats`

---

## Configuration

| Env var | Default | Purpose |
|---|---|---|
| `REDIS_URL` | `redis://localhost:6379` | Redis connection URL |
| `EVENT_BUS_STREAM_PREFIX` | `rtmn:` | stream name prefix (stream = prefix + "events") |
| `EVENT_BUS_MAXLEN` | `10000` | approximate max events kept per stream (`XADD MAXLEN ~`) |
| `SERVICE_NAME` | `unknown` | identifies consumer group + envelope `source` field |
| `EVENT_BUS_URL` | `http://localhost:4510` | legacy: HTTP bus URL (kept for back-compat with old publishers) |

---

## Migration from in-memory bus

The HTTP event-bus at port 4510 (`platform/observability/event-bus/`) now
delegates storage to Redis Streams. The HTTP API surface is identical, so
existing publishers/subscribers need no code changes.

For new services, prefer the direct `@rtmn/shared/event-bus` client over the
HTTP wrapper for lower latency and richer API (pattern subscription, consumer
groups, replay).

---

## Testing

Tests skip gracefully when Redis is unreachable:

```bash
# Direct lib tests
cd companies/HOJAI-AI/shared
node test/event-bus.test.js          # 12 assertions (ESM)
node test/event-bus-cjs.test.cjs     # 4 assertions (CJS mirror)

# Per-service emit tests (vitest)
cd ../sutar-os/core/sutar-decision-engine
npx vitest run __tests__/unit/events.test.ts
```

---

## Related

- [ADR-0009 Phase 1 — Multi-Tenant SUTAR](ADR/0009-PHASE-1-MULTI-TENANCY-EXECUTION-LOG.md) — set up tenant context that flows into the envelope's `tenantId`
- [ADR-0009 Phase 2 — Execution Log](ADR/0009-PHASE-2-EXECUTION-LOG.md) — implementation audit
- [Source: `@rtmn/shared/event-bus`](../companies/HOJAI-AI/shared/event-bus/index.js)
- [Source: stub services helper](../companies/HOJAI-AI/sutar-os/core/sutar-shared/event-bus.js)
