# SUTAR OS — Intent Bus (Port 4154)

> **Status:** ✅ NEW — Built June 20, 2026
> **SUTAR Layer:** 3 — Agent Network / Intent Broadcast
> **Purpose:** Pub/sub broadcast of agent intents across SUTAR — publish intents, subscribe by capability/type, claim and resolve

---

## Mission

When one agent in SUTAR needs something — "I want to book a hotel", "I want to negotiate a price", "I need a quote for shipping" — it needs a way to tell other agents that handle those capabilities. The Intent Bus is that broadcast channel. It avoids hard-coded point-to-point integrations and lets agents discover each other at runtime.

## Architecture

```
[Publisher agent]
       │
       ▼
POST /api/intents/publish
       │
       ▼
[Intents store] ──────────► [Subscription matchers] ──► long-poll / callback
       │
       ├── claim       (one subscriber wins)
       ├── resolve     (with result)
       └── cancel      (with reason)
```

## Key Concepts

| Concept | Meaning |
|---------|---------|
| **Intent** | A structured request ("book_hotel", "negotiate_price") with payload + priority + TTL |
| **Capability** | What an agent can handle ("hotel.booking", "price.negotiation") — first-class routing key |
| **Type** | The verb / action ("book", "order", "negotiate") — secondary routing key |
| **Subscription** | A filter `{capability, type, priority}` that matches incoming intents |
| **Claim** | Single-winner — first subscriber to claim wins the intent |
| **Resolve** | Final state with the result data |

## Endpoints

| Method | Path | Purpose |
|--------|------|---------|
| POST | `/api/intents/publish` | Publish a new intent (type, capability, payload, priority, ttlSeconds, publisher) |
| GET | `/api/intents` | Query intents (filters: capability, type, status, publisher) |
| GET | `/api/intents/:id` | Get intent detail |
| POST | `/api/intents/:id/claim` | Claim an intent (only one claimer wins) |
| POST | `/api/intents/:id/resolve` | Mark intent resolved with result |
| POST | `/api/intents/:id/cancel` | Cancel an open or claimed intent |
| POST | `/api/subscriptions` | Subscribe to capability / type |
| GET | `/api/subscriptions` | List all subscriptions |
| DELETE | `/api/subscriptions/:id` | Cancel subscription |
| GET | `/api/subscriptions/:id/poll` | Long-poll matching intents |
| GET | `/api/topics` | List active topics with open counts |
| GET | `/api/stats` | Bus statistics (by status, by type) |
| GET | `/health` | Health + counts |

## Valid Intent Types

`book_hotel`, `book_table`, `order_product`, `negotiate_price`, `request_payment`, `request_quote`, `request_recommendation`, `request_negotiation`, `escalate`, `broadcast`

Default TTL: 600s (10 minutes). Open intents past TTL are auto-expired.

## Claim Semantics

First subscriber to call `/api/intents/:id/claim` wins. Subsequent claim attempts return 409 Conflict. The winner can then `/resolve` with the result or `/cancel` with a reason. This implements the **competitive** intent-handling pattern — only one agent ends up executing the work.

For multi-agent collaboration patterns (broadcast to many), use `broadcast` type or create separate subscription trees.

## How It Maps to SUTAR

| SUTAR concern | How this service covers it |
|---------------|----------------------------|
| **Agent network decoupling** | Agents don't need to know each other — they publish and subscribe to capabilities |
| **Capability discovery** | Subscriptions can be queried to find what each agent handles |
| **Workload distribution** | First-claim semantics distribute competing work |
| **Audit trail** | Every intent carries publisher, timestamps, claimer, result |
| **Priority routing** | Higher-priority intents surface first in subscription polls |

## Known Limitations

- In-memory store — doesn't survive restart, doesn't scale horizontally. Production needs Redis Streams or NATS.
- No push delivery (callback URLs are recorded but not called) — currently long-poll only.
- No replay — resolved intents stay in memory but don't trigger downstream subscriptions.
- No security model — every agent can claim every intent. Need capability attestation.

## Integration with HOJAI Intelligence (4881)

The new service is wired into the AI Intelligence routing table. `/api/route` will return `http://localhost:4154` and `/api/agents` will list `intentBus` as a routable agent.

## Related Services

- `/services/decision-engine` (4240) — uses intent priority to decide routing
- `/services/negotiation-ai` (4850) — consumes `negotiate_price` intents
- `/services/merchant-agents` (4810) — publish intents on behalf of merchants
- `/services/genie-shopping-agent` (4716) — publishes booking / ordering intents

---

*See also: [companies/HOJAI-AI/divisions/12-sutar-os/CLAUDE.md](../../divisions/12-sutar-os/CLAUDE.md)*