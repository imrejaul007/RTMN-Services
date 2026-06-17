# REZ-ecosystem-connector

**Service:** REZ Ecosystem Service Registry & Discovery  
**Port:** 4399  
**Status:** ✅ RUNNING

## Overview

REZ-ecosystem-connector is the central service registry and discovery hub for the RTMN ecosystem. It provides:
- Service registration and discovery
- Health monitoring and heartbeats
- Event subscriptions
- Transaction management
- Message routing

## Quick Start

```bash
cd companies/RABTUL-Technologies/REZ-ecosystem-connector
npm install
npm start
```

## API Endpoints

### Service Management
- `POST /api/services` - Register a service
- `GET /api/services` - List all services
- `GET /api/services/:id` - Get service by ID
- `GET /api/services/name/:name` - Get service by name
- `PATCH /api/services/:id/status` - Update service status
- `POST /api/services/:id/heartbeat` - Send heartbeat
- `DELETE /api/services/:id` - Unregister service

### Messaging
- `POST /api/messages` - Send message
- `GET /api/messages/:id` - Get message
- `GET /api/messages/correlation/:id` - Get by correlation ID
- `GET /api/messages/service/:name` - Get by service name

### Subscriptions
- `POST /api/subscriptions` - Create subscription
- `GET /api/subscriptions` - List subscriptions
- `DELETE /api/subscriptions/:id` - Delete subscription

### Health
- `GET /health` - Health check
- `GET /api/health/services` - Service health
- `GET /api/stats` - Statistics

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| PORT | 4399 | Service port |
| LOG_LEVEL | info | Logging level |

## Connected Services

Currently registered services (19):
- Integration Connector (4399)
- REZ Event Bus (4510)
- GraphQL Federation (4000)
- Goal OS (4242)
- Memory OS (4703)
- Restaurant OS (5010)
- Healthcare OS (5020)
- Hotel OS (5025)
- Retail OS (5030)
- Legal OS (5035)
- Hospitality OS (5050)
- Education OS (5060)
- Automotive OS (5080)
- Beauty OS (5090)
- Energy OS (5100)
- Fitness OS (5110)
- Manufacturing OS (5150)
- RealEstate OS (5230)
- Media OS (5600)

## Architecture

```
                    ┌─────────────────────┐
                    │ REZ-ecosystem-      │
                    │ connector (4399)    │
                    └──────────┬──────────┘
                               │
         ┌─────────────────────┼─────────────────────┐
         │                     │                     │
    ┌────▼────┐          ┌────▼────┐          ┌────▼────┐
    │Services │          │Messages │          │Subs     │
    │Registry │          │Router   │          │criptions│
    └─────────┘          └─────────┘          └─────────┘
```