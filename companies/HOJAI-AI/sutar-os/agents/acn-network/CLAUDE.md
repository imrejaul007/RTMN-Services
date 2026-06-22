# ACN Network — Agent Registry

**Port:** 4801
**Layer:** Agents (Phase 1)
**Version:** 1.0.0

Central registry for all AI agents in the RTMN ecosystem. Provides
agent discovery, capability matching, and message routing.

## Why This Service

Every SUTAR service that needs to find another agent (e.g. `agent-teaming`
forming a team, `agent-orchestration` delegating a step, `agent-analytics`
computing cross-agent stats) calls `acn-network` first to:
1. Look up an agent by ID
2. Find agents with a specific capability or role
3. Find agents in a specific industry / domain
4. Resolve an agent's reputation score

Without this registry, every service would need its own agent DB.

## Agent Types

| Type | Description | Example |
|------|-------------|---------|
| `GENIE` | Consumer personal AI | Shopping assistant, budget manager |
| `MERCHANT` | Business AI (SUTAR OS) | Restaurant AI, Hotel AI, Retail AI |
| `SYSTEM` | RTMN internal agents | Reputation tracker, Contract manager |
| `PARTNER` | External agents | Payment processors, Logistics |

## API

| Method | Path | Purpose |
|--------|------|---------|
| `POST` | `/api/agents` | Register a new agent (auth required) |
| `GET` | `/api/agents` | List agents (filter by type, role, capability) |
| `GET` | `/api/agents/:id` | Get an agent by ID |
| `PATCH` | `/api/agents/:id` | Update an agent |
| `DELETE` | `/api/agents/:id` | Deregister an agent |
| `POST` | `/api/agents/:id/heartbeat` | Refresh the agent's online status |
| `GET` | `/api/capabilities/:cap` | Find agents with a capability |

## Quick Start

Register a new agent:

```bash
curl -X POST http://localhost:4801/api/agents \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Pizza Palace Agent",
    "type": "MERCHANT",
    "industry": "restaurant",
    "capabilities": ["order_pizza", "menu_lookup"],
    "endpoint": "http://merchant-agents:4810/api/merchants/42"
  }'
```

Find agents with a capability:

```bash
curl http://localhost:4801/api/capabilities/order_pizza
```

## See Also

- [acn-hub](../acn-hub/CLAUDE.md) — gateway for all ACN services
- [agent-teaming](../agent-teaming/CLAUDE.md) — uses this registry to form teams
- [agent-reputation](../../../platform/trust/agent-reputation/) — reputation scores for these agents