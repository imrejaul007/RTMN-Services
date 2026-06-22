# Merchant Agents Service

**Port:** 4810
**Layer:** Agents
**Version:** 1.0.0

SUTAR merchant agents — the AI counterparts of physical businesses
(restaurants, hotels, retailers, etc.). Each merchant agent advertises
its catalog, responds to QUERY messages, and processes orders.

## Why This Service

The RTMN ecosystem has 24 Industry OS services, each representing a
vertical (restaurant, hotel, healthcare, …). Merchant agents are the
AI front door for those verticals — when a Genie agent wants to order
pizza, it talks to the pizza shop's merchant agent, which routes the
request to the underlying Industry OS.

## Agent Types

| Type | Description |
|------|-------------|
| `RESTAURANT` | Restaurant (pizza, sushi, …) — menu, orders, delivery |
| `HOTEL` | Hotel — rooms, bookings, concierge |
| `RETAIL` | Retail — products, cart, shipping |
| `HEALTHCARE` | Healthcare — appointments, prescriptions |
| `GENERIC` | Any other business |

## API

| Method | Path | Purpose |
|--------|------|---------|
| `POST` | `/api/merchants` | Register a new merchant agent |
| `GET` | `/api/merchants` | List merchants (filter by type, location) |
| `GET` | `/api/merchants/:id` | Get a merchant |
| `POST` | `/api/merchants/:id/catalog` | Add items to the catalog |
| `GET` | `/api/merchants/:id/catalog` | Get the full catalog |
| `POST` | `/api/merchants/:id/inventory` | Update stock |
| `POST` | `/api/merchants/:id/quote` | Generate a quote for a QUERY |
| `POST` | `/api/merchants/:id/order` | Place an order |

## Integration

A merchant agent typically fronts an Industry OS service:

```
Genie (consumer)  ─►  Merchant Agent  ─►  Industry OS (e.g. Restaurant OS)
     ACP                merchant-agents       restaurant-os:5010
```

The merchant agent translates ACP messages into the Industry OS's
domain-specific calls.

## See Also

- [ACP Protocol](../acp-protocol/CLAUDE.md) — message format
- [acn-network](../acn-network/CLAUDE.md) — agent registry
- [Industry OS examples](../../../industry-os/) — the verticals merchants front