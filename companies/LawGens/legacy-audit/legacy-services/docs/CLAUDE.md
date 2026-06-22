# CLAUDE.md - LawGens Documentation Index

**Version:** 2.0.0 | **Date:** June 12, 2026

---

## Project Overview

**LawGens** is a comprehensive Legal AI platform under RTNM Digital that democratizes legal services through artificial intelligence.

**RTMZ** (Real-Time Management eXtended) is an AI-powered business operating system that combines agents, intelligence, and automation with comprehensive forensic intelligence capabilities.

**Products:** LawGens Web, LawGens Biz, LawGens Pro, Contract OS, RTMZ Enterprise Intelligence

**Status:** ✅ Production Ready (LawGens) | 🔄 In Development (RTMZ)

---

## Documentation Files

| Document | Description | Lines |
|----------|-------------|-------|
| [README.md](../README.md) | Main documentation | ~545 |
| [CLAUDE.md](./CLAUDE.md) | This file - documentation index | - |
| [AUDIT.md](./AUDIT.md) | Code audit report | ~200 |
| [DEPLOYMENT.md](./DEPLOYMENT.md) | Deployment guide | ~200 |
| [PRODUCTION-READY.md](./PRODUCTION-READY.md) | Production checklist | ~200 |
| [COMPANIES-AUDIT.md](./COMPANIES-AUDIT.md) | RTNM companies reference | ~213 |
| [PRODUCTS-FEATURES-AUDIT.md](./PRODUCTS-FEATURES-AUDIT.md) | Products & features reference | ~452 |
| [FEATURES.md](./FEATURES.md) | Complete features list | ~500 |
| [API.md](./API.md) | API documentation | ~250 |
| [CHANGELOG.md](./CHANGELOG.md) | Version history | ~100 |
| [TROUBLESHOOTING.md](./TROUBLESHOOTING.md) | Common issues & solutions | ~100 |

---

## Quick Reference

### Products & Ports

| Product | Port | Status |
|---------|------|--------|
| LawGens Web | 3001 | ✅ Production Ready |
| LawGens Biz | 3002 | ✅ Production Ready |
| LawGens Pro | 3003 | ✅ Production Ready |
| Contract OS | 4190 | ✅ Production Ready |
| Integration API | 5098 | ✅ Production Ready |
| LawGens API | 5099 | ✅ Production Ready |
| RTMZ Dashboard | 3000 | 🔄 In Development |
| RTMZ Auth | 4002-4003 | 🔄 In Development |
| RTMZ GraphQL | 5000 | 🔄 In Development |
| RTMZ Forensics | 5100 | 🔄 In Development |

### RTMZ Architecture (34 Microservices)

```
RTMZ/
├── 10 Business Services (Ports 4002-5100)
│   ├── Auth: REZ Auth (4002), REZ SSO (4003)
│   ├── API: GraphQL Gateway (5000)
│   ├── Business: AutoML (5001), Invoice OCR (5002), Contract Mgmt (5003), Legal AI (5004), Cosmic Twin (5005), Ranking (5006)
│   └── Forensics Gateway (5100)
├── 24 MCP Servers (AI Agent Tools)
│   ├── 16 Business MCPs (3100-3115)
│   └── 8 Forensics MCPs (3120-3133)
└── Monitoring (3000, 3030, 9090-9093)
```

### Commands

```bash
# Docker deployment
docker-compose up -d
./scripts/health-check.sh

# Health checks
curl http://localhost:4190/health      # Contract OS
curl http://localhost:5099/health    # LawGens API
curl http://localhost:3001             # Web App
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

## RTMZ 4 Pillars

| Pillar | Description | Competitors |
|--------|-------------|-------------|
| **Business Intelligence OS** | AutoML, Ranking, Cosmic Twin, Analytics, Contracts, GraphQL Gateway | ServiceNow, Palantir |
| **Investigation OS** | OSINT, Social Intelligence, Contact Networks, Evidence Collection | Maltego, Recorded Future |
| **Digital Forensics OS** | Disk Imaging, Mobile Forensics, Evidence Management, Chain of Custody | Cellebrite, Magnet Forensics |
| **Trust & Authenticity OS** | Deepfake Detection, AI Content Detection, Fraud Detection | Reality Defender, Sensity AI |

---

## Key Features

### LawGens Features (50+)

- Contract Analysis & Generation (AI-powered)
- Legal Research (Case Law, Statutes, Citations)
- Compliance Management (12 regulations)
- Court Case Tracking (Indian courts)
- Document Drafting (AI-assisted)
- Risk Assessment
- E-Discovery
- Arbitration Management
- Docket Tracking

### RTMZ Features (100+)

- Business Intelligence & Analytics
- Investigation & OSINT
- Digital Forensics
- Deepfake Detection
- Evidence Management
- Chain of Custody
- Financial Forensics
- Location Intelligence
- Expert Reports
- AI Agent Orchestration (24 MCP servers)

---

## Tech Stack

| Component | Technology |
|-----------|------------|
| Frontend | Next.js 14, React 18, Tailwind CSS |
| Backend | Express.js, TypeScript |
| Database | MongoDB 7.0 (Mongoose) |
| API | REST, GraphQL |
| Container | Docker, Kubernetes |
| Monitoring | Prometheus, Grafana |

---

## External References

| Document | Location |
|----------|----------|
| RTNM Companies Audit | `/Users/rejaulkarim/Documents/RTMN/RTMN-COMPANIES-AUDIT.md` |
| RTNM Products Audit | `/Users/rejaulkarim/Documents/RTMN/RTMN-PRODUCTS-FEATURES-AUDIT.md` |
| RTMZ README | `products/rtmz/README.md` |
| RTMZ CLAUDE | `products/rtmz/CLAUDE.md` |

---

## Support

- **Email:** support@lawgens.app
- **Documentation:** https://docs.lawgens.app
- **API Docs:** https://api.lawgens.app/docs

---

**Last Updated:** June 12, 2026