# Agent Twin Service

**Port:** 4720 (TwinOS layer)
**Layer:** Agents (TwinOS)
**Version:** 2.0.0

Digital twin for individual SUTAR agents. Tracks the agent's state,
history, metadata, and serves as the single source of truth that other
services query when they need info about an agent.

## Why This Service

Many RTMN services need to know things about an agent: its current
status, reputation history, recent transactions, capabilities, role.
Rather than each service maintaining its own DB, they all read from
the `agent-twin` service (or write to it and let others read).

This is the agent equivalent of TwinOS's customer-twin, product-twin,
etc. — a domain-centric digital twin for the agent entity.

## API

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| `GET` | `/api/twins` | optional | List agent twins (paginated, searchable) |
| `GET` | `/api/twin/:id` | optional | Get one agent twin (returns default if not found) |
| `POST` | `/api/twin` | ✓ strict | Create an agent twin |
| `PUT` | `/api/twin/:id` | ✓ strict | Update fields |
| `DELETE` | `/api/twin/:id` | ✓ strict | Delete |
| `PATCH` | `/api/twin/:id/state` | ✓ strict | Update state sub-object |
| `GET` | `/api/twin/:id/history` | optional | Get version history |

## Twin Schema

```json
{
  "id": "agent-pizza-42",
  "name": "Pizza Palace Agent",
  "type": "MERCHANT",
  "category": "foundation",
  "status": "active",
  "role": "merchant",
  "permissions": ["order_pizza", "menu_lookup"],
  "businessId": "biz-pizza-42",
  "state": { /* agent-specific state */ },
  "metadata": { /* free-form */ },
  "version": 1,
  "createdAt": "...",
  "updatedAt": "..."
}
```

## See Also

- [TwinOS Hub](../../../platform/twins/twinos-hub/) — the TwinOS platform
- [acn-network](../acn-network/) — registry that agent-twin complements
- [@rtmn/twinos-shared](../../../platform/twins/twinos-shared/) — auth + validation helpers