# RTMZ System Specification

## Overview

**RTMZ (Real-Time Management eXtended)** is an AI-powered business operating system built on microservices architecture. It provides real-time intelligence, automation, and orchestration for enterprise operations, including comprehensive forensic intelligence capabilities.

**Version:** 1.0.0
**Architecture:** Microservices + MCP (Model Context Protocol)
**Services:** 34 total (10 business + 24 MCP)
**Monorepo:** https://github.com/imrejaul007/rtmz

---

## System Architecture

### High-Level Topology

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         CLIENTS                                          │
│            (Web, Mobile, AI Agents, API Consumers)                    │
└────────────────────────────┬───────────────────────────────────────────┘
                             │
                    ┌────────▼────────┐
                    │  GraphQL Gateway │  Port 5000
                    │   (Federation)   │
                    └────────┬────────┘
                             │
        ┌────────────────────┼────────────────────┐
        │                    │                    │
┌───────▼───────┐    ┌───────▼──────┐    ┌──────▼──────┐
│ AUTH SERVICES  │    │  BUSINESS    │    │  MCP SERVERS │
│                │    │   SERVICES   │    │  (AI Tools)  │
│ 4002 REZ Auth │    │              │    │              │
│ 4003 REZ SSO  │    │  5001-5006  │    │  3100-3115  │
│                │    │  5100 Forens │    │  3120-3133  │
└────────┬───────┘    └──────────────┘    └──────────────┘
         │                   │                    │
         └───────────────────┼────────────────────┘
                             │
                    ┌────────▼────────┐
                    │   INFRASTRUCTURE │
                    │  MongoDB + Redis │
                    └──────────────────┘
```

---

## Services Inventory

### 1. Auth Services

| Service | Port | Protocol | Description |
|---------|------|----------|-------------|
| `rez-auth-service` | 4002 | REST | JWT/OTP/TOTP authentication |
| `REZ-sso-service` | 4003 | REST | OAuth2/SSO (Okta, Google) |

### 2. Business Services

| Service | Port | Protocol | Description |
|---------|------|----------|-------------|
| `REZ-graphql-federation` | 5000 | GraphQL | Unified GraphQL API Gateway |
| `REZ-automl-pipeline` | 5001 | REST | ML automation pipeline |
| `REZ-invoice-ocr` | 5002 | REST | Document OCR processing |
| `REZ-contract-management` | 5003 | REST | Contract management, e-signatures |
| `REZ-legal-document-ai` | 5004 | REST | Legal document AI analysis |
| `REZ-cosmic-twin` | 5005 | REST | Digital twin service |
| `REZ-ranking-service` | 5006 | REST | ML ranking service |
| `REZ-forensics-gateway` | 5100 | REST | Unified forensics orchestration |

### 3. MCP Servers (24 total)

#### Business MCPs (16)

| Port | MCP Server | Purpose |
|------|------------|---------|
| 3100 | `rez-mcp-analytics` | Metrics, dashboards, reporting |
| 3101 | `rez-mcp-identity` | User identity, profiles |
| 3102 | `rez-mcp-event-bus` | Pub/sub event system |
| 3103 | `rez-mcp-notification` | Email, SMS, push notifications |
| 3104 | `rez-mcp-order` | Order management |
| 3105 | `rez-mcp-payment` | Payment processing |
| 3106 | `rez-mcp-inventory` | Inventory tracking |
| 3107 | `rez-mcp-logs` | Centralized logging |
| 3108 | `rez-mcp-service-discovery` | Service registry |
| 3109 | `rez-mcp-agent-invoke` | Cross-service orchestration |
| 3110 | `rez-mcp-automl` | ML pipeline control |
| 3111 | `rez-mcp-invoice` | Invoice OCR control |
| 3112 | `rez-mcp-contracts` | Contract management |
| 3113 | `rez-mcp-legal` | Legal document AI |
| 3114 | `rez-mcp-cosmic-twin` | Digital twin control |
| 3115 | `rez-mcp-ranking` | ML ranking control |

#### Forensics MCPs (8)

| Port | MCP Server | Purpose |
|------|------------|---------|
| 3120 | `rez-mcp-evidence-ingestion` | WhatsApp, Email, CCTV import |
| 3121 | `rez-mcp-deepfake-detector` | AI content detection |
| 3122 | `rez-mcp-chain-of-custody` | Legal-grade evidence tracking |
| 3123 | `rez-mcp-digital-forensics` | Disk imaging, mobile forensics |
| 3130 | `rez-mcp-social-intelligence` | OSINT, contact network |
| 3131 | `rez-mcp-financial-forensics` | Invoice fraud, anomaly detection |
| 3132 | `rez-mcp-location-intelligence` | GPS, cell tower, IP geolocation |
| 3133 | `rez-mcp-expert-reports` | Court-ready reports |

### 4. Monitoring

| Service | Port | Description |
|---------|------|-------------|
| Dashboard | 3000 | Web monitoring dashboard |
| Grafana | 3030 | Metrics visualization |
| Prometheus | 9090 | Metrics collection |
| Alertmanager | 9093 | Alert routing |

---

## Forensics Gateway (Port 5100)

The Forensics Gateway provides unified orchestration for all 8 forensics MCPs.

### Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/investigation` | Start cross-MCP investigation |
| GET | `/api/investigations` | List all investigations |
| GET | `/api/investigation/{id}` | Get investigation details |
| POST | `/api/evidence` | Ingest new evidence |
| GET | `/api/evidence/{id}` | Get evidence by ID |
| POST | `/api/evidence/verify` | Verify evidence by hash |
| POST | `/api/deepfake/analyze` | Analyze media for deepfake |
| POST | `/api/custody/chain` | Create custody chain |
| POST | `/api/custody/transfer` | Transfer custody |
| POST | `/api/financial/analyze` | Analyze financials |
| POST | `/api/social/profile` | Lookup social profile |
| POST | `/api/social/connections` | Analyze connections |
| POST | `/api/location/lookup` | Lookup location |
| POST | `/api/report/generate` | Generate expert report |
| GET | `/api/tools` | List forensics tools |
| GET | `/health` | Health check |

