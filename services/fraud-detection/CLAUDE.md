# Fraud Detection Service

**Version:** 1.0.0
**Port:** 4985
**Status:** Production Ready

Real-time fraud detection engine for the RTMN ecosystem. Scans transactions for fraudulent patterns, calculates risk scores, and integrates with Customer Operations and Trust Twins.

---

## Quick Start

```bash
cd /Users/rejaulkarim/Documents/RTMN/services/fraud-detection

# Install dependencies
npm install

# Start service
npm start

# Or development mode
npm run dev
```

Health check: `http://localhost:4985/health`

---

## Architecture

```
                    ┌─────────────────────────┐
                    │   Fraud Detection        │
                    │   Service (4985)         │
                    └───────────┬─────────────┘
                                │
        ┌───────────────────────┼───────────────────────┐
        │                       │                       │
        ▼                       ▼                       ▼
┌───────────────┐    ┌─────────────────┐    ┌─────────────────┐
│ FraudDetector │    │  RiskScorer     │    │ PatternMatcher  │
│               │    │                 │    │                 │
│ - Pattern eval│    │ - Score calc    │    │ - Condition eval│
│ - Context     │    │ - Thresholds    │    │ - Confidence    │
└───────────────┘    └─────────────────┘    └─────────────────┘
                                │
              ┌─────────────────┼─────────────────┐
              │                 │                 │
              ▼                 ▼                 ▼
      ┌───────────┐    ┌───────────────┐    ┌───────────────┐
      │CustomerOps│    │  TwinSync     │    │  Alert Store  │
      │ Bridge     │    │               │    │               │
      │            │    │               │    │               │
      └───────────┘    └───────────────┘    └───────────────┘
```

---

## API Endpoints

### Fraud Check

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/check/transaction` | Real-time fraud check |
| POST | `/api/check/batch` | Batch fraud check (max 100) |
| GET | `/api/check/history/:customerId` | Customer check history |
| GET | `/api/check/stats` | Check statistics |

### Alerts

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/alerts` | List alerts (filterable) |
| GET | `/api/alerts/:id` | Get specific alert |
| POST | `/api/alerts` | Create alert manually |
| PATCH | `/api/alerts/:id` | Update alert |
| POST | `/api/alerts/:id/resolve` | Resolve alert |
| GET | `/api/alerts/stats/summary` | Alert statistics |
| GET | `/api/alerts/export` | Export alerts (CSV/JSON) |

### Patterns

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/patterns` | List patterns |
| GET | `/api/patterns/:id` | Get pattern |
| POST | `/api/patterns` | Create pattern |
| PUT | `/api/patterns/:id` | Update pattern |
| PATCH | `/api/patterns/:id` | Partial update |
| DELETE | `/api/patterns/:id` | Delete pattern |
| POST | `/api/patterns/:id/enable` | Enable pattern |
| POST | `/api/patterns/:id/disable` | Disable pattern |
| POST | `/api/patterns/reset` | Reset to defaults |

---

## Transaction Check Request

```json
{
  "transactionId": "TXN-123456",
  "customerId": "CUST-001",
  "merchantId": "MERCH-001",
  "amount": 1500.00,
  "currency": "USD",
  "type": "payment",
  "channel": "web",
  "metadata": {
    "deviceId": "DEV-001",
    "ip": "192.168.1.1",
    "authenticated": true,
    "authMethod": "password",
    "cardPresent": false,
    "threeDSecure": true,
    "customerTenureDays": 365
  }
}
```

## Transaction Check Response

```json
{
  "transactionId": "TXN-123456",
  "allowed": true,
  "status": "approved",
  "riskAssessment": {
    "score": 45,
    "level": "medium",
    "blockAction": "flag",
    "factors": [...],
    "matchedPatterns": ["pattern-1"],
    "recommendations": [...],
    "assessedAt": "2026-06-16T10:30:00Z",
    "processingTimeMs": 25
  },
  "processingTimeMs": 45,
  "timestamp": "2026-06-16T10:30:00Z",
  "actions": [
    { "type": "flag", "reason": "Medium risk", "severity": "medium" }
  ]
}
```

---

## Risk Scoring

| Score Range | Risk Level | Action |
|-------------|------------|--------|
| 0-24 | LOW | Allow |
| 25-49 | MEDIUM | Allow with flag |
| 50-74 | HIGH | Review required |
| 75-100 | CRITICAL | Auto-block (if enabled) |

### Configurable Thresholds (via .env)

```
HIGH_RISK_THRESHOLD=75
MEDIUM_RISK_THRESHOLD=50
LOW_RISK_THRESHOLD=25
AUTO_BLOCK_ENABLED=true
AUTO_BLOCK_THRESHOLD=90
```

---

## Fraud Patterns

### Default Patterns

| Pattern | Type | Weight | Description |
|---------|------|--------|-------------|
| High Velocity | velocity | 30 | 5+ transactions in 5 min |
| High Amount | amount_anomaly | 35 | 3x std deviation + >$1000 |
| Rapid Fire | velocity | 25 | 3+ transactions in 1 min |
| Night Owl | time_based | 15 | Transactions 1AM-5AM |
| New Device | device_fingerprint | 20 | Unknown device |
| Unusual Location | geo_anomaly | 25 | Different from usual |
| Same Merchant | behavioral | 20 | 2+ to same merchant in 3 min |
| Network Fraud | network | 40 | Connected to fraud ring |

### Pattern Types

- `velocity` - Rapid transaction patterns
- `amount_anomaly` - Unusual amounts
- `geo_anomaly` - Location anomalies
- `device_fingerprint` - Unknown devices
- `behavioral` - Unusual behavior
- `network` - Fraud ring connections
- `time_based` - Timing anomalies
- `custom` - User-defined patterns

---

## Integrations

### Customer Operations Bridge

Notifies Customer Operations team of:
- High-risk transactions (score >= 90)
- Fraud alerts created
- Alert resolutions
- Account blocks/unblocks

Endpoints:
- `POST /api/customer-operations/high-risk`
- `POST /api/customer-operations/alerts`
- `POST /api/customer-operations/resolution`
- `POST /api/customer-operations/block`

### Trust Twin Sync

Syncs fraud data to digital twins:
- Customer risk scores
- Trust levels
- Fraud patterns
- Alert history

Endpoints:
- `POST /api/twins/risk-score`
- `POST /api/twins/patterns`
- `POST /api/twins/alerts`
- `PATCH /api/twins/customer/:id`

---

## Environment Variables

```bash
# Service
PORT=4985
NODE_ENV=development

