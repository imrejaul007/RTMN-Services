# REZ-graphql-federation

**Service:** REZ GraphQL Federation Gateway  
**Port:** 4000  
**Status:** ✅ RUNNING

## Overview

REZ-graphql-federation provides a unified GraphQL API that federates all RTMN services. It provides:
- Unified GraphQL endpoint
- GraphiQL IDE for testing
- Service federation
- REST integration

## Quick Start

```bash
cd companies/RABTUL-Technologies/REZ-graphql-federation
npm install
npm start
```

## GraphiQL IDE

Access the interactive GraphQL IDE at:
```
http://localhost:4000/graphql
```

## API Endpoints

### GraphQL
- `POST /graphql` - GraphQL queries and mutations
- `GET /graphql` - GraphiQL IDE

### Health
- `GET /health` - Health check

## GraphQL Schema

```graphql
type Service {
  id: String
  name: String
  status: String
  industry: String
  capabilities: [String]
}

type Query {
  services(status: String, industry: String): [Service]
  service(id: String!): Service
  health: String
}

type Mutation {
  registerService(name: String!, industry: String, capabilities: [String]): Service
}
```

## Query Examples

### List all services
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

### Get service by ID
```graphql
query {
  service(id: "service-id") {
    id
    name
    status
    capabilities
  }
}
```

### Register new service
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

## Connected Services

The GraphQL federation connects to:
- REZ-ecosystem-connector (4399) - Service registry

## Architecture

```
                    ┌─────────────────────┐
                    │  GraphQL Federation │
                    │      (4000)        │
                    └──────────┬──────────┘
                               │
              ┌────────────────┼────────────────┐
              │                │                │
         ┌────▼────┐     ┌────▼────┐     ┌────▼────┐
         │Query    │     │Mutation │     │Schema  │
         │Resolver │     │Resolver │     │Builder │
         └─────────┘     └─────────┘     └─────────┘
              │                │                │
              └────────────────┼────────────────┘
                               │
                    ┌──────────▼──────────┐
                    │   Service Registry  │
                    │    (Integration)    │
                    └────────────────────┘
```