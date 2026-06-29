# Health Intelligence

**Version:** 1.0.0
**Port:** 4748
**Status:** ✅ COMPLETE (Week 11-12)

## Overview

Continuous health operations — not healthcare. Sleep, food, energy, burnout.

## API Endpoints

```
GET  /api/health/:userId            # Dashboard
GET  /api/health/:userId/sleep      # Sleep analysis
GET  /api/health/:userId/gastric    # Gastric triggers
GET  /api/health/:userId/burnout    # Burnout risk
```

## Quick Start

```bash
# Get health dashboard
curl http://localhost:4748/api/health/user_123

# Get sleep insights
curl http://localhost:4748/api/health/user_123/sleep?days=30

# Get gastric triggers
curl http://localhost:4748/api/health/user_123/gastric?days=60

# Get burnout risk
curl http://localhost:4748/api/health/user_123/burnout
```

## Features

| Feature | What |
|---------|------|
| **Sleep Optimizer** | Trends, quality, recommendations |
| **Gastric Detector** | Food → symptom correlations |
| **Burnout Predictor** | Multi-factor risk scoring |
| **Energy Tracker** | Daily energy levels |
| **Personalized Recs** | Based on YOUR patterns |

## Files

```
genie-health-intelligence/
├── src/
│   ├── index.ts                        # Express server, port 4748
│   ├── types/
│   │   └── health.ts                   # Health types
│   └── services/
│       ├── sleepOptimizer.ts           # Sleep patterns
│       ├── gastricDetector.ts          # Food triggers
│       └── burnoutPredictor.ts         # Burnout risk
├── __tests__/
│   └── health.test.ts
├── package.json
├── tsconfig.json
└── vitest.config.ts
```

## Status: ✅ COMPLETE