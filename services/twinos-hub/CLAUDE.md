# TwinOS Hub - Digital Twins Orchestrator

**Version:** 1.0.0  
**Port:** 4705  
**Status:** ✅ RUNNING | **June 18, 2026**

---

## Overview

TwinOS Hub is the central orchestrator for all **Digital Twins** in the RTMN ecosystem. It manages Personal, Financial, Health, Relationship, and 50+ other twin types.

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                           TwinOS HUB (4705)                                    │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                 │
│  ┌─────────────────────────────────────────────────────────────────────┐       │
│  │                         FIVE CORE TWINS                                │       │
│  │                                                                       │       │
│  │   Personal Twin ──→ Identity, preferences, goals, timeline           │       │
│  │   Financial Twin ──→ Accounts, transactions, budgets, net worth      │       │
│  │   Health Twin ──→ Vitals, activity, sleep, mood, conditions         │       │
│  │   Relationship Twin ──→ People, interactions, intimacy, trust        │       │
│  │   Founder Twin ──→ Ventures, KPIs, customers, team, decisions         │       │
│  │                                                                       │       │
│  └─────────────────────────────────────────────────────────────────────┘       │
│                                                                                 │
│  ┌─────────────────────────────────────────────────────────────────────┐       │
│  │                      50+ SPECIALIZED TWINS                           │       │
│  │                                                                       │       │
│  │   Lead Twin, Asset Twin, Order Twin, Employee Twin, Product Twin     │       │
│  │   Partner Twin, Voice Twin, Industry Twin, Executive Twin ...        │       │
│  │                                                                       │       │
│  └─────────────────────────────────────────────────────────────────────┘       │
│                                                                                 │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

## Architecture

```
services/twinos-hub/
├── src/
│   └── index.js              # Twin orchestration (in-memory)
├── package.json
└── CLAUDE.md
```

---

## Twin Types

### Core Twins (5)

| Twin | ID Pattern | Data Tracked |
|------|------------|--------------|
| Personal Twin | `personal_{userId}` | Profile, preferences, goals, timeline |
| Financial Twin | `financial_{userId}` | Accounts, transactions, budgets, net worth |
| Health Twin | `health_{userId}` | Vitals, activity, sleep, mood, medications |
| Relationship Twin | `relationship_{userId}` | People, interactions, intimacy, trust scores |
| Founder Twin | `founder_{userId}` | Ventures, KPIs, customers, team, decisions |

### Specialized Twins (50+)

| Twin | Purpose |
|------|---------|
| Lead Twin | Sales leads, qualification, pipeline |
| Asset Twin | Assets, depreciation, maintenance |
| Order Twin | Orders, fulfillment, tracking |
| Employee Twin | HR data, performance, skills |
| Product Twin | Products, pricing, inventory |
| Partner Twin | Partner relationships, deals |
| Voice Twin | Voice profiles, TTS/STT |
| Industry Twin | Industry-specific data |
| Executive Twin | Executive KPIs, strategy |
| Customer Twin | Customer 360, lifecycle |
| Revenue Twin | Revenue streams, forecasting |

---

## API Endpoints

### Twin CRUD
```
POST /api/twins           # Create twin
GET  /api/twins           # List all twins
GET  /api/twins/:id       # Get twin by ID
PUT  /api/twins/:id       # Update twin
DELETE /api/twins/:id     # Delete twin
```

### Sync
```
POST /api/twins/:id/sync    # Sync twin data
GET  /api/twins/:id/history # Get sync history
```

### Health
```
GET /health                 # Hub health check
```

---

## Example Usage

### Create Twin
```bash
curl -X POST http://localhost:4705/api/twins \
  -H "Content-Type: application/json" \
  -d '{
    "type": "personal",
    "userId": "user_123",
    "data": { "name": "John", "preferences": {} }
  }'
```

### Get Twin
```bash
curl http://localhost:4705/api/twins/twin_abc123
```

### List All Twins
```bash
curl http://localhost:4705/api/twins
```

---

## Environment Variables

```env
PORT=4705
```

---

## Quick Start

```bash
cd services/twinos-hub
npm install
npm start

# Health check
curl http://localhost:4705/health
```

---

*Last Updated: June 18, 2026*