# Integration
SERVICE_REGISTRY_URL=http://localhost:4399
CUSTOMER_OPS_URL=http://localhost:4399/api/customer-operations
TWIN_OS_URL=http://localhost:4705
EVENT_BUS_URL=http://localhost:4510

# Risk Thresholds
HIGH_RISK_THRESHOLD=75
MEDIUM_RISK_THRESHOLD=50
LOW_RISK_THRESHOLD=25
AUTO_BLOCK_ENABLED=true
AUTO_BLOCK_THRESHOLD=90

# Pattern Matching
VELOCITY_WINDOW_MS=600000
VELOCITY_THRESHOLD=5
AMOUNT_DEVIATION_MULTIPLIER=3

# Logging
LOG_LEVEL=info
```

---

## Data Models

### FraudAlert

```typescript
interface FraudAlert {
  id: string;
  transactionId: string;
  patternId: string;
  patternName: string;
  severity: 'info' | 'warning' | 'error' | 'critical';
  status: 'pending' | 'investigating' | 'confirmed' | 'false_positive' | 'resolved';
  riskScore: number;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  blockAction: 'none' | 'flag' | 'review' | 'block' | 'auto_block';
  customerId: string;
  merchantId: string;
  amount: number;
  currency: string;
  description: string;
  details: AlertDetail[];
  createdAt: Date;
  updatedAt: Date;
  resolvedAt?: Date;
  resolvedBy?: string;
}
```

### FraudPattern

```typescript
interface FraudPattern {
  id: string;
  name: string;
  type: FraudPatternType;
  description: string;
  enabled: boolean;
  weight: number; // 0-100
  conditions: PatternCondition[];
  createdAt: Date;
  updatedAt: Date;
}

interface PatternCondition {
  field: string;
  operator: 'eq' | 'neq' | 'gt' | 'lt' | 'gte' | 'lte' | 'contains' | 'regex' | 'in' | 'between';
  value: unknown;
  secondaryValue?: unknown;
}
```

---

## Stats & Monitoring

```bash
# Service health
curl http://localhost:4985/health

# Check statistics
curl http://localhost:4985/api/check/stats

# Alert statistics
curl http://localhost:4985/api/alerts/stats/summary
```

---

## Testing

```bash
# Check a transaction
curl -X POST http://localhost:4985/api/check/transaction \
  -H "Content-Type: application/json" \
  -d '{
    "transactionId": "TXN-TEST-001",
    "customerId": "CUST-001",
    "merchantId": "MERCH-001",
    "amount": 500,
    "currency": "USD",
    "type": "payment",
    "channel": "web",
    "metadata": {
      "authenticated": true,
      "customerTenureDays": 100
    }
  }'
```

---

## Files

```
fraud-detection/
├── package.json
├── tsconfig.json
├── .env.example
├── CLAUDE.md
└── src/
    ├── index.ts              # Express server
    ├── models/
    │   ├── Fraud.ts          # Fraud patterns, alerts
    │   └── Transaction.ts    # Transaction models
    ├── routes/
    │   ├── check.ts          # Fraud check endpoints
    │   ├── alerts.ts         # Alert management
    │   └── patterns.ts       # Pattern management
    └── services/
        ├── detector.ts       # Core fraud detection
        ├── riskscorer.ts     # Risk scoring
        ├── patterns.ts       # Pattern matching
        ├── customerOpsBridge.ts  # Customer Ops integration
        └── twinSync.ts       # Trust Twin sync
```

---

*Last Updated: June 16, 2026*
