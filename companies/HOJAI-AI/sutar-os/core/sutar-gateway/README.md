# SUTAR Gateway (Port 4140)

The HTTP entry point for SUTAR OS. All SUTAR consumers (RTMN Hub, REZ, external apps) should hit this service for `/api/sutar/*` requests.

## Purpose

The Gateway provides:
1. **Service Registry** - Knows every SUTAR service, its port, status
2. **Request Routing** - Forwards `/api/sutar/<service>/<path>` to the right port
3. **Aggregation** - `/api/sutar/status` hits every SUTAR service in parallel
4. **Capability Discovery** - `/api/sutar/capabilities` returns the union of every SUTAR service's declared capabilities

## Key API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Health check with all service statuses |
| GET | `/ready` | Readiness probe |
| GET | `/api/sutar/services` | List all registered services |
| GET | `/api/sutar/services/:key` | Get specific service info |
| GET | `/api/sutar/layers` | Services organized by layer |
| GET | `/api/sutar/capabilities` | Capability map (task → service) |
| GET | `/api/sutar/status` | Aggregated health status |
| ALL | `/api/sutar/:service/:path` | Route request to upstream service |
| GET | `/rez-intel-status` | REZ Intelligence health status |
| POST | `/api/enrich` | Enrich agent context (internal) |
| POST | `/api/intel/classify-intent` | Intent classification |
| GET | `/api/intel/next-best-action` | Get next best action |

## Service Layers

| Layer | Services |
|-------|----------|
| 1 | monitoring (3100) |
| 2 | gateway (4140), twinOS (4142), memoryBridge (4143), identityOS (4144), agentID (4145) |
| 3 | intentBus (4154), agentNetwork (4155) |
| 4 | decisionEngine (4290), simulationOS (4241), goalOS (4242), networkLearning (4243), flowOS (4244), founderOS (4260) |
| 5 | marketplace (4255), economyOS (4294), usageTracker (4252), policyOS (4254) |
| 6 | trustEngine (4291), contractsOS (4292), negotiationEngine (4293) |
| 7 | exploration (4255), discovery (4256), multiAgentEvaluator (4257), reputationAggregator (4258), roiCalculator (4259) |
| Agent | agentTeaming (4853) |

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `PORT` | Yes | 4140 | Service port |
| `NODE_ENV` | No | development | Environment (development/production) |
| `JWT_SECRET` | For auth | - | JWT signing secret |
| `INTERNAL_SERVICE_TOKEN` | No | - | Internal service authentication |

## Dependencies

- `@rtmn/shared` - Shared utilities (auth, security, logging)
- `axios` - HTTP client for upstream service calls
- `express` - Web framework
- `helmet` - Security headers
- `cors` - CORS support
- `compression` - Response compression
- `morgan` - HTTP request logging

## Quick Start

```bash
# Start the service
npm start

# Run tests
npm test

# Watch mode
npm run test:watch
```

## Health Check

```bash
curl http://localhost:4140/health
```

Response:
```json
{
  "status": "ok",
  "service": "sutar-gateway",
  "sutarLayer": 2,
  "port": 4140,
  "counts": { "services": 27, "live": 25, "offline": 2 },
  "services": { ... },
  "timestamp": "2026-06-28T12:00:00.000Z"
}
```

## Capability Map

The gateway maps tasks to services:

```bash
curl -H "Authorization: Bearer <token>" http://localhost:4140/api/sutar/capabilities
```

Response:
```json
{
  "count": 15,
  "capabilities": {
    "negotiation": ["acpProtocol", "negotiationEngine"],
    "wallet": ["agentWallets"],
    "memory": ["memoryBridge"],
    ...
  },
  "services": { ... }
}
```

## Request Routing Example

Route a request to the Decision Engine:

```bash
curl -X POST http://localhost:4140/api/sutar/decisionEngine/v1/rank \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"options": [...], "context": {...}}'
```

## Tests

```bash
npm test
```

28 unit tests covering:
- Service registry
- Capability mapping
- Health check logic
- Request routing
- HTTP method handling
- Error handling
- Layer organization
- Internal auth
