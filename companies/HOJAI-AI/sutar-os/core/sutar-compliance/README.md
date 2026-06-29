# SUTAR Compliance Engine

> **SOC2 Type II + GDPR compliance for autonomous agent operations**

**Port:** 4605
**Layer:** Compliance
**Package:** `@hojai/sutar-compliance`

## Overview

SUTAR Compliance provides:
- Comprehensive audit logging
- GDPR data subject management
- Consent management
- Data retention policies
- Access review reporting

## Quick Start

```bash
cd sutar-os/core/sutar-compliance
npm install
npm run dev
# Service runs on http://localhost:4605
```

## Features

| Feature | Status |
|---------|--------|
| Audit logging | ✅ Implemented |
| GDPR data subjects | ✅ Implemented |
| Data export (portability) | ✅ Implemented |
| Right to erasure | ✅ Implemented |
| Consent management | ✅ Implemented |
| Retention policies | ✅ Implemented |
| Access review | ✅ Implemented |

---

## API Examples

### Health Check

```bash
curl http://localhost:4605/health
```

Response:
```json
{
  "status": "ok",
  "service": "sutar-compliance",
  "port": 4605,
  "layer": "Compliance",
  "auditEvents": 234,
  "dataSubjects": 45,
  "consentRecords": 123,
  "retentionPolicies": 5,
  "timestamp": "2026-06-28T12:00:00.000Z"
}
```

### Query Audit Log

```bash
curl "http://localhost:4605/api/compliance/audit-log?actor=agent-restaurant-001&limit=10"
```

Response:
```json
{
  "total": 234,
  "returned": 10,
  "events": [
    {
      "id": "audit_xyz789",
      "timestamp": "2026-06-28T12:00:00.000Z",
      "actor": "agent-restaurant-001",
      "actorType": "agent",
      "action": "negotiation_completed",
      "resource": "contract",
      "resourceId": "contract_abc123",
      "outcome": "success",
      "metadata": {"dealValue": 50000}
    }
  ]
}
```

### List GDPR Data Subjects

```bash
curl http://localhost:4605/api/compliance/gdpr/data-subjects
```

Response:
```json
{
  "total": 45,
  "subjects": [
    {
      "subjectId": "sub_abc123",
      "email": "user@example.com",
      "fullName": "John Doe",
      "registeredAt": "2026-06-01T12:00:00.000Z",
      "gdprConsent": true,
      "erasureRequested": false,
      "dataCategories": ["personal", "transaction"]
    }
  ]
}
```

### Register Data Subject

```bash
curl -X POST http://localhost:4605/api/compliance/gdpr/data-subjects \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <jwt_token>" \
  -d '{
    "email": "user@example.com",
    "fullName": "John Doe",
    "dataCategories": ["personal", "transaction"]
  }'
```

Response:
```json
{
  "subjectId": "sub_xyz789",
  "email": "user@example.com",
  "fullName": "John Doe",
  "registeredAt": "2026-06-28T12:00:00.000Z",
  "gdprConsent": false,
  "erasureRequested": false,
  "dataCategories": ["personal", "transaction"],
  "controller": "SUTAR OS",
  "dpoc": "privacy@sutar.ai"
}
```

### GDPR Data Export (Portability)

```bash
curl -X POST http://localhost:4605/api/compliance/gdpr/export \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <jwt_token>" \
  -d '{"subjectId": "sub_abc123"}'
```

Response:
```json
{
  "subject": {
    "subjectId": "sub_abc123",
    "email": "user@example.com",
    "fullName": "John Doe"
  },
  "auditEvents": [
    { "action": "login", "timestamp": "2026-06-28T10:00:00.000Z" }
  ],
  "consentRecords": [
    { "purpose": "marketing", "granted": true, "timestamp": "2026-06-01T12:00:00.000Z" }
  ],
  "exportedAt": "2026-06-28T12:00:00.000Z",
  "format": "JSON",
  "controller": "SUTAR OS"
}
```

### Schedule GDPR Erasure

```bash
curl -X POST http://localhost:4605/api/compliance/gdpr/erase \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <jwt_token>" \
  -d '{"subjectId": "sub_abc123"}'
```

Response:
```json
{
  "subjectId": "sub_abc123",
  "status": "erasure_scheduled",
  "scheduledWithin": "30 days"
}
```

### Execute GDPR Erasure

```bash
curl -X POST http://localhost:4605/api/compliance/gdpr/erase \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <jwt_token>" \
  -d '{"subjectId": "sub_abc123", "execute": true}'
```

Response:
```json
{
  "subjectId": "sub_abc123",
  "auditRecordsErased": 5,
  "status": "completed"
}
```

### Record Consent

```bash
curl -X POST http://localhost:4605/api/compliance/consent \
  -H "Content-Type: application/json" \
  -d '{
    "subjectId": "sub_abc123",
    "purpose": "marketing",
    "granted": true,
    "method": "web_form",
    "version": "2.0"
  }'
```

Response:
```json
{
  "consentId": "consent_xyz789",
  "subjectId": "sub_abc123",
  "purpose": "marketing",
  "granted": true,
  "timestamp": "2026-06-28T12:00:00.000Z",
  "method": "web_form",
  "version": "2.0",
  "withdrawalPossible": true
}
```

### Check Consent

```bash
curl "http://localhost:4605/api/compliance/consent?subjectId=sub_abc123&purpose=marketing"
```

Response:
```json
{
  "granted": true,
  "consentId": "consent_xyz789",
  "timestamp": "2026-06-28T12:00:00.000Z"
}
```

### Generate Access Review Report

```bash
curl http://localhost:4605/api/compliance/access-review \
  -H "Authorization: Bearer <jwt_token>"
```

Response:
```json
{
  "reviewedAt": "2026-06-28T12:00:00.000Z",
  "totalActors": 156,
  "actors": [
    { "actor": "agent-001", "actorType": "agent", "actions": 45, "resources": 12, "lastSeen": "2026-06-28T11:00:00.000Z" }
  ],
  "staleActors": 8,
  "reportPeriod": "last_90_days"
}
```

### Get Retention Status

```bash
curl "http://localhost:4605/api/compliance/retention?dataType=transaction"
```

Response:
```json
{
  "policyId": "policy_abc123",
  "dataType": "transaction",
  "totalEvents": 500,
  "eventsBeforeCutoff": 50,
  "retentionDays": 365,
  "purgeRecommended": true
}
```

### Create Retention Policy

```bash
curl -X POST http://localhost:4605/api/compliance/retention/policies \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <jwt_token>" \
  -d '{
    "dataType": "session_logs",
    "retentionDays": 90,
    "jurisdiction": "EU",
    "legalBasis": "legitimate_interest"
  }'
```

Response:
```json
{
  "policyId": "policy_xyz789",
  "dataType": "session_logs",
  "retentionDays": 90,
  "purgeAfter": "immediately",
  "encrypted": true,
  "jurisdiction": "EU",
  "legalBasis": "legitimate_interest",
  "createdAt": "2026-06-28T12:00:00.000Z"
}
```

---

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `COMPLIANCE_PORT` | 4605 | Service port |
| `NODE_ENV` | development | Environment (development/production) |

---

## Tech Stack

- Node.js 20+
- Express.js
- JavaScript
- @rtmn/shared (security)

---

**Last Updated:** 2026-06-28
