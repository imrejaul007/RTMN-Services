# Genie Browser History-service

## Overview

This is the Genie browser history-service service for HOJAI Genie AI.

**Tagline:** "You don't use Genie. You talk to Genie."

## Quick Start

```bash
# Install dependencies
npm install

# Development
npm run dev

# Production
npm run build
npm start
```

## Docker

```bash
docker build -t genie-browser-history-service .
docker run -p 3000:3000 genie-browser-history-service
```

## Environment Variables

See `.env.example` for configuration options.

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Health check |
| GET | `/health/live` | Liveness probe |
| GET | `/health/ready` | Readiness probe |

## Documentation

Full documentation: [GENIE-COMPLETE-DOCUMENTATION.md](../GENIE-COMPLETE-DOCUMENTATION.md)

---

**Status:** ✅ Built | **Last Updated:** June 13, 2026
