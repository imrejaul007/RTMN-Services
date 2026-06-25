# genie-shopping-agent

> **Port:** 4728 (configurable via `PORT`)
> **Owner:** Genie product (personal AI assistant)
> **Status:** Production-ready scaffold with substantive business logic

The personal shopping agent for HOJAI Genie. Handles natural-language shopping requests, multi-merchant comparison, autonomous price negotiation, smart product matching, budget management, and purchase history.

## What it does

This service sits between the user and the ACN (Agent Commerce Network) to make Genie an autonomous personal shopper. When a user says "Find me running shoes under ₹5000", the shopping agent:

1. Parses the natural-language request (intent, category, budget, brand preferences)
2. Calls `acn-network` to discover relevant merchants and products
3. Uses `acp-protocol` to negotiate prices across multiple merchants in parallel
4. Ranks results by price, rating, delivery time, and user preference fit
5. Returns a ranked list with explanations
6. If the user confirms, places the order via ACP and tracks fulfillment

## API surface

| Method | Path | Purpose | Auth |
|---|---|---|---|
| GET | `/health` | Service health + uptime | No |
| POST | `/api/shopping/session` | Start a new shopping session | Yes |
| GET | `/api/shopping/session/:id` | Get session status + product list | Yes |
| POST | `/api/shopping/session/:id/negotiate` | Trigger price negotiation | Yes |
| POST | `/api/shopping/session/:id/checkout` | Place order for chosen product | Yes |
| GET | `/api/shopping/history` | User's purchase history | Yes |
| GET | `/api/wishlist` | User's wishlist | Yes |
| POST | `/api/wishlist` | Add item to wishlist | Yes |
| DELETE | `/api/wishlist/:id` | Remove item from wishlist | Yes |
| POST | `/api/price-alert` | Subscribe to price drop alerts | Yes |
| GET | `/api/price-alert` | List active price alerts | Yes |
| GET | `/api/preferences` | Get shopping preferences | Yes |
| PUT | `/api/preferences` | Update shopping preferences | Yes |

## State machine

```
IDLE → SEARCHING → COMPARING → NEGOTIATING → AWAITING_CONFIRMATION → PURCHASED
  ↑                                                            ↓
  └────────────────── CANCELLED / EXPIRED ──────────────────┘
```

## Data model

All state is stored in `PersistentMap` (JSON file) under `data/genie-shopping-agent/`:
- `shopping-sessions` — active and historical shopping sessions
- `purchase-history` — completed orders
- `wishlists` — saved items
- `price-alerts` — subscriptions to price drops
- `user-preferences` — per-user shopping preferences (size, brand, budget caps)

## Integration points

- **`acn-network` (port 4801)** — merchant + product discovery
- **`acp-protocol` (port 4800)** — autonomous negotiation across merchants
- **`runtime/genie` (port 7100)** — `/api/ask` routes shopping queries here

## How to run

```bash
cd genie-shopping-agent
npm install
PORT=4728 npm start
```

Or via genie-os orchestrator:
```bash
cd genie-os
npm run start:all
```

## Tests

```bash
npm test  # (run from genie-shopping-agent/)
```

## Files

- `src/index.js` — main entry, all 15 routes, state machine, ACN/ACP integration (899 LOC)
- `tests/` — vitest suite (in progress)
- `package.json` — express v5 + helmet + cors + uuid

## Roadmap

- **Now:** Working state machine + ACN/ACP integration + JSON persistence
- **Next:** Real LLM for natural-language intent parsing (currently keyword-based)
- **Later:** MongoDB persistence + real merchant accounts + payment integration

## See also

- `../genie-os/docs/SERVICES.md` — full catalog of Genie services
- `../../platform/intelligence/inference-gateway/` — LLM gateway for intent parsing
- `../../platform/acn-network/` — Agent Commerce Network (merchant registry)