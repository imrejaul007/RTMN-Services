# RTMZ Deployment Guide

Complete deployment instructions for RTMZ ecosystem.

## Prerequisites

- Docker 20.10+
- Docker Compose 2.0+
- 8GB+ RAM recommended
- 20GB+ disk space

## Quick Start

```bash
# Clone the repo
git clone https://github.com/imrejaul007/rtmz
cd rtmz/infra

# Deploy everything
./deploy.sh

# Or manually:
docker-compose -f docker-compose.prod.yml up -d --build

# Verify
./verify-deployment.sh
```

## Service Architecture

### Auth Services
| Port | Service | Description |
|------|---------|-------------|
| 4002 | REZ Auth | JWT/OTP/TOTP authentication |
| 4003 | REZ SSO | OAuth2 SSO (Okta, Google) |

### Business Services
| Port | Service | Description |
|------|---------|-------------|
| 5000 | GraphQL Gateway | Unified GraphQL API |
| 5001 | AutoML Pipeline | ML automation |
| 5002 | Invoice OCR | Document processing |
| 5003 | Contract Management | E-signatures |
| 5004 | Legal Document AI | Legal analysis |
| 5005 | Cosmic Twin | Digital twin |
| 5006 | Ranking Service | ML ranking |

### MCP Servers (AI Agent Tools)
| Port | Service | Description |
|------|---------|-------------|
| 3100 | Analytics | Metrics and analytics |
| 3101 | Identity | User identity management |
| 3102 | Event Bus | Pub/sub event system |
| 3103 | Notification | Email, SMS, push notifications |
| 3104 | Order | Order management |
| 3105 | Payment | Payment processing |
| 3106 | Inventory | Inventory tracking |
| 3107 | Logs | Centralized logging |
| 3108 | Service Discovery | Service registry |
| 3109 | Agent Invoke | Cross-service orchestration |
| 3110 | AutoML | ML pipeline control |
| 3111 | Invoice | Invoice OCR processing |
| 3112 | Contracts | Contract management |
| 3113 | Legal | Legal document AI |
| 3114 | Cosmic Twin | Digital twin control |
| 3115 | Ranking | ML ranking control |

### Monitoring
| Port | Service | Description |
|------|---------|-------------|
| 3000 | Dashboard | RTMZ web dashboard |
| 3030 | Grafana | Metrics visualization |
| 9090 | Prometheus | Metrics collection |
| 9093 | Alertmanager | Alert routing |

## Environment Variables

Create a `.env` file in the `infra/` directory:

```bash
# MongoDB
MONGODB_URI=mongodb://localhost:27017/rtmz

# Redis
REDIS_URL=redis://localhost:6379

# JWT Secrets (generate new for production!)
JWT_SECRET=your-secure-jwt-secret-here
JWT_MERCHANT_SECRET=your-merchant-secret-here
JWT_ADMIN_SECRET=your-admin-secret-here
JWT_REFRESH_SECRET=your-refresh-secret-here

# Internal Service Tokens
INTERNAL_SERVICE_TOKENS={"graphql-gateway":"token1","automl":"token2"...}

# CORS
CORS_ORIGIN=http://localhost:3000,http://localhost:5000

# OAuth Providers (optional)
OKTA_CLIENT_ID=
OKTA_CLIENT_SECRET=
OKTA_DOMAIN=
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=

# AI Services
ANTHROPIC_API_KEY=sk-ant-...

# Email (for contract notifications)
SMTP_HOST=smtp.mailtrap.io
SMTP_PORT=587
SMTP_USER=
SMTP_PASS=
```

## Docker Compose Options

### Full Stack (with monitoring)
```bash
docker-compose -f docker-compose.prod.yml -f docker-compose.monitoring.yml up -d
```

### Services Only
```bash
docker-compose -f docker-compose.prod.yml up -d
```

### Development
```bash
docker-compose -f docker-compose.dev.yml up -d
```

## Verification

```bash
# Run verification script
./verify-deployment.sh

# Manual check
curl http://localhost:4002/health   # REZ Auth
curl http://localhost:5000/health   # GraphQL
curl http://localhost:3100/health   # MCP Analytics
```

## Troubleshooting

### Services not starting
```bash
# View logs
docker-compose -f docker-compose.prod.yml logs -f

# Restart specific service
docker-compose -f docker-compose.prod.yml restart rez-auth
```

### MongoDB connection issues
```bash
# Check MongoDB
docker exec rtmz-mongodb-1 mongosh --eval "db.adminCommand('ping')"
```

### Reset everything
```bash
docker-compose -f docker-compose.prod.yml down -v
docker-compose -f docker-compose.prod.yml up -d --build
```

## Service Health Endpoints

| Service | Endpoint |
|---------|----------|
| REZ Auth | `GET /health` |
| REZ SSO | `GET /health` |
| GraphQL | `GET /health` |
| AutoML | `GET /health` |
| Invoice OCR | `GET /health` |
| Contract Mgmt | `GET /health` |
| Legal AI | `GET /health` |
| Cosmic Twin | `GET /health` |
| Ranking | `GET /health` |
| MCP Servers | `GET /health` |

## Scaling

Scale individual services:
```bash
# Scale to 3 instances
docker-compose -f docker-compose.prod.yml up -d --scale automl=3
```

## Stopping

```bash
# Stop all services
docker-compose -f docker-compose.prod.yml down

# Stop and remove volumes
docker-compose -f docker-compose.prod.yml down -v
```

## Kubernetes

For Kubernetes deployment:
```bash
kubectl apply -f ../k8s/
```

See `../k8s/` directory for Kubernetes manifests.

## Monitoring URLs

- **Dashboard**: http://localhost:3000
- **Grafana**: http://localhost:3030 (admin/admin)
- **Prometheus**: http://localhost:9090
- **Alertmanager**: http://localhost:9093

## Authentication Flow

1. Client requests token from REZ Auth (port 4002)
2. REZ Auth validates credentials and returns JWT
3. Client includes JWT in Authorization header
4. Each service validates JWT via REZ Auth
5. For SSO, users redirected to REZ SSO (port 4003)
6. OAuth providers (Okta/Google) authenticate user
7. REZ SSO exchanges OAuth code for JWT

## API Documentation

- GraphQL: http://localhost:5000/graphql
- Swagger: http://localhost:5000/api-docs
- OpenAPI specs: `../docs/openapi/`