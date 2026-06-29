# Life Simulation

**Version:** 1.0.0
**Port:** 4752
**Status:** ✅ COMPLETE (Week 17-18)

## Overview

"What if I move to Dubai?" — Genie simulates life scenarios with timeline, impacts, and risks.

## API Endpoints

```
POST /api/simulation/run              # Run what-if
GET  /api/simulation/:scenarioId     # Get saved scenario
```

## Quick Start

```bash
# Simulate moving to Dubai
curl -X POST http://localhost:4752/api/simulation/run \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "user_123",
    "scenario": "What if I move to Dubai?",
    "parameters": {"destination": "Dubai"}
  }'

# Simulate hiring
curl -X POST http://localhost:4752/api/simulation/run \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "user_123",
    "scenario": "What if I hire 3 people?",
    "parameters": {"headcount": 3}
  }'

# Simulate savings
curl -X POST http://localhost:4752/api/simulation/run \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "user_123",
    "scenario": "What if I save 50K/month for 5 years?",
    "parameters": {"monthlyAmount": 50000, "months": 60}
  }'
```

## Scenario Types

| Scenario | What It Simulates |
|----------|------------------|
| **Move/Relocate** | Career, family, social impact |
| **Hire People** | Capacity, cost, management |
| **Work Hours** | Health, productivity, relationships |
| **Exercise** | Physical, mental, sleep |
| **Savings** | Net worth, financial security |

## Files

```
genie-life-simulation/
├── src/
│   ├── index.ts                        # Express server, port 4752
│   ├── types/
│   │   └── simulation.ts               # Simulation types
│   └── services/
│       └── scenarioBuilder.ts          # 5 scenario handlers
├── package.json
├── tsconfig.json
└── vitest.config.ts
```

## Status: ✅ COMPLETE