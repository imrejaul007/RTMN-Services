# Sutar Trust Engine

> **Trust Engine - Trust score verification**

## Overview

This is a SUTAR OS service providing Trust Engine - Trust score verification.

**Port:** 4180
**Company:** HOJAI AI
**Product:** SUTAR OS

## Quick Start

```bash
cd services/sutar-trust-engine
npm install
npm run dev
```

## Features

| Feature | Status |
|---------|--------|
| Credit check | ✅ Implemented |
| Trust validation | ✅ Implemented |
| Payment history | ✅ Implemented |
| Dispute analysis | ✅ Implemented |

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
Layer: Trust Engine
Port: 4180
Type: Microservice
```

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| PORT | No | 4180 | Service port |
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
