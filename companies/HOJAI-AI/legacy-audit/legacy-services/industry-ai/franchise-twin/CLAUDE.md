# CLAUDE.md - Franchise Twin

## Project Overview

**Name:** Franchise Twin
**Type:** Industry AI - Twin Product
**Tagline:** "Unified Franchise Profile Intelligence"
**Version:** 1.0.0
**Date:** June 12, 2026

---

## AI EMPLOYEES (3 Agents)

### 1. Health Monitor
```
Role: Performance monitoring
Skills: KPI tracking, health scoring, alert generation
Integration: Franchise operations
```

### 2. Compliance Tracker
```
Role: Standards tracking
Skills: SOP compliance, audit management, issue detection
Integration: Compliance system
```

### 3. Growth Planner
```
Role: Growth strategy
Skills: Expansion planning, performance improvement, benchmarking
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
franchise-twin/
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
| Nexha | TBD | Franchise data |

---

**Last Updated:** 2026-06-12
**HOJAI AI - Industry AI Division**