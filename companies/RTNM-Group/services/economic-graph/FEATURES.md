# Economic Graph - Product Features Documentation

**Service:** Economic Graph  
**Port:** 3017  
**Location:** `core/economic-graph/`  
**Status:** ✅ PRODUCTION READY  
**Last Updated:** June 14, 2026

---

## Overview

The Economic Graph provides value flow mapping and network analysis across the RTNM ecosystem. Built on Graphology, it enables sophisticated network analysis including centrality metrics, path finding, and visualization.

---

## Core Features

### 1. Graph Engine

| Feature | Description | Status |
|---------|-------------|--------|
| **Node Management** | Add, update, delete nodes | ✅ |
| **Edge Management** | Create relationships | ✅ |
| **Graph Traversal** | BFS, DFS, path finding | ✅ |
| **Subgraph Extraction** | Extract subgraphs | ✅ |
| **Graph Operations** | Union, intersection, difference | ✅ |

### 2. Value Flows

| Feature | Description | Status |
|---------|-------------|--------|
| **Revenue Tracking** | Map revenue flows | ✅ |
| **Cost Mapping** | Track cost flows | ✅ |
| **Investment Flows** | Investment tracking | ✅ |
| **Flow Calculation** | Calculate flow values | ✅ |
| **Flow Analytics** | Flow patterns and trends | ✅ |

### 3. Network Analysis

| Feature | Description | Status |
|---------|-------------|--------|
| **Centrality Metrics** | Degree, betweenness, closeness | ✅ |
| **Clustering Analysis** | Community detection | ✅ |
| **Influence Scoring** | Node influence ranking | ✅ |
| **Network Metrics** | Density, diameter, connectivity | ✅ |
| **Trend Analysis** | Network evolution over time | ✅ |

### 4. Visualization

| Feature | Description | Status |
|---------|-------------|--------|
| **D3.js Export** | D3-compatible data format | ✅ |
| **Hierarchical View** | Tree structure visualization | ✅ |
| **Matrix View** | Adjacency matrix export | ✅ |
| **Force-Directed** | Force-directed layout data | ✅ |
| **Custom Layouts** | Custom visualization configs | ✅ |

### 5. Node Types

| Type | Examples | Status |
|------|----------|--------|
| **COMPANY** | Business entities | ✅ |
| **INDUSTRY** | 12 industry verticals | ✅ |
| **MARKET** | Market segments | ✅ |
| **AGENT** | AI agents | ✅ |
| **PRODUCT** | Products/services | ✅ |
| **CUSTOMER** | End customers | ✅ |

### 6. Edge Types

| Type | Description | Status |
|------|-------------|--------|
| **REVENUE** | Revenue flows | ✅ |
| **COST** | Cost transactions | ✅ |
| **INVESTMENT** | Investment flows | ✅ |
| **PARTNERSHIP** | Partnership connections | ✅ |
| **SUPPLY** | Supply chain links | ✅ |
| **DEMAND** | Demand connections | ✅ |
| **DATA** | Data exchanges | ✅ |

---

## API Endpoints

### Graph Operations

| Method | Endpoint | Description | Status |
|--------|----------|-------------|--------|
| GET | `/api/graph` | Get full graph | ✅ |
| POST | `/api/graph/node` | Add node | ✅ |
| PUT | `/api/graph/node/:id` | Update node | ✅ |
| DELETE | `/api/graph/node/:id` | Delete node | ✅ |
| POST | `/api/graph/edge` | Add edge | ✅ |
| DELETE | `/api/graph/edge/:id` | Delete edge | ✅ |
| GET | `/api/graph/node/:id` | Get node | ✅ |
| GET | `/api/graph/path` | Find path | ✅ |

### Value Flows

| Method | Endpoint | Description | Status |
|--------|----------|-------------|--------|
| GET | `/api/flows` | List flows | ✅ |
| POST | `/api/flows` | Create flow | ✅ |
| POST | `/api/flows/calculate` | Calculate flow | ✅ |
| GET | `/api/flows/summary` | Flow summary | ✅ |
| GET | `/api/flows/:id` | Get flow details | ✅ |

### Analysis

| Method | Endpoint | Description | Status |
|--------|----------|-------------|--------|
| GET | `/api/analysis/metrics` | Graph metrics | ✅ |
| GET | `/api/analysis/centrality` | Centrality scores | ✅ |
| GET | `/api/analysis/trends` | Flow trends | ✅ |
| GET | `/api/analysis/communities` | Community detection | ✅ |
| GET | `/api/analysis/influence` | Influence ranking | ✅ |

### Visualization

| Method | Endpoint | Description | Status |
|--------|----------|-------------|--------|
| GET | `/api/visualization/d3` | D3.js data | ✅ |
| GET | `/api/visualization/hierarchical` | Tree view | ✅ |
| GET | `/api/visualization/matrix` | Adjacency matrix | ✅ |
| GET | `/api/visualization/force` | Force-directed | ✅ |

---

## File Structure

```
economic-graph/
├── src/
│   ├── index.js              # Main entry point
│   ├── config.js            # Configuration
│   └── routes/
│       ├── graph.js          # Graph operations
│       ├── flows.js          # Value flows
│       ├── analysis.js       # Network analysis
│       └── visualization.js  # Export formats
├── package.json
├── Dockerfile
├── README.md
└── CLAUDE.md
```

---

## Quick Start

```bash
# Start service
cd core/economic-graph
npm install
npm start

# Health check
curl http://localhost:3017/health

# Add company node
curl -X POST http://localhost:3017/api/graph/node \
  -H "Content-Type: application/json" \
  -d '{
    "id": "company_hojai",
    "type": "COMPANY",
    "attributes": {
      "name": "HOJAI AI",
      "industry": "technology"
    }
  }'

# Add revenue edge
curl -X POST http://localhost:3017/api/graph/edge \
  -d '{
    "source": "company_hojai",
    "target": "industry_ai",
    "type": "REVENUE",
    "weight": 1000000
  }'

# Find path between nodes
curl -X POST http://localhost:3017/api/graph/path \
  -d '{"source": "company_a", "target": "company_b"}'

# Get D3 visualization
curl http://localhost:3017/api/visualization/d3
```

---

## Use Cases

### 1. Value Chain Mapping
Visualize value flows across the ecosystem.

### 2. Key Player Identification
Find most influential companies/agents.

### 3. Supply Chain Analysis
Map and analyze supply chain relationships.

### 4. Investment Impact
Track investment flows and impacts.

---

## Integration Points

| Service | Integration | Purpose |
|---------|-------------|---------|
| BOA Council | Impact analysis | Decision support |
| Simulation OS | Scenario testing | What-if flows |
| Revenue Network | Revenue tracking | Value mapping |
| Commerce OS | Transaction flows | Commerce mapping |

---

*Last Updated: June 14, 2026*
