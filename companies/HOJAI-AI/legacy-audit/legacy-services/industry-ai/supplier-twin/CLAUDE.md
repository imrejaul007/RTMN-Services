# CLAUDE.md - Supplier Twin

## Project Overview

**Name:** Supplier Twin
**Type:** Industry AI - Twin Product
**Tagline:** "Unified Supplier Profile Intelligence"
**Version:** 1.0.0
**Date:** June 12, 2026

---

## AI EMPLOYEES (3 Agents)

### 1. Risk Assessor
```
Role: Risk analysis
Skills: Supplier risk scoring, compliance checking, financial health
Integration: Procurement
```

### 2. Performance Analyzer
```
Role: Performance tracking
Skills: Delivery tracking, quality scoring, cost analysis
Integration: Purchase orders
```

### 3. Recommendation Engine
```
Role: Supplier matching
Skills: Best-fit supplier selection, negotiation support
Integration: RFQ system
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
supplier-twin/
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
| Nexha | TBD | Supplier data |

---

**Last Updated:** 2026-06-12
**HOJAI AI - Industry AI Division**