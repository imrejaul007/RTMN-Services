# NeXha - CLAUDE.md

## What is NeXha?

**NeXha** is the Unified Commerce Network Infrastructure for RTNM Group.
- Positioned as "The Operating System for Commerce Networks"
- Connects manufacturers, distributors, franchises, retailers, suppliers, and merchants

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           NeXha Ecosystem                                  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────┐   ┌─────────────┐   ┌─────────────┐   ┌─────────────┐  │
│  │ DistributionOS│   │ FranchiseOS │   │Procurement │   │Manufacturing │  │
│  │   :4300    │   │   :4310    │   │   :4320    │   │   :4330    │  │
│  └──────┬──────┘   └──────┬──────┘   └──────┬──────┘   └─────────────┘  │
│         └──────────────────┬──────────────────┘                               │
│                           │                                                  │
│                    ┌──────┴──────┐                                        │
│                    │  Ecosystem   │                                        │
│                    │  Connector   │                                        │
│                    │   :4399      │                                        │
│                    └─────────────┘                                        │
│                                                                             │
│  ┌─────────────┐   ┌─────────────┐   ┌─────────────┐                     │
│  │TradeFinance │   │Intelligence │   │   Portal    │                     │
│  │   :4340    │   │   :4350    │   │   :4388    │                     │
│  └─────────────┘   └─────────────┘   └─────────────┘                     │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Services

| Service | Port | Description |
|---------|------|-------------|
| **Portal** | 4388 | B2B Infrastructure Marketplace (Next.js) |
| **DistributionOS** | 4300 | Distributor & wholesaler management |
| **FranchiseOS** | 4310 | Multi-location franchise operations |
| **ProcurementOS** | 4320 | Supplier network & RFQ |
| **ManufacturingOS** | 4330 | Production & BOM management |
| **TradeFinance** | 4340 | BNPL, credit lines, invoice financing |
| **Intelligence** | 4350 | AI predictions & analytics |
| **Connector** | 4399 | Central event bus & orchestration |

## Shared Packages

| Package | Purpose |
|---------|---------|
| `@rez/webhook-sdk` | HMAC verification, replay protection |
| `@rez/auth-client` | RABTUL OAuth2 authentication |
| `@rez/shared-types` | Canonical Zod schemas |
| `@rez/integration-framework` | Universal partner connectors |

## Quick Start

```bash
# Install dependencies
cd RTNM-Group/nexha
pnpm install

# Run with Docker
docker-compose up

# Or run individually
cd distribution-os && npm run dev
cd franchise-os && npm run dev
cd portal && npm run dev
```

## Environment Variables

See `.env.example` for all configuration options.

Key variables:
- `MONGODB_URI` - MongoDB connection
- `AUTH_SERVICE_URL` - RABTUL Auth Service
- `INTERNAL_SERVICE_TOKEN` - Service-to-service auth

## Development

```bash
# Build all services
pnpm build

# Run seed script
npx tsx scripts/seed.ts

# Run tests
pnpm test
```

## Key Files

- `docker-compose.yml` - Full stack deployment
- `scripts/seed.ts` - Test data generator
- `.env.example` - Environment template

## Integration Points

### REZ Ecosystem
- REZ Merchant (Port 4003) - Merchant operations
- REZ Intelligence (Port 4018) - AI predictions
- RTNM Finance (Port 4004) - Financial services

### External
- MongoDB - Primary database
- Redis - Caching & queues
- RABTUL Auth - Authentication

## Production Features

### Authentication & Authorization
- RABTUL Auth Service integration
- RBAC with 12 roles
- Permission-based access control
- Audit logging

### Database
- MongoDB with connection pooling
- Automatic retry on failure
- Index management
- Database initialization scripts

### Monitoring
- Prometheus metrics endpoint (`/metrics`)
- Health check endpoint (`/health`)
- Sentry error tracking
- Memory & CPU monitoring

### Real-time
- WebSocket server
- Room-based broadcasting
- Event-driven messaging

### Deployment
- Docker Compose for local
- Kubernetes manifests
- Ingress configuration
- HPA (auto-scaling)

### Scripts
- `scripts/init-db.ts` - Initialize collections & indexes
- `scripts/seed.ts` - Generate test data

## Environment Variables

See `.env.example` for all configuration.

## Deployment

See `docs/DEPLOYMENT.md` for detailed deployment instructions.

### Quick Start

```bash
# Local development
docker-compose up -d mongo redis
npx tsx scripts/init-db.ts
npx tsx scripts/seed.ts
pnpm dev

# Production (Docker)
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d

# Production (Kubernetes)
kubectl apply -f k8s/
```
