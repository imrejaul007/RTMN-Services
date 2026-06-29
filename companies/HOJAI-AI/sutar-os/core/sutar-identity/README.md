# SUTAR Identity

> **Universal identity management for agents and entities in the autonomous economy**

**Port:** 4144
**Layer:** 2 (Gateway + Twin + Memory + Identity)
**Package:** `@hojai/sutar-identity`

## Overview

SUTAR Identity provides:
- Universal identity creation and management
- JWT-based authentication for agents and entities
- Role-based access control (RBAC)
- Cross-entity attestation
- CorpID proxy for identity verification

## Quick Start

```bash
cd sutar-os/core/sutar-identity
npm install
npm run dev
# Service runs on http://localhost:4144
```

## Features

| Feature | Status |
|---------|--------|
| Identity creation | ✅ Implemented |
| JWT authentication | ✅ Implemented |
| Claims management | ✅ Implemented |
| Identity revocation | ✅ Implemented |
| Cross-entity attestation | ✅ Implemented |
| CorpID proxy | ✅ Implemented |

---

## API Examples

### Health Check

```bash
curl http://localhost:4144/health
```

Response:
```json
{
  "status": "ok",
  "service": "sutar-identity",
  "sutarLayer": 2,
  "port": 4144,
  "counts": {
    "identities": 89,
    "claims": 234,
    "revoked": 5
  },
  "timestamp": "2026-06-28T12:00:00.000Z"
}
```

### Readiness Probe

```bash
curl http://localhost:4144/ready
```

Response:
```json
{
  "ready": true,
  "timestamp": "2026-06-28T12:00:00.000Z"
}
```

### Create SUTAR Identity

```bash
curl -X POST http://localhost:4144/api/identities \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <jwt_token>" \
  -d '{
    "corpId": "corp_abc123",
    "entityType": "merchant",
    "name": "Restaurant ABC",
    "roles": ["seller", "negotiator"],
    "capabilities": ["transact", "negotiate", "fulfill"]
  }'
```

Response:
```json
{
  "sutarId": "sutar_xyz789",
  "corpId": "corp_abc123",
  "entityType": "merchant",
  "name": "Restaurant ABC",
  "roles": ["seller", "negotiator"],
  "capabilities": ["transact", "negotiate", "fulfill"],
  "trustLevel": "verified",
  "createdAt": "2026-06-28T12:00:00.000Z",
  "status": "active"
}
```

### List Identities

```bash
curl http://localhost:4144/api/identities
```

Response:
```json
{
  "count": 89,
  "identities": [
    {
      "sutarId": "sutar_xyz789",
      "entityType": "merchant",
      "name": "Restaurant ABC",
      "roles": ["seller", "negotiator"],
      "status": "active"
    }
  ]
}
```

### Filter Identities by Role

```bash
curl "http://localhost:4144/api/identities?role=negotiator"
```

Response:
```json
{
  "count": 23,
  "identities": [
    {
      "sutarId": "sutar_xyz789",
      "entityType": "merchant",
      "name": "Restaurant ABC",
      "roles": ["seller", "negotiator"],
      "status": "active"
    }
  ]
}
```

### Get Identity by SUTAR ID

```bash
curl http://localhost:4144/api/identities/sutar_xyz789
```

Response:
```json
{
  "sutarId": "sutar_xyz789",
  "corpId": "corp_abc123",
  "entityType": "merchant",
  "name": "Restaurant ABC",
  "roles": ["seller", "negotiator"],
  "capabilities": ["transact", "negotiate", "fulfill"],
  "claims": [
    { "type": "kyc", "value": "verified", "issuedAt": "2026-06-20" }
  ],
  "trustLevel": "verified",
  "createdAt": "2026-06-28T12:00:00.000Z",
  "status": "active"
}
```

### Add Claim to Identity

```bash
curl -X POST http://localhost:4144/api/identities/sutar_xyz789/claims \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <jwt_token>" \
  -d '{
    "type": "credit_rating",
    "value": "A+",
    "issuer": "sutar-trust-engine",
    "expiresAt": "2027-06-28T12:00:00.000Z"
  }'
```

Response:
```json
{
  "claimId": "claim_abc123",
  "type": "credit_rating",
  "value": "A+",
  "issuer": "sutar-trust-engine",
  "issuedAt": "2026-06-28T12:00:00.000Z",
  "expiresAt": "2027-06-28T12:00:00.000Z"
}
```

### Revoke Identity

```bash
curl -X POST http://localhost:4144/api/identities/sutar_xyz789/revoke \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <jwt_token>" \
  -d '{
    "reason": "compliance_violation",
    "revokedBy": "admin@corp.com"
  }'
```

Response:
```json
{
  "sutarId": "sutar_xyz789",
  "status": "revoked",
  "revokedAt": "2026-06-28T12:00:00.000Z",
  "reason": "compliance_violation",
  "revokedBy": "admin@corp.com"
}
```

### Cross-Entity Attestation

```bash
curl -X POST http://localhost:4144/api/identities/sutar_xyz789/attest \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <jwt_token>" \
  -d '{
    "attestorId": "sutar_abc456",
    "attestationType": "capability_verified",
    "evidence": {
      "testPassed": true,
      "score": 95
    }
  }'
```

Response:
```json
{
  "attestationId": "attest_def456",
  "sutarId": "sutar_xyz789",
  "attestorId": "sutar_abc456",
  "type": "capability_verified",
  "status": "verified",
  "evidence": {
    "testPassed": true,
    "score": 95
  },
  "timestamp": "2026-06-28T12:00:00.000Z"
}
```

### Proxy to CorpID

```bash
curl http://localhost:4144/api/corpid/proxy/corp_abc123
```

Response:
```json
{
  "corpId": "corp_abc123",
  "legalName": "Restaurant ABC LLC",
  "registrationNumber": "REG123456",
  "verified": true,
  "kycStatus": "approved"
}
```

### View Audit Log

```bash
curl http://localhost:4144/api/audit
```

Response:
```json
{
  "total": 100,
  "returned": 100,
  "events": [
    {
      "id": "audit_xyz789",
      "timestamp": "2026-06-28T12:00:00.000Z",
      "action": "identity_created",
      "actor": "admin@corp.com",
      "resource": "sutar-identity",
      "outcome": "success"
    }
  ]
}
```

---

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | 4144 | Service port |
| `NODE_ENV` | development | Environment (development/production) |
| `JWT_SECRET` | - | JWT signing secret |
| `CORPID_URL` | http://localhost:4702 | CorpID service URL |
| `INTERNAL_SERVICE_TOKEN` | - | Internal service authentication |

---

## Tech Stack

- Node.js 20+
- Express.js
- JavaScript
- @rtmn/shared (auth, security)

---

## Integration Points

| Service | Port | Purpose |
|---------|------|---------|
| SUTAR Gateway | 4140 | API Gateway |
| CorpID | 4702 | Identity verification |
| SUTAR Trust Engine | 4291 | Trust scoring |

---

**Last Updated:** 2026-06-28