### Investigation Workflow

```typescript
// 1. Start investigation
POST /api/investigation
{
  "title": "Fraud Investigation",
  "query": "investigate@email.com",
  "type": "full",           // evidence|deepfake|osint|financial|location|full
  "priority": "high",       // low|medium|high|critical
  "mcpServices": ["evidence", "financial", "social"]
}

// 2. Response
{
  "investigationId": "inv_abc123",
  "status": "in_progress",
  "results": { ... }
}

// 3. Generate report
POST /api/report/generate
{
  "investigationId": "inv_abc123",
  "type": "final",
  "format": "pdf"
}
```

---

## GraphQL API (Port 5000)

All services including forensics are accessible via GraphQL.

### Forensics Queries

```graphql
query {
  # Investigation
  investigation(id: "inv_abc123") {
    id, title, status, priority, query
    results, mcpResults, reportId
    createdAt, updatedAt
  }
  investigations(filter: { status: completed }, page: 1, limit: 20) {
    items { id, title, status }
    total, page, limit, hasMore
  }

  # Evidence
  evidence(id: "ev_001") { id, type, sha256Hash, ... }
  evidenceList(filter: { type: email }, page: 1, limit: 20) { ... }
  evidenceByHash(hash: "abc123...") { ... }

  # Deepfake
  deepfakeAnalysis(id: "df_001") { confidence, verdict, details }
  deepfakeAnalyses(filter: { verdict: fake }, page: 1, limit: 20) { ... }

  # Chain of Custody
  custodyChain(evidenceId: "ev_001") { chain, isIntact }
  custodyTransfer(id: "ct_001") { fromCustodian, toCustodian, ... }

  # Financial
  financialAnalysis(id: "fa_001") { findings { type, severity }, anomalies }
  financialAnomalies(page: 1, limit: 20) { ... }

  # Social/OSINT
  socialProfile(identifier: "user@email.com") { riskScore, profileData }
  socialConnections(identifier: "user@email.com") { ... }

  # Location
  locationData(identifier: "8.8.8.8") { coordinates, address, confidence }

  # Tools
  forensicsTools {
    name, description, endpoint, capabilities, mcpPort
  }
}
```

