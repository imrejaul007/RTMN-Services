# SUTAR Trust Engine

> **Trust scoring, reputation aggregation, and credit assessment for autonomous commerce**

**Port:** 4291
**Layer:** 6 (Trust + Contracts)
**Package:** `@hojai/sutar-trust-engine`

## Overview

The Trust Engine provides:
- Trust score calculation for entities (agents, merchants, consumers)
- Reputation aggregation across multiple sources
- Credit check and scoring
- Entity verification (KYC/KYB)
- SADA federation health monitoring

## Quick Start

```bash
cd sutar-os/core/sutar-trust-engine
npm install
npm run dev
# Service runs on http://localhost:4291
```

## Features

| Feature | Status |
|---------|--------|
| Trust score calculation | ✅ Implemented |
| Reputation aggregation | ✅ Implemented |
| Credit scoring | ✅ Implemented |
| KYC/KYB verification | ✅ Implemented |
| SADA federation probe | ✅ Implemented |

---

## API Examples

### Health Check

```bash
curl http://localhost:4291/health
```

Response:
```json
{
  "status": "ok",
  "service": "sutar-trust-engine",
  "sutarLayer": 6,
  "port": 4291,
  "counts": {
    "entities": 156,
    "creditChecks": 23,
    "verifications": 8
  },
  "timestamp": "2026-06-28T12:00:00.000Z"
}
```

### SADA Federation Status

```bash
curl http://localhost:4291/api/v1/sada/status
```

Response:
```json
{
  "federation": "active",
  "memberCount": 24,
  "avgTrustScore": 0.78,
  "lastSync": "2026-06-28T12:00:00.000Z",
  "status": "healthy"
}
```

### Calculate Trust Score

```bash
curl -X POST http://localhost:4291/api/v1/trust/calculate \
  -H "Content-Type: application/json" \
  -d '{
    "entityId": "merchant-001",
    "entityType": "merchant",
    "factors": {
      "transactionHistory": 0.9,
      "responseTime": 0.85,
      "disputeRate": 0.05,
      "complianceScore": 0.95
    }
  }'
```

Response:
```json
{
  "entityId": "merchant-001",
  "trustScore": 0.84,
  "trustLevel": "gold",
  "factors": {
    "transactionHistory": { "contribution": 0.25, "score": 0.9 },
    "responseTime": { "contribution": 0.15, "score": 0.85 },
    "disputeRate": { "contribution": 0.35, "score": 0.95 },
    "complianceScore": { "contribution": 0.25, "score": 0.95 }
  },
  "calculatedAt": "2026-06-28T12:00:00.000Z",
  "expiresAt": "2026-06-29T12:00:00.000Z"
}
```

### Get Trust Score (with SADA fallback)

```bash
curl http://localhost:4291/api/v1/trust/merchant-001
```

Response:
```json
{
  "entityId": "merchant-001",
  "trustScore": 0.84,
  "trustLevel": "gold",
  "source": "local",
  "sadaScore": 0.86,
  "calculatedAt": "2026-06-28T12:00:00.000Z"
}
```

### Get Reputation Details

```bash
curl http://localhost:4291/api/v1/reputation/merchant-001
```

Response:
```json
{
  "entityId": "merchant-001",
  "reputation": {
    "overall": 0.82,
    "ratings": {
      "quality": 0.88,
      "delivery": 0.79,
      "communication": 0.85,
      "value": 0.76
    },
    "reviewCount": 234,
    "avgRating": 4.1,
    "responseRate": 0.95
  },
  "badges": ["top_rated", "fast_responder"],
  "rank": 45
}
```

### Aggregate Reputation Across Entities

```bash
curl -X POST http://localhost:4291/api/v1/reputation/aggregate \
  -H "Content-Type: application/json" \
  -d '{
    "entityIds": ["merchant-001", "merchant-002", "merchant-003"],
    "weights": [0.5, 0.3, 0.2]
  }'
```

Response:
```json
{
  "aggregatedScore": 0.81,
  "individualScores": {
    "merchant-001": 0.84,
    "merchant-002": 0.79,
    "merchant-003": 0.76
  },
  "confidence": 0.92,
  "sampleSize": 567
}
```

