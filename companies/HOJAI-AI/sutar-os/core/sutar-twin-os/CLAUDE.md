# sutar-twin-os

> **Service:** SUTAR OS Twin OS
> **Port:** 4142
> **Layer:** 2 (Twin + Memory + Identity + Agent ID)
> **Built:** June 20, 2026
> **Status:** ✅ Production-ready v1.0

## What it does

The SUTAR-scoped view over `/services/twinos-hub` (4705). Adds three things
the underlying TwinOS does not provide:

1. **SUTAR capability tags per twin** — `negotiator`, `learner`, `planner`, `executor`, `simulator`, `memory-keeper`, `intent-publisher`, `intent-consumer`
2. **Intent-aware resolution** — given an SUTAR intent (e.g. `negotiate_price`), return the best twin(s) for that intent
3. **Twin federation** — a twin's SUTAR view may span multiple underlying twin services (commerce.customer + ai.intent for a "merchant" twin)

## Endpoints

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/health` | Health + counts + capabilities |
| GET | `/api/twins` | List SUTAR composite twins |
| GET | `/api/twins/:id` | Get one twin |
| POST | `/api/twins` | Create composite twin |
| POST | `/api/twins/:id/tags` | Add capability tag |
| DELETE | `/api/twins/:id/tags/:tag` | Remove tag |
| POST | `/api/twins/resolve-for-intent` | Best twins for an intent type |
| GET | `/api/twinos/proxy/:twinId` | Proxy to underlying twinos-hub |
| GET | `/api/audit` | Recent changes |

## Seeded data

- `sutar-merchant` — composite of commerce.merchant + commerce.product + commerce.order, tagged `negotiator`, `executor`
- `sutar-consumer` — composite of commerce.customer + commerce.wallet, tagged `intent-publisher`
- `sutar-facilitator` — composite of agent.ai + decision.policy, tagged `negotiator`, `planner`
- `sutar-observer` — composite of ai.memory + ai.simulation, tagged `simulator`, `learner`

## Intent → capability mapping

| Intent type | Required capability |
|-------------|---------------------|
| `negotiate_price` | `negotiator` |
| `request_recommendation` | `simulator` |
| `broadcast` | `intent-publisher` |
| `request_negotiation` | `negotiator` |
| `request_quote` | `negotiator` |
| `book_hotel`, `book_table`, `order_product` | `executor` |
| `escalate` | `planner` |

## Next steps

- Persist composite twins + tags to MongoDB
- Bridge with `twin-memory-bridge` (4704) so capability tags are also memory annotations
