# BOA OS - Strategy Layer (Port 4100)

**Status:** ✅ Production Ready
**Company:** RTMN-Group
**Layer:** Strategy (Above SUTAR OS)
**Last Updated:** June 15, 2026

## Overview

BOA OS is the **Strategy Layer** in the RTMN architecture. It sits ABOVE SUTAR OS and transforms high-level business objectives into executable plans that are synced to SUTAR OS GoalOS for autonomous execution.

## Architecture

```
┌─────────────────────────────────────────────┐
│  BOA OS (Strategy Layer) - Port 4100       │
│  - Vision/Mission/Strategy                  │
│  - Strategic Pillars                        │
│  - OKR/Objectives + Key Results             │
│  - Roadmaps with Milestones                 │
│  - KPIs (auto status)                       │
│  - SWOT Analysis                            │
│  - Strategic Alignment                      │
│  - Goal Sync to SUTAR OS                    │
└──────────────────┬──────────────────────────┘
                   │ Bidirectional Sync
                   ▼
┌─────────────────────────────────────────────┐
│  SUTAR OS GoalOS (Port 4242)                │
│  - Autonomous Goal Execution                │
└─────────────────────────────────────────────┘
```

## Features

### 1. Strategy Management
- Create strategies with vision, mission, horizon
- Define strategic pillars with themes
- Activate/pause/archive strategies
- Strategy summaries with progress

### 2. OKR / Objectives
- Create objectives with priority and tags
- Add key results (KRs) with metrics and targets
- Auto-progress calculation
- Auto-status (on-track / at-risk / off-track / completed)
- Link objectives to SUTAR goals

### 3. Roadmaps
- Create roadmaps with milestones
- Track milestone status (pending / in-progress / completed / blocked)
- Dependencies between milestones
- Timeline view
- Auto-recalculate roadmap status

### 4. KPI Tracking
- Define KPIs with baselines and targets
- Record measurements (hourly/daily/weekly/monthly/quarterly)
- Auto-status: on-track / at-risk / off-track / achieved
- Trend analysis (improving / declining / stable)
- Progress calculation: `(current - baseline) / (target - baseline)`

### 5. SWOT Analysis
- Generate SWOT from context
- Keyword-based extraction (strengths, weaknesses, opportunities, threats)
- Strategic recommendations (SO/WO/ST/WT strategies)
- Custom SWOT inputs supported

### 6. Strategic Alignment
- Assess alignment of business units to strategy
- Compute alignment score (0-100)
- Identify gaps
- Generate recommendations
- Aggregate alignment metrics

### 7. Goal Sync (BOA → SUTAR)
- Sync objectives to SUTAR GoalOS at `http://localhost:4242`
- Push progress updates
- Bidirectional event flow via event bus (port 4510)
- Sync history per objective

