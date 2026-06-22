# SADA - Trust, Governance & Risk Platform

**Version:** 1.0 | **Port:** 4190

---

## What is SADA?

**SADA** is the unified Trust, Governance, and Risk platform for the RTMN ecosystem.

```
SADA = Trust + Governance + Risk + Verification
```

### Position in RTMN

```
CorpID
   │
SADA
   │
MemoryOS
   │
TwinOS
   │
Sutar OS
```

---

## Modules

### 1. Trust Score

Track trust scores for entities:
- Humans (employees, customers)
- Agents (AI employees)
- Businesses (companies, merchants)
- Products (services)

### 2. Governance

Policy engine for:
- Policy creation and management
- Rule-based compliance
- Audit trails

### 3. Risk Assessment

Risk scoring for:
- Credit risk
- Operational risk
- Fraud risk

### 4. Verification

KYC/KYB for:
- Identity verification
- Business verification
- Agent verification

---

## Quick Start

```bash
cd Sada-os
npm install
npm run dev  # Port 4190

# Health check
curl http://localhost:4190/health
```

---

## API Reference

### Trust

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/trust` | Calculate trust score |
| GET | `/trust/:entityId` | Get trust score |
| POST | `/trust/:entityId/activity` | Record activity |

### Governance

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/governance/policies` | List policies |
| POST | `/governance/policies` | Create policy |
| POST | `/governance/validate` | Validate action |

### Risk

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/risk/assess` | Assess risk |
| GET | `/risk/:entityId` | Get risk assessment |

### Verification

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/verification` | Submit verification |
| GET | `/verification/:entityId` | Get verification status |
| POST | `/verification/:id/approve` | Approve verification |

---

## Example: Calculate Trust Score

```bash
curl -X POST http://localhost:4190/trust \
  -H "Content-Type: application/json" \
  -d '{
    "entityId": "CI-AGT-001",
    "factors": {
      "reliability": 0.9,
      "quality": 0.85
    }
  }'
```

---

## Example: Assess Risk

```bash
curl -X POST http://localhost:4190/risk/assess \
  -H "Content-Type: application/json" \
  -d '{
    "entityId": "CI-BIZ-001",
    "entityType": "BUSINESS",
    "factors": [
      {"name": "payment_history", "contribution": 20},
      {"name": "transaction_volume", "contribution": 15}
    ]
  }'
```

---

## Environment Variables

```bash
PORT=4190
INTERNAL_TOKEN=sada-internal-token
SALAR_SERVICE_URL=http://localhost:4710
CORPID_SERVICE_URL=http://localhost:4702
```

---

**SADA v1.0 | June 10, 2026**
