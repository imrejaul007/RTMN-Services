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

### SUTAR OS Top-Level Routing (v1.1.0)

The Hub proxies the SUTAR OS autonomous-economic layer (HOJAI-AI platform) at the
top level. Two endpoints:

- `GET /api/sutar/capabilities` — Capability → service map (mirrors
  `sutar-gateway`'s `CAPABILITY_MAP`) plus the full service-URL table.
- `ANY /api/sutar/<service>/<path>` — Direct HTTP proxy to a SUTAR service.
  Supports GET, POST, PUT, PATCH, DELETE. Forwards headers (except Host),
  query string, and request body. Returns a 502 with details if the upstream
  is unreachable.

#### Available SUTAR Services

| Service | Default URL |
|---------|-------------|
| `sutar-gateway` | http://localhost:4140 |
| `sutar-agent-teaming` | http://localhost:4853 |
| `sutar-agent-network` | http://localhost:4155 |
| `sutar-agent-reputation` | http://localhost:4820 |
| `sutar-decision-engine` | http://localhost:4240 |
| `sutar-contract-os` | http://localhost:4190 |
| `sutar-negotiation` | http://localhost:4191 |
| `sutar-wallet-service` | http://localhost:4840 |
| `sutar-economy-os` | http://localhost:4251 |
| `sutar-trust-network` | http://localhost:4252 |
| `sutar-dispute` | http://localhost:4847 |
| `sutar-marketplace` | http://localhost:4250 |
| `sutar-twin-os` | http://localhost:4142 |
| `sutar-goal-os` | http://localhost:4242 |
| `sutar-monitoring` | http://localhost:3100 |

Each URL can be overridden via env var: `SUTAR_<SERVICE>_URL`.

#### Examples

```bash
# Capabilities
curl http://localhost:4399/api/sutar/capabilities

# List agent-teaming mission templates (direct path proxy)
curl http://localhost:4399/api/sutar/sutar-agent-teaming/api/teaming/templates

# Form a team via the Hub
curl -X POST http://localhost:4399/api/sutar/sutar-agent-teaming/api/teaming/teams \
  -H 'Content-Type: application/json' \
  -d '{"name":"price-compare","mission":"compare-prices","size":3}'

# Check agent reputation
curl http://localhost:4399/api/sutar/sutar-agent-reputation/api/reputation/agent_001

# Health check via Hub for any SUTAR service
curl http://localhost:4399/api/sutar/sutar-decision-engine/health
```

#### Design Notes

- Direct service URLs are used (not the gateway) so each service can be reached
  independently — no gateway becomes a single point of failure.
- The gateway (4140) remains the recommended path for capability-based routing
  with retries, fallbacks, and centralized auth.
- This complements the existing `sutarOS.js` connection module in
  `companies/REZ-Workspace/core/unified-fabric/`, which is the in-process Node
  client. The Hub routes here are HTTP-facing for cross-language consumers.


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