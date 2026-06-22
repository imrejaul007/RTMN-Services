# CLAUDE.md - BOA OS

## Project Overview

**Name:** boa-os
**Type:** SUTAR OS - Strategy Layer
**Port:** 4100
**Company:** RTNM-Group
**Part of:** SUTAR OS Phase 6 - Strategic Planning
**Lines:** 1,313
**Status:** ✅ PRODUCTION READY

## What is BOA OS?

BOA OS is the **Strategy Layer** of SUTAR OS. It sits above SUTAR OS and transforms high-level business strategies into actionable goals that SUTAR OS can execute autonomously.

```
BOA OS (Strategy) → SUTAR OS (Execution) → Industry Agents
```

## Tech Stack

- Node.js 20+
- Express.js
- TypeScript
- MongoDB/Mongoose
- Axios (for SUTAR integration)

## Commands

| Command | Description |
|---------|-------------|
| `npm install` | Install dependencies |
| `npm run dev` | Development server (tsx watch) |
| `npm run build` | Build for production |
| `npm start` | Production server |

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| PORT | No | 4100 | Service port |
| MONGODB_URI | Yes | - | MongoDB connection string |
| NODE_ENV | No | development | Environment mode |
| SUTAR_GOAL_OS_URL | No | http://localhost:4242 | SUTAR GoalOS URL |

## Features

### 1. Strategic Goals Management

| Feature | Description |
|---------|-------------|
| **Goal Creation** | Create strategic goals with title, description, type |
| **Goal Types** | market_expansion, revenue_growth, cost_reduction, operational_efficiency, customer_acquisition, partnership |
| **Planning** | Set quarter, fiscal year, horizon, department, owner |
| **Target Setting** | Define primary and secondary KPIs with current vs target values |
| **Budget Planning** | Allocate budget with breakdown by category |
| **Risk Management** | Identify risks with probability, impact, mitigation |
| **Dependencies** | Track blocked-by and blocks relationships |
| **Progress Tracking** | Real-time progress monitoring (0-100%) |
| **Health Score** | Goal health assessment (0-100) |

### 2. Portfolio Management

| Feature | Description |
|---------|-------------|
| **Goal Portfolio** | Track multiple goals together |
| **Budget Tracking** | Total allocated vs spent |
| **Performance Metrics** | Achievement rates, on-budget rates |
| **Risk Exposure** | Portfolio-level risk assessment |

### 3. Opportunities

| Feature | Description |
|---------|-------------|
| **Opportunity Types** | market, partnership, acquisition, expansion, optimization |
| **SWOT Analysis** | Strengths, weaknesses, opportunities, threats |
| **Financial Analysis** | Investment, ROI, payback, NPV, IRR |
| **Timeline Tracking** | Start/end dates with milestones |
| **Linked Goals** | Connect opportunities to goals |

### 4. SUTAR Integration

| Feature | Description |
|---------|-------------|
| **Goal Sync** | Sync approved goals to SUTAR GoalOS |
| **Progress Sync** | Pull progress from SUTAR |
| **Outcome Reporting** | Report execution outcomes back |
| **Status Tracking** | Track execution status in real-time |

### 5. Dashboard & Analytics

| Feature | Description |
|---------|-------------|
| **Stats API** | Total goals, by status, by type |
| **Average Progress** | Track overall progress |
| **Budget Utilization** | Allocated vs spent tracking |

## API Endpoints

### Goals

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/goals` | Create strategic goal |
| GET | `/api/goals` | List goals (with filters) |
| GET | `/api/goals/:id` | Get goal details |
| PUT | `/api/goals/:id` | Update goal |
| POST | `/api/goals/:id/approve` | Approve goal for execution |
| POST | `/api/goals/:id/execute` | Start execution (sync to SUTAR) |
| POST | `/api/goals/:id/sync` | Sync progress from SUTAR |
| POST | `/api/goals/:id/cancel` | Cancel goal |
| GET | `/api/goals/stats/dashboard` | Get dashboard statistics |

### Opportunities

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/opportunities` | Create opportunity |
| GET | `/api/opportunities` | List opportunities |
| GET | `/api/opportunities/:id` | Get opportunity |
| PUT | `/api/opportunities/:id` | Update opportunity |
| POST | `/api/opportunities/:id/approve` | Approve opportunity |
| POST | `/api/opportunities/:id/pursue` | Start pursuing |

## Goal Status Flow

```
draft → approved → in_progress → achieved/failed/cancelled
```

## Goal Types

- `market_expansion` - Enter new markets
- `revenue_growth` - Increase revenue
- `cost_reduction` - Reduce costs
- `operational_efficiency` - Improve operations
- `customer_acquisition` - Acquire new customers
- `partnership` - Form partnerships

## Integration

### Upstream
- Leadership input (goals)
- Analytics services
- Human approval

### Downstream
- SUTAR GoalOS (4242) - Goal execution
- BOA-SUTAR Bridge (4110) - Sync

## Events Published

- `boa.goal.created` - New goal created
- `boa.goal.approved` - Goal approved
- `boa.goal.execution_started` - Execution started
- `boa.goal.progress_synced` - Progress synced from SUTAR
- `boa.goal.cancelled` - Goal cancelled

## Health Endpoints

- `GET /health` - Health check
- `GET /health/live` - Liveness probe
- `GET /health/ready` - Readiness probe (MongoDB)

## File Structure

```
boa-os/
├── src/
│   ├── index.ts                    # Main server
│   ├── models/
│   │   └── Strategy.ts             # MongoDB models (StrategicGoal, Opportunity, Portfolio)
│   ├── services/
│   │   ├── strategyService.ts      # Business logic
│   │   └── eventBus.ts            # Event publishing
│   ├── routes/
│   │   ├── goals.ts                # Goal endpoints
│   │   └── opportunities.ts        # Opportunity endpoints
│   └── utils/
│       └── logger.ts              # Structured logging
├── package.json
├── tsconfig.json
└── CLAUDE.md (this file)
```

## Notes

- BOA OS is the STRATEGY LAYER above SUTAR OS
- Goals must be approved before execution
- Approved goals sync to SUTAR for autonomous execution
- Progress syncs back from SUTAR in real-time
- Health score indicates goal health (0-100)
