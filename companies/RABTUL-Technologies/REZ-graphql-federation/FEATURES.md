# REZ-graphql-federation - Features

**Version:** 1.0.0  
**Last Updated:** June 17, 2026

---

## Core Features

### 1. GraphQL Federation

| Feature | Description | Status |
|---------|-------------|--------|
| **Single Endpoint** | Unified GraphQL API for all services | ✅ |
| **Service Federation** | Aggregate data from multiple services | ✅ |
| **Type Federation** | Combine schemas from different sources | ✅ |
| **Schema Stitching** | Merge GraphQL schemas | ✅ |
| **Remote Schemas** | Query external GraphQL services | ✅ |

### 2. Query Capabilities

| Feature | Description | Status |
|---------|-------------|--------|
| **Service Queries** | Query service registry | ✅ |
| **Event Queries** | Query event bus | ✅ |
| **Subscription Queries** | Query subscriptions | ✅ |
| **Statistics Queries** | Query aggregated stats | ✅ |
| **Filtering** | Filter by industry, status, type | ✅ |
| **Pagination** | Limit and offset support | ✅ |

### 3. GraphQL Tools

| Feature | Description | Status |
|---------|-------------|--------|
| **GraphiQL IDE** | Interactive query playground | ✅ |
| **Voyager** | Schema visualization | ✅ |
| **Schema SDL** | Schema definition export | ✅ |
| **Introspection** | Full introspection support | ✅ |
| **Doc Explorer** | Documentation browser | ✅ |

### 4. Developer Experience

| Feature | Description | Status |
|---------|-------------|--------|
| **Auto-complete** | Smart suggestions | ✅ |
| **Syntax Highlighting** | Code highlighting | ✅ |
| **Error Messages** | Clear error messages | ✅ |
| **Query History** | Recent queries | ✅ |
| **Variables** | Variable support | ✅ |
| **Headers** | Custom headers | ✅ |

---

## API Features

### Service Registry Queries

```graphql
# All services
query {
  services {
    name
    port
    industry
    status
  }
}

# Filter by industry
query {
  services(industry: "hospitality") {
    name
    status
  }
}

# Filter by status
query {
  services(status: "healthy") {
    name
    industry
  }
}

# Single service
query {
  service(name: "restaurant-os") {
    name
    port
    status
    version
    lastHeartbeat
  }
}
```

### Event Bus Queries

```graphql
# All events
query {
  events {
    id
    type
    source
    timestamp
  }
}

# Filter by type
query {
  events(type: "order.created") {
    id
    data
    timestamp
  }
}

# Filter by source
query {
  events(source: "restaurant-os") {
    id
    type
    data
  }
}

# Limit results
query {
  events(limit: 10) {
    id
    type
    timestamp
  }
}
```

### Statistics Queries

```graphql
# Get all stats
query {
  stats {
    totalServices
    healthyServices
    totalEvents
    totalSubscriptions
    byIndustry {
      industry
      count
    }
    byStatus {
      status
      count
    }
  }
}
```

### Subscription Queries

```graphql
# All subscriptions
query {
  subscriptions {
    id
    pattern
    callback
    active
  }
}

# Filter by pattern
query {
  subscriptions(pattern: "order.*") {
    id
    callback
  }
}
```

---

## Schema Federation

### Aggregated Types

| Type | Source | Fields |
|------|--------|--------|
| `Service` | REZ-ecosystem-connector | name, port, industry, status, version, url, description, lastHeartbeat |
| `Event` | REZ-event-bus | id, type, source, data, timestamp, correlationId |
| `Subscription` | REZ-event-bus | id, pattern, callback, active |
| `Stats` | Aggregated | totalServices, healthyServices, totalEvents, totalSubscriptions |

### Federation Strategy

1. **Service Registry Integration**
   - Connect to REZ-ecosystem-connector (port 4398)
   - Fetch service data via REST
   - Transform to GraphQL types

2. **Event Bus Integration**
   - Connect to REZ-event-bus (port 4510)
   - Query events via REST
   - Transform to GraphQL Event type

3. **Statistics Aggregation**
   - Fetch from multiple sources
   - Aggregate in resolver
   - Return unified Stats type

---

## Integration Points

### Connected Services

| Service | Port | Connection |
|---------|------|-----------|
| REZ-ecosystem-connector | 4398 | REST API |
| REZ-event-bus | 4510 | REST API |

### Clients

| Client | Use Case |
|--------|----------|
| Frontend Apps | Data querying |
| Mobile Apps | API access |
| Third-party | Integration |
| GraphQL Clients | Apollo, Relay, urql |

---

## Performance Metrics

| Metric | Value |
|--------|-------|
| Query Latency | < 100ms |
| Max Query Depth | 10 |
| Max Complexity | 1000 |
| Max Results | 1000 |

---

## Error Handling

| Error | Response |
|-------|----------|
| Service unavailable | `null` with error message |
| Invalid query | GraphQL error |
| Timeout | Error with partial results |
| Schema error | Validation error |

---

## Security

| Feature | Implementation |
|---------|----------------|
| CORS | Configured origins |
| Helmet | Security headers |
| Introspection | Enabled (dev mode) |
| Query Depth | Limited |
| Query Complexity | Limited |

---

## Use Cases

### 1. Dashboard Queries
```graphql
query DashboardQuery {
  stats {
    totalServices
    healthyServices
  }
  services(status: "healthy") {
    name
    industry
  }
  events(type: "*.error", limit: 5) {
    id
    type
    timestamp
  }
}
```

### 2. Service Monitoring
```graphql
query ServiceMonitor {
  services {
    name
    status
    lastHeartbeat
  }
  stats {
    byStatus {
      status
      count
    }
  }
}
```

### 3. Event Analysis
```graphql
query EventAnalysis {
  events(type: "order.*", limit: 100) {
    type
    source
    timestamp
  }
}
```

---

*Last Updated: June 17, 2026*
