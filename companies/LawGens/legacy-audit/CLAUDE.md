# CLAUDE.md - LawGens Legal AI Platform

**Version:** 2.0.0 | **Date:** June 12, 2026 | **Status:** ✅ Production Ready

---

## Project Overview

**LawGens** is a comprehensive Legal AI platform under RTNM Digital that democratizes legal services through artificial intelligence. It provides contract analysis, legal research, compliance management, and court case tracking for businesses, individuals, and legal professionals.

**RTMZ** (Real-Time Management eXtended) is an AI-powered business operating system that combines agents, intelligence, and automation with comprehensive forensic intelligence capabilities.

**Products:** LawGens Web, LawGens Biz, LawGens Pro, Contract OS, RTMZ Enterprise Intelligence

---

## Directory Structure

```
LawGens/
├── apps/
│   └── lawgens-web/          # Next.js 14 Web App (Port 3001)
├── contract-os/              # Contract Lifecycle Engine (Port 4190)
├── services/                 # API Gateway (Port 5099)
├── products/
│   └── rtmz/                 # Enterprise Intelligence & Forensic OS (Ports 3000-5100)
├── shared/                   # Shared utilities
├── src/                      # Types, config, integrations
├── docs/                     # Documentation
├── scripts/                  # Deployment scripts
├── systemd/                 # Systemd service files
└── docs/                     # Documentation
```

---

## RTNM Companies Portfolio

| Company | Purpose | Status | Port Range |
|---------|---------|--------|------------|
| **Karma Foundation** | Social Impact & NGO Ecosystem | ✅ Production Ready | 3009, 4098 |
| **LawGens** | Legal AI Platform | ✅ Production Ready | 5098-5123 |
| **RTMZ** | Enterprise Intelligence & Forensic OS | 🔄 In Development | 3000-5100 |
| **BrandPulse** | Brand Intelligence | 🔄 In Development | 4770 |
| **HIB** | Human Intelligence Bridge | ✅ Operational | 3053 |
| **AssetMind** | Financial Intelligence | 🔄 In Development | 5001 |
| **Nexha** | Commerce Network | 🔄 In Development | 5002 |
| **RisaCare** | Healthcare Intelligence | 🔄 In Development | 4800 |
| **StayOwn** | Hospitality Intelligence | 🔄 In Development | 4801 |
| **CorpPerks** | Workforce Intelligence | 🔄 In Development | 4720 |
| **KHAIRMOVE** | Mobility Intelligence | 🔄 In Development | 4600 |
| **Genie OS** | Personal AI | 🔄 In Development | 4703 |
| **Industry AI** | Industry Intelligence | 🔄 In Development | 4750 |

---

## LawGens Products

| Product | Port | Purpose | Status |
|--------|------|---------|--------|
| LawGens Web | 3001 | Consumer SaaS Platform | ✅ Production Ready |
| LawGens Biz | 3002 | Business Portal | ✅ Production Ready |
| LawGens Pro | 3003 | Professional Dashboard | ✅ Production Ready |
| Contract OS | 4190 | Contract Lifecycle Engine | ✅ Production Ready |
| Integration API | 5098 | Service-to-service integration | ✅ Production Ready |
| LawGens API | 5099 | Main REST API | ✅ Production Ready |

---

## RTMZ - Enterprise Intelligence & Forensic OS

**Location:** `products/rtmz/`

**Tagline:** "Palantir + Cellebrite + ServiceNow + Relativity + AI Agents"

**Status:** 🔄 In Development (Ports 3000-5100)

### 4 Pillars

| Pillar | Description | Competitors |
|--------|-------------|-------------|
| **Business Intelligence OS** | AutoML, Ranking, Cosmic Twin, Analytics, Contracts, GraphQL Gateway | ServiceNow, Palantir |
| **Investigation OS** | OSINT, Social Intelligence, Contact Networks, Evidence Collection | Maltego, Recorded Future |
| **Digital Forensics OS** | Disk Imaging, Mobile Forensics, Evidence Management, Chain of Custody | Cellebrite, Magnet Forensics |
| **Trust & Authenticity OS** | Deepfake Detection, AI Content Detection, Fraud Detection | Reality Defender, Sensity AI |

### RTMZ Services (34 Microservices)

#### Auth Services
| Port | Service | Description |
|------|---------|-------------|
| 4002 | REZ Auth | JWT/OTP/TOTP authentication |
| 4003 | REZ SSO | OAuth2 SSO (Okta, Google) |

#### Business Services
| Port | Service | Description |
|------|---------|-------------|
| 5000 | GraphQL Gateway | Unified GraphQL API |
| 5001 | AutoML Pipeline | ML automation |
| 5002 | Invoice OCR | Document processing |
| 5003 | Contract Management | E-signatures |
| 5004 | Legal Document AI | Legal analysis |
| 5005 | Cosmic Twin | Digital twin |
| 5006 | Ranking Service | ML ranking |
| 5100 | Forensics Gateway | Unified forensics orchestration |

#### Business MCP Servers (16)
| Port | Server | Description |
|------|--------|-------------|
| 3100 | Analytics | Metrics and analytics |
| 3101 | Identity | User identity |
| 3102 | Event Bus | Pub/sub events |
| 3103 | Notification | Email/SMS/Push |
| 3104 | Order | Order management |
| 3105 | Payment | Payment processing |
| 3106 | Inventory | Inventory tracking |
| 3107 | Logs | Centralized logging |
| 3108 | Service Discovery | Service registry |
| 3109 | Agent Invoke | Cross-service orchestration |
| 3110 | AutoML | ML pipeline control |
| 3111 | Invoice | Invoice OCR |
| 3112 | Contracts | Contract management |
| 3113 | Legal | Legal document AI |
| 3114 | Cosmic Twin | Digital twin control |
| 3115 | Ranking | ML ranking control |

