# Genie Briefing Service

## Overview

This is the Genie briefing service service for HOJAI Genie AI.

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
docker build -t genie-briefing-service .
docker run -p 3000:3000 genie-briefing-service
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