### Forensics Mutations

```graphql
mutation {
  # Investigation
  createInvestigation(input: {
    title: "Case 001"
    query: "investigate@email.com"
    type: full
    priority: high
  }) { id, status }

  runFullInvestigation(query: "investigate@email.com", priority: high) {
    investigationId, status
  }

  # Evidence
  ingestEvidence(input: {
    type: email
    filename: "evidence.eml"
    fileData: "base64..."
    source: "manual"
  }) { id, sha256Hash }

  verifyEvidence(hash: "abc...") { id, verified }

  # Deepfake
  analyzeDeepfake(input: {
    fileId: "file_001"
    fileType: video
    analysisType: video
  }) { id, confidence, verdict }

  # Custody
  createCustodyChain(evidenceId: "ev_001") { isIntact }

  transferCustody(input: {
    evidenceId: "ev_001"
    fromCustodian: "investigator-a"
    toCustodian: "investigator-b"
    purpose: analysis
  }) { id, transferredAt }

  verifyChain(evidenceId: "ev_001") { isIntact }

  # Financial
  analyzeFinancial(input: {
    caseId: "case_001"
    analysisType: fraud
  }) { id, findings { severity } }

  # Social
  lookupSocialProfile(identifier: "user@email.com") { riskScore }

  analyzeSocialConnections(identifier: "user@email.com") { strength }

  # Location
  lookupLocation(input: { type: ip, identifier: "8.8.8.8" }) { coordinates }

  # Reports
  generateForensicsReport(
    investigationId: "inv_abc123"
    type: final
    format: pdf
  ) { reportId, downloadUrl }
}
```

---

## SDK

### Installation
```bash
npm install @rtmz/sdk @rtmz/shared
```

### Usage
```typescript
import { RTMZClient, createClient } from '@rtmz/sdk';
import { ForensicsClient, createForensicsClient } from '@rtmz/sdk';
import { Investigation, Evidence, ForensicsTool } from '@rtmz/shared';

// Main client
const client = createClient({
  apiUrl: 'http://localhost:5000',
  authUrl: 'http://localhost:4002'
});

// Forensics client
const forensics = createForensicsClient({
  gatewayUrl: 'http://localhost:5100'
});

// Use via GraphQL
const result = await client.graphql(`
  query { forensicsTools { name, mcpPort } }
`);
```

---

## Service Contracts

### Authentication Flow

```
Client → POST /api/v1/auth/login {email, password}
      ← { accessToken, refreshToken, expiresIn }

Client → GET /api/v1/auth/userinfo (Authorization: Bearer <token>)
      ← { id, email, name, role }
```

### Internal Service Authentication

Each service uses `INTERNAL_SERVICE_TOKEN` for service-to-service calls:

```
Service A → POST http://service-b:port/internal/verify
  Header: X-Internal-Token: <token>
        ← { valid: true, service: "service-a" }
```

---

## Data Models

### Investigation
```typescript
interface Investigation {
  id: string;
  title: string;
  description?: string;
  type: 'evidence' | 'deepfake' | 'osint' | 'financial' | 'location' | 'full';
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  priority: 'low' | 'medium' | 'high' | 'critical';
  query: string;
  results?: Record<string, unknown>;
  mcpResults?: Record<string, unknown>;
  reportId?: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}
```

### Evidence
```typescript
interface Evidence {
  id: string;
  type: 'whatsapp' | 'email' | 'cctv' | 'document' | 'image' | 'video' | 'audio' | 'other';
  filename: string;
  fileSize: number;
  mimeType: string;
  sha256Hash: string;
  metadata?: Record<string, unknown>;
  source: string;
  importedBy: string;
  investigationId?: string;
  createdAt: Date;
}
```

