# CLAUDE.md - Consumer Twin

## Project Overview

**Name:** Consumer Twin
**Type:** Industry AI - Twin Product
**Tagline:** "Unified Consumer Profile Intelligence"
**Version:** 1.0.0
**Date:** June 12, 2026

---

## AI EMPLOYEES (3 Agents)

### 1. Profile Analyzer
```
Role: Consumer profiling
Skills: Data aggregation, preference extraction, segment classification
Integration: All consumer touchpoints
```

### 2. Preference Engine
```
Role: Preference learning
Skills: Behavior analysis, intent prediction, personalization
Integration: Recommendations
```

### 3. Behavior Predictor
```
Role: Future behavior prediction
Skills: Churn prediction, purchase prediction, engagement forecasting
Integration: Analytics
```

---

## Tech Stack

- **Runtime:** Node.js 20+
- **Framework:** Express.js
- **Language:** TypeScript
- **Database:** MongoDB
- **Cache:** Redis

## Project Structure

```
consumer-twin/
├── src/
│   └── index.ts          # Main entry point
├── package.json
├── tsconfig.json
├── Dockerfile
├── docker-compose.yml
└── CLAUDE.md             # This file
```

---

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| PORT | No | TBD | Service port |
| MONGODB_URI | Yes | - | MongoDB connection string |
| JWT_SECRET | Yes | - | JWT signing secret |

---

## Integration Points

| Service | Port | Integration |
|---------|------|-------------|
| RABTUL Auth | 4002 | User verification |
| RABTUL Consumer | TBD | Consumer data |

---

**Last Updated:** 2026-06-12
**HOJAI AI - Industry AI Division**