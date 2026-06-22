# sutar-contracts

> **Service:** SUTAR OS Contracts
> **Port:** 4185
> **Layer:** 6 (Trust + Contracts + Negotiation)
> **Built:** June 20, 2026
> **Status:** ✅ Production-ready v1.0

## What it does

SUTAR-specific contract templates with a full lifecycle:
**draft → negotiating → signed → fulfilled → settled** (or `cancelled`/`breached`).

Distinct from `/services/agent-contracts` (4830) which is the ACN-level
contract engine. SUTAR Contracts is focused on the **templates + lifecycle**
that SUTAR agents need to do business.

## Templates (4)

| Kind | Fields | Use case |
|------|--------|----------|
| `negotiation` | parties, subject, terms, walkAwayPrice, expiresAt | Two parties agree to negotiate terms |
| `sla` | provider, consumer, metric, target, penalty, duration | Service level agreement |
| `delivery` | from, to, item, quantity, deliveryBy, price | Delivery of goods/services |
| `data_share` | provider, consumer, dataset, purpose, retentionDays | Data sharing agreement |

## Endpoints

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/health` | Health + counts by status |
| GET | `/api/templates` | List all templates |
| GET | `/api/templates/:kind` | Get one template |
| POST | `/api/contracts` | Create a new contract |
| GET | `/api/contracts` | List contracts (filter by status/party) |
| GET | `/api/contracts/:id` | Get one contract |
| POST | `/api/contracts/:id/sign` | Transition to `signed` |
| POST | `/api/contracts/:id/fulfill` | Transition to `fulfilled` |
| POST | `/api/contracts/:id/settle` | Transition to `settled` |
| POST | `/api/contracts/:id/cancel` | Transition to `cancelled` |
| GET | `/api/audit` | Recent transitions |

## Lifecycle transitions

```
draft        → negotiating, signed, cancelled
negotiating  → signed, cancelled
signed       → fulfilled, breached, cancelled
fulfilled    → settled, breached
settled      → (terminal)
breached     → settled
cancelled    → (terminal)
```

## Next steps

- Persist contracts to MongoDB (currently in-memory Map)
- Add contract templates as a marketplace (publish/subscribe)
- Wire breach detection → auto-escalate via escalation service
