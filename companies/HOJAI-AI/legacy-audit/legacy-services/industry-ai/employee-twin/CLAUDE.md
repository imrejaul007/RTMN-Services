# CLAUDE.md - Employee Twin

## Project Overview

**Name:** Employee Twin
**Type:** Industry AI - Twin Product
**Tagline:** "Unified Employee Profile Intelligence"
**Version:** 1.0.0
**Date:** June 12, 2026

---

## AI EMPLOYEES (3 Agents)

### 1. Skill Matcher
```
Role: Skill profiling
Skills: Skill inventory, gap analysis, learning recommendations
Integration: HR systems
```

### 2. Performance Tracker
```
Role: Performance analysis
Skills: KPI tracking, goal progress, performance scoring
Integration: HRMS
```

### 3. Growth Advisor
```
Role: Career development
Skills: Career pathing, promotion readiness, development plans
Integration: Learning system
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
employee-twin/
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
| CorpPerks | 4700 | HR data |

---

**Last Updated:** 2026-06-12
**HOJAI AI - Industry AI Division**