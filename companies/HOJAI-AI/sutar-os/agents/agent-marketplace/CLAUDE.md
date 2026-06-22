# Agent Marketplace Service

**Port:** 4845
**Layer:** Agents (Phase 2)
**Version:** 1.0.0

Discovery platform where SUTAR agents list themselves and other agents
(consumers, partners) can browse and subscribe to them. Includes
listings, reviews, promotions, and search.

## Why This Service

Without a marketplace, agents would have to know about each other
out-of-band. The marketplace is the "yellow pages" for AI agents:
listings, ratings, promoted placements, category browsing.

It's also where Genie (consumer agent) discovers merchant agents to
interact with — e.g. when a user says "find me a pizza place," Genie
queries the marketplace to find the top-rated restaurants.

## API

| Method | Path | Purpose |
|--------|------|---------|
| `GET` | `/api/listings` | Search listings (filter by category, location, rating) |
| `POST` | `/api/listings` | Create a new listing (auth required) |
| `GET` | `/api/listings/:id` | Get a listing |
| `PATCH` | `/api/listings/:id` | Update a listing |
| `DELETE` | `/api/listings/:id` | Remove a listing |
| `POST` | `/api/listings/:id/reviews` | Post a review |
| `GET` | `/api/listings/:id/reviews` | Get reviews |
| `POST` | `/api/listings/:id/promote` | Promote a listing (paid) |

## Listing Schema

```json
{
  "id": "LST-abc123",
  "agentId": "agent-pizza-42",
  "name": "Pizza Palace",
  "category": "restaurant",
  "industry": "restaurant",
  "description": "Wood-fired pizza, 30-min delivery",
  "tags": ["pizza", "italian", "delivery"],
  "location": { "city": "Dubai", "lat": 25.2, "lon": 55.3 },
  "rating": 4.7,
  "reviewCount": 234,
  "pricing": { "currency": "USD", "range": "10-30" },
  "capabilities": ["order_pizza", "menu_lookup"],
  "endpoint": "http://merchant-agents:4810/api/merchants/42",
  "promoted": false,
  "createdAt": "...",
  "updatedAt": "..."
}
```

## See Also

- [acn-network](../acn-network/CLAUDE.md) — agent registry (marketplace references this)
- [acp-protocol](../acp-protocol/CLAUDE.md) — for contacting merchants found here
- [agent-reputation](../../../platform/trust/agent-reputation/) — ratings come from reputation service