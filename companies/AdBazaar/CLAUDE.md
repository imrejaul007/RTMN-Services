# AdBazaar - DOOH Advertising & Creator Commerce Platform

**Version:** 1.0.1  
**Last Updated:** June 15, 2026  
**Status:** 🚧 UNDER DEVELOPMENT — 1 of 130+ services production-ready

---

## Overview

AdBazaar is the advertising and creator commerce platform of the RTMN ecosystem. It provides DOOH (Digital Out-of-Home) advertising, QR code campaigns, creator studios, and comprehensive ad management.

> ⚠️ **Documentation updated June 15, 2026.** The previous version claimed "DEPLOYMENT READY" with 30+ services. In reality, **only `REZ-crm-hub` is production-ready**. All other services are either scaffolded, partially built, or empty. See [Onboarding Status](#onboarding-status) below.

---

## Production-Ready Services

| Service | Port | Status | Notes |
|---------|------|--------|-------|
| **REZ-crm-hub** | 4056 | ✅ Ready | Express + Mongoose + Redis, full /health endpoints |

---

## Services — In Development

These services have partial code (compiled `dist/` or `src/` scaffolding) but are **not yet production-ready** (no `package.json`, no Dockerfile, no health endpoint).

| Service | State | Notes |
|---------|-------|-------|
| REZ-ads-service | dist/only | Compiled artifact, no source manifest |
| REZ-decision-service | dist/only | Compiled artifact, no source manifest |
| REZ-economic-engine | dist/only | Compiled artifact, no source manifest |
| REZ-google-enhanced | dist/only | Compiled artifact, no source manifest |
| REZ-meta-capi | dist/only | Compiled artifact, no source manifest |
| REZ-partner-portal | dist/only | Compiled artifact, no source manifest |
| REZ-rtb-service | dist/only | Compiled artifact, no source manifest |
| REZ-cross-device | dist/only | Compiled artifact, no source manifest |
| adBazaar-backend | dist/only | Compiled artifact, no source manifest |
| adBazaar-dashboard | dist/only | Compiled artifact, no source manifest |
| adbazaar-api-gateway | dist/only | Compiled artifact, no source manifest |
| adsqr | dist/only | Compiled artifact, no source manifest |
| openrtb-exchange-service | dist/only | Compiled artifact, no source manifest |
| rez-ad-exchange | dist/only | Compiled artifact, no source manifest |
| rez-dsp-bidder | dist/only | Compiled artifact, no source manifest |
| rez-live-shopping | dist/only | Compiled artifact, no source manifest |
| rez-viral-loop | dist/only | Compiled artifact, no source manifest |
| rez-dooh-service | dist/only | Compiled artifact, no source manifest |
| hojai-ai-gateway-v2 | dist/only | Compiled artifact, no source manifest |
| commerce-graph-service | src/only | Source scaffolding, no package.json |
| flywheel-analytics | src/only | Source scaffolding, no package.json |
| hospitality-integration | src/only | Source scaffolding, no package.json |
| inventory-classifier | src/only | Source scaffolding, no package.json |
| tenant-registry | src/only | Source scaffolding, no package.json |
| unified-campaign-service | src/only | Source scaffolding, no package.json |
| rez-ride-integration | src/only | Source scaffolding, no package.json |
| adBazaar-integration-service | src/only | Source scaffolding, no package.json |
| creators | src/only | Source scaffolding, no package.json |
| rez-workflow-editor | src/only | Source scaffolding, no package.json |
| rez-ads | src/only | Source scaffolding, no package.json |
| rez-crm-ui | src/only | Source scaffolding, no package.json |

---

## Services — Scaffolded (Empty Directories)

These are planned services with placeholder directories. No code, no manifests, no deployment path.

| Service | State |
|---------|-------|
| REZ-ad-ai | Empty dir |
| REZ-ai-campaign-builder | Empty dir |
| REZ-qr-service | Empty dir |
| REZ-creator-studio | Empty dir |
| REZ-creator-commerce | Empty dir |
| REZ-anniversary-rewards | Empty dir |
| REZ-birthday-rewards | Empty dir |
| REZ-cohort-analysis | Empty dir |
| REZ-ab-testing | Empty dir |
| REZ-abandonment-tracker | Empty dir |
| REZ-consumer-kb | Empty dir |
| REZ-buzzlocal-karma-bridge | Empty dir |
| adBazaar-creator | Empty dir |
| adbazaar-cdp | Empty dir |
| adbazaar-clean-room | Empty dir |
| adbazaar-event-stream | Empty dir |
| adbazaar-intelligence-graph | Empty dir |
| adbazaar-pixel | Empty dir |
| adbazaar-revenue-intelligence | Empty dir |
| adbazaar-verification | Empty dir |
| adbazaar-data-marketplace | Empty dir |
| adbazaar-hojai-gateway | Empty dir |
| adbazaar-creator-wallet | Empty dir |
| adbazaar-marketing-agent | Empty dir |
| REZ-ads-api | Empty dir |
| apps/adbazaar-mobile-app | Empty dir |
| + ~70 more `REZ-*` / `rez-*` empty dirs | Empty dirs |

---

## Onboarding Status

**Current client onboarding path:** `REZ-crm-hub` only.

### Prerequisites
- MongoDB instance (port 27017)
- Redis instance (port 6379)
- RABTUL Auth service (port 4002) — for internal service token validation

### Quick Start (REZ-crm-hub)
```bash
cd companies/AdBazaar/REZ-crm-hub
npm install
cp .env.example .env   # Edit with your MongoDB/Redis URIs
npm run build
npm start

# Health check
curl http://localhost:4056/health
curl http://localhost:4056/health/live
curl http://localhost:4056/health/ready
```

### Health Endpoints
| Endpoint | Purpose |
|----------|---------|
| `GET /health` | Basic health (returns `{status: "healthy"}`) |
| `GET /health/live` | Liveness probe (is the process alive?) |
| `GET /health/ready` | Readiness probe (is the service ready to accept traffic?) |

---

## Port Assignments

| Port | Service | Status |
|------|---------|--------|
| 4056 | REZ-crm-hub | ✅ Assigned |
| 5000 | REZ-ads-api | 🚧 Planned (empty) |
| 5001 | REZ-ads-service | 🚧 Planned (dist only) |

> Note: The 5000-5001 range was previously listed as AdBazaar's core ports in the root CLAUDE.md. Only `REZ-crm-hub` (4056) is actually deployed. Port assignments for all other services are pending and will be added as services reach production-ready status.

---

## Architecture

```
AdBazaar
├── REZ-crm-hub (4056)          ← PRODUCTION READY
├── REZ-ads-service (5001)      ← In development
├── adbazaar-api-gateway        ← In development
├── REZ-decision-service        ← In development
├── REZ-economic-engine         ← In development
├── [ ~25 in-development services ]
└── [ ~104 scaffolded services ]
```

---

## Dependencies

| Dependency | Required | Purpose |
|------------|----------|---------|
| MongoDB | Yes | Contact/deal persistence |
| Redis | Yes | Rate limiting, caching |
| RABTUL Auth (4002) | Yes | Internal service token validation |
| RABTUL Wallet (4004) | Optional | Payment processing |
| RABTUL Notification (4005) | Optional | Alerts |

---

## Next Steps (Roadmap)

1. **Phase 1 (Current):** `REZ-crm-hub` is the only onboarding-ready service
2. **Phase 2:** Add Dockerfiles to `REZ-crm-hub` and register in `docker-compose.yml`
3. **Phase 3:** Build out `REZ-ads-service` and `adbazaar-api-gateway` with full manifests
4. **Phase 4:** Expand to QR, Creator Studio, and DOOH services

---

## Documentation

- [RTNM-COMPANIES-AUDIT.md](../../RTNM-COMPANIES-AUDIT.md) - Full company details
- [RTNM-PRODUCTS-FEATURES-AUDIT.md](../../RTNM-PRODUCTS-FEATURES-AUDIT.md) - Product features
- [PORT-REGISTRY.md](../../PORT-REGISTRY.md) - Port assignments

---

*AdBazaar - Advertising & Creator Commerce Platform*
*Status updated: June 15, 2026*
