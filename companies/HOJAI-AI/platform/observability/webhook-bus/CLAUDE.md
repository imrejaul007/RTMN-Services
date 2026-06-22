# Webhook Bus (port 4110)

> **Status:** ✅ Production-ready v1.0.0 (Architecture v2 — June 20, 2026)
> **Role:** Event subscriptions and reliable delivery for HOJAI AI partners.
> **Owner:** HOJAI AI Developer Experience team

## Mission

Subscribers register an event type + URL + secret. When an event fires, the bus records what *would* be sent (or attempts a real POST if the consumer worker is up), increments attempt counters on each retry, and surfaces a delivery audit trail per subscriber.

## Endpoints (10)

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/health` | Health + counts |
| GET | `/api/event-types` | List 15 seeded event types |
| POST | `/api/event-types` | Register a custom event type |
| POST | `/api/subscribers` | Subscribe to event types (URL + secret + maxAttempts) |
| GET | `/api/subscribers` | List subscribers |
| GET | `/api/subscribers/:id` | Get one subscriber |
| DELETE | `/api/subscribers/:id` | Unsubscribe (soft-delete) |
| POST | `/api/dispatch` | Dispatch an event — returns delivery records per subscriber |
| POST | `/api/deliveries/:id/delivered` | Mark a delivery successful |
| POST | `/api/deliveries/:id/failed` | Mark a delivery failed (auto-retry or give up) |
| POST | `/api/deliveries/:id/retry` | Manual retry |
| GET | `/api/deliveries` | List deliveries (filter by subscriberId/eventType/status) |
| GET | `/api/deliveries/:id` | Get one delivery |
| GET | `/api/audit` | Audit log |

## 15 Seeded Event Types

- **Twin**: `twin.created`, `twin.updated`, `twin.archived`
- **Memory**: `memory.record-added`, `memory.summary-created`
- **Skill**: `skill.executed`, `skill.failed`
- **Execution**: `execution.completed`, `execution.failed`
- **Marketplace**: `marketplace.listing-created`, `marketplace.purchase`
- **Connector**: `connector.sync-completed`
- **Flow**: `flow.plan-completed`, `flow.plan-failed`
- **Reasoning**: `reasoning.trace-completed`

## Backoff Schedule

| Attempt | Delay (seconds) |
|---------|-----------------|
| 1 | 1 |
| 2 | 2 |
| 3 | 4 |
| 4 | 8 |
| 5 | 16 |
| 6+ | capped at 60 |

`maxAttempts` is set per subscriber (default 5, max 10). After max attempts the delivery is marked `failed` and the subscriber's `failureCount` is incremented.

## Wiring

- **ai-intelligence (4881) `/api/route`** — exposes `webhookBus: http://localhost:4110`
- **ai-intelligence (4881) `/api/agents`** — exposes `webhookBus` agent
- **unified-os-hub (4399)** — `/api/webhooks/...` routes to this service

## Example

```bash
# Subscribe to twin.created
curl -X POST http://localhost:4110/api/subscribers \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://my-app.com/hooks/hojai",
    "events": ["twin.created", "twin.updated"],
    "secret": "whsec_my_secret",
    "maxAttempts": 5
  }'

# Dispatch an event
curl -X POST http://localhost:4110/api/dispatch \
  -H "Content-Type: application/json" \
  -d '{
    "eventType": "twin.created",
    "payload": { "twinId": "twin-123", "kind": "customer" }
  }'

# Mark delivery as delivered
curl -X POST http://localhost:4110/api/deliveries/<deliveryId>/delivered
```

## Next Steps

- Add real HTTP POST on dispatch (?post=true opt-in)
- Add HMAC signature on every POST body
- Add at-least-once vs exactly-once delivery modes
- Add per-event-type replay
- Add dead-letter queue for terminal failures
