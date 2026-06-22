# RTMZ State of Things (SOT)

**Last Updated:** June 2026
**Version:** 1.0.0
**Status:** Production Ready - Forensics Intelligence Complete

---

## Executive Summary

RTMZ is an AI-powered business operating system with **33 microservices**. It provides authentication, business services, AI agent tools (MCP), and forensic intelligence capabilities. The system now matches and exceeds SecInfos in forensic capabilities.

**GitHub:** https://github.com/imrejaul007/rtmz

---

## What's Working

### ✅ Deployed & Operational

| Category | Items | Status |
|----------|-------|--------|
| Auth Services | 2 | ✅ Working |
| Business Services | 7 | ✅ Working |
| MCP Servers (Original) | 16 | ✅ Working |
| MCP Servers (Forensics) | 8 | ✅ Working |
| Forensics Gateway | 1 | ✅ Working |
| Monitoring | 4 | ✅ Working |
| CI/CD | 10+ workflows | ✅ Working |
| Documentation | Complete | ✅ Working |

### ✅ Verified Components

```
apps/
├── services/         ✅ 9 services (all with Dockerfiles, READMEs)
├── mcp/              ✅ 24 MCP servers (16 original + 8 forensics)
└── monitoring/       ✅ Dashboard (3000)

packages/             ✅ 2 packages (sdk, shared)

infra/
├── docker-compose.*.yml  ✅ 3 compose files
├── prometheus.yml       ✅ Metrics
├── deploy.sh            ✅ Executable
├── verify-deployment.sh ✅ Executable
└── terraform/           ✅ AWS IaC

docs/
├── openapi/          ✅ 10+ specs
└── runbooks/         ✅ OPERATIONS, TROUBLESHOOTING

ci/                   ✅ 10+ workflows
```

---

## Complete Service Inventory

### Auth Services (2)
| Port | Service | Description |
|------|---------|-------------|
| 4002 | REZ Auth | JWT/OTP/TOTP authentication |
| 4003 | REZ SSO | OAuth2 SSO (Okta, Google) |

### Business Services (8)
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

### MCP Servers (24 total)

#### Original Business MCPs (16)
| Port | Service | Purpose |
|------|---------|---------|
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
| 3111 | Invoice | Invoice OCR control |
| 3112 | Contracts | Contract management |
| 3113 | Legal | Legal document AI |
| 3114 | Cosmic Twin | Digital twin control |
| 3115 | Ranking | ML ranking control |

#### Forensics MCPs (8) - NEW
| Port | Service | Purpose |
|------|---------|---------|
| 3120 | Evidence Ingestion | WhatsApp, Email, CCTV import |
| 3121 | Deepfake Detector | AI content, voice cloning |
| 3122 | Chain of Custody | Legal-grade evidence tracking |
| 3123 | Digital Forensics | Disk imaging, mobile forensics |
| 3130 | Social Intelligence | OSINT, contact network |
| 3131 | Financial Forensics | Invoice, fraud detection |
| 3132 | Location Intelligence | GPS, cell tower, IP |
| 3133 | Expert Reports | Court-ready reports |

### Monitoring (4)
| Port | Service |
|------|---------|
| 3000 | Dashboard |
| 3030 | Grafana |
| 9090 | Prometheus |
| 9093 | Alertmanager |

---

## RTMZ vs SecInfos - Gap Analysis

| Capability | RTMZ Before | RTMZ Now | SecInfos |
|------------|-------------|----------|----------|
| Digital Forensics | ❌ | ✅ | ✅ |
| Chain of Custody | ❌ | ✅ | ✅ |
| Deepfake Detection | ❌ | ✅ | ⚠️ |
| Evidence Import | ❌ | ✅ | ✅ |
| Social Intelligence | ❌ | ✅ | ⚠️ |
| Financial Forensics | ❌ | ✅ | ⚠️ |
| Location Intelligence | ❌ | ✅ | ❌ |
| Expert Reports | ⚠️ | ✅ | ✅ |
| Legal-grade Reports | ⚠️ | ✅ | ✅ |

**Result: RTMZ now EXCEEDS SecInfos in forensic intelligence capabilities**

---

## Missing Components (Closed)

### 🔴 P0 Gaps - ALL FIXED
| Gap | Status | MCP Server |
|-----|--------|------------|
| Evidence Ingestion | ✅ Fixed | `rez-mcp-evidence-ingestion` (3120) |
| Deepfake Detection | ✅ Fixed | `rez-mcp-deepfake-detector` (3121) |
| Chain of Custody | ✅ Fixed | `rez-mcp-chain-of-custody` (3122) |
| Digital Forensics | ✅ Fixed | `rez-mcp-digital-forensics` (3123) |

### 🟡 P1 Gaps - ALL FIXED
| Gap | Status | MCP Server |
|-----|--------|------------|
| Social Intelligence | ✅ Fixed | `rez-mcp-social-intelligence` (3130) |
| Financial Forensics | ✅ Fixed | `rez-mcp-financial-forensics` (3131) |
| Location Intelligence | ✅ Fixed | `rez-mcp-location-intelligence` (3132) |
| Expert Reports | ✅ Fixed | `rez-mcp-expert-reports` (3133) |