### Perform Credit Check

```bash
curl -X POST http://localhost:4291/api/v1/credit/check \
  -H "Content-Type: application/json" \
  -d '{
    "entityId": "merchant-001",
    "requestAmount": 50000,
    "purpose": "expansion",
    "tenure": 12
  }'
```

Response:
```json
{
  "entityId": "merchant-001",
  "creditCheckId": "cc_abc123",
  "approved": true,
  "creditLimit": 75000,
  "riskCategory": "low_risk",
  "interestRate": 8.5,
  "terms": {
    "minAmount": 5000,
    "maxAmount": 75000,
    "tenureMonths": 12
  }
}
```

### Get Credit Score

```bash
curl http://localhost:4291/api/v1/credit/merchant-001
```

Response:
```json
{
  "entityId": "merchant-001",
  "creditScore": 720,
  "creditLimit": 75000,
  "utilization": 0.34,
  "paymentHistory": "excellent",
  "creditAge": 36,
  "totalAccounts": 5,
  "hardInquiries": 2
}
```

### Get Full Credit Report

```bash
curl http://localhost:4291/api/v1/credit/merchant-001/report
```

Response:
```json
{
  "entityId": "merchant-001",
  "reportId": "cr_xyz789",
  "generatedAt": "2026-06-28T12:00:00.000Z",
  "score": 720,
  "factors": [
    { "factor": "payment_history", "impact": "+25", "rating": "excellent" },
    { "factor": "credit_utilization", "impact": "-10", "rating": "good" },
    { "factor": "credit_age", "impact": "+15", "rating": "very_good" }
  ],
  "accounts": [
    { "type": "trade_credit", "limit": 50000, "balance": 17000, "status": "current" }
  ],
  "inquiries": [
    { "date": "2026-06-15", "type": "business_loan", "lender": "RABTUL" }
  ]
}
```

### Entity Verification

```bash
curl -X POST http://localhost:4291/api/v1/verification/verify \
  -H "Content-Type: application/json" \
  -d '{
    "entityId": "merchant-001",
    "verificationType": "kyb",
    "documents": ["business_license", "tax_certificate", "address_proof"]
  }'
```

Response:
```json
{
  "entityId": "merchant-001",
  "verificationId": "vrf_def456",
  "status": "verified",
  "verificationType": "kyb",
  "checksPassed": ["identity", "address", "business_registration", "tax_status"],
  "verifiedAt": "2026-06-28T12:00:00.000Z",
  "expiresAt": "2026-06-28T12:00:00.000Z"
}
```

### Full KYC Processing

```bash
curl -X POST http://localhost:4291/api/v1/verification/kyc \
  -H "Content-Type: application/json" \
  -d '{
    "entityId": "merchant-001",
    "kycType": "full",
    "documents": {
      "id": "passport",
      "address": "utility_bill",
      "business": "registration_certificate"
    }
  }'
```

Response:
```json
{
  "entityId": "merchant-001",
  "kycId": "kyc_ghi789",
  "status": "approved",
  "level": "full",
  "checks": {
    "identity_verification": "passed",
    "address_verification": "passed",
    "sanctions_screening": "clear",
    "adverse_media": "clear",
    "pep_check": "clear"
  },
  "riskRating": "low",
  "completedAt": "2026-06-28T12:00:00.000Z"
}
```

---

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | 4291 | Service port |
| `NODE_ENV` | development | Environment (development/production) |
| `SADA_FEDERATION_URL` | - | SADA federation endpoint |
| `REZ_INTEL_URL` | - | REZ Intelligence URL |
| `REZ_INTEL_API_KEY` | - | REZ Intelligence API key |
| `INTERNAL_SERVICE_TOKEN` | - | Internal service authentication |

---

## Tech Stack

- Node.js 20+
- Express.js
- TypeScript
- Zod (validation)

---

## Integration Points

| Service | Port | Purpose |
|---------|------|---------|
| SUTAR Gateway | 4140 | API Gateway |
| SADA Federation | - | Cross-network trust |
| REZ Intel | - | Context enrichment |

---

**Last Updated:** 2026-06-28
