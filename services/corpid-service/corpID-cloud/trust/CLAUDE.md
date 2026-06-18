# Trust Engine

**Service:** Risk Assessment & Fraud Detection
**Port:** 4702 (via gateway)
**Prefix:** `/api/trust`

---

## Overview

The Trust Engine provides real-time risk scoring and fraud detection for all identity-related actions. It calculates composite trust scores and makes risk-based access decisions.

## Features

- **5-Component Trust Score:** Identity, behavior, device, transaction, history
- **Risk Checks:** Real-time action evaluation
- **Automatic Decisions:** Allow, challenge, or deny
- **Fraud Flags:** New IP, VPN, Tor, velocity, etc.
- **Anomaly Detection:** Record and track anomalies
- **MFA Challenges:** Automatic challenge requirements
- **Trust History:** Track score changes over time
- **Weighted Scoring:** Configurable component weights

## Trust Score Components

| Component | Weight | Description |
|-----------|--------|-------------|
| Identity | 25% | Verification, KYC, MFA |
| Behavior | 25% | Activity patterns |
| Device | 15% | Device trust, location |
| Transaction | 20% | Financial history |
| History | 15% | Account age, violations |

## Trust Grades

| Score | Grade | Risk Level |
|-------|-------|------------|
| 80-100 | very_high | low |
| 60-79 | high | medium |
| 40-59 | medium | high |
| 20-39 | low | critical |
| 0-19 | very_low | critical |

## Risk Decision Levels

| Risk Score | Level | Decision | Challenge |
|------------|-------|----------|-----------|
| 0-29 | low | allow | none |
| 30-59 | medium | challenge | MFA |
| 60-79 | high | challenge | MFA + phone |
| 80-100 | critical | deny | blocked |

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/trust/me` | Get my trust score |
| POST | `/api/trust/evaluate` | Evaluate my trust |
| GET | `/api/trust/user/:userId` | Get user trust (admin) |
| POST | `/api/trust/user/:userId/evaluate` | Evaluate user trust (admin) |
| POST | `/api/trust/risk-check` | Perform risk check |
| GET | `/api/trust/risk-checks` | Get risk check history |
| POST | `/api/trust/anomalies` | Record anomaly |
| GET | `/api/trust/anomalies` | Get anomalies |
| GET | `/api/trust/stats` | Statistics (admin) |

## Usage Example

```bash
# Get my trust score
curl http://localhost:4702/api/trust/me \
  -H "Authorization: Bearer $TOKEN"

# Perform risk check
curl -X POST http://localhost:4702/api/trust/risk-check \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "action": "login",
    "context": {
      "newIp": true,
      "vpn": true,
      "unusualLocation": true
    }
  }'
```

Response:
```json
{
  "success": true,
  "check": {
    "riskLevel": "high",
    "riskScore": 60,
    "decision": "challenge",
    "fraudFlags": ["new_ip", "vpn", "unusual_location"],
    "challenges": [
      { "type": "mfa", "required": true, "completed": false },
      { "type": "phone_verification", "required": true, "completed": false }
    ]
  }
}
```

## Risk Factors Detected

| Factor | Score Impact |
|--------|--------------|
| New IP | +20 |
| New Device | +15 |
| Unusual Time | +10 |
| Unusual Location | +25 |
| VPN | +15 |
| Tor Network | +50 |
| High Value Transaction | +20 |
| Velocity Exceeded | +30 |

## File Structure

```
trust/
├── src/
│   ├── models/
│   │   └── trust.model.js
│   └── routes/
│       └── trust.routes.js
└── CLAUDE.md
```
