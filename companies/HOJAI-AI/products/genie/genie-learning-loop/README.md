# Continuous Learning Loop

**Version:** 1.0.0
**Port:** 4742
**Status:** ✅ COMPLETE (Week 3-4)

## Overview

"I don't like meetings after 8 PM" → auto-adjust calendar. Learns user preferences from feedback.

## API Endpoints

```
POST /api/feedback                   # Record feedback
GET  /api/preferences/:userId        # Get learned preferences
POST /api/preferences/adapt          # Auto-adapt calendar
POST /api/behavior/observe           # Record behavior
GET  /api/behavior/:userId           # Get patterns
POST /api/preferences/extract        # Extract from text (no save)
```

## Quick Start

```bash
# Tell Genie you don't like late meetings
curl -X POST http://localhost:4742/api/feedback \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "user_123",
    "text": "I don'\''t like meetings after 8 PM",
    "type": "preference"
  }'

# Check what Genie learned
curl http://localhost:4742/api/preferences/user_123

# Apply to calendar
curl -X POST http://localhost:4742/api/preferences/adapt \
  -H "Content-Type: application/json" \
  -d '{"userId": "user_123"}'
```

## Files

```
genie-learning-loop/
├── src/
│   ├── index.ts                        # Express server, port 4742
│   ├── types/
│   │   └── preference.ts               # Preference types
│   └── services/
│       ├── preferenceLearner.ts        # Extract from feedback
│       ├── preferenceStorage.ts        # Redis storage
│       ├── behaviorTracker.ts          # Track patterns
│       └── scheduleAdapter.ts          # Adapt calendar
├── __tests__/
│   └── learning.test.ts
├── package.json
├── tsconfig.json
└── vitest.config.ts
```

## Status: ✅ COMPLETE