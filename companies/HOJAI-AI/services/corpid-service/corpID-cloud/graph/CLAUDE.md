# Identity Graph

**Service:** Relationship Graph
**Port:** 4702 (via gateway)
**Prefix:** `/api/graph`

---

## Overview

The Identity Graph service provides a network of relationships between all identity types in the RTMN ecosystem. It supports graph traversal, path finding, and relationship analytics.

## Features

- **12 Node Types:** User, organization, department, team, consumer, merchant, branch, agent, device, API key, twin, employee
- **20+ Edge Types:** Owns, member_of, manages, reports_to, partner_of, etc.
- **Path Finding:** BFS-based shortest path algorithm
- **Relationship Traversal:** Find related nodes with depth limits
- **Common Connections:** Find shared connections between two nodes
- **Graph Statistics:** Density, degrees, centrality
- **Bidirectional Edges:** Incoming and outgoing relationships

## Node Types

| Type | Description |
|------|-------------|
| `user` | CorpID user |
| `organization` | Business organization |
| `department` | Org department |
| `team` | Org team |
| `consumer` | Consumer profile |
| `merchant` | Merchant business |
| `branch` | Merchant branch/store |
| `agent` | AI agent |
| `device` | User device |
| `api_key` | API key |
| `twin` | Digital twin |
| `employee` | Employee record |

## Edge Types

| Type | Description |
|------|-------------|
| `owns` | Ownership relationship |
| `member_of` | Membership |
| `manages` | Management hierarchy |
| `reports_to` | Reporting structure |
| `partner_of` | Partnership |
| `supplies_to` | Supply relationship |
| `parent_of` / `child_of` | Hierarchy |
| `linked_to` | Connection |
| `created` | Creation relationship |
| `uses` | Usage |
| `trusts` | Trust relationship |

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/graph/types` | Get node/edge types |
| POST | `/api/graph/nodes` | Create or get node |
| GET | `/api/graph/nodes/:id` | Get node by ID |
| GET | `/api/graph/entities/:type/:id` | Get node by entity |
| POST | `/api/graph/edges` | Create relationship |
| GET | `/api/graph/nodes/:id/edges` | Get node edges |
| GET | `/api/graph/nodes/:id/related` | Get related nodes |
| GET | `/api/graph/path/:from/:to` | Find shortest path |
| GET | `/api/graph/common/:id1/:id2` | Find common connections |
| DELETE | `/api/graph/edges/:id` | Delete edge |
| GET | `/api/graph/stats` | Graph statistics (admin) |

## Usage Example

```bash
# Create user node
curl -X POST http://localhost:4702/api/graph/nodes \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "entityType": "user",
    "entityId": "user-123",
    "properties": { "name": "John" }
  }'

# Create organization node
curl -X POST http://localhost:4702/api/graph/nodes \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "entityType": "organization",
    "entityId": "RTMN-HQ",
    "properties": { "name": "RTMN HQ" }
  }'

# Create relationship
curl -X POST http://localhost:4702/api/graph/edges \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "sourceNodeId": "node-user",
    "targetNodeId": "node-org",
    "type": "member_of",
    "properties": { "role": "owner" }
  }'

# Find shortest path
curl http://localhost:4702/api/graph/path/node-1/node-2 \
  -H "Authorization: Bearer $TOKEN"
```

Response:
```json
{
  "success": true,
  "pathExists": true,
  "distance": 2,
  "path": [
    { "id": "node-1", "entityType": "user" },
    { "id": "node-org", "entityType": "organization" },
    { "id": "node-2", "entityType": "team" }
  ]
}
```

## Graph Algorithms

### Breadth-First Search (BFS)
Used for:
- Shortest path between two nodes
- Finding related nodes within depth limit
- Common connection discovery

### Degree Calculation
For each node:
- Outgoing edges (node as source)
- Incoming edges (node as target)
- Total degree = outgoing + incoming

## File Structure

```
graph/
├── src/
│   ├── models/
│   │   └── graph.model.js
│   └── routes/
│       └── graph.routes.js
└── CLAUDE.md
```
