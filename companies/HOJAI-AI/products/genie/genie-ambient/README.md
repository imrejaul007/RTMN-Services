# Ambient Intelligence

**Version:** 1.0.0
**Port:** 4746
**Status:** ✅ COMPLETE (Week 7)

## Overview

"You look tired" — Genie notices things before you ask.

## API Endpoints

```
GET  /api/ambient/:userId             # Get ambient signals
GET  /api/ambient/alerts/:userId     # Get active alerts
POST /api/ambient/check              # Force check
POST /api/ambient/:alertId/dismiss   # Dismiss
POST /api/ambient/:alertId/act       # Mark action taken
```

## Quick Start

```bash
# Get ambient alerts
curl http://localhost:4746/api/ambient/alerts/user_123

# Force check
curl -X POST http://localhost:4746/api/ambient/check \
  -H "Content-Type: application/json" \
  -d '{"userId": "user_123"}'
```

## Alert Types

| Type | Example |
|------|---------|
| wellness | "You look tired — move meetings" |
| relationship | "Haven't talked to Mom in 20 days" |
| work | "Meeting overload — 10 today" |
| mindfulness | "Lunch break — take a real break" |
| health | "Drink water — stay hydrated" |

## Severity

- **urgent** — Action needed now
- **gentle** — Awareness suggestion
- **info** — Soft reminder

## Files

```
genie-ambient/
├── src/
│   ├── index.ts                        # Express server, port 4746
│   ├── types/
│   │   └── alert.ts                   # Alert types
│   └── services/
│       ├── ambientDetector.ts          # Collect signals
│       ├── wellnessChecker.ts          # Wellness checks
│       ├── relationshipChecker.ts      # Relationship gaps
│       └── alertEngine.ts              # Aggregate alerts
├── __tests__/
│   └── ambient.test.ts
├── package.json
├── tsconfig.json
└── vitest.config.ts
```

## Status: ✅ COMPLETE