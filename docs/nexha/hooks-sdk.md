# nexha-hooks-sdk

> **ADR-0011 Phase 12 (2026-06-23)** — Webhook subscriptions with HMAC-SHA256 signing and exponential retry.

## What it does

Lets external systems subscribe to **28+ event types** from the Nexha federation and receive reliable, signed webhook deliveries with automatic retry on failure.

## Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                    nexha-hooks-sdk (4386)                            │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  Event source (sutar/industry/provisioning/...)                     │
│       │                                                             │
│       ▼  POST /api/events                                           │
│  ┌─────────────────────────────────────────────────────┐           │
│  │             hooksService.emitEvent()                 │           │
│  │   • Looks up active subscriptions for eventType      │           │
│  │   • Wildcard `*` matches everything                  │           │
│  │   • Creates one HookDelivery per matching sub        │           │
│  └─────────────────────────────────────────────────────┘           │
│       │                                                             │
│       ▼  POST /api/deliveries/process (cron / worker)               │
│  ┌─────────────────────────────────────────────────────┐           │
│  │          hooksService.processDeliveries()            │           │
│  │   • Loads due deliveries (nextAttemptAt <= now)     │           │
│  │   • Signs payload with HMAC-SHA256 + subscription    │           │
│  │     secret                                         │           │
│  │   • POSTs to subscriber's targetUrl                  │           │
│  │   • On failure: schedule next retry per schedule     │           │
│  │   • On maxAttempts: mark FAILED                      │           │
│  └─────────────────────────────────────────────────────┘           │
│                                                                     │
│  Webhook POST to subscriber:                                        │
│  Headers:                                                           │
│    Content-Type: application/json                                   │
│    X-Nexha-Event-Id: he_xxx                                         │
│    X-Nexha-Event-Type: sutar.instance.provisioned                   │
│    X-Nexha-Delivery-Id: hd_xxx                                      │
│    X-Nexha-Attempt: 1                                               │
│    X-Nexha-Signature: sha256=abc123...                              │
│  Body: { eventId, eventType, tenantId, payload, occurredAt }        │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

## Event Types (28)

| Category | Event types |
|----------|-------------|
| **SUTAR instance lifecycle** | `sutar.instance.provisioning`, `sutar.instance.ready`, `sutar.instance.failed`, `sutar.instance.suspended`, `sutar.instance.destroyed`, `sutar.instance.key.rotated` |
| **Industry tenant lifecycle** | `industry.tenant.provisioning`, `industry.tenant.activated`, `industry.tenant.suspended`, `industry.tenant.destroyed`, `industry.tenant.compliance.failed` |
| **Provisioning plan events** | `provisioning.plan.created`, `provisioning.plan.transitioned`, `provisioning.plan.ready`, `provisioning.plan.failed`, `provisioning.plan.destroyed` |
| **Mission events** | `mission.created`, `mission.started`, `mission.completed`, `mission.failed`, `mission.cancelled` |
| **Commerce events** | `commerce.order.placed`, `commerce.order.fulfilled`, `commerce.payment.received`, `commerce.refund.issued` |
| **Partner events** | `partner.connected`, `partner.disconnected`, `partner.trust.changed` |
| **Wildcard** | `*` (matches all events) |

## Signature Scheme

Every delivery is signed with HMAC-SHA256 over the **raw body**:

```
X-Nexha-Signature: sha256=<hex digest>
```

Subscribers verify:

```js
const crypto = require('crypto');
function verify(rawBody, headerSignature, secret) {
  const expected = 'sha256=' + crypto
    .createHmac('sha256', secret)
    .update(rawBody)
    .digest('hex');
  return crypto.timingSafeEqual(
    Buffer.from(headerSignature),
    Buffer.from(expected)
  );
}
```

Use **timing-safe comparison** — never `===`. The `verify` route on the SDK does this for you.

## Retry Schedule

Exponential backoff, max 6 attempts:

| Attempt | Delay before retry |
|---------|--------------------|
| 1 (initial) | 0 |
| 2 | 1 minute |
| 3 | 5 minutes |
| 4 | 30 minutes |
| 5 | 2 hours |
| 6 | 12 hours |
| 7+ | **FAILED** (terminal) |

