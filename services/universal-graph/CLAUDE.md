# Universal Business Graph Engine

**Port:** 4937  
**Service Name:** @rtmn/universal-graph  
**Status:** Ready for Development

---

## Overview

The Universal Business Graph Engine connects all entities in the RTMN ecosystem into a unified graph structure. It provides relationship discovery, path finding, and intelligent recommendations across all business entities.

## Features

- **Node Management**: Create and manage graph nodes for any entity type
- **Edge Management**: Define relationships between entities
- **Graph Queries**: Traverse, search, and analyze the graph
- **Path Finding**: Discover connections between entities
- **Recommendations**: Collaborative filtering, content-based, and graph-based recommendations
- **Network Analysis**: Degree centrality, clustering, community detection

## Entity Types Supported

| Type | Description |
|------|-------------|
| customer | Customer profiles |
| order | Order records |
| payment | Payment transactions |
| product | Products/SKUs |
| service | Services offered |
| company | Company profiles |
| employee | Staff members |
| vendor | Supplier/vendor entities |
| location | Physical locations |
| campaign | Marketing campaigns |
| transaction | General transactions |
| subscription | Subscription records |
| review | Reviews/ratings |
| inventory | Inventory items |
| agent | AI agents |
| goal | Goals/objectives |
| task | Tasks |
| document | Documents |
| asset | Business assets |
| event | Events |
| deal | Deals/opportunities |
| lead | Sales leads |
| opportunity | Business opportunities |
| invoice | Invoices |
| shipment | Shipment records |

## Edge Types Supported

| Type | Description |
|------|-------------|
| owns | Ownership relationship |
| purchased | Purchase transaction |
| paid | Payment made |
| shipped | Shipment sent |
| contains | Container relationship |
| references | Reference/link |
| belongs_to | Membership |
| managed_by | Management chain |
| works_at | Employment |
| referred_by | Referral source |
| depends_on | Dependency |
| related_to | General relation |
| similar_to | Similarity |
| competes_with | Competition |
| partners_with | Partnership |
| invested_in | Investment |
| approved | Approval action |
| rejected | Rejection action |
| created | Creation link |
| updated | Update link |
| deleted | Deletion marker |

---

## API Endpoints

### Nodes

```
GET    /api/nodes                    # List all nodes (with filters)
POST   /api/nodes                    # Create a node
GET    /api/nodes/:nodeId            # Get node by ID
PATCH  /api/nodes/:nodeId            # Update a node
DELETE /api/nodes/:nodeId            # Delete a node
POST   /api/nodes/batch              # Batch create nodes
```

### Edges

```
GET    /api/edges                    # List all edges (with filters)
POST   /api/edges                    # Create an edge
GET    /api/edges/:edgeId            # Get edge by ID
PATCH  /api/edges/:edgeId            # Update an edge
DELETE /api/edges/:edgeId            # Delete an edge
GET    /api/edges/node/:nodeId       # Get edges for a node
GET    /api/edges/neighbors/:nodeId  # Get neighboring nodes
POST   /api/edges/batch              # Batch create edges
```

### Query

```
GET    /api/query/stats              # Graph statistics
POST   /api/query/traverse           # Graph traversal
POST   /api/query/aggregate          # Aggregation queries
POST   /api/query/search             # Search nodes
GET    /api/query/subgraph/:nodeId   # Get subgraph around node
GET    /api/query/analyze/:nodeId    # Network analysis
GET    /api/query/common-neighbors   # Find common neighbors
GET    /api/query/entity-connections # Entity type connections
```

### Path

```
POST   /api/path/shortest            # Find shortest path
POST   /api/path/all                 # Find all paths
POST   /api/path/reachable           # Find reachable nodes
GET    /api/path/connected/:s/:t     # Check if connected
GET    /api/path/chain               # Get connection chain
GET    /api/path/connectors          # Find connector nodes
```

### Recommendations

