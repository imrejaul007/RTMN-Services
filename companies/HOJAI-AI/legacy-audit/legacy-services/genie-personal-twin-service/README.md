# GENIE Personal Twin Service

**Version:** 1.0.0 | **Port:** 4708

Personal Digital Twin for Genie - A complete digital representation of each user.

## What It Does

Creates a Personal Twin that knows:
- Identity & Profile
- Preferences (food, travel, shopping, entertainment)
- Goals & Aspirations
- Timeline & History
- Behavioral Patterns
- Predictive Intelligence

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/twin` | Create twin |
| GET | `/api/twin` | Get twin |
| PATCH | `/api/twin` | Update twin |
| GET | `/api/twin/summary` | Get summary |
| POST | `/api/twin/goals` | Add goal |
| PATCH | `/api/twin/goals/:id` | Update goal |
| POST | `/api/twin/timeline` | Add event |
| POST | `/api/twin/learn` | Learn preference |
| GET | `/api/twin/recommendations` | Get recommendations |

## Quick Start

```bash
npm install
npm run dev
```

## Docker

```bash
docker build -t genie-personal-twin .
docker run -p 4708:4708 genie-personal-twin
```

---

**Status:** ✅ Built | **Port:** 4708