After 6 failed attempts the delivery is marked `FAILED` and stops retrying. Operators can manually re-enqueue via the admin API.

## API

### POST /api/subscriptions

Create a subscription. **The plaintext secret is returned ONCE** — it cannot be retrieved later.

```json
{
  "tenantId": "t_x",
  "targetUrl": "https://example.com/webhook",
  "eventTypes": ["sutar.instance.*", "provisioning.plan.ready"]
}
```

Response:

```json
{
  "subscriptionId": "hs_abc",
  "tenantId": "t_x",
  "targetUrl": "https://example.com/webhook",
  "eventTypes": ["sutar.instance.*", "provisioning.plan.ready"],
  "secret": "whsec_plaintext_returned_only_once",
  "status": "ACTIVE",
  "createdAt": "2026-06-23T..."
}
```

### POST /api/subscriptions/:id/rotate-secret

Rotate the secret (returns new plaintext once).

### POST /api/subscriptions/:id/disable / /enable

Pause and resume deliveries.

### DELETE /api/subscriptions/:id

Permanently delete.

### POST /api/events

Emit an event (called by other services):

```json
{
  "eventType": "sutar.instance.ready",
  "tenantId": "t_x",
  "payload": { "instanceId": "si_x", "host": "sutar.x.com" }
}
```

Returns `{ eventId, deliveriesCreated }`.

### POST /api/deliveries/process

Internal-only endpoint (requires `x-internal-token`). Called by the cron worker / queue consumer.

Optional body: `{ "limit": 50 }` to bound the batch size.

Returns `{ processed, succeeded, failed, retried }`.

### POST /api/sign, /api/verify

Convenience endpoints for testing signatures without a live subscription.

## Authentication

- **External callers (UI / API):** JWT.
- **Webhook receivers:** They use the subscription's `secret` to verify the `X-Nexha-Signature` header — no auth needed to receive.
- **Internal `processDeliveries`:** Internal token via `x-internal-token` header.

## Hub Wiring

Exposed at the RTMN Hub (4399):

```
POST   http://localhost:4399/api/nexha/nexha-hooks-sdk/api/subscriptions
GET    http://localhost:4399/api/nexha/nexha-hooks-sdk/api/subscriptions
GET    http://localhost:4399/api/nexha/nexha-hooks-sdk/api/subscriptions/:id
PATCH  http://localhost:4399/api/nexha/nexha-hooks-sdk/api/subscriptions/:id
DELETE http://localhost:4399/api/nexha/nexha-hooks-sdk/api/subscriptions/:id
POST   http://localhost:4399/api/nexha/nexha-hooks-sdk/api/subscriptions/:id/disable
POST   http://localhost:4399/api/nexha/nexha-hooks-sdk/api/subscriptions/:id/enable
POST   http://localhost:4399/api/nexha/nexha-hooks-sdk/api/subscriptions/:id/rotate-secret
POST   http://localhost:4399/api/nexha/nexha-hooks-sdk/api/events
POST   http://localhost:4399/api/nexha/nexha-hooks-sdk/api/deliveries/process
GET    http://localhost:4399/api/nexha/nexha-hooks-sdk/api/deliveries
GET    http://localhost:4399/api/nexha/nexha-hooks-sdk/api/deliveries/:id
POST   http://localhost:4399/api/nexha/nexha-hooks-sdk/api/sign
POST   http://localhost:4399/api/nexha/nexha-hooks-sdk/api/verify
GET    http://localhost:4399/api/nexha/nexha-hooks-sdk/api/event-types
GET    http://localhost:4399/api/nexha/nexha-hooks-sdk/api/stats
```

## Capabilities registered at the Hub

| Capability | Purpose |
|------------|---------|
| `webhook-subscriptions` | Subscription CRUD |
| `event-delivery` | Delivery + retry |
| `webhook-signing` | HMAC sign/verify |
| `subscription-lifecycle` | disable/enable/delete/rotate |

## Tests

- `hooksService.test.js` — **46 tests** (HMAC sign/verify, retry schedule, emit fan-out, processDeliveries, max-attempts cutoff, secret rotation, stats aggregation)
- `routes.test.js` — **27 tests** (HTTP contract, auth, wildcard matching, event-type lookup, delivery retry on 5xx, signature header validation)
- **Total: 73 vitest tests, 0 failures**