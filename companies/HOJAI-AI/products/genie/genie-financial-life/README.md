# Financial LifeOS

**Version:** 1.0.0
**Port:** 4747
**Status:** ✅ COMPLETE (Week 9-10)

## Overview

"Can I afford Dubai?" — Genie is your financial brain.

## API Endpoints

```
GET  /api/financial/:userId              # Dashboard
GET  /api/financial/:userId/burn        # Burn analysis
POST /api/financial/afford              # "Can I afford X?"
POST /api/financial/simulation          # Future simulation
```

## Quick Start

```bash
# Get burn analysis
curl http://localhost:4747/api/financial/user_123/burn?period=month

# Check affordability
curl -X POST http://localhost:4747/api/financial/afford \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "user_123",
    "item": "Dubai trip",
    "cost": 45000,
    "category": "travel"
  }'

# Returns:
# { "canAfford": true, "recommendation": "yes", "reasoning": "...", ... }

# Future simulation
curl -X POST http://localhost:4747/api/financial/simulation \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "user_123",
    "monthlySaving": 50000,
    "years": 5,
    "expectedReturn": 0.10
  }'
```

## Files

```
genie-financial-life/
├── src/
│   ├── index.ts                        # Express server, port 4747
│   ├── types/
│   │   └── financial.ts                # Financial types
│   └── services/
│       ├── burnAnalyzer.ts             # Monthly burn
│       ├── affordabilityEngine.ts      # "Can I afford X?"
│       └── futureSimulator.ts          # Compound interest
├── __tests__/
│   └── financial.test.ts
├── package.json
├── tsconfig.json
└── vitest.config.ts
```

## Status: ✅ COMPLETE