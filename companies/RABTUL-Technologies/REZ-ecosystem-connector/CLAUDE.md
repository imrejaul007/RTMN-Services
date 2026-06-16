# REZ-ecosystem-connector - Service Registry & Discovery

**Version:** 1.0.0  
**Port:** 4398  
**Location:** `companies/RABTUL-Technologies/REZ-ecosystem-connector/`  
**Status:** ✅ **RUNNING** | **June 17, 2026**

---

## Overview

REZ-ecosystem-connector is the central service registry and discovery hub for the RTMN ecosystem. It maintains a live registry of all services, their health status, and provides service discovery capabilities.

## Quick Start

```bash
# Start the service
npm install
npm start

# Health check
curl http://localhost:4398/health

# Register a service
curl -X POST http://localhost:4398/api/services/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "my-service",
    "port": 5000,
    "industry": "retail",
    "version": "1.0.0",
    "status": "healthy"
  }'

# List all services
curl http://localhost:4398/api/services

# Get service by name
curl http://localhost:4398/api/services/my-service

# Get stats
curl http://localhost:4398/api/stats

# Heartbeat
curl -X POST http://localhost:4398/api/heartbeat/my-service
```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Health check |
| GET | `/api/services` | List all registered services |
| GET | `/api/services/:name` | Get service by name |
| POST | `/api/services/register` | Register a new service |
| POST | `/api/services/:name/heartbeat` | Send heartbeat |
| DELETE | `/api/services/:name` | Unregister service |
| GET | `/api/stats` | Get registry statistics |

## Service Registration Schema

```json
{
  "name": "string (required)",
  "port": "number (required)",
  "industry": "string (required)",
  "version": "string (optional)",
  "status": "string (healthy|unhealthy|unknown)",
  "url": "string (optional)",
  "description": "string (optional)"
}
```

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | 4398 | Service port |
| `HOST` | 0.0.0.0 | Service host |

## Dependencies

- express: HTTP server
- axios: HTTP client for health checks
- cors: Cross-origin support
- helmet: Security headers

## Connected Services

This service is used by all Industry OS services for:
- Service discovery
- Health monitoring
- Load balancing
- Circuit breaker pattern

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                  REZ-ecosystem-connector                 │
│                        (Port 4398)                       │
├─────────────────────────────────────────────────────────┤
│  Service Registry                                        │
│  ├── Service Name → Service Info                        │
│  ├── Health Status → Last heartbeat time                 │
│  └── Industry → List of services                         │
│                                                          │
│  API Endpoints                                           │
│  ├── /api/services - List/register services              │
│  ├── /api/stats - Registry statistics                    │
│  └── /health - Health check                             │
└─────────────────────────────────────────────────────────┘
```

---

*Last Updated: June 17, 2026*
