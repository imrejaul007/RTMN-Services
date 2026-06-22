# HOJAI GoalOS - Goal & OKR Management

> **HOJAI AI** | Company: hojai-ai  
> **Port:** 4242 | **Status:** ✅ **BUILT** (June 13, 2026)

## Overview

**HOJAI GoalOS** provides comprehensive goal and OKR management. Create goals, track progress, manage objectives and key results.

### Key Features

- 🎯 **Goal Management** - Create and track company/team goals
- 📊 **Progress Tracking** - Track goal completion percentage
- ✅ **OKR System** - Objectives and Key Results framework
- 📈 **Key Results** - Measurable key results with targets
- 📅 **Due Dates** - Set and track deadlines
- 👤 **Owner Assignment** - Assign goals to team members

## Architecture

| Component | Technology |
|-----------|------------|
| Runtime | Node.js 20+ |
| Framework | Express.js 4.x |
| Language | TypeScript 5.x |
| Database | MongoDB 6.x |
| Validation | Zod 3.x |

## API Endpoints

### Goals

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/goals` | List goals |
| POST | `/api/v1/goals` | Create goal |
| GET | `/api/v1/goals/:id` | Get goal |
| PUT | `/api/v1/goals/:id` | Update goal |
| PATCH | `/api/v1/goals/:id` | Partial update |
| DELETE | `/api/v1/goals/:id` | Delete goal |

### OKRs

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/okrs` | List OKRs |
| POST | `/api/v1/okrs` | Create OKR |
| GET | `/api/v1/okrs/:id` | Get OKR |
| PUT | `/api/v1/okrs/:id` | Update OKR |

## Data Models

### Goal

```typescript
{
  id: string;
  title: string;
  description?: string;
  status: 'active' | 'completed' | 'paused' | 'cancelled';
  progress: number; // 0-100
  dueDate?: Date;
  ownerId?: string;
  teamId?: string;
}
```

### OKR

```typescript
{
  id: string;
  objective: string;
  keyResults: KeyResult[];
  goalId?: string;
}

interface KeyResult {
  id: string;
  metric: string;
  target: number;
  current: number;
  unit?: string;
}
```

## Security Features

| Feature | Status |
|---------|--------|
| Input Validation (Zod) | ✅ |
| Graceful Shutdown | ✅ |
| Health Checks | ✅ |

## Quick Start

```bash
npm install
npm run dev
npm run build
npm start
```

---

**License:** Proprietary - RTNM Digital  
**Last Updated:** June 13, 2026
