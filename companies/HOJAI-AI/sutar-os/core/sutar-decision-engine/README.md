# SUTAR Decision Engine

> **AI-powered policy decisions with risk assessment and multi-option ranking**

**Port:** 4290
**Layer:** 4 (Decision + Execution)
**Package:** `@hojai/sutar-decision-engine`

## Overview

The Decision Engine is the brain of SUTAR OS. It provides:
- Policy-based decision making with configurable rules
- Risk assessment for autonomous agent actions
- Multi-option ranking across cost, time, risk, and trust dimensions
- What-if simulation for scenario analysis

## Quick Start

```bash
cd sutar-os/core/sutar-decision-engine
npm install
npm run dev
# Service runs on http://localhost:4290
```

## Features

| Feature | Status |
|---------|--------|
| Policy decision | ✅ Implemented |
| Risk assessment | ✅ Implemented |
| Multi-option ranking | ✅ Implemented |
| What-if simulation | ✅ Implemented |
| REZ Intel enrichment | ✅ Implemented |

---

## API Examples

### Health Check

```bash
curl http://localhost:4290/health
```

Response:
```json
{
  "status": "ok",
  "service": "sutar-decision-engine",
  "sutarLayer": 4,
  "port": 4290,
  "counts": {
    "decisions": 47,
    "policies": 5,
    "simulations": 3
  },
  "timestamp": "2026-06-28T12:00:00.000Z"
}
```

### Readiness Probe

```bash
curl http://localhost:4290/ready
```

Response:
```json
{
  "ready": true,
  "simulationOSHealthy": true,
  "timestamp": "2026-06-28T12:00:00.000Z"
}
```

### Get Service Info

```bash
curl http://localhost:4290/api/v1/info
```

Response:
```json
{
  "service": "sutar-decision-engine",
  "version": "1.0.0",
  "sutarLayer": 4,
  "port": 4290,
  "features": [
    "policy-decision",
    "risk-assessment",
    "multi-option-ranking",
    "what-if-simulation",
    "intent-enrichment"
  ]
}
```

### Make a Policy Decision

```bash
curl -X POST http://localhost:4290/api/v1/decide \
  -H "Content-Type: application/json" \
  -d '{
    "decisionType": "negotiation_start",
    "context": {
      "agentId": "agent-restaurant-001",
      "dealValue": 5000,
      "counterpartType": "merchant",
      "urgency": "normal"
    }
  }'
```

Response:
```json
{
  "decisionId": "dec_abc123",
  "decisionType": "negotiation_start",
  "result": "proceed",
  "riskLevel": "low",
  "riskScore": 0.25,
  "confidence": 0.92,
  "recommendations": ["start_negotiation", "set_batna"],
  "timestamp": "2026-06-28T12:00:00.000Z"
}
```

### Rank Multiple Options

```bash
curl -X POST http://localhost:4290/api/v1/rank \
  -H "Content-Type: application/json" \
  -d '{
    "options": [
      { "id": "opt1", "name": "Negotiate", "cost": 500, "time": 48, "risk": 0.3, "trust": 0.8 },
      { "id": "opt2", "name": "Accept Terms", "cost": 0, "time": 1, "risk": 0.7, "trust": 0.5 },
      { "id": "opt3", "name": "Walk Away", "cost": 0, "time": 0, "risk": 0.1, "trust": 0.9 }
    ],
    "weights": { "cost": 0.3, "time": 0.2, "risk": 0.3, "trust": 0.2 }
  }'
```

Response:
```json
{
  "rankings": [
    { "id": "opt1", "name": "Negotiate", "score": 0.82, "rank": 1 },
    { "id": "opt3", "name": "Walk Away", "score": 0.75, "rank": 2 },
    { "id": "opt2", "name": "Accept Terms", "score": 0.58, "rank": 3 }
  ],
  "weights": { "cost": 0.3, "time": 0.2, "risk": 0.3, "trust": 0.2 },
  "timestamp": "2026-06-28T12:00:00.000Z"
}
```

### What-If Simulation

```bash
curl -X POST http://localhost:4290/api/v1/decide/simulate \
  -H "Content-Type: application/json" \
  -d '{
    "decisionType": "pricing_strategy",
    "baseline": { "price": 100, "volume": 1000 },
    "variations": [
      { "price": 90, "volume": 1500 },
      { "price": 110, "volume": 800 }
    ]
  }'
```

Response:
```json
{
  "simulationId": "sim_xyz789",
  "baseline": { "price": 100, "volume": 1000, "revenue": 100000 },
  "variations": [
    { "price": 90, "volume": 1500, "revenue": 135000, "change": "+35%" },
    { "price": 110, "volume": 800, "revenue": 88000, "change": "-12%" }
  ],
  "recommended": "variation_0",
  "confidence": 0.87
}
```

### List All Policies

```bash
curl http://localhost:4290/api/v1/policies
```

Response:
```json
{
  "count": 5,
  "policies": [
    {
      "decisionType": "negotiation_start",
      "rules": ["risk_threshold", "value_limit"],
      "autoApproveBelow": 1000
    },
    {
      "decisionType": "contract_sign",
      "rules": ["risk_threshold", "legal_review"],
      "autoApproveBelow": 5000
    }
  ]
}
```

### Get Decision Statistics

```bash
curl http://localhost:4290/api/v1/stats
```

Response:
```json
{
  "totalDecisions": 47,
  "decisionsByType": {
    "negotiation_start": 23,
    "contract_sign": 12,
    "pricing_strategy": 8,
    "risk_accept": 4
  },
  "decisionsByResult": {
    "proceed": 35,
    "hold": 8,
    "reject": 4
  },
  "avgRiskScore": 0.32,
  "period": "24h"
}
```

### Direct Risk Assessment

```bash
curl -X POST http://localhost:4290/api/v1/risk/assess \
  -H "Content-Type: application/json" \
  -d '{
    "entityId": "merchant-001",
    "action": "sign_contract",
    "value": 25000,
    "context": {
      "industry": "restaurant",
      "creditScore": 720,
      "paymentHistory": "good"
    }
  }'
```

Response:
```json
{
  "riskLevel": "medium",
  "riskScore": 0.45,
  "factors": [
    { "name": "dealValue", "impact": 0.15, "direction": "negative" },
    { "name": "creditScore", "impact": -0.1, "direction": "positive" }
  ],
  "recommendations": ["require_approval", "verify_references"]
}
```

---

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | 4290 | Service port |
| `NODE_ENV` | development | Environment (development/production) |
| `SIMULATION_OS_URL` | http://localhost:4241 | Simulation OS URL |
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
| Simulation OS | 4241 | What-if scenarios |
| REZ Intel | - | Context enrichment |

---

**Last Updated:** 2026-06-28
