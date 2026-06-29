# TravelOS

**Version:** 1.0.0
**Port:** 4750
**Status:** ✅ COMPLETE (Week 15)

## Overview

Travel intelligence — packing, documents, jet lag.

## API Endpoints

```
POST /api/travel/packing              # Generate packing list
POST /api/travel/documents/check      # Check documents ready
POST /api/travel/jetlag              # Get jet lag plan
```

## Quick Start

```bash
# Generate packing list
curl -X POST http://localhost:4750/api/travel/packing \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "user_123",
    "tripId": "trip_dubai",
    "destination": "Dubai",
    "durationDays": 5,
    "season": "winter"
  }'

# Check documents
curl -X POST http://localhost:4750/api/travel/documents/check \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "user_123",
    "destination": "Dubai",
    "departureDate": "2026-07-01"
  }'

# Get jet lag plan
curl -X POST http://localhost:4750/api/travel/jetlag \
  -H "Content-Type: application/json" \
  -d '{
    "destination": "New York",
    "departureDate": "2026-07-01"
  }'
```

## Features

| Feature | What |
|---------|------|
| **Packing List** | Season-aware, duration-based |
| **Document Check** | Passport, visa, tickets, insurance |
| **Jet Lag Plan** | Pre-travel sleep adjustment |

## Files

```
genie-travel/
├── src/
│   ├── index.ts                        # Express server, port 4750
│   ├── types/
│   │   └── travel.ts                   # Travel types
│   └── services/
│       ├── packingAdvisor.ts           # Packing list generator
│       ├── documentTracker.ts          # Document checker
│       └── jetLagOptimizer.ts          # Jet lag plan
├── package.json
├── tsconfig.json
└── vitest.config.ts
```

## Status: ✅ COMPLETE