# HOJAI Production Deployment Hub

> **Version:** 1.0.0
> **Purpose:** Centralized production deployment for all HOJAI services

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│              Production Deployment Hub                        │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │   HOJAI AI   │  │    Nexha    │  │    Genie    │      │
│  │   Services   │  │   Network   │  │    Voice    │      │
│  │   (20+)      │  │   (28+)     │  │   (15+)     │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
│                                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │    SDKs      │  │    Widget   │  │   Foundry   │      │
│  │   (37)       │  │   Backend   │  │    Cloud    │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
│                                                              │
└─────────────────────────────────────────────────────────────┘
                    │
                    ▼
         ┌──────────────────────┐
         │   Deploy Targets     │
         ├──────────────────────┤
         │ • Render.com        │
         │ • Vercel            │
         │ • Docker Hub        │
         │ • GHCR.io           │
         └──────────────────────┘
```

---

## Core Services to Deploy

### Foundation (4)

| Service | Port | Repo | Deploy Target |
|---------|------|------|---------------|
| CorpID | 4702 | HOJAI-AI | Docker |
| MemoryOS | 4703 | HOJAI-AI | Docker |
| TwinOS Hub | 4705 | HOJAI-AI | Docker |
| SUTAR Gateway | 4140 | HOJAI-AI | Docker |

### SUTAR OS (8)

| Service | Port | Deploy Target |
|---------|------|--------------|
| sutar-decision-engine | 4290 | Docker |
| sutar-trust-engine | 4291 | Docker |
| sutar-contract-os | 4292 | Docker |
| sutar-negotiation-engine | 4293 | Docker |
| sutar-economy-os | 4294 | Docker |
| sutar-tenant-instances | 4141 | Docker |
| BCP Engine | 4298 | Docker |

### Nexha Network (10)

| Service | Port | Deploy Target |
|---------|------|--------------|
| nexha-supplier-network | 4280 | Docker |
| nexha-supplier-registry | 4281 | Docker |
| nexha-pricing-network | 4286 | Docker |
| nexha-distribution-network | 4285 | Docker |
| nexha-trade-finance-network | 4287 | Docker |
| nexha-warehouse-network | 4288 | Docker |
| nexha-federation-os | 4273 | Docker |
| nexha-business-directory | 4360 | Docker |
| nexha-acp-messaging | 4340 | Docker |
| nexha-commerce-runtime | 4364 | Docker |

### Genie Voice (6)

| Service | Port | Deploy Target |
|---------|------|--------------|
| Genie Calendar | 4709 | Docker |
| Genie Memory Inbox | 4710 | Docker |
| Genie Briefing | 4712 | Docker |
| Genie Universal Search | 4713 | Docker |
| Genie Serendipity | 4714 | Docker |
| Genie Smart Forgetting | 4715 | Docker |

### Products (5)

| Service | Port | Deploy Target |
|---------|------|--------------|
| HOJAI Widget Backend | 5380 | Docker |
| HOJAI Cloud | 4380 | Docker |
| REZ Intelligence | 5370 | Docker |
| AI Inspector | 5173 | Vercel |
| DO App Backend | 3001 | Render |

---

## Quick Deploy

### Deploy All Foundation Services

```bash
cd deployment
./deploy.sh --services foundation --env production
```

### Deploy Nexha Network

```bash
./deploy.sh --services nexha --env production
```

### Deploy Single Service

```bash
./deploy.sh --service sutar-gateway --env production
```

### Check Status

```bash
./deploy.sh --status
```

---

## CI/CD Pipeline

GitHub Actions workflows in `.github/workflows/`:

- `deploy-foundation.yml` - CorpID, MemoryOS, TwinOS, SUTAR Gateway
- `deploy-nexha.yml` - All Nexha services
- `deploy-genie.yml` - All Genie voice services
- `deploy-products.yml` - Widget, Cloud, REZ Intel

---

## Environment Variables Required

```bash
# Docker Hub
DOCKER_HUB_USERNAME
DOCKER_HUB_TOKEN

# GitHub Container Registry
GHCR_TOKEN

# Cloud Providers
RENDER_API_KEY
VERCEL_TOKEN

# Service Secrets
OPENAI_API_KEY
ANTHROPIC_API_KEY
JWT_SECRET
```

---

## Monitoring

After deployment, services are monitored at:

- **Health Dashboard:** `/api/health` on each service
- **Hub Status:** `localhost:4399/health`
- **Nexha Portal:** `https://portal.nexha.io`

---

## Rollback

```bash
# Rollback to previous version
./rollback.sh --service sutar-gateway --version v1.2.3

# Rollback all services
./rollback.sh --all
```

---

*Last Updated: June 25, 2026*
