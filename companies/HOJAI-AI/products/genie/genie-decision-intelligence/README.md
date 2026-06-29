# Decision Intelligence

**Version:** 1.0.0
**Port:** 4740
**Status:** ✅ COMPLETE (Week 1-2)

## Overview

Decision Intelligence stores WHY/WHO/WHAT/WHEN of every decision, not just the outcome.

## API Endpoints

```
POST /api/decisions/extract         # Extract decisions from text
GET  /api/decisions/:userId         # List user's decisions
GET  /api/decisions/:userId/:id     # Get single decision
GET  /api/decisions/why?topic=X     # "Why did we choose X?"
POST /api/decisions/:id/revisit     # Set revisit date
POST /api/decisions/:id/alternatives # Add alternative
GET  /api/decisions/:userId/memory  # Memory summary
GET  /api/decisions/search/:tag     # Search by tag
```

## Quick Start

```bash
npm install
npm run build
npm start

# Test
curl http://localhost:4740/health

# Extract decisions
curl -X POST http://localhost:4740/api/decisions/extract \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "user_123",
    "text": "We decided to launch in Dubai because of GCC market demand. We considered Singapore but rejected it due to lower market fit.",
    "source": "meeting"
  }'

# Query "Why did we choose Dubai?"
curl "http://localhost:4740/api/decisions/why?userId=user_123&topic=Dubai"
```

## Architecture

```
Audio/Text → Decision Extractor (LLM + Pattern fallback)
              ↓
        Decision Storage (Redis)
              ↓
    ┌─────────┼─────────┐
    ↓         ↓         ↓
  Why Query  Search   Memory
```

## Files

```
genie-decision-intelligence/
├── src/
│   ├── index.ts                        # Express server, port 4740
│   ├── types/
│   │   └── decision.ts                 # Decision types
│   └── services/
│       ├── decisionExtractor.ts        # LLM + pattern extraction
│       ├── decisionStorage.ts          # Redis storage
│       ├── queryEngine.ts              # "Why did we choose X?"
│       └── alternativesTracker.ts      # Track rejected alternatives
├── __tests__/
│   └── decision.test.ts
├── package.json
├── tsconfig.json
└── vitest.config.ts
```

## Status

✅ COMPLETE — All endpoints built and tested