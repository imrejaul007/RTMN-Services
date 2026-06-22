# CLAUDE.md - Sutar Decision Engine

## Project Overview

**Name:** sutar-decision-engine
**Type:** SUTAR OS Service
**Port:** 4290 (renumbered 2026-06-22; was 4240)
**Description:** Decision Engine - Policy and risk evaluation
**Company:** HOJAI AI
**Product:** SUTAR OS

## Tech Stack

- Node.js 20+
- Express.js
- TypeScript
- Zod (validation)

## Commands

| Command | Description |
|---------|-------------|
| `npm install` | Install dependencies |
| `npm run dev` | Development server (watch mode) |
| `npm run build` | Build for production |
| `npm start` | Production server |
| `npm test` | Run unit tests (vitest) |
| `npm run test:watch` | Run tests in watch mode |

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| PORT | No | 4290 | Service port (renumbered 2026-06-22) |
| NODE_ENV | No | development | Environment |
| LOG_LEVEL | No | info | Logging level |
| SIMULATION_OS_URL | No | http://localhost:4241 | SimulationOS endpoint for what-if |

## Features

| Feature | Status | Notes |
|---------|--------|-------|
| Policy check | Implemented | Rule-based, 10 decision types, AND/OR logic |
| Risk assessment | Implemented | 4 categories: behavioral, transactional, historical, contextual |
| Authorization | Implemented | Bearer token via `@rtmn/shared/auth` |
| Proceed/Hold/Reject | Implemented | Single-decision mode |
| Multi-option ranking | **Phase B.2** | `POST /api/v1/rank` — score 2+ options across cost/time/risk/trust |

## API Endpoints

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| GET | `/health` | public | Basic liveness |
| GET | `/health/ready` | public | Readiness (includes ranker self-test) |
| GET | `/health/live` | public | Liveness |
| GET | `/api/v1/info` | public | Service info + endpoint catalog |
| POST | `/api/v1/decide` | required | Single-decision PROCEED/HOLD/REJECT |
| POST | `/api/v1/decide/simulate` | required | What-if simulation (uses SimulationOS) |
| POST | `/api/v1/rank` | required | **Multi-option ranking (Phase B.2)** |
| GET | `/api/v1/policies` | public | List all default policies |
| GET | `/api/v1/policies/:decisionType` | public | Get a specific policy |
| GET | `/api/v1/stats` | public | Decision statistics |
| POST | `/api/v1/stats/reset` | required | Reset statistics |
| POST | `/api/v1/risk/assess` | required | Direct risk assessment |
| POST | `/api/v1/intent` | required | Legacy intent hook |
| POST | `/api/v1/event` | required | Legacy event hook |

## Multi-Option Ranking (Phase B.2)

Given 2+ options scored on 4 dimensions, return a ranked list with per-dimension
breakdowns and a confidence score.

### Dimensions

| Dim | Direction | Notes |
|-----|-----------|-------|
| `cost` | lower is better | Currency-agnostic units |
| `time` | lower is better | Caller's unit (seconds, minutes, etc.) |
| `risk` | lower is better | 0..100, 100 = critical |
| `trust` | higher is better | 0..100, 100 = complete trust |

### Algorithm

1. Normalize each dimension to [0, 1] using min-max normalization across options.
2. Invert cost/time/risk so 1 = best on every dimension.
3. Weighted sum, normalized to sum=1 across the dimensions that actually have data.
4. Sort descending; tie-break by id.
5. Confidence = `min(1, spread * 1.5)` where spread = top.score - bottom.score.

### Default Weights

```ts
{ cost: 0.30, time: 0.20, risk: 0.30, trust: 0.20 }
```

### Request Example

```bash
curl -X POST http://localhost:4240/api/v1/rank \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "options": [
      { "id": "supplier-a", "name": "Bharat Grocers", "cost": 4500, "time": 86400, "risk": 25, "trust": 85 },
      { "id": "supplier-b", "name": "Kumar Wholesale", "cost": 4200, "time": 172800, "risk": 40, "trust": 60 },
      { "id": "supplier-c", "name": "Premium Foods",  "cost": 5500, "time": 43200, "risk": 15, "trust": 95 }
    ]
  }'
```

### Response Shape

```ts
{
  success: true,
  data: {
    id: "uuid",
    ranked: [
      { id, name, rank: 1, score: 0.85, breakdown: { cost: {raw, normalized, weight, contribution}, ... }, metadata }
    ],
    winner: { id, name, rank: 1, score: 0.85, ... },
    confidence: 0.6,
    dimensionsUsed: ['cost', 'time', 'risk', 'trust'],
    processingTimeMs: 4,
    weights: { cost: 0.30, time: 0.20, risk: 0.30, trust: 0.20 }
  }
}
```

### Tests

21 unit tests in `__tests__/unit/optionRanker.test.ts` cover:
- Basic ranking with 3+ options
- Default vs custom weights
- Per-dimension normalization, inversion, contribution
- Missing dimensions per option and across all options
- All-equal values (zero confidence)
- Determinism across repeated calls
- Confidence bounds
- Input validation (array, id, min count)

## Architecture

This service follows the SUTAR OS 12-layer canonical architecture.

## Integration

### Upstream Services
- SUTAR Gateway (4140)
- SUTAR Intent Bus (4154)

### Downstream Services
- HOJAI Memory (4520)
- RABTUL Services (4001-4005)
- SimulationOS (4241) — used by `/api/v1/decide/simulate`

---

**Last Updated:** 2026-06-22
