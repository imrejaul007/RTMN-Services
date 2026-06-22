# SUTAR Flow OS

> **Flow OS - Workflow orchestration, execution, and AI-powered optimization for SUTAR OS**

## Overview

SUTAR Flow OS provides a comprehensive workflow orchestration layer for SUTAR OS. It enables businesses to define, execute, and optimize automated workflows with AI-powered insights.

**Port:** 4244
**Company:** HOJAI AI
**Product:** SUTAR OS
**Layer:** FlowOS

## Key Features

- **Flow Definition & Execution** - Create and manage workflow definitions with step-by-step execution
- **Step Types** - Action, Condition, Wait, Notify, and Transform steps
- **Trigger Management** - Manual, Scheduled, Event-driven, Webhook, and Cron triggers
- **Flow Execution Engine** - State management, conditional branching, parallel execution
- **Bottleneck Detection** - AI-powered analysis to identify workflow bottlenecks
- **Workflow Analytics** - Success/failure rates, execution times, step-level analytics
- **AI Optimization** - Suggestions to reduce steps, parallelize, and improve reliability
- **Multi-tenant** - Full tenant isolation with tenant ID header

## Quick Start

```bash
# Install dependencies
npm install

# Development server
npm run dev

# Build for production
npm run build

# Production server
npm start
```

## API Endpoints

### Health Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/health` | GET | Service health check |
| `/health/live` | GET | Liveness probe |
| `/health/ready` | GET | Readiness probe (checks MongoDB) |

### Flow Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/flows` | GET | List flow definitions |
| `/api/flows` | POST | Create flow definition |
| `/api/flows/:id` | GET | Get flow detail |
| `/api/flows/:id` | PATCH | Update flow |
| `/api/flows/:id` | DELETE | Delete flow |
| `/api/flows/:id/run` | POST | Execute flow |
| `/api/flows/:id/runs` | GET | Flow run history |
| `/api/flows/:id/runs/:runId` | GET | Run detail |
| `/api/flows/:id/runs/:runId/cancel` | POST | Cancel run |
| `/api/flows/:id/analytics` | GET | Flow analytics |
| `/api/flows/:id/bottlenecks` | GET | Bottleneck analysis |

### Run Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/runs` | GET | List all runs |
| `/api/runs/:id` | GET | Run detail |

### Trigger Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/triggers` | GET | List triggers |
| `/api/triggers` | POST | Create trigger |
| `/api/triggers/:id` | PATCH | Update trigger |
| `/api/triggers/:id` | DELETE | Delete trigger |
| `/api/triggers/:id/test` | POST | Test trigger |

### Analytics Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/analytics/dashboard` | GET | Dashboard statistics |
| `/api/analytics` | GET | Workflow analytics |

### Optimization Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/optimization/suggest` | POST | AI workflow suggestions |
| `/api/optimization/optimize/:flowId` | POST | AI flow optimization |

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| PORT | No | 4244 | Service port |
| NODE_ENV | No | development | Environment |
| MONGODB_URI | No | mongodb://localhost:27017/sutar-flow-os | MongoDB connection URI |
| CORS_ORIGIN | No | * | CORS origin |
| JWT_SECRET | No | - | JWT secret for auth |
| LOG_LEVEL | No | info | Logging level |

## Authentication

All API routes (except `/health`) require the `X-Tenant-Id` header:

```bash
curl -H "X-Tenant-Id: your-tenant-id" http://localhost:4244/api/flows
```

## Flow Definition Example

```json
{
  "name": "Order Processing",
  "description": "Automated order processing workflow",
  "steps": [
    {
      "id": "validate-order",
      "name": "Validate Order",
      "type": "action",
      "config": {
        "action": "validate"
      },
      "nextSteps": ["check-inventory"]
    },
    {
      "id": "check-inventory",
      "name": "Check Inventory",
      "type": "condition",
      "config": {
        "condition": "order.items",
        "operator": "gt",
        "value": 0
      },
      "nextSteps": ["process-payment", "notify-out-of-stock"]
    },
    {
      "id": "process-payment",
      "name": "Process Payment",
      "type": "action",
      "config": {
        "action": "payment"
      }
    },
    {
      "id": "notify-out-of-stock",
      "name": "Notify Out of Stock",
      "type": "notify",
      "config": {
        "template": "out-of-stock",
        "recipients": ["{{order.customer.email}}"],
        "channel": "email"
      }
    }
  ],
  "triggers": [
    {
      "type": "webhook",
      "config": {
        "webhookPath": "/order-created"
      }
    }
  ]
}
```

## Tech Stack

- Node.js 20+
- Express.js
- TypeScript
- MongoDB (Mongoose)
- Zod (validation)
- JSON Web Tokens

## Docker

```bash
# Build and run with Docker Compose
docker-compose up -d

# Or build standalone
docker build -t sutar-flow-os .
docker run -p 4244:4244 sutar-flow-os
```

## Integration Points

| Service | Port | Purpose |
|---------|------|---------|
| SUTAR Gateway | 4140 | API Gateway |
| SUTAR Intent Bus | 4154 | Intent routing |
| SUTAR Agent Network | 4155 | Agent registry |
| HOJAI Memory | 4520 | Long-term memory |
| HOJAI Flow Service | 4580 | Base flow service |

## Architecture

This service follows the SUTAR OS 12-layer canonical architecture:

```
Layer: FlowOS
Port: 4244
Type: Microservice
Database: MongoDB
```

## License

Proprietary - RTNM Digital

---

**Last Updated:** 2026-06-12