```
POST   /api/recommendations/collaborative  # Collaborative filtering
POST   /api/recommendations/content       # Content-based
GET    /api/recommendations/related/:id   # Related entities
GET    /api/recommendations/also-bought/:id # Also-bought
GET    /api/recommendations/for-entity/:type/:id # For entity type
GET    /api/recommendations/popular/:type # Popular entities
GET    /api/recommendations/cross-sell/:id # Cross-sell
GET    /api/recommendations/trending/:type # Trending
```

---

## Quick Start

```bash
# Install dependencies
cd services/universal-graph
npm install

# Start development server
npm run dev

# Build for production
npm run build
npm start
```

## Configuration

Create a `.env` file based on `.env.example`:

```env
PORT=4937
MONGODB_URI=mongodb://localhost:27017/universal_graph
NEO4J_URI=bolt://localhost:7687
NEO4J_USER=neo4j
NEO4J_PASSWORD=password
LOG_LEVEL=info
```

---

## Example Usage

### Create a Customer Node

```bash
curl -X POST http://localhost:4937/api/nodes \
  -H "Content-Type: application/json" \
  -d '{
    "entityType": "customer",
    "entityId": "cust-123",
    "name": "John Doe",
    "properties": {
      "email": "john@example.com",
      "segment": "premium"
    },
    "labels": ["vip", "tech"]
  }'
```

### Create a Product Node

```bash
curl -X POST http://localhost:4937/api/nodes \
  -H "Content-Type: application/json" \
  -d '{
    "entityType": "product",
    "entityId": "prod-456",
    "name": "Premium Widget",
    "properties": {
      "price": 99.99,
      "category": "electronics"
    }
  }'
```

### Create a Purchase Relationship

```bash
curl -X POST http://localhost:4937/api/edges \
  -H "Content-Type: application/json" \
  -d '{
    "sourceNodeId": "customer_cust-123",
    "targetNodeId": "product_prod-456",
    "edgeType": "purchased",
    "properties": {
      "quantity": 2,
      "total": 199.98
    },
    "weight": 1.0
  }'
```

### Find Shortest Path

```bash
curl -X POST http://localhost:4937/api/path/shortest \
  -H "Content-Type: application/json" \
  -d '{
    "sourceNodeId": "customer_cust-123",
    "targetNodeId": "product_prod-789"
  }'
```

### Get Recommendations

```bash
curl -X POST http://localhost:4937/api/recommendations/collaborative \
  -H "Content-Type: application/json" \
  -d '{
    "nodeId": "customer_cust-123",
    "types": ["product"],
    "maxResults": 5
  }'
```

### Graph Statistics

```bash
curl http://localhost:4937/api/query/stats
```

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    Universal Business Graph                     │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐         │
│  │ Customer │──│  Order   │──│ Product  │──│ Payment  │         │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └──────────┘         │
│       │             │             │                             │
│       └─────────────┼─────────────┘                             │
│                     │                                             │
│              ┌──────▼──────┐                                      │
│              │   Graph     │                                      │
│              │   Engine    │                                      │
│              └──────┬──────┘                                      │
│                     │                                             │
│  ┌──────────────────┼──────────────────┐                         │
│  │                  │                  │                         │
│  ▼                  ▼                  ▼                         │
│ ┌────────┐    ┌───────────┐    ┌──────────────┐                  │
│ │ Path   │    │ Traversal │    │Recommendation│                  │
│ │ Finding│    │  Service  │    │   Service    │                  │
│ └────────┘    └───────────┘    └──────────────┘                  │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

## Integration Points

| Service | Connection | Purpose |
|---------|------------|---------|
| Memory OS | REST | Store graph patterns |
| Goal OS | REST | Track graph objectives |
| Twin OS | REST | Sync digital twins |
| All Industry OS | REST | Sync entities |

---

## Health Check

```bash
curl http://localhost:4937/health
```

Response:
```json
{
  "status": "healthy",
  "service": "universal-graph",
  "version": "1.0.0",
  "timestamp": "2026-06-16T00:00:00.000Z",
  "mongodb": "connected"
}
```

---

## License

Internal RTMN Service
