# RTMN Unified Hub

**Version:** 1.0.0
**Port:** 4399
**Status:** ✅ COMPLETE

## Overview

Single entry point for all RTMN services. Routes requests to appropriate downstream services and provides health monitoring.

## Quick Start

```bash
cd services/rtmn-unified-hub
npm install
npm run build
npm start

# Health check
curl http://localhost:4399/health

# Service registry
curl http://localhost:4399/api/services

# Check all services health
curl http://localhost:4399/api/health/all
```

## API Endpoints

### Hub Management

| Method | Path | Description |
|--------|------|-------------|
| GET | `/health` | Hub health |
| GET | `/ready` | All services ready? |
| GET | `/api/services` | Service registry |
| GET | `/api/health/all` | Check all services |
| GET | `/api/health/cached` | Cached health |
| GET | `/api/health/:name` | Specific service health |

### Routed Endpoints (proxied to downstream)

| Path Pattern | Routes To |
|--------------|-----------|
| `/api/genie/*` | Genie Runtime (7100) |
| `/api/services/decision/*` | Decision Intelligence (4740) |
| `/api/services/learning/*` | Learning Loop (4742) |
| `/api/services/anticipation/*` | Anticipation (4745) |
| `/api/services/ambient/*` | Ambient (4746) |
| `/api/services/constitution/*` | Constitution (4743) |
| `/api/services/financial/*` | Financial Life (4747) |
| `/api/services/health/*` | Health Intelligence (4748) |
| `/api/services/household/*` | Household (4749) |
| `/api/services/travel/*` | Travel (4750) |
| `/api/services/spiritual/*` | Spiritual (4751) |
| `/api/services/simulation/*` | Life Simulation (4752) |
| `/api/services/focus/*` | Focus (4753) |
| `/api/services/dreams/*` | Dreams (4754) |
| `/api/services/legacy/*` | Legacy (4755) |
| `/api/memory/*` | MemoryOS (4703) |
| `/api/twin/*` | TwinOS (4705) |
| `/api/corpid/*` | CorpID (4702) |
| `/api/calendar/*` | Calendar (4709) |
| `/api/wellness/*` | Wellness (4723) |
| `/api/money/*` | Money (4724) |
| `/api/sutar/*` | SUTAR (4140) |
| `/api/razo/*` | RAZO (4299) |
| `/api/genie-gateway/*` | Genie Gateway (4701) |

**Total: 25+ services routed**

## Files

```
rtmn-unified-hub/
├── src/
│   ├── index.ts                        # Express server, port 4399
│   └── services/
│       ├── serviceRegistry.ts          # 25+ services registered
│       ├── proxy.ts                    # HTTP proxy
│       └── healthChecker.ts            # Health monitoring
├── __tests__/
│   └── hub.test.ts
├── package.json
├── tsconfig.json
└── vitest.config.ts
```

## Status: ✅ COMPLETE — Wire to Genie runtime

This hub wires all 14 Genie services to the public port 4399. The Genie OS runtime at port 7100 also wires them at /api/genie/*.