### DeepfakeAnalysis
```typescript
interface DeepfakeAnalysis {
  id: string;
  fileId: string;
  fileType: string;
  analysisType: 'image' | 'video' | 'audio' | 'exif';
  confidence: number; // 0-1
  verdict: 'real' | 'fake' | 'uncertain';
  details?: {
    faceDetection?: boolean;
    manipulationDetected?: boolean;
    confidenceBreakdown?: Record<string, number>;
  };
  examinedBy: string;
  examinedAt: Date;
}
```

---

## Environment Variables

### Required

| Variable | Description | Example |
|----------|-------------|---------|
| `JWT_SECRET` | JWT signing secret | `secure-random-string` |
| `MONGODB_URI` | MongoDB connection | `mongodb://localhost:27017/rtmz` |
| `REDIS_URL` | Redis connection | `redis://localhost:6379` |
| `INTERNAL_SERVICE_TOKENS` | Service auth tokens (JSON) | `{"service":"token"}` |

### Forensics MCP URLs

| Variable | Default | Purpose |
|----------|---------|---------|
| `MCP_EVIDENCE_URL` | http://localhost:3120 | Evidence ingestion |
| `MCP_DEEPFAKE_URL` | http://localhost:3121 | Deepfake detection |
| `MCP_CUSTODY_URL` | http://localhost:3122 | Chain of custody |
| `MCP_FORENSICS_URL` | http://localhost:3123 | Digital forensics |
| `MCP_SOCIAL_URL` | http://localhost:3130 | Social intelligence |
| `MCP_FINANCIAL_URL` | http://localhost:3131 | Financial forensics |
| `MCP_LOCATION_URL` | http://localhost:3132 | Location intelligence |
| `MCP_REPORTS_URL` | http://localhost:3133 | Expert reports |
| `FORENSICS_GATEWAY_URL` | http://localhost:5100 | Gateway URL |

---

## API Specifications

### OpenAPI Specs

| Service | Spec File |
|---------|-----------|
| GraphQL Gateway | `docs/openapi/graphql-federation.yaml` |
| Forensics Gateway | `docs/openapi/forensics-gateway.yaml` |
| AutoML Pipeline | `docs/openapi/automl.yaml` |
| Invoice OCR | `docs/openapi/invoice-ocr.yaml` |
| Contract Management | `docs/openapi/contracts.yaml` |
| Legal Document AI | `docs/openapi/legal.yaml` |
| Cosmic Twin | `docs/openapi/cosmic-twin.yaml` |
| Ranking Service | `docs/openapi/ranking.yaml` |

---

## MCP Protocol

### Overview

RTMZ uses the Model Context Protocol (MCP) for AI agent tool integration.

### Forensics MCP Tools

#### Evidence Ingestion (3120)
- `evidence.ingest` - Import WhatsApp, Email, CCTV
- `evidence.verify_hash` - SHA256 verification
- `evidence.list` - List evidence items

#### Deepfake Detection (3121)
- `deepfake.analyze_image` - Detect AI-generated images
- `deepfake.analyze_video` - Face swap detection
- `deepfake.analyze_audio` - Voice cloning detection
- `deepfake.exif_analysis` - Metadata inspection

#### Chain of Custody (3122)
- `custody.create_chain` - Initialize custody chain
- `custody.transfer` - Record custody transfer
- `custody.verify` - Verify chain integrity
- `custody.timeline` - Generate timeline

#### Digital Forensics (3123)
- `forensics.case_create` - Create investigation case
- `forensics.acquire_disk` - Disk imaging
- `forensics.acquire_mobile` - Mobile extraction
- `forensics.extract_artifacts` - Browser, app artifacts
- `forensics.timeline` - Event timeline

#### Social Intelligence (3130)
- `social.lookup_email` - Email OSINT
- `social.lookup_phone` - Phone lookup
- `social.connections` - Contact network
- `social.risk_score` - Risk assessment

