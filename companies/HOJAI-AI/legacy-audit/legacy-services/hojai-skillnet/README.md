# HOJAI SkillNet

**AI Skill Marketplace & Lifecycle Management**

---

## Overview

HOJAI SkillNet is a production-ready AI service providing:
- ML Predictions (Churn, LTV, Intent, Propensity, Revisit, Conversion)
- Product Recommendations (Collaborative Filtering)
- Event Bus & Pub/Sub
- Insights Generation (Segments, Trends, Anomalies)
- Tenant Management
- API Key Management

---

## Quick Start

```bash
# Install dependencies
npm install

# Development
npm run dev

# Production build
npm run build

# Start production
npm start

# Run tests
npm test
```

---

## API Endpoints

### REST API
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Full health check |
| GET | `/health/live` | Kubernetes liveness |
| GET | `/health/ready` | Kubernetes readiness |
| GET | `/metrics` | Prometheus metrics |
| GET | `/api-docs` | OpenAPI spec (JSON) |
| GET | `/docs` | Swagger UI |
| GET | `/graphql` | GraphQL playground |
| GET | `/stats` | Service statistics |
| POST | `/predictions/churn` | Churn prediction |
| POST | `/predictions/ltv` | LTV prediction |
| POST | `/predictions/intent` | Intent detection |
| GET | `/predictions` | List predictions |
| POST | `/recommendations/product` | Product recommendations |
| GET | `/recommendations` | List recommendations |
| POST | `/events` | Publish event |
| GET | `/events` | List events |
| POST | `/insights` | Create insight |
| GET | `/insights` | List insights |
| POST | `/tenants` | Create tenant |
| GET | `/tenants` | List tenants |
| POST | `/apikeys` | Create API key |

### WebSocket
| Endpoint | Description |
|----------|-------------|
| `ws://localhost:4530/ws?tenantId=xxx` | Real-time events |

---

## Architecture

```
hojai-skillnet/
├── src/
│   ├── index.ts         # Main service (28KB)
│   ├── graphql.ts       # GraphQL resolvers
│   ├── websocket.ts     # WebSocket manager
│   ├── metrics.ts       # Prometheus metrics
│   ├── tracing.ts       # OpenTelemetry tracing
│   └── swagger.ts      # OpenAPI spec
├── proto/
│   └── skillnet.proto  # gRPC definitions
├── k8s/                 # Kubernetes manifests
├── helm/                # Helm charts
├── alerts/              # Prometheus alerts
├── .github/workflows/  # CI/CD pipeline
├── dist/                # Built output (26 files)
└── test/                # 112 unit tests
```

---

## Features

| Category | Feature | Status |
|----------|---------|--------|
| **Core** | TypeScript Build | ✅ |
| | MongoDB Persistence | ✅ |
| | Graceful Shutdown | ✅ |
| | JWT Authentication | ✅ |
| | XSS Sanitization | ✅ |
| **API** | REST API | ✅ |
| | GraphQL API | ✅ |
| | WebSocket | ✅ |
| | gRPC (proto defined) | ✅ |
| | OpenAPI/Swagger | ✅ |
| **Observability** | Prometheus Metrics | ✅ |
| | OpenTelemetry Tracing | ✅ |
| | Health Checks | ✅ |
| **Infrastructure** | Docker | ✅ |
| | Kubernetes | ✅ |
| | Helm Charts | ✅ |
| | GitHub Actions CI/CD | ✅ |
| | Prometheus Alerts | ✅ |

---

## Testing

**112 unit tests passing**

---

## Environment Variables

| Variable | Required | Default |
|----------|----------|---------|
| PORT | No | 4530 |
| MONGODB_URI | Yes | mongodb://localhost:27017/hojai-skillnet |
| JWT_SECRET | Yes | (min 32 chars) |
| CORS_ORIGINS | No | - |
| NODE_ENV | No | development |

---

## Docker

```bash
docker build -t hojai-skillnet .
docker run -p 4530:4530 hojai-skillnet
```

---

## Documentation

| Document | Description |
|----------|-------------|
| README.md | This file |
| AUDIT-COMPLETE.md | Full audit report |
| CLAUDE.md | Developer guide |
| .env.example | Environment variables |

---

**Version:** 1.1.0  
**Updated:** June 13, 2026
