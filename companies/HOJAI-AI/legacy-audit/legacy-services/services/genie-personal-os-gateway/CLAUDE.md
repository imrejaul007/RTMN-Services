# 🎯 Genie Personal OS Gateway

## Overview

**Service Name:** Genie Personal OS Gateway  
**Version:** 1.0.0  
**Port:** 4702  
**Location:** `companies/hojai-ai/services/genie-personal-os-gateway/`  
**Tagline:** "You don't use Genie. You talk to Genie."  
**Purpose:** Unified API orchestrator for all Genie Personal AI services

**Status:** ✅ PRODUCTION READY  
**Last Updated:** June 13, 2026

---

## Quick Start

```bash
cd companies/hojai-ai/services/genie-personal-os-gateway

# Install dependencies
npm install

# Build
npm run build

# Start service
PORT=4702 npm start

# Development mode
PORT=4702 npm run dev
```

---

## Features

### Core Features

| Feature | Description | Status |
|---------|-------------|--------|
| Unified API | Single entry point for all Genie services | ✅ |
| Service Orchestration | Route requests to appropriate backend services | ✅ |
| Health Monitoring | Health checks for all backend services | ✅ |
| Rate Limiting | Protect backend services from overload | ✅ |
| CORS Support | Cross-origin requests enabled | ✅ |
| Security Headers | Helmet.js security middleware | ✅ |
| Compression | Gzip response compression | ✅ |

### Connected Genie Services

| Service | Port | Purpose |
|---------|------|---------|
| Genie Memory | 4703 | Personal memory storage |
| Genie Relationship | 4704 | Contact relationships |
| Genie Briefing | 4706 | Daily briefings |
| Genie Meeting | 4713 | Meeting scheduling |
| Genie Business Intelligence | 4725 | Business insights |

---

## API Endpoints

### Health Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Basic health check |
| GET | `/health/live` | Liveness probe |
| GET | `/health/ready` | Readiness probe |

### Genie Services

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/genie/status` | Get all connected services status |
| POST | `/api/genie/process` | Process a Genie command |
| GET | `/api/genie/briefing/:userId` | Get user briefing |
| GET | `/api/genie/memory/:userId` | Get user memory context |
| GET | `/api/genie/relationships/:userId` | Get user relationships |

### User Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/users/:userId/profile` | Get user profile |
| PUT | `/api/users/:userId/profile` | Update user profile |
| GET | `/api/users/:userId/settings` | Get user settings |
| PUT | `/api/users/:userId/settings` | Update user settings |

---

## Architecture

```
┌────────────────────────────────────────────────────────────────┐
│                 GENIE PERSONAL OS GATEWAY                     │
│                         Port: 4702                             │
├────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │                    API Layer                             │  │
│  │  /health │ /api/genie/* │ /api/users/*                  │  │
│  └──────────────────────────────────────────────────────────┘  │
│                              │                                 │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │              Orchestration Layer                         │  │
│  │  Service Router │ Request Validator │ Response Formatter  │  │
│  └──────────────────────────────────────────────────────────┘  │
│                              │                                 │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │              Backend Services                             │  │
│  │  Memory (4703) │ Relationship (4704) │ Briefing (4706)  │  │
│  │  Meeting (4713) │ Business Intel (4725)                   │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                 │
└────────────────────────────────────────────────────────────────┘
```

---

## Project Structure

```
genie-personal-os-gateway/
├── src/
│   ├── index.ts              # Main entry point
│   ├── routes/
│   │   ├── health.ts        # Health endpoints
│   │   ├── genie.ts         # Genie API routes
│   │   └── users.ts         # User API routes
│   ├── services/
│   │   ├── memory.ts        # Memory service client
│   │   ├── relationship.ts  # Relationship service client
│   │   ├── briefing.ts     # Briefing service client
│   │   └── meeting.ts       # Meeting service client
│   ├── middleware/
│   │   ├── auth.ts          # Authentication
│   │   ├── rateLimit.ts     # Rate limiting
│   │   └── error.ts        # Error handling
│   └── utils/
│       ├── logger.ts        # Logging
│       └── validator.ts     # Request validation
├── dist/                     # Compiled JavaScript
├── package.json
├── tsconfig.json
├── .env.example
├── Dockerfile
├── docker-compose.yml
└── CLAUDE.md               # This file
```

---

## Configuration

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | 4702 | Service port |
| `NODE_ENV` | development | Environment |
| `GENIE_MEMORY_URL` | `http://localhost:4703` | Memory service URL |
| `GENIE_RELATIONSHIP_URL` | `http://localhost:4704` | Relationship service URL |
| `GENIE_BRIEFING_URL` | `http://localhost:4706` | Briefing service URL |
| `GENIE_MEETING_URL` | `http://localhost:4713` | Meeting service URL |
| `GENIE_BI_URL` | `http://localhost:4725` | Business Intel service URL |

---

## Connected Services

### RAZO Keyboard Integration

Genie Gateway is connected to **RAZO Keyboard** for:

| Integration | Purpose |
|-------------|---------|
| Genie Mode | Voice commands via keyboard |
| Smart Suggestions | Genie-powered suggestions |
| Briefings | Show briefings in keyboard |
| Context | Personal context for suggestions |

### RAZO Keyboard File

- **Location:** `companies/hojai-ai/RAZO-Keyboard/`
- **Service Client:** `CloudServices/src/genie-client.ts`
- **Port Used:** 4702

---

## Security

| Feature | Status |
|---------|--------|
| Helmet.js Security Headers | ✅ |
| CORS Configuration | ✅ |
| Rate Limiting | ✅ |
| Input Validation (Zod) | ✅ |
| Error Handling | ✅ |
| Request Logging | ✅ |

---

## Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| express | ^4.18.2 | Web framework |
| cors | ^2.8.5 | CORS support |
| helmet | ^7.1.0 | Security headers |
| compression | ^1.7.4 | Response compression |
| zod | ^3.22.4 | Schema validation |
| express-rate-limit | ^7.1.5 | Rate limiting |
| axios | ^1.6.0 | HTTP client |

---

## Docker

```bash
# Build image
docker build -t genie-gateway .

# Run container
docker run -p 4702:4702 \
  -e GENIE_MEMORY_URL=http://host.docker.internal:4703 \
  -e GENIE_BRIEFING_URL=http://host.docker.internal:4706 \
  genie-gateway
```

---

## Related Documentation

- [Genie Briefing Service CLAUDE.md](../genie-briefing-service/CLAUDE.md)
- [RAZO Keyboard CLAUDE.md](../RAZO-Keyboard/CLAUDE.md)
- [HOJAI AI CLAUDE.md](../CLAUDE.md)
- [RTNM-COMPANIES-AUDIT.md](../../RTNM-COMPANIES-AUDIT.md)
- [RTNM-PRODUCTS-FEATURES-AUDIT.md](../../RTNM-PRODUCTS-FEATURES-AUDIT.md)

---

**Built with ❤️ by RTNM**  
**"You don't use Genie. You talk to Genie."**
