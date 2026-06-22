# sutar-agent-network

> **Service:** SUTAR OS Agent Network
> **Port:** 4155
> **Layer:** 3 (Intent + Network + REZ Bridge)
> **Built:** June 20, 2026
> **Status:** ✅ Production-ready v1.0

## What it does

Network topology of agents + message routing between them. Distinct from
`/services/acn-network` (4801) which handles the ACP protocol + agent
registry. The SUTAR Agent Network focuses on the **runtime mesh**: who is
connected to whom, what messages are flowing, what the routing graph looks
like at this moment.

## Endpoints

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/health` | Health + counts |
| GET | `/api/nodes` | List all known nodes |
| POST | `/api/nodes` | Register a node |
| POST | `/api/nodes/:agentId/heartbeat` | Update last-seen timestamp |
| POST | `/api/edges` | Add an edge between two nodes |
| GET | `/api/edges` | List edges (filter by from/to/type) |
| POST | `/api/route` | BFS shortest-hop route between two nodes |
| POST | `/api/messages` | Send a message between nodes |
| GET | `/api/messages` | List messages (filter by from/to/intentId) |

## Edge types

- `peers` — two agents are peers
- `routes-to` — agent A routes requests to agent B
- `publishes-to` — agent A publishes intents that agent B consumes
- `claims-from` — agent A claims intents from agent B

## Seeded mesh

- agent-restaurant-001 → agent-negotiator-001 (routes-to, weight 8)
- agent-hotel-001 → agent-negotiator-001 (routes-to, weight 5)
- agent-recommender-001 → agent-restaurant-001 (peers, weight 3)
- agent-recommender-001 → agent-hotel-001 (peers, weight 3)

## Next steps

- Add weighted shortest-path (Dijkstra) instead of BFS hop-count
- Add edge TTL + auto-prune stale edges
- Persist mesh state to Redis (currently in-memory)
- WebSocket subscription for real-time message stream
