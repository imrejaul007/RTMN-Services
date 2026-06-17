# Trust Intelligence Service

**Version:** 1.0.0  
**Port:** 4953  
**Status:** Ready for Development

---

## Overview

Trust Intelligence Service calculates and manages trust scores for entities across the RTMN ecosystem. It provides comprehensive trust evaluation, verification management, fraud detection, and risk flagging capabilities.

## Features

### Trust Score Management
- Calculate trust scores (0-100) based on multiple factors
- Support for 6 entity types: customer, merchant, agent, vendor, partner, device
- Real-time score updates with historical tracking
- Trust level classification: critical, low, medium, high, excellent
- Multi-tenant support

### Score Factors
| Factor | Weight | Description |
|--------|--------|-------------|
| Transaction Reliability | 30% | Based on transaction history and patterns |
| Verification Status | 25% | KYC, document, biometric verification |
| Behavioral Pattern | 20% | User behavior analysis |
| Historical Behavior | 15% | Past trust history |
| Network Trust | 10% | Linked entity trust influence |
| Risk Indicators | Variable | Dynamic penalty from risk flags |
| Compliance Score | Variable | Compliance record |

### Verification Methods
- **KYC**: Full identity verification
- **Document**: ID document verification
- **Biometric**: Fingerprint, face recognition
- **Bank**: Bank account verification
- **Email**: Email address verification
- **Phone**: Phone number verification
- **Social**: Social media verification

### Verification Levels
| Level | Score Range | Description |
|-------|-------------|-------------|
| None | 0 | No verification |
| Basic | 1-20 | Single basic method |
| Standard | 21-50 | Multiple methods |
| Enhanced | 51-70 | Comprehensive verification |
| Full | 71-100 | Complete KYC + biometric |

### Risk Flags
12 flag types for fraud detection:
- suspicious_transaction
- unusual_pattern
- address_mismatch
- velocity_exceeded
- geo_anomaly
- device_mismatch
- identity_discrepancy
- fraud_report
- chargeback
- policy_violation
- compliance_risk
- link_to_flagged

### Fraud Detection
- Transaction velocity monitoring
- Geo-location anomaly detection
- Device fingerprinting
- Linked entity risk propagation
- Pattern matching against known fraud

### Entity Linking
- Link related entities (parent, child, sibling, related)
- Cross-entity trust influence
- Same-entity resolution
- Entity merging capabilities

---

## API Endpoints

### Trust Score

```
GET  /api/score/:entityId/:entityType     - Get trust score
POST /api/score/calculate                  - Calculate trust score
PUT  /api/score                            - Update trust score
GET  /api/score/:entityId/:entityType/trend - Get trust trend
GET  /api/score/bulk                       - Get bulk scores
```

### Verification

```
POST /api/verify                           - Initiate verification
GET  /api/verify/:entityId/:entityType     - Get verifications
GET  /api/verify/id/:verificationId        - Get verification by ID
GET  /api/verify/:entityId/:entityType/level - Get verification level
POST /api/verify/:verificationId/revoke    - Revoke verification
POST /api/verify/expire                    - Expire old verifications
```

### Risk Flags

```
POST /api/flags                            - Create risk flag
GET  /api/flags/:entityId/:entityType       - Get entity flags
GET  /api/flags/id/:flagId                  - Get flag by ID
POST /api/flags/:flagId/resolve             - Resolve flag
POST /api/flags/:flagId/dismiss             - Dismiss flag
POST /api/flags/:flagId/escalate            - Escalate flag
POST /api/flags/analyze                     - Analyze transaction
GET  /api/flags/stats                       - Get flag statistics
```

### Health & Info

```
GET /health                                - Health check
GET /api/info                               - Service info
```

---

## Quick Start

```bash
# Install dependencies
cd services/trust-intelligence
npm install

# Build TypeScript
npm run build

# Start service
npm start

# Or development mode
npm run dev
```

### Health Check

```bash
curl http://localhost:4953/health
```

### Get Trust Score

```bash
curl http://localhost:4953/api/score/customer-123/customer
```

### Calculate Trust Score

```bash
curl -X POST http://localhost:4953/api/score/calculate \
  -H "Content-Type: application/json" \
  -d '{
    "entityId": "customer-123",
    "entityType": "customer",
    "factors": {
      "transactionReliability": 85,
      "verificationStatus": 70,
      "behavioralPattern": 90
    }
  }'
```

### Initiate Verification

