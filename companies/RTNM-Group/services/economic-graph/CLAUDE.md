# RTMN Economic Graph Engine

## Overview
Maps value flows across the RTMN ecosystem, connecting companies, industries, markets, and agents through graph-based network analysis.

## Architecture

### Port: 3017

### Dependencies
- `express` - HTTP server
- `graphology` - Graph data structure
- `redis` - State persistence
- `uuid` - ID generation
- `winston` - Logging

### Core Types

**Node Types:**
- `company` - Business entities
- `industry` - Industry verticals (12 total)
- `market` - Market segments
- `agent` - AI agents
- `product` - Products/services
- `customer` - End customers
- `partner` - Business partners

**Edge Types (Value Flows):**
- `revenue` - Revenue flows
- `cost` - Cost transactions
- `investment` - Investment flows
- `partnership` - Partnership connections
- `supply` - Supply chain links
- `demand` - Demand connections
- `referral` - Referral networks
- `data` - Data exchanges
- `talent` - Talent flow

## API Routes

### Graph Operations
- `GET /api/graph` - Get full graph structure
- `POST /api/graph/node` - Add node
- `POST /api/graph/edge` - Add edge
- `GET /api/graph/node/:id` - Get node details
- `DELETE /api/graph/node/:id` - Remove node
- `POST /api/graph/path` - Find paths

### Value Flows
- `GET /api/flows` - List all flows
- `POST /api/flows/calculate` - Calculate flow between nodes
- `GET /api/flows/summary` - Flow summary
- `POST /api/flows/transfer` - Simulate transfer
- `GET /api/flows/industry/:id` - Industry flows

### Analysis
- `GET /api/analysis/metrics` - Graph metrics
- `GET /api/analysis/industry` - Industry analysis
- `GET /api/analysis/trends` - Flow trends
- `GET /api/analysis/network` - Network health

### Visualization
- `GET /api/visualization/d3` - D3.js format
- `GET /api/visualization/hierarchical` - Tree view
- `GET /api/visualization/matrix` - Adjacency matrix
- `GET /api/visualization/sunburst` - Sunburst chart
- `GET /api/visualization/force` - Force-directed data
- `GET /api/visualization/export` - Export graph

## Usage Examples

### Add a company node
```javascript
POST /api/graph/node
{
  "type": "company",
  "name": "FitnessCo",
  "attributes": {
    "value": 1000000,
    "industry": "fitness"
  }
}
```

### Create value flow
```javascript
POST /api/graph/edge
{
  "source": "company:fitnessco123",
  "target": "industry:fitness",
  "type": "revenue",
  "value": 500000
}
```

### Analyze flows
```javascript
POST /api/flows/calculate
{
  "source": "industry:financial",
  "target": "industry:manufacturing",
  "currency": "money"
}
```

## Graph Theory Algorithms

### Centrality Measures
- Degree centrality
- Betweenness centrality

### Network Analysis
- Clustering coefficient
- Component detection
- Path finding (BFS)

### Flow Analysis
- Net position calculation
- Reciprocity analysis
- Critical node identification

## Environment Variables
- `REDIS_URL` - Redis connection (default: `redis://localhost:6379`)
- `PORT` - Server port (default: `3017`)

## Notes
- The graph is in-memory with optional Redis persistence
- Visualization endpoints output D3.js compatible formats
- All value calculations support multiple currencies
