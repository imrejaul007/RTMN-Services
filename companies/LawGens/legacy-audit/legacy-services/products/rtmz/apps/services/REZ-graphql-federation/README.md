# REZ GraphQL Federation Gateway

**Port:** 5000

Unified GraphQL API gateway that federates existing REST services into a single GraphQL schema.

## Architecture

```
Client → GraphQL Gateway (5000) → REST Services
                                  ├── REZ-company-memory (4801)
                                  ├── REZ-agent-protocol (4201)
                                  └── Hojai API (4500)
```

## Features

- **Unified GraphQL API** - Single endpoint for all services
- **Company Brain** - Query company memory, decisions, goals, metrics
- **Agent Discovery** - Find and invoke AI agents
- **Memory Queries** - Search knowledge bases across services
- **Intelligence** - Access predictions, signals, recommendations
- **Real-time Subscriptions** - WebSocket support for live updates

## Schema Types

### Company
```graphql
type Company {
  id: ID!
  name: String!
  healthScore: Float
  metrics: CompanyMetrics
  goals: [Goal!]!
  decisions: [Decision!]!
  createdAt: DateTime!
  updatedAt: DateTime!
}
```

### Agent
```graphql
type Agent {
  id: ID!
  name: String!
  type: AgentType!
  capabilities: [Capability!]!
  status: AgentStatus!
  health: AgentHealth
}
```

### Memory
```graphql
type Memory {
  entityType: String!
  entityId: String!
  knowledge: [Knowledge!]!
  events: [MemoryEvent!]!
  lastUpdated: DateTime!
}
```

### Intelligence
```graphql
type Intelligence {
  predictions: [Prediction!]!
  signals: [Signal!]!
  recommendations: [Recommendation!]!
}
```

## Quick Start

```bash
# Install dependencies
npm install

# Configure environment
cp .env.example .env
# Edit .env with your service URLs

# Development
npm run dev

# Production
npm run build
npm start
```

## API Endpoints

| Endpoint | Description |
|----------|-------------|
| `POST /graphql` | GraphQL query/mutation endpoint |
| `GET /graphql` | GraphQL playground (dev only) |
| `GET /health` | Health check |
| `GET /health/ready` | Readiness check |

## Example Queries

### Get Company Memory
```graphql
query {
  company(id: "company_123") {
    name
    healthScore
    metrics {
      revenue
      customers
      orders
    }
    goals {
      id
      title
      progress
    }
  }
}
```

### Discover and Invoke Agent
```graphql
query {
  agents(capability: "customer_support") {
    id
    name
    status
  }
}

mutation {
  invokeAgent(agentId: "agent_456", input: { query: "Help me" }) {
    response
    confidence
  }
}
```

### Query Memory
```graphql
query {
  memory(entityType: "merchant", entityId: "merchant_789") {
    knowledge(category: "operations") {
      title
      content
    }
    events(limit: 10) {
      type
      description
      timestamp
    }
  }
}
```

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Server port | 5000 |
| `COMPANY_MEMORY_URL` | REZ-company-memory URL | http://localhost:4801 |
| `AGENT_PROTOCOL_URL` | REZ-agent-protocol URL | http://localhost:4201 |
| `HOJAI_API_URL` | Hojai API URL | http://localhost:4500 |
| `JWT_SECRET` | JWT signing secret | - |
| `NODE_ENV` | Environment | development |

## Authentication

All requests require a valid JWT token in the `Authorization` header:

```
Authorization: Bearer <token>
```

Multi-tenant requests require `X-Tenant-ID` header:

```
X-Tenant-ID: tenant_123
```

## Health Checks

```bash
# Liveness
curl http://localhost:5000/health

# Readiness (includes upstream service checks)
curl http://localhost:5000/health/ready
```

## License

MIT
