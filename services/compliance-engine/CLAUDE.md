# Compliance Engine Service

**Version:** 1.0.0
**Port:** 4986
**Status:** Development

## Overview

The Compliance Engine is a centralized service for managing regulatory compliance across the RTMN ecosystem. It provides comprehensive GDPR, KYC (Know Your Customer), and AML (Anti-Money Laundering) compliance capabilities.

## Capabilities

- **GDPR Compliance**: Data subject requests, consent management, right to erasure, data portability
- **KYC Verification**: Identity verification workflows, document management, risk assessment
- **AML Screening**: Sanctions screening, PEP checks, transaction monitoring, SAR filing

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                      Compliance Engine                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │   GDPR API   │  │   KYC API    │  │   AML API    │          │
│  │   (Routes)   │  │   (Routes)   │  │   (Routes)   │          │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘          │
│         │                 │                 │                    │
│  ┌──────▼─────────────────▼─────────────────▼───────┐            │
│  │                  Services Layer                  │            │
│  │  ┌────────────┐ ┌────────────┐ ┌────────────┐   │            │
│  │  │ Validator  │ │ KYCChecker │ │ AuditLogger│   │            │
│  │  └────────────┘ └────────────┘ └────────────┘   │            │
│  │  ┌────────────┐ ┌────────────┐                  │            │
│  │  │CustomerOps │ │  TwinSync  │                  │            │
│  │  │  Bridge     │ │            │                  │            │
│  │  └────────────┘ └────────────┘                  │            │
│  └──────────────────────────────────────────────────┘            │
│                              │                                    │
│  ┌──────────────────────────▼──────────────────────────┐          │
│  │                    Data Layer                        │          │
│  │  ┌────────────┐ ┌────────────┐ ┌────────────┐       │          │
│  │  │ Compliance │ │    KYC     │ │   Audit    │       │          │
│  │  │   Rules    │ │  Records   │ │   Logs     │       │          │
│  │  └────────────┘ └────────────┘ └────────────┘       │          │
│  └──────────────────────────────────────────────────────┘          │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
                               │
            ┌──────────────────┼──────────────────┐
            │                  │                  │
    ┌───────▼───────┐  ┌───────▼───────┐  ┌──────▼───────┐
    │    TwinOS     │  │   Customer    │  │   Event Bus  │
    │     Hub       │  │   Operations   │  │              │
    │   (Port 4705) │  │   (Port 4399)  │  │  (Port 4510) │
    └───────────────┘  └───────────────┘  └──────────────┘
