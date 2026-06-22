# Sutar Intent Bus

> **Intent Bus - Intent routing and management**

## Overview

This is a SUTAR OS service providing Intent Bus - Intent routing and management.

**Port:** 4154
**Company:** HOJAI AI
**Product:** SUTAR OS

## Quick Start

```bash
cd services/sutar-intent-bus
npm install
npm run dev
```

## Features

| Feature | Status |
|---------|--------|
| Intent capture | ✅ Implemented |
| Pattern recognition | ✅ Implemented |
| Context enrichment | ✅ Implemented |
| Routing | ✅ Implemented |

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| /health | GET | Service health check |
| /api/v1/info | GET | Service information |
| /api/v1/status | GET | Service status |
| /api/v1/intent | POST | Submit intent for processing |
| /api/v1/event | POST | Publish event |

## Integration Points

| Service | Port | Purpose |
|---------|------|---------|
| SUTAR Gateway | 4140 | API Gateway |
| SUTAR Intent Bus | 4154 | Intent routing |
| SUTAR Agent Network | 4155 | Agent registry |
| HOJAI Memory | 4520 | Long-term memory |

## Architecture

This service follows the SUTAR OS 12-layer canonical architecture:

```
Layer: Intent Bus
Port: 4154
Type: Microservice
```

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| PORT | No | 4154 | Service port |
| NODE_ENV | No | development | Environment |
| LOG_LEVEL | No | info | Logging level |

## Tech Stack

- Node.js 20+
- Express.js
- TypeScript
- Zod (validation)

## License

Proprietary - RTNM Digital

---

**Last Updated:** 2026-06-13
