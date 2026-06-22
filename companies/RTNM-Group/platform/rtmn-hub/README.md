# RTMN Platform Hub

> Central Orchestration Platform for Real-Time Multi-Industry Network

**Port:** 8000 | **Status:** ✅ Production Ready

## Overview

The RTMN Platform Hub connects all 24 Industry Operating Systems with core platform services (BOA, SUTAR, Genie, AgentOS) through a unified orchestration layer.

## Quick Start

```bash
cd platform/rtmn-hub
npm install
node src/index.js
```

Access at: http://localhost:8000

## Architecture

```
┌─────────────────────────────────────────┐
│           RTMN Platform Hub             │
├─────────────┬─────────────┬─────────────┤
│   Core      │  Platform   │  Industries │
│   Services  │   Services  │    (24)    │
└─────────────┴─────────────┴─────────────┘
```

## Services

| Layer | Services |
|-------|----------|
| Core | API Gateway, AgentOS Hub, TwinOS Hub, Knowledge Graph, Business Copilot |
| Platform | BOA OS, SUTAR OS, Genie OS, Agent OS |
| Industries | Restaurant, Healthcare, Retail, Hospitality, Legal, Education... (24 total) |

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `GET /` | - | Platform overview |
| `GET /health` | - | Health check |
| `GET /services` | - | Full service registry |
| `GET /industries` | - | All Industry OS |
| `GET /twins` | - | All Digital Twins |
| `GET /agents` | - | All AI Agents |
| `POST /query` | POST | Universal query |
| `GET /search?q=` | GET | Platform search |

## Examples

```bash
# Get all services
curl http://localhost:8000/services

# Search platform
curl "http://localhost:8000/search?q=restaurant"

# Query service
curl -X POST http://localhost:8000/query \
  -H "Content-Type: application/json" \
  -d '{"service": "restaurant-os", "endpoint": "/health"}'
```

## Documentation

- [CLAUDE.md](CLAUDE.md) - Developer guide
- [FEATURES.md](FEATURES.md) - Feature documentation

## Related

- [RTNM-COMPANIES-AUDIT.md](../RTNM-COMPANIES-AUDIT.md)
- [RTNM-PRODUCTS-FEATURES-AUDIT.md](../RTNM-PRODUCTS-FEATURES-AUDIT.md)
