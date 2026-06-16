# REZ-graphql-federation - Unified GraphQL API

**Version:** 1.0.0  
**Port:** 4000  
**Location:** `companies/RABTUL-Technologies/REZ-graphql-federation/`  
**Status:** ✅ **RUNNING** | **June 17, 2026**

---

## Overview

REZ-graphql-federation provides a unified GraphQL API gateway that federates requests across multiple RTMN services. It offers a single GraphQL endpoint for querying data from different Industry OS services.

## Quick Start

```bash
# Start the service
npm install
node federation-server.js

# Health check
curl http://localhost:4000/health

# GraphQL endpoint
curl -X POST http://localhost:4000/graphql \
  -H "Content-Type: application/json" \
  -d '{"query": "{ services { name status industry } }"}'

# GraphiQL IDE
open http://localhost:4000/graphql

# Voyager (Schema visualization)
open http://localhost:4000/voyager
```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Health check |
| POST | `/graphql` | GraphQL query endpoint |
| GET | `/graphql` | GraphiQL IDE |
| GET | `/voyager` | GraphQL Voyager visualization |
| GET | `/schema` | SDL schema definition |

## GraphQL Features

### Query Examples

```graphql
# Get all registered services
query {
  services {
    name
    status
    industry
    port
  }
}

# Get service by name
query {
  service(name: "restaurant-os") {
    name
    status
    industry
    port
    version
  }
}

# Get service statistics
query {
  stats {
    totalServices
    healthyServices
    byIndustry {
      industry
      count
    }
  }
}

# Get events
query {
  events(type: "order.created") {
    id
    type
    source
    timestamp
    data
  }
}

# Get subscriptions
query {
  subscriptions {
    id
    pattern
    callback
    active
  }
}
```

### Federation Schema

```graphql
type Service {
  name: String!
  port: Int!
  industry: String!
  status: String!
  version: String
  url: String
  description: String
  lastHeartbeat: String
}

type Event {
  id: ID!
  type: String!
  source: String!
  data: JSON
  timestamp: String!
  correlationId: String
}

type Subscription {
  id: ID!
  pattern: String!
  callback: String!
  active: Boolean!
}

type Stats {
  totalServices: Int!
  healthyServices: Int!
  totalEvents: Int!
  totalSubscriptions: Int!
  byIndustry: [IndustryStats!]!
  byStatus: [StatusStats!]!
}

type IndustryStats {
  industry: String!
  count: Int!
}

type StatusStats {
  status: String!
  count: Int!
}

type Query {
  services(industry: String, status: String): [Service!]!
  service(name: String!): Service
  events(type: String, source: String, limit: Int): [Event!]!
  subscriptions(pattern: String): [Subscription!]!
  stats: Stats!
}
```

## Connected Services

| Service | Port | GraphQL Integration |
|---------|------|---------------------|
| REZ-ecosystem-connector | 4398 | Service registry queries |
| REZ-event-bus | 4510 | Event queries |
| All Industry OS | 5010+ | Federated types |

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | 4000 | Service port |
| `ECOSYSTEM_URL` | http://localhost:4398 | Integration connector URL |
| `EVENT_BUS_URL` | http://localhost:4510 | Event bus URL |

## Dependencies

- express: HTTP server
- graphql: GraphQL core
- graphql-yoga: GraphQL server
- cors: Cross-origin support
- helmet: Security headers

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                  REZ-graphql-federation                   │
│                        (Port 4000)                       │
├─────────────────────────────────────────────────────────┤
│  GraphQL Schema                                         │
│  ├── Service type (from ecosystem connector)            │
│  ├── Event type (from event bus)                       │
│  ├── Subscription type                                │
│  └── Stats type                                        │
│                                                          │
│  Resolvers                                              │
│  ├── Query.services → Integration Connector             │
│  ├── Query.events → Event Bus                         │
│  ├── Query.stats → Aggregated stats                   │
│  └── Query.subscriptions → Event Bus                   │
│                                                          │
│  Tools                                                  │
│  ├── GraphiQL IDE - Interactive query playground       │
│  ├── Voyager - Schema visualization                    │
│  └── SDL Export - Schema definition                    │
└─────────────────────────────────────────────────────────┘
```

## GraphiQL Features

- Syntax highlighting
- Auto-complete
- History
- Variables support
- Headers support
- Documentation explorer

---

*Last Updated: June 17, 2026*
