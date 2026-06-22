# KnowledgeGraphOS Developer Guide

## Architecture

KnowledgeGraphOS provides an in-memory graph store with REST API:

```
┌─────────────────────────────────────────────────────────────┐
│                     KnowledgeGraphOS API                       │
├─────────────────────────────────────────────────────────────┤
│  GraphStore (In-Memory)                                     │
│  ├── nodes: Map<id, Node>                                 │
│  ├── relationships: Map<id, Relationship>                   │
│  └── adjacency: Map<id, Map<type, Set<id>>>              │
└─────────────────────────────────────────────────────────────┘
```

## Node Structure

```javascript
{
  id: "node_123",
  type: "Person",
  properties: {
    name: "John",
    age: 30
  },
  labels: ["Person", "Customer"]
}
```

## Relationship Structure

```javascript
{
  id: "rel_123",
  from: "node_1",
  to: "node_2",
  type: "KNOWS",
  properties: {
    since: "2020"
  }
}
```

## Graph Traversal

Use `/api/traverse` for BFS/DFS:

```javascript
POST /api/traverse
{
  "startNode": "node_123",
  "depth": 3,
  "direction": "outbound",
  "types": ["KNOWS", "WORKS_AT"]
}
```

## Search

Full-text search with filters:

```javascript
GET /api/search?q=john&type=Person&labels=Customer
```