```

## API Endpoints

### Health Check
```
GET /health
```

### KYC Endpoints
```
POST   /api/kyc                    - Create new KYC record
GET    /api/kyc/:id                - Get KYC by ID
GET    /api/kyc/user/:userId       - Get KYC by user ID
POST   /api/kyc/:id/documents      - Upload document
POST   /api/kyc/:id/documents/:docId/verify - Verify document
POST   /api/kyc/:id/approve        - Approve KYC
POST   /api/kyc/:id/reject         - Reject KYC
PUT    /api/kyc/:id                - Update KYC
GET    /api/kyc/stats/summary      - Get KYC statistics
```

### GDPR Endpoints
```
POST   /api/gdpr/request            - Submit GDPR request
GET    /api/gdpr/request/:id       - Get GDPR request
GET    /api/gdpr/requests/user/:userId - Get user's GDPR requests
GET    /api/gdpr/requests/pending   - Get pending requests
POST   /api/gdpr/request/:id/export - Export user data
POST   /api/gdpr/request/:id/delete - Delete user data
POST   /api/gdpr/request/:id/complete - Complete request
POST   /api/gdpr/request/:id/reject - Reject request
POST   /api/gdpr/consent            - Update consent
GET    /api/gdpr/stats              - Get GDPR statistics
```

### AML Endpoints
```
POST   /api/aml/screen              - Perform AML screening
GET    /api/aml/check/:id          - Get AML check
GET    /api/aml/checks/entity/:entityId - Get entity's AML checks
GET    /api/aml/alerts              - Get open alerts
GET    /api/aml/alert/:id           - Get alert
POST   /api/aml/alert/:id/resolve  - Resolve alert
POST   /api/aml/sar                - File SAR
POST   /api/aml/monitor/transaction - Monitor transaction
GET    /api/aml/stats              - Get AML statistics
```

### Audit Endpoints
```
GET    /api/audit                  - Search audit logs
GET    /api/audit/:id             - Get audit log by ID
GET    /api/audit/entity/:entityId - Get entity audit trail
GET    /api/audit/user/:userId   - Get user audit trail
GET    /api/audit/action/:action  - Get logs by action
GET    /api/audit/stats/summary   - Get audit statistics
GET    /api/audit/export/user/:userId - Export user audit logs
POST   /api/audit                 - Create audit log entry
POST   /api/audit/cleanup         - Cleanup expired logs
GET    /api/audit/metadata/actions - Get action types
```

## Models

### Compliance Rules
- Defines regulatory rules (GDPR, KYC, AML)
- Conditions and actions for rule evaluation
- Severity levels for risk assessment

### KYC Records
- Personal and business information
- Document management with verification status
- Risk scoring and factors
- Verification levels (Basic, Standard, Enhanced, Premium)

### Audit Logs
- Immutable audit trail
- Retention policies per entity type
- GDPR compliance: minimum 5 years for financial records

## Services

### Validator
- Validates compliance rules against data
- Validates personal/business information
- Validates documents and addresses

### KYC Checker
- Performs comprehensive KYC verification checks
- Document completeness and validity checks
- High-risk indicator detection

### Audit Logger
- Creates immutable audit trail entries
- Logs data access, errors, violations
- Exports user data for GDPR compliance

### Customer Ops Bridge
- Coordinates data deletion across services
- Exports user data from connected services
- Notifies of KYC/AML status changes

### Twin Sync
- Syncs compliance data to Trust Twin
- Maintains real-time compliance status
- Supports GDPR/AML flag management

## Environment Variables

```env
PORT=4986
NODE_ENV=development

# Service URLs
CUSTOMER_OPS_URL=http://localhost:4399
TWIN_OS_URL=http://localhost:4705
EVENT_BUS_URL=http://localhost:4510

# Compliance Settings
MIN_AGE=18
REQUIRE_DOCUMENT_VERIFICATION=true
REQUIRE_ADDRESS_VERIFICATION=true

# Audit Settings
AUDIT_RETENTION_DAYS=2555
AUDIT_LOG_LEVEL=info

# Security
API_KEY_SECRET=your-secret-key-here
```

## Quick Start

```bash
# Install dependencies
npm install

# Start in development
npm run dev

# Start in production
npm run build
npm start

# Health check
curl http://localhost:4986/health
```

## Compliance Standards

### GDPR
- Right to Access (Article 15)
- Right to Rectification (Article 16)
- Right to Erasure (Article 17)
- Right to Data Portability (Article 20)
- Consent Management

### KYC
- Identity Verification
- Document Authentication
- Address Verification
- Risk Assessment
- Ongoing Monitoring

### AML
- Sanctions Screening (OFAC, EU, UN, UK HMT)
- PEP Screening
- Transaction Monitoring
- Suspicious Activity Reporting
- High-Risk Country Checks

## Integration

### TwinOS Hub (Port 4705)
- Sync compliance twins for real-time status
- Automatic flag synchronization

### Customer Operations (Port 4399)
- Cross-service data deletion
- Notification of compliance events

### Event Bus (Port 4510)
- Publish compliance events
- Subscribe to relevant events

## Port Registry

| Service | Port | Purpose |
|---------|------|---------|
| Compliance Engine | 4986 | GDPR, KYC, AML |

## Files Structure

```
compliance-engine/
├── package.json
├── tsconfig.json
├── .env.example
├── CLAUDE.md
└── src/
    ├── index.ts
    ├── models/
    │   ├── Compliance.ts
    │   ├── KYC.ts
    │   └── Audit.ts
    ├── routes/
    │   ├── kyc.ts
    │   ├── gdpr.ts
    │   ├── aml.ts
    │   └── audit.ts
    └── services/
        ├── validator.ts
        ├── kycChecker.ts
        ├── auditLogger.ts
        ├── customerOpsBridge.ts
        └── twinSync.ts
```

---

*Last Updated: June 2026*
