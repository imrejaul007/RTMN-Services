# Anticipation Engine

**Version:** 1.0.0
**Port:** 4745
**Status:** ✅ COMPLETE (Week 5-6)

## Overview

"Flight tomorrow — pack tonight." Genie shouldn't wait. It should anticipate.

## API Endpoints

```
GET  /api/anticipations/:userId           # Get predictions
POST /api/anticipations/check             # Generate fresh
POST /api/anticipations/:id/dismiss       # Dismiss
POST /api/anticipations/:id/act           # Mark as acted on
GET  /api/anticipations/active/:userId    # Get active only
```

## Quick Start

```bash
# Generate predictions
curl -X POST http://localhost:4745/api/anticipations/check \
  -H "Content-Type: application/json" \
  -d '{"userId": "user_123", "notify": true}'

# Get active predictions
curl http://localhost:4745/api/anticipations/active/user_123
```

## Prediction Types

| Type | Example |
|------|---------|
| travel | "Flight in 18 hours — Pack tonight" |
| follow_up | "Met Investor A 10 days ago — Draft follow-up" |
| relationship | "Mom's birthday in 5 days — Send gift" |
| work | "Task due in 2 days — Schedule time" |
| health | "Doctor appointment tomorrow" |
| finance | "Bill due in 3 days" |

## Files

```
genie-anticipation/
├── src/
│   ├── index.ts                        # Express server, port 4745
│   ├── types/
│   │   └── prediction.ts               # Prediction types
│   └── services/
│       ├── contextAggregator.ts        # Pull from Calendar/Memory
│       ├── predictiveEngine.ts        # Generate predictions
│       └── proactiveNotifier.ts       # Send via RAZO
├── __tests__/
│   └── anticipation.test.ts
├── package.json
├── tsconfig.json
└── vitest.config.ts
```

## Status: ✅ COMPLETE