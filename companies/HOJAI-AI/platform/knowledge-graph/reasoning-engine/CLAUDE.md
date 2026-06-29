# Reasoning Engine - Claude.md

## Service Overview

**Reasoning Engine** provides inference capabilities over the knowledge graph. Part of KnowledgeOS infrastructure.

## Core Modules

| Module | File | Purpose |
|--------|------|---------|
| Rule Engine | `src/rules/ruleEngine.ts` | Forward/backward chaining |
| Path Query | `src/path/pathQuery.ts` | Path finding algorithms |
| Transitive Closure | `src/closure/transitiveClosure.ts` | Reachability analysis |
| Link Prediction | `src/prediction/linkPrediction.ts` | Relationship prediction |
| Query Planner | `src/query/queryPlanner.ts` | Query optimization |

## Key Algorithms

### Rule Engine
- Forward chaining: data → conclusions
- Backward chaining: goal → subgoals
- Supports conditions: eq, ne, gt, gte, lt, lte, contains, exists

### Path Querying
- findAllPaths: BFS with depth limit
- shortestPath: Dijkstra variant
- Pattern matching: Typed path sequences

### Transitive Closure
- Floyd-Warshall for reachability
- Strongly connected components
- Mutual reachability queries

### Link Prediction
- Common Neighbors
- Jaccard Coefficient
- Adamic-Adar Index
- PageRank

## Common Tasks

### Add new inference rule

```typescript
POST /reason/rules
{
  "name": "My Rule",
  "antecedent": [{"attribute": "x", "operator": "gt", "value": 10}],
  "consequent": [{"type": "assert", "attribute": "y", "value": true}]
}
```

### Query paths

```bash
GET /reason/paths/A/C?maxDepth=5
```

### Predict links

```bash
GET /reason/predict/person-123?threshold=0.7
```

## Testing

```bash
npm test
```