#### Forensics MCP Servers (8)
| Port | Server | Description |
|------|--------|-------------|
| 3120 | Evidence Ingestion | WhatsApp, Email, CCTV import |
| 3121 | Deepfake Detector | AI content, voice cloning |
| 3122 | Chain of Custody | Legal evidence tracking |
| 3123 | Digital Forensics | Disk imaging, mobile forensics |
| 3130 | Social Intelligence | OSINT, contact network |
| 3131 | Financial Forensics | Invoice, fraud detection |
| 3132 | Location Intelligence | GPS, cell tower, IP |
| 3133 | Expert Reports | Court-ready reports |

#### Monitoring
| Port | Service | Description |
|------|---------|-------------|
| 3000 | Dashboard | Web dashboard + Investigation Workspace |
| 3030 | Grafana | Metrics visualization |
| 9090 | Prometheus | Metrics collection |
| 9093 | Alertmanager | Alert routing |

---

## Tech Stack

### LawGens Stack
| Component | Technology |
|-----------|------------|
| Frontend | Next.js 14, React 18, Tailwind CSS |
| Backend | Express.js, TypeScript |
| Database | MongoDB 7.0 (Mongoose) |
| Security | Helmet, express-rate-limit |
| Logging | Winston |
| Validation | Zod |
| API | REST, GraphQL Gateway |

### RTMZ Stack
| Component | Technology |
|-----------|------------|
| Backend | Node.js, Express, TypeScript |
| API Gateway | GraphQL Federation |
| Database | MongoDB, PostgreSQL |
| Cache | Redis |
| Message Queue | BullMQ |
| Container | Docker, Kubernetes |
| Monitoring | Prometheus, Grafana |
| Service Mesh | Istio |

---

## Commands

### LawGens
| Command | Description |
|---------|-------------|
| `npm install` | Install dependencies |
| `npm run dev` | Development server |
| `npm run build` | Build for production |
| `npm start` | Production server |

### Docker
| Command | Description |
|---------|-------------|
| `docker-compose up -d` | Start all services |
| `docker-compose build` | Build images |
| `./scripts/health-check.sh` | Health check all services |

---

## Environment Variables

### Required
| Variable | Description |
|----------|-------------|
| PORT | Service port |
| MONGODB_URI | MongoDB connection |
| JWT_SECRET | JWT signing secret (min 32 chars) |
| ENCRYPTION_KEY | Encryption key (min 32 chars) |

### Optional
| Variable | Default | Description |
|----------|---------|-------------|
| CORS_ORIGINS | http://localhost:3001 | CORS allowed origins |
| REDIS_URL | redis://localhost:6379 | Redis connection |
| HOJAI_GATEWAY_URL | http://localhost:4500 | HOJAI AI gateway |

---

## API Endpoints

### LawGens API (5099)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /health | Health check |
| POST | /api/contracts/create | Create contract |
| POST | /api/contracts/analyze | Analyze contract |
| POST | /api/cases/search | Search court cases |
| POST | /api/compliance/check | Compliance check |
| POST | /api/ai/assist | AI legal assistant |

### Contract OS (4190)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /health | Health check |
| GET | /health/ready | Readiness probe |
| GET | /health/live | Liveness probe |
| POST | /api/contracts | Create contract |
| GET | /api/contracts/:id | Get contract |
| POST | /api/contracts/:id/sign | Sign contract |
| POST | /api/contracts/:id/execute | Execute contract |

### RTMZ GraphQL Gateway (5000)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /health | Health check |
| POST | /graphql | GraphQL API |
| GET | /graphql | GraphQL Playground |

---

## Contract Types Supported

- NDA (Non-Disclosure Agreement)
- MSA (Master Service Agreement)
- Employment Agreement
- Lease Agreement
- Service Agreement
- Purchase Agreement
- Partnership Agreement
- License Agreement
- Subscription Agreement
- Rental Agreement
- Consulting Agreement

---

## Compliance Support

- GDPR (Data Protection)
- SOC2 (Security)
- SEBI (Capital Markets)
- HIPAA (Healthcare)
- PCI-DSS (Payment Cards)
- ISO27001 (Information Security)
- SOX (Corporate Governance)
- CCPA (Consumer Privacy)
- LGPD (Brazilian Privacy)
- PDPA (Thailand Privacy)
- DPDPA (Indian Privacy)

---

## Deployment

### Docker (Recommended)
```bash
docker-compose up -d
./scripts/health-check.sh
```

### Manual
```bash
npm install
npm run build
npm start
```

---

## Documentation

| Document | Description |
|----------|-------------|
| README.md | Main documentation |
| docs/AUDIT.md | Code audit report |
| docs/DEPLOYMENT.md | Deployment guide |
| docs/PRODUCTION-READY.md | Production checklist |
| docs/COMPANIES-AUDIT.md | RTNM companies reference |
| docs/PRODUCTS-FEATURES-AUDIT.md | Products & features reference |

---

## Support

- **Email:** support@lawgens.app
- **Documentation:** https://docs.lawgens.app
- **API Docs:** https://api.lawgens.app/docs

---

**Last Updated:** June 12, 2026
