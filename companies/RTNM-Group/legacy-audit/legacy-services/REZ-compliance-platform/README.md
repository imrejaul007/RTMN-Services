# REZ-compliance-platform

> GDPR/DPDP Compliance Service
> **Status:** Scaffold - Implementation Required

---

## Overview

REZ-compliance-platform provides GDPR, DPDP (Digital Personal Data Protection), and audit compliance features for the ReZ ecosystem.

## Features

- [x] Package.json configured
- [x] TypeScript configured
- [x] Render deployment configured
- [ ] Consent management
- [ ] Data subject rights
- [ ] Audit trails
- [ ] Data retention policies
- [ ] Data breach notification

## Compliance Framework

### GDPR Compliance

| Requirement | Status | Endpoint |
|-------------|--------|----------|
| Right to access | TODO | `POST /api/v1/data/access/:userId` |
| Right to rectification | TODO | `POST /api/v1/data/rectification/:id` |
| Right to erasure | TODO | `POST /api/v1/data/erasure/:userId` |
| Right to portability | TODO | `POST /api/v1/data/portability/:userId` |
| Consent management | TODO | `POST /api/v1/consent` |
| Data breach notification | TODO | `POST /api/v1/breach/report` |

### DPDP Compliance

| Requirement | Status |
|-------------|--------|
| Consent collection | TODO |
| Purpose limitation | TODO |
| Data minimization | TODO |
| Accuracy | TODO |
| Storage limitation | TODO |
| Accountability | TODO |

## API Endpoints

### Consent Management

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/consent` | Record consent |
| GET | `/api/v1/consent/:userId` | Get user consents |
| PUT | `/api/v1/consent/:userId` | Update consent |
| DELETE | `/api/v1/consent/:userId` | Withdraw consent |

### Data Subject Rights

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/data/access/:userId` | Right to access |
| POST | `/api/v1/data/rectification/:id` | Right to rectification |
| POST | `/api/v1/data/erasure/:userId` | Right to erasure |
| POST | `/api/v1/data/portability/:userId` | Right to portability |

### Audit

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/audit/log` | Create audit entry |
| GET | `/api/v1/audit/logs` | Query audit logs |
| GET | `/api/v1/audit/export` | Export logs |

## Database Schema

```typescript
// Consent records
interface ConsentRecord {
  _id: ObjectId;
  userId: string;
  consentType: ConsentType;  // marketing, analytics, third_party, data_processing
  granted: boolean;
  purpose: string;
  grantedAt: Date;
  withdrawnAt?: Date;
  ipAddress: string;
  userAgent: string;
}

// Audit log
interface ComplianceAuditLog {
  _id: ObjectId;
  userId: string;
  action: string;
  dataCategory: string;
  legalBasis: string;
  timestamp: Date;
  processedBy: string;
  outcome: 'success' | 'failure';
}

// Data subject request
interface DataSubjectRequest {
  _id: ObjectId;
  requestId: string;
  userId: string;
  type: 'access' | 'rectification' | 'erasure' | 'portability';
  status: 'pending' | 'processing' | 'completed' | 'rejected';
  dataCategories: string[];
  responseData?: any;
  completedAt?: Date;
  deadline: Date;  // 30 days from request
}
```

## Environment Variables

```bash
NODE_ENV=production
PORT=4000
MONGODB_URI=mongodb://...
REDIS_URL=redis://...
RETENTION_DAYS=365
DATA_PROCESSING_AGREEMENT_ID=xxx
```

## Setup

```bash
npm install
npm run build
npm start
```

## TODO

- [ ] Create src/index.ts
- [ ] Create consent service
- [ ] Create audit service
- [ ] Add data subject rights endpoints
- [ ] Implement consent UI hooks
- [ ] Add compliance tests
- [ ] Configure audit logging

---

**Last Updated:** 2026-05-13
**Status:** Scaffold Only
