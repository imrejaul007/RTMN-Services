# Reasoning Engine Service

**Port:** 4753  
**Package:** `@hojai/reasoning-engine`

Enterprise-grade reasoning engine for knowledge graph inference and prediction.

## Features

- **Rule Engine**: Forward and backward chaining inference
- **Query Planner**: Optimize multi-hop graph queries
- **Path Querying**: Find paths between entities
- **Transitive Closure**: Compute entity reachability
- **Link Prediction**: Suggest new relationships
- **Network Metrics**: PageRank, clustering, betweenness

## Quick Start

```bash
npm install
npm run dev
```

## API Endpoints

### Rules

```bash
# Create rule
POST /reason/rules
{
  "name": "Hot Weather",
  "antecedent": [{"attribute": "temperature", "operator": "gt", "value": 30}],
  "consequent": [{"type": "assert", "attribute": "hot", "value": true}]
}

# Forward chaining
POST /reason/forward

# Backward chaining
POST /reason/backward
{"goal": {"attribute": "hot", "value": true}}
```

### Paths

```bash
# Find all paths
GET /reason/paths/:start/:end?maxDepth=5

# Shortest path
GET /reason/shortest-path/:start/:end
```

### Closure

```bash
# Transitive closure
GET /reason/closure/:entity
```

### Link Prediction

```bash
# Predict links
GET /reason/predict/:entity?threshold=0.5

# Network metrics
GET /reason/metrics/:entity
```

### Graph

```bash
# Add node
POST /graph/nodes
# Add edge
POST /graph/edges
```

## Architecture

```
┌─────────────┐
│  REST API   │
└──────┬──────┘
       │
┌──────▼──────┐
│ Rule Engine  │
│  Query Plan  │
│ Path Query   │
│ Link Pred    │
└─────────────┘
```

## Testing

```bash
npm test
```
