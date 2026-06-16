# REZ-graphql-federation - Features

**Version:** 1.0.0  
**Last Updated:** June 15, 2026  
**Port:** 4000  
**Status:** ✅ RUNNING

---

## Core Features

### 1. GraphQL API

| Feature | Description | Status |
|---------|-------------|--------|
| GraphQL Endpoint | POST /graphql for queries and mutations | ✅ |
| GraphiQL IDE | Interactive IDE at GET /graphql | ✅ |
| Query Support | Full GraphQL query support | ✅ |
| Mutation Support | Full GraphQL mutation support | ✅ |
| Schema | Dynamic schema with service data | ✅ |

### 2. Federation

| Feature | Description | Status |
|---------|-------------|--------|
| Service Integration | Connects to Integration Connector | ✅ |
| REST Integration | Fetches from REST APIs | ✅ |
| Data Aggregation | Aggregates data from multiple sources | ✅ |
| Service Federation | Single API for all services | ✅ |

### 3. Service Data

| Feature | Description | Status |
|---------|-------------|--------|
| Service Registry | Fetches from Integration Connector | ✅ |
| Service Listing | List all registered services | ✅ |
| Service Details | Get individual service details | ✅ |
| Real-time Data | Live data from services | ✅ |

---

## GraphQL Schema

### Types

```graphql
type Service {
  id: String
  name: String
  status: String
  industry: String
  capabilities: [String]
}
```

### Queries

| Query | Arguments | Returns |
|-------|-----------|---------|
| services | status, industry | [Service] |
| service | id | Service |

### Mutations

| Mutation | Arguments | Returns |
|----------|-----------|---------|
| registerService | name, industry, capabilities | Service |

---

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/graphql` | GraphQL query/mutation |
| GET | `/graphql` | GraphiQL IDE |
| GET | `/health` | Health check |

---

## Integration

### Connected Services

| Service | Port | Integration |
|---------|------|-------------|
| REZ-ecosystem-connector | 4399 | Service registry data |

### Data Flow

```
  Client
    │
    │ POST /graphql
    │
    ▼
┌─────────────────────────────────────────┐
│         GraphQL Federation (4000)       │
│                                         │
│  Schema ────▶ Resolvers                │
│    │              │                     │
│    │              ▼                     │
│    │         HTTP Client                │
│    │              │                     │
│    └──────────────┼────────────────────┘
│                   │
│                   ▼
│         ┌─────────────────┐
│         │ Integration     │
│         │ Connector (4399) │
│         └─────────────────┘
```

---

## Usage Examples

### Query: List all services
```graphql
query {
  services {
    id
    name
    status
    industry
    capabilities
  }
}
```

### Query: Filter by status
```graphql
query {
  services(status: "active") {
    name
    industry
  }
}
```

### Query: Get service details
```graphql
query {
  service(id: "service-id") {
    name
    status
    capabilities
  }
}
```

### Mutation: Register service
```graphql
mutation {
  registerService(
    name: "new-service"
    industry: "retail"
    capabilities: ["inventory", "orders"]
  ) {
    id
    name
    status
  }
}
```

---

## Statistics

| Metric | Value |
|--------|-------|
| Federated Services | 16 |
| GraphQL Operations | Active |

---

*Last Updated: June 15, 2026*
*REZ-graphql-federation - GraphQL Federation Gateway*