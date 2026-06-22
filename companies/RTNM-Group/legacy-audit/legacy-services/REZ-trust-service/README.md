# REZ-trust-service

> Trust Score Management Service
> **Status:** TODO - Implementation Required

---

## Overview

REZ-trust-service manages trust scores for users and merchants across the ReZ platform.

## Features

- [ ] Trust score calculation
- [ ] Trust level assignment
- [ ] Trust decay over time
- [ ] Trust boost for verified actions
- [ ] Trust penalty for violations

## Trust Levels

| Level | Score Range | Description |
|-------|-------------|-------------|
| VERY_HIGH | 90-100 | Trusted user |
| HIGH | 75-89 | Verified user |
| MEDIUM | 50-74 | Standard user |
| LOW | 25-49 | Under review |
| VERY_LOW | 0-24 | Flagged user |

## API Endpoints

### Trust Score

```
GET /api/v1/trust/:userId
POST /api/v1/trust/:userId/calculate
POST /api/v1/trust/:userId/boost
POST /api/v1/trust/:userId/penalty
```

### Trust History

```
GET /api/v1/trust/:userId/history
GET /api/v1/trust/:userId/events
```

## Implementation Guide

```typescript
// TODO: Implement trust score calculation
async function calculateTrustScore(userId: string): Promise<TrustScore> {
  // Factors:
  // - Identity verification (+10)
  // - KYC completed (+20)
  // - Payment history (+30)
  // - Order count (+20)
  // - Response rate (+10)
  // - Reports (-50)
}
```

## Database Schema

```typescript
interface TrustScore {
  userId: string;
  score: number;           // 0-100
  level: TrustLevel;
  factors: {
    identityVerification: number;
    kycStatus: number;
    paymentHistory: number;
    orderCount: number;
    responseRate: number;
    reports: number;
  };
  lastCalculated: Date;
  nextDecayDate: Date;
}
```

## Environment Variables

```bash
MONGODB_URI=mongodb://...
REDIS_URL=redis://...
```

## TODO

- [ ] Create src/index.ts
- [ ] Create src/models/trust.model.ts
- [ ] Create src/services/trust.service.ts
- [ ] Add API endpoints
- [ ] Add tests
- [ ] Configure render.yaml

---

**Created:** 2026-05-13
**Status:** Not Implemented