```bash
curl -X POST http://localhost:4953/api/verify \
  -H "Content-Type: application/json" \
  -d '{
    "entityId": "customer-123",
    "entityType": "customer",
    "method": "email",
    "data": {
      "email": "user@example.com"
    }
  }'
```

### Create Risk Flag

```bash
curl -X POST http://localhost:4953/api/flags \
  -H "Content-Type: application/json" \
  -d '{
    "entityId": "customer-123",
    "entityType": "customer",
    "type": "velocity_exceeded",
    "severity": "high",
    "description": "Transaction velocity exceeds threshold",
    "evidence": [
      {
        "type": "transaction",
        "data": { "velocity": 15 },
        "timestamp": "2026-06-16T10:00:00Z",
        "source": "fraud_detector"
      }
    ]
  }'
```

### Analyze Transaction

```bash
curl -X POST http://localhost:4953/api/flags/analyze \
  -H "Content-Type: application/json" \
  -d '{
    "entityId": "customer-123",
    "entityType": "customer",
    "amount": 5000,
    "velocity": 12,
    "deviceId": "device-abc"
  }'
```

---

## Configuration

Environment variables in `.env`:

| Variable | Default | Description |
|----------|---------|-------------|
| PORT | 4953 | Service port |
| MONGODB_URI | mongodb://localhost:27017/trust_intelligence | MongoDB connection |
| SERVICE_NAME | trust-intelligence | Service name |
| SERVICE_VERSION | 1.0.0 | Service version |
| LOG_LEVEL | info | Logging level |

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Trust Intelligence                         │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐         │
│  │  Score API  │  │ Verify API  │  │  Flags API  │         │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘         │
│         │                 │                 │                │
│  ┌──────▼─────────────────▼─────────────────▼──────┐         │
│  │              Service Layer                       │         │
│  │  ┌─────────────┐ ┌─────────────┐ ┌──────────┐│         │
│  │  │ScoreCalculator│ │Verification │ │FraudDetect││         │
│  │  └─────────────┘ └─────────────┘ └──────────┘│         │
│  │  ┌─────────────┐                               │         │
│  │  │EntityResolver│                               │         │
│  │  └─────────────┘                               │         │
│  └──────────────────────────────────────────────────┘         │
│         │                 │                 │                │
│  ┌──────▼─────────────────▼─────────────────▼──────┐         │
│  │                   MongoDB                        │         │
│  │  ┌──────────┐ ┌─────────────┐ ┌──────────┐    │         │
│  │  │TrustScore│ │ Verification │ │RiskFlags │    │         │
│  │  └──────────┘ └─────────────┘ └──────────┘    │         │
│  └──────────────────────────────────────────────────┘         │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## Models

### TrustScore
- `entityId`, `entityType`, `tenantId`: Entity identification
- `score`: 0-100 trust score
- `level`: critical/low/medium/high/excellent
- `factors`: Individual factor scores
- `breakdown`: Score calculation breakdown
- `history`: Score change history
- `linkedEntities`: Related entity links
- `riskFlags`: Active risk flags

### Verification
- `entityId`, `entityType`, `tenantId`: Entity identification
- `method`: Verification method used
- `status`: pending/in_progress/verified/rejected/expired
- `level`: Verification level achieved
- `score`: Verification quality score
- `documents`: Submitted documents
- `attempts`: Verification attempts

### RiskFlag
- `entityId`, `entityType`, `tenantId`: Entity identification
- `type`: Flag type
- `severity`: low/medium/high/critical
- `status`: active/resolved/dismissed/escalated
- `evidence`: Supporting evidence
- `resolvedAt`, `resolvedBy`: Resolution info

---

## Integration

Connect to other RTMN services:

```javascript
// Get trust score
const trustScore = await fetch('http://localhost:4953/api/score/${entityId}/${entityType}');

// Trigger verification
await fetch('http://localhost:4953/api/verify', {
  method: 'POST',
  body: JSON.stringify({ entityId, entityType, method: 'kyc', data: {...} })
});

// Check fraud risk
const analysis = await fetch('http://localhost:4953/api/flags/analyze', {
  method: 'POST',
  body: JSON.stringify({ entityId, entityType, amount, velocity })
});
```

---

## Metrics

Monitor these metrics:
- `trust_score_distribution`: Score buckets (0-25, 26-50, 51-75, 76-100)
- `verification_success_rate`: Successful verifications / total
- `risk_flag_count`: Active flags by type and severity
- `fraud_detection_rate`: Suspicious transactions detected

---

*Last Updated: June 16, 2026*