## API Endpoints

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/health` | Health check |
| GET | `/api/v1/info` | Service info |
| POST | `/api/v1/strategy` | Create strategy |
| GET | `/api/v1/strategy` | List strategies |
| GET | `/api/v1/strategy/:id` | Get strategy |
| GET | `/api/v1/strategy/:id/summary` | Strategy summary |
| POST | `/api/v1/strategy/:id/activate` | Activate strategy |
| POST | `/api/v1/objective` | Create objective |
| GET | `/api/v1/objective` | List objectives |
| GET | `/api/v1/objective/:id` | Get objective |
| PATCH | `/api/v1/objective/:id` | Update objective |
| DELETE | `/api/v1/objective/:id` | Delete objective |
| POST | `/api/v1/objective/:id/keyresult/:krId/progress` | Update KR |
| GET | `/api/v1/objective/summary/all` | Progress summary |
| POST | `/api/v1/roadmap` | Create roadmap |
| GET | `/api/v1/roadmap` | List roadmaps |
| GET | `/api/v1/roadmap/:id` | Get roadmap |
| PATCH | `/api/v1/roadmap/:rid/milestone/:mid` | Update milestone |
| GET | `/api/v1/roadmap/:id/timeline` | Timeline view |
| POST | `/api/v1/kpi` | Create KPI |
| GET | `/api/v1/kpi` | List KPIs |
| GET | `/api/v1/kpi/:id` | Get KPI |
| POST | `/api/v1/kpi/:id/measurement` | Record measurement |
| GET | `/api/v1/kpi/:id/progress` | Get progress |
| GET | `/api/v1/kpi/:id/measurements` | History |
| POST | `/api/v1/alignment/assess` | Assess alignment |
| GET | `/api/v1/alignment/scores` | All scores |
| GET | `/api/v1/alignment/aggregate` | Aggregate metrics |
| POST | `/api/v1/alignment/swot` | Generate SWOT |
| GET | `/api/v1/alignment/swot/:id` | Get SWOT |
| POST | `/api/v1/sync/objective/:id` | Sync to SUTAR |
| POST | `/api/v1/sync/strategy/:id` | Sync strategy |
| POST | `/api/v1/sync/progress/:id` | Push progress |
| GET | `/api/v1/insights` | Combined insights |
| POST | `/api/v1/event` | Event handler |

## Configuration

| Env Var | Default | Description |
|---------|---------|-------------|
| `PORT` | 4100 | Service port |
| `SUTAR_GOAL_OS_URL` | http://localhost:4242 | GoalOS endpoint |
| `SUTAR_DECISION_ENGINE_URL` | http://localhost:4240 | Decision engine |
| `EVENT_BUS_URL` | http://localhost:4510 | Event bus |
| `CORPID_SERVICE_URL` | http://localhost:4702 | Identity service |
| `NODE_ENV` | development | Environment |
| `LOG_LEVEL` | info | Log level |

## Running

```bash
cd companies/RTNM-Group/boa-os
npm install
npm run dev  # development with ts-node
npm run build && npm start  # production
```

## Dependencies

- **express** - Web framework
- **cors** - CORS middleware
- **helmet** - Security headers
- **axios** - HTTP client (for SUTAR integration)
- **uuid** - ID generation
- **winston** - Logging
- **mongoose** - MongoDB ODM (optional)
- **dotenv** - Environment config

## Service Integration

| Service | Direction | Purpose |
|---------|-----------|---------|
| SUTAR GoalOS (4242) | BOA → SUTAR | Sync objectives as goals |
| SUTAR Decision Engine (4240) | BOA ↔ SUTAR | Strategic decisions |
| REZ Event Bus (4510) | BOA ↔ All | Event publishing |
| CorpID (4702) | BOA → CorpID | Auth/identity |

## Events Published

- `boa.os.ready` - Service startup
- `boa.strategy.created`
- `boa.strategy.activated`
- `boa.strategy.synced`
- `boa.objective.created`
- `boa.objective.updated`
- `boa.objective.synced`
- `boa.objective.progress-updated`
- `boa.keyresult.progress`
- `boa.roadmap.created`
- `boa.milestone.updated`
- `boa.kpi.created`
- `boa.kpi.measured`

## File Structure

```
boa-os/
├── package.json
├── tsconfig.json
├── CLAUDE.md (this file)
├── FEATURES.md
└── src/
    ├── index.ts                 # Main server
    ├── config.ts                # Configuration
    ├── types/index.ts           # Type definitions
    ├── middleware/
    │   ├── errorHandler.ts
    │   └── requestLogger.ts
    ├── utils/
    │   ├── logger.ts
    │   ├── errors.ts
    │   └── eventBus.ts
    ├── validators/
    │   └── strategyValidator.ts
    ├── services/
    │   ├── strategyEngine.ts    # Core strategy logic
    │   ├── objectiveService.ts  # Objective CRUD
    │   ├── roadmapService.ts    # Roadmap + milestones
    │   ├── kpiTracker.ts        # KPI tracking
    │   ├── swotAnalyzer.ts      # SWOT analysis
    │   ├── strategicAlignment.ts # Alignment scoring
    │   └── goalSync.ts          # SUTAR sync
    ├── models/
    │   ├── Strategy.ts
    │   ├── Objective.ts
    │   ├── Roadmap.ts
    │   └── StrategicPillar.ts
    └── routes/
        ├── strategy.ts
        ├── objective.ts
        ├── roadmap.ts
        ├── kpi.ts
        └── alignment.ts
```

## Key Formulas

### Objective Progress
```
avg(KR.progress) = sum(KR.currentValue / KR.targetValue) / count(KR)
```

### Objective Status
- `progress >= 100` → completed
- `progress < 30` → off-track
- `progress < 60` → at-risk
- else → on-track

### KPI Status
```
progress = (current - baseline) / (target - baseline)
progress >= 1   → achieved
progress >= 0.8 → on-track
progress >= 0.5 → at-risk
else            → off-track
```

### Alignment Score
```
score = (alignedObjectives / totalStrategyObjectives) * 100
score >= 90  → aligned
score >= 60  → partially-aligned
else         → misaligned
```