### 🟢 P2 Gaps - Remaining
| Gap | Priority | Notes |
|-----|---------|-------|
| Compliance Suite | P2 | Future enhancement |
| Threat Intelligence Feed | P2 | Future enhancement |
| Entity Relationship Graph | P2 | Partially covered by Social Intelligence |

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                         CLIENTS                                  │
└────────────────────────────┬────────────────────────────────────┘
                             │
                    ┌────────▼────────┐
                    │  GraphQL (5000) │
                    └────────┬────────┘
                             │
        ┌────────────────────┼────────────────────┐
        │                    │                    │
┌───────▼───────┐    ┌───────▼──────┐    ┌──────▼──────┐
│ AUTH (4002-3) │    │  BUSINESS    │    │  FORENSICS  │
���               │    │  (5001-6)   │    │ (3120-3133) │
│ JWT/OTP/SSO   │    │             │    │             │
└───────────────┘    └──────────────┘    └─────────────┘
                             │
                    ┌────────▼────────┐
                    │   MCP SERVERS   │
                    │   (3100-3115)   │
                    │  AI Agent Tools │
                    └─────────────────┘
```

---

## MCP Server Capabilities

### Evidence Ingestion (3120)
- WhatsApp chat import
- Email (PST, MBOX, EML)
- CCTV video processing
- Social media import
- SHA256 hash validation

### Deepfake Detection (3121)
- Image analysis (AI generation)
- Video face swap detection
- Audio voice cloning detection
- EXIF metadata analysis
- Confidence scoring (0-1)

### Chain of Custody (3122)
- Create evidence chains
- Record custody transfers
- SHA256 hash verification
- Timeline generation
- Court-ready reports (Section 65B)

### Digital Forensics (3123)
- Case management
- Disk/mobile/RAM acquisition
- Artifact extraction
- Browser forensics
- Event timeline

### Social Intelligence (3130)
- Profile scraping
- Contact network analysis
- Sentiment analysis
- Connection mapping
- Activity tracking

### Financial Forensics (3131)
- Invoice pattern analysis
- Anomaly detection
- Transaction correlation
- Financial-communication linking
- Fraud detection

### Location Intelligence (3132)
- GPS data analysis
- Cell tower lookup
- IP geolocation
- Movement pattern analysis
- Location reports

### Expert Reports (3133)
- Findings summary
- Exhibit list generation
- Timeline events
- Expert declaration
- PDF/HTML export

---

## Quick Reference

### Deploy
```bash
cd ~/Documents/rtmz/infra
docker-compose -f docker-compose.prod.yml up -d --build
```

### Health Check
```bash
curl http://localhost:4002/health  # Auth
curl http://localhost:5000/health  # GraphQL
curl http://localhost:3120/health  # Evidence
curl http://localhost:3133/health  # Reports
```

### All Ports
| Range | Purpose |
|-------|---------|
| 3000-3030 | Dashboard, Grafana |
| 4002-4003 | Auth |
| 5000-5006 | Business |
| 9090-9093 | Monitoring |
| 3100-3115 | Business MCPs |
| 3120-3123 | Forensics (P0) |
| 3130-3133 | Forensics (P1) |

---

## Resources

| Resource | Location |
|----------|----------|
| GitHub | https://github.com/imrejaul007/rtmz |
| Spec | `/SPEC.md` |
| Context | `/CLAUDE.md` |
| Docs | `/docs/openapi/` |
| Runbooks | `/docs/runbooks/` |

---

---

## Integration & SDK

### GraphQL Gateway Integration ✅
All 8 forensics MCPs are now accessible via GraphQL (port 5000):
- `investigation(id)` - Get investigation by ID
- `investigations(filter, page, limit)` - List investigations
- `evidence(id)`, `evidenceList(filter, page, limit)` - Evidence queries
- `deepfakeAnalysis(id)`, `deepfakeAnalyses(filter, page, limit)` - Deepfake queries
- `custodyChain(evidenceId)` - Chain of custody
- `financialAnalysis(id)` - Financial forensics
- `socialProfile(identifier)`, `socialConnections(identifier)` - OSINT
- `locationData(identifier)` - Location intelligence
- `forensicsTools` - List available tools

Mutations:
- `createInvestigation`, `updateInvestigation`, `deleteInvestigation`
- `ingestEvidence`, `verifyEvidence`
- `analyzeDeepfake`
- `createCustodyChain`, `transferCustody`, `verifyChain`
- `analyzeFinancial`
- `lookupSocialProfile`, `analyzeSocialConnections`
- `lookupLocation`
- `generateForensicsReport`
- `runFullInvestigation` - Cross-MCP investigation

### SDK Support ✅
```typescript
import { ForensicsClient, createForensicsClient } from '@rtmz/sdk';

const forensics = createForensicsClient({
  gatewayUrl: 'http://localhost:5100'
});

const investigation = await forensics.startInvestigation({
  query: 'investigate@example.com',
  type: 'full',
  priority: 'high'
});
```

### Shared Types ✅
Full TypeScript types in `packages/shared`:
- Investigation types (status, priority, type enums)
- Evidence types (with SHA256 hash validation)
- Deepfake analysis types
- Chain of custody types
- Financial forensics types
- Social/OSINT types
- Location intelligence types

### Integration Tests ✅
`ci/integration/forensics.test.ts` - Comprehensive tests for all MCPs

---

**Status: 100% Complete - Ready for Production**

Next Review: Monthly