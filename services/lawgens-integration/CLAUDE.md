# LawGens Integration Service

**Version:** 1.0.0  
**Port:** 4970  
**Status:** Active

---

## Overview

LawGens Integration is a legal document automation service that connects to Customer Operations in the RTMN ecosystem. It provides contract management, compliance tracking, and document generation capabilities with seamless integration to Knowledge Twin, Journey Twin, and Industry Twin.

---

## Service Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     LawGens Integration                          │
│                          Port: 4970                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐        │
│  │  Contracts    │  │  Compliance  │  │   Documents   │        │
│  │  API          │  │  API         │  │   API         │        │
│  │  /api/contracts│ │  /api/compliance│ │  /api/documents│        │
│  └───────┬───────┘  └───────┬───────┘  └───────┬───────┘        │
│          │                  │                  │                │
│  ┌───────▼──────────────────▼──────────────────▼───────┐        │
│  │              Legal Profile Store                      │        │
│  │   (Contracts, Compliance, Documents, Parties)         │        │
│  └────────────────────────┬─────────────────────────────┘        │
│                           │                                       │
│  ┌────────────────────────▼─────────────────────────────┐        │
│  │              Customer Ops Bridge                        │        │
│  │   (Service Registry, Event Bus, Customer Data)         │        │
│  └────────────────────────┬─────────────────────────────┘        │
│                           │                                       │
│  ┌────────────────────────▼─────────────────────────────┐        │
│  │              Legal Sync Service                        │        │
│  │   (Auto-sync to Twins)                                  │        │
│  └────────────────────────┬─────────────────────────────┘        │
│                           │                                       │
└───────────────────────────┼─────────────────────────────────────┘
                            │
        ┌───────────────────┼───────────────────┐
        │                   │                   │
   ┌────▼─────┐      ┌──────▼──────┐     ┌─────▼─────┐
   │ Knowledge │      │   Journey   │     │  Industry │
   │   Twin    │      │    Twin     │     │   Twin    │
   │  (Legal)  │      │  (Legal)    │     │  (Legal)  │
   └───────────┘      └─────────────┘     └───────────┘
```

---

## API Endpoints

### Health & Status

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Service health check |
| GET | `/api/integrations` | List connected services |
| POST | `/api/sync` | Trigger manual sync |

### Contracts

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/contracts` | List all contracts |
| GET | `/api/contracts/:id` | Get contract details |
| POST | `/api/contracts` | Create contract |
| PUT | `/api/contracts/:id` | Update contract |
| DELETE | `/api/contracts/:id` | Terminate contract |
| POST | `/api/contracts/:id/milestones` | Add milestone |
| PATCH | `/api/contracts/:id/milestones/:milestoneId` | Update milestone |
| POST | `/api/contracts/:id/parties` | Add party |
| POST | `/api/contracts/:id/sign` | Sign contract |
| GET | `/api/contracts/:id/analytics` | Get contract analytics |

### Compliance

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/compliance` | List compliance items |
| GET | `/api/compliance/:id` | Get compliance item |
| POST | `/api/compliance` | Create compliance item |
| PUT | `/api/compliance/:id` | Update compliance item |
| POST | `/api/compliance/:id/complete` | Mark as complete |
| GET | `/api/compliance/dashboard/summary` | Compliance dashboard |
| GET | `/api/compliance/regulatory/:category` | Regulatory items |
| GET | `/api/compliance/risk-assessment` | Risk assessment |
| DELETE | `/api/compliance/:id` | Waive compliance item |

### Documents

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/documents` | List all documents |
| GET | `/api/documents/:id` | Get document |
| POST | `/api/documents` | Create document |
| POST | `/api/documents/generate` | Generate from template |
| PUT | `/api/documents/:id` | Update document |
| POST | `/api/documents/:id/sign` | Sign document |
| POST | `/api/documents/:id/signatories` | Add signatory |
| GET | `/api/documents/:id/content` | Get document content |
| GET | `/api/documents/templates/list` | List templates |
| POST | `/api/documents/:id/archive` | Archive document |
| DELETE | `/api/documents/:id` | Delete draft document |

---

## Connected Services

### Twin Integrations

| Service | Purpose | Connection |
|---------|---------|------------|
| **Knowledge Twin** | Legal knowledge base, contracts, documents | REST API |
| **Journey Twin** | Customer journey milestones, legal stages | REST API |
| **Industry Twin** | Legal standards, compliance requirements | REST API |

### Event Bus Subscriptions

| Event | Purpose |
|-------|---------|
| `contract.created` | New contract notification |
| `contract.updated` | Contract modification |
| `contract.signed` | Contract signature event |
| `contract.terminated` | Contract termination |
| `compliance.created` | New compliance requirement |
| `compliance.completed` | Compliance achieved |
| `document.created` | Document created |
| `document.signed` | Document signed |

---

## Document Templates

| Template ID | Name | Type |
|-------------|------|------|
| `nda_standard` | Standard NDA | Confidentiality |
| `nda_mutual` | Mutual NDA | Confidentiality |
| `service_agreement` | Service Agreement | Commercial |
| `employment_contract` | Employment Contract | HR |
| `vendor_contract` | Vendor Contract | Commercial |
| `lease_agreement` | Lease Agreement | Property |
| `partnership_agreement` | Partnership Agreement | Commercial |
| `consulting_agreement` | Consulting Agreement | Commercial |
| `licensing_agreement` | Licensing Agreement | IP |
| `sales_agreement` | Sales Agreement | Commercial |

---

## Environment Variables

```bash
PORT=4970
NODE_ENV=development

# Twin URLs
KNOWLEDGE_TWIN_URL=http://localhost:4705
JOURNEY_TWIN_URL=http://localhost:3016
INDUSTRY_TWIN_URL=http://localhost:4705
EVENT_BUS_URL=http://localhost:4510
SERVICE_REGISTRY_URL=http://localhost:4399

# Sync Settings
INTEGRATION_MODE=full
AUTO_SYNC_ENABLED=true
SYNC_INTERVAL_MS=60000

# Storage
DOCUMENT_STORAGE_PATH=./documents
```

---

## Usage Examples

### Create a Contract

```bash
curl -X POST http://localhost:4970/api/contracts \
  -H "Content-Type: application/json" \
  -d '{
    "profileId": "LP-123",
    "title": "Service Agreement with Vendor",
    "type": "service_agreement",
    "terms": {
      "paymentTerms": "Net 30",
      "jurisdiction": "California"
    }
  }'
```

### Add Compliance Item

```bash
curl -X POST http://localhost:4970/api/compliance \
  -H "Content-Type: application/json" \
  -d '{
    "profileId": "LP-123",
    "type": "regulatory",
    "category": "data_protection",
    "title": "GDPR Compliance",
    "requirement": "Implement data protection measures",
    "priority": "high",
    "dueDate": "2026-12-31"
  }'
```

### Generate Document from Template

```bash
curl -X POST http://localhost:4970/api/documents/generate \
  -H "Content-Type: application/json" \
  -d '{
    "templateId": "nda_standard",
    "profileId": "LP-123",
    "data": {
      "disclosingParty": "ABC Corp",
      "receivingParty": "XYZ Inc",
      "jurisdiction": "Delaware",
      "term": "3 years"
    }
  }'
```

---

## Development

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Start production server
npm start
```

---

## Related Services

- **Legal OS** (Port 5035) - Core legal operations
- **CorpID** (Port 4702) - Universal identity
- **REZ-crm-hub** (Port 4056) - CRM integration
- **TwinOS Hub** (Port 4705) - Digital twin registry

---

*Last Updated: June 2026*
