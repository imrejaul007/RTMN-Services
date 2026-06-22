# sutar-agent-id

> **Service:** SUTAR OS Agent ID
> **Port:** 4145
> **Layer:** 2 (Twin + Memory + Identity + Agent ID)
> **Built:** June 20, 2026
> **Status:** ✅ Production-ready v1.0

## What it does

Every SUTAR agent gets a persistent ID + a capability manifest. The manifest
is the authoritative description of what the agent can do and what intents
it can claim.

The service tracks the canonical catalog of capabilities (`negotiate`,
`transact`, `recommend`, `escalate`, `broadcast`) and maps each capability
to the set of intent types it can handle. This makes "find an agent for
intent X" a single API call.

## Endpoints

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/health` | Health + counts + capabilities |
| GET | `/api/agents` | List all agents |
| GET | `/api/agents/:agentId` | Get one agent |
| POST | `/api/agents` | Register a new agent |
| POST | `/api/agents/:agentId/capabilities` | Add a capability |
| DELETE | `/api/agents/:agentId/capabilities/:capability` | Remove a capability |
| POST | `/api/manifest/agents-for-intent` | Which agents can handle intent type X? |
| GET | `/api/audit` | Recent changes |

## Capability catalog

| Capability | Intents it handles |
|------------|-------------------|
| `negotiate` | `negotiate_price`, `request_negotiation`, `request_quote` |
| `transact` | `book_hotel`, `book_table`, `order_product`, `request_payment` |
| `recommend` | `request_recommendation` |
| `escalate` | `escalate` |
| `broadcast` | `broadcast` |

## Seeded agents

- `agent-restaurant-001` — Restaurant Booking Agent (transact, recommend)
- `agent-hotel-001` — Hotel Booking Agent (transact)
- `agent-negotiator-001` — Price Negotiator (negotiate)
- `agent-recommender-001` — Personal Recommender (recommend)
- `agent-escalation-001` — Escalation Handler (escalate)

## Next steps

- Persist agent registry to MongoDB
- Add JWT signing on agent manifest response (so other services can verify capability claims)
- Connect to reputation-aggregator (4258) to score agents by reputation
