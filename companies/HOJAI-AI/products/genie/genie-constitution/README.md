# Personal Constitution

**Version:** 1.0.0
**Port:** 4743
**Status:** ✅ COMPLETE (Week 8)

## Overview

"What would I never do?" — Genie enforces your values before taking action.

## API Endpoints

```
GET  /api/constitution/:userId              # Get constitution
POST /api/constitution                      # Create/update
POST /api/constitution/check                # Check if action allowed
POST /api/constitution/values/extract       # Extract values from text
GET  /api/constitution/:userId/values       # Get extracted values
```

## Quick Start

```bash
# Set your constitution
curl -X POST http://localhost:4743/api/constitution \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "user_123",
    "always": ["disclose AI identity"],
    "never": ["lie to investors", "make medical decisions"],
    "requiresApproval": ["financial transfers over 1 lakh"],
    "values": [
      {"name": "honesty", "weight": 1.0},
      {"name": "family-first", "weight": 0.9}
    ]
  }'

# Check if action is allowed
curl -X POST http://localhost:4743/api/constitution/check \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "user_123",
    "action": "Transfer 5 lakh to vendor",
    "amount": 500000,
    "category": "financial"
  }'

# Returns:
# { "allowed": false, "requiresApproval": true, ... }
```

## Files

```
genie-constitution/
├── src/
│   ├── index.ts                        # Express server, port 4743
│   ├── types/
│   │   └── constitution.ts             # Constitution types
│   └── services/
│       ├── constitutionStorage.ts      # Redis storage
│       ├── valueExtractor.ts           # LLM + pattern extraction
│       └── boundaryEnforcer.ts         # Check rules
├── __tests__/
│   └── constitution.test.ts
├── package.json
├── tsconfig.json
└── vitest.config.ts
```

## Status: ✅ COMPLETE