#### Financial Forensics (3131)
- `financial.invoice_analyze` - Invoice pattern analysis
- `financial.anomaly_detect` - Fraud detection
- `financial.correlate` - Transaction correlation
- `financial.link_comm` - Financial-communication link

#### Location Intelligence (3132)
- `location.gps_analysis` - GPS data analysis
- `location.cell_lookup` - Cell tower lookup
- `location.ip_geolocate` - IP geolocation
- `location.movement` - Movement patterns

#### Expert Reports (3133)
- `report.generate` - Generate court-ready report
- `report.findings` - Findings summary
- `report.exhibits` - Exhibit list
- `report.declaration` - Expert declaration

---

## Security

### Authentication

1. **JWT** - Short-lived tokens (1 hour default)
2. **Refresh Tokens** - Long-lived tokens (7 days)
3. **Internal Service Tokens** - Service-to-service auth

### Authorization

- Role-based access control (RBAC)
- Service-level permissions
- API key authentication for MCP clients

### Forensics-Specific

- Chain of custody tamper detection
- Evidence hash verification (SHA256)
- Audit logging for all forensic operations

---

## Deployment

### Docker Compose (Recommended)

```bash
cd infra
docker-compose -f docker-compose.prod.yml up -d
```

### Health Checks

| Endpoint | Expected Response |
|----------|-------------------|
| `GET /health` | `{ status: "healthy" }` |

### All Forensics MCPs
```bash
curl http://localhost:3120/health  # Evidence
curl http://localhost:3121/health  # Deepfake
curl http://localhost:3122/health  # Custody
curl http://localhost:3123/health  # Forensics
curl http://localhost:3130/health  # Social
curl http://localhost:3131/health  # Financial
curl http://localhost:3132/health  # Location
curl http://localhost:3133/health  # Reports
curl http://localhost:5100/health  # Gateway
```

---

## Monitoring

### Metrics

Prometheus metrics available at `/metrics` on all services.

### Forensics Metrics

- Investigation count by type/status
- Evidence ingestion rate
- Deepfake detection verdicts
- Chain of custody integrity
- Report generation time

### Dashboards

- **Grafana**: http://localhost:3030
- **Prometheus**: http://localhost:9090

---

## Roadmap

### Phase 1 (Completed) ✅
- [x] Auth services (JWT/OTP/SSO)
- [x] Business services (7 services)
- [x] MCP servers (16 servers)
- [x] Monitoring stack
- [x] CI/CD pipeline

### Phase 2 (Completed) ✅
- [x] Evidence ingestion pipeline
- [x] Deepfake detection MCP
- [x] Financial forensics MCP
- [x] Chain of custody tracking

### Phase 3 (Completed) ✅
- [x] OSINT integration (Social Intelligence)
- [x] Location intelligence
- [x] Expert witness report generation
- [x] Court-ready PDF export

### Phase 4 (Future)
- [ ] Compliance Suite
- [ ] Threat Intelligence Feed
- [ ] Real-time streaming forensics

---

## Appendix: Port Map

| Port | Service | Type |
|------|---------|------|
| 3000 | Dashboard | Web UI |
| 3030 | Grafana | Monitoring |
| 4002 | REZ Auth | Auth |
| 4003 | REZ SSO | Auth |
| 5000 | GraphQL Gateway | API |
| 5001 | AutoML | ML |
| 5002 | Invoice OCR | Document |
| 5003 | Contract Mgmt | Legal |
| 5004 | Legal AI | Legal |
| 5005 | Cosmic Twin | Digital Twin |
| 5006 | Ranking | ML |
| 5100 | Forensics Gateway | Forensics |
| 9090 | Prometheus | Monitoring |
| 9093 | Alertmanager | Monitoring |
| 3100-3115 | Business MCPs | AI Tools |
| 3120-3123 | Forensics MCPs (P0) | Forensics |
| 3130-3133 | Forensics MCPs (P1) | Forensics |

---

**Last Updated:** June 2026
**Maintainer:** HOJAI Technologies
