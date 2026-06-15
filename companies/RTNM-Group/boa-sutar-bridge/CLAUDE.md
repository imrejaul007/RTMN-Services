# BOA-SUTAR Bridge (Port 4110)

**Status:** ✅ Production Ready
**Company:** RTMN-Group
**Role:** Strategy ↔ Execution Bridge
**Last Updated:** June 15, 2026

## Overview

The BOA-SUTAR Bridge synchronizes strategy from BOA OS to execution in SUTAR OS, and feeds execution feedback back to inform strategy. It enables bidirectional alignment between high-level objectives and autonomous goal execution.

## Architecture

```
┌─────────────────┐         ┌─────────────────────┐         ┌─────────────────┐
│   BOA OS        │ ◄─────► │  BOA-SUTAR BRIDGE   │ ◄─────► │  SUTAR OS       │
│   Port 4100     │         │   Port 4110         │         │   Port 4242+    │
│  (Strategy)     │         │   (Sync & Feedback) │         │  (Execution)    │
└─────────────────┘         └─────────────────────┘         └─────────────────┘
```

## Features

### 1. Bidirectional Sync
- BOA → SUTAR: Push strategic objectives as executable goals
- SUTAR → BOA: Pull execution status and progress
- Sync history with status tracking
- Conflict detection and resolution

### 2. Goal Mapping
- 1:1 mapping (default)
- 1:N splitting (by key result, tag, metric)
- N:1 aggregation (multiple objectives → single goal)
- Custom mapping rules with conditions and transforms

### 3. Conflict Resolution
- Strategies: BOA-wins, SUTAR-wins, newest-wins, merged, business-priority, manual
- Business-priority: Strategic fields (title, description, priority, owner) → BOA wins; execution fields (status, progress) → SUTAR wins
- Resolution log

### 4. Strategic Alignment
- Drift calculation between BOA objective and SUTAR goal progress
- Alignment score 0-100
- Levels: fully-aligned (≥90), mostly-aligned (≥70), partially-aligned (≥50), misaligned (<50)
- Trend tracking over time
- Per-business-unit assessment

### 5. Feedback Loops
- Capture SUTAR execution feedback to inform BOA strategy
- Types: progress, blocker, completion, deviation, insight
- Severity: info, warning, critical
- Handlers per feedback type
- Auto-process from SUTAR events

### 6. Metrics Aggregation
- Per-strategy metrics (objective count, synced count, avg progress, alignment, feedback count)
- 5-minute cache TTL
- Dashboard with system health
- BOA OS / SUTAR GoalOS health checks

## API Endpoints

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/health` | Health check (includes dep status) |
| GET | `/api/v1/info` | Service info |
| POST | `/api/v1/sync/objective` | Sync BOA objective to SUTAR |
| POST | `/api/v1/sync/progress` | Push progress update |
| POST | `/api/v1/sync/pull/:sutarGoalId` | Pull SUTAR data |
| GET | `/api/v1/sync` | List all syncs |
| GET | `/api/v1/sync/:id` | Get sync by ID |
| GET | `/api/v1/sync/stats/summary` | Sync statistics |
| POST | `/api/v1/sync/map/one-to-many` | Apply 1:N mapping |
| POST | `/api/v1/sync/map/many-to-one` | Apply N:1 mapping |
| POST | `/api/v1/sync/resolve-conflict` | Resolve conflict |
| POST | `/api/v1/alignment/check` | Check strategy alignment |
| GET | `/api/v1/alignment` | All records |
| GET | `/api/v1/alignment/:id` | Record by ID |
| GET | `/api/v1/alignment/trend/:strategyId` | Trend over time |
| GET | `/api/v1/alignment/aggregate` | Aggregate metrics |
| POST | `/api/v1/feedback` | Submit feedback |
| GET | `/api/v1/feedback/objective/:boaObjectiveId` | Feedback for objective |
| GET | `/api/v1/feedback/unprocessed` | Unprocessed |
| GET | `/api/v1/feedback/severity/:severity` | By severity |
| POST | `/api/v1/feedback/:id/process` | Mark processed |
| GET | `/api/v1/feedback/stats/summary` | Feedback stats |
| GET | `/api/v1/metrics/strategy/:strategyId` | Strategy metrics |
| GET | `/api/v1/metrics/dashboard` | Dashboard |
| POST | `/api/v1/metrics/invalidate` | Invalidate cache |
| POST | `/api/v1/event` | Receive external events |

## Configuration

| Env Var | Default | Description |
|---------|---------|-------------|
| `PORT` | 4110 | Service port |
| `BOA_OS_URL` | http://localhost:4100 | BOA OS endpoint |
| `SUTAR_GOAL_OS_URL` | http://localhost:4242 | SUTAR GoalOS endpoint |
| `SUTAR_DECISION_ENGINE_URL` | http://localhost:4240 | Decision engine |
| `SUTAR_MONITORING_URL` | http://localhost:4255 | SUTAR monitoring |
| `EVENT_BUS_URL` | http://localhost:4510 | Event bus |
| `SYNC_INTERVAL_MS` | 60000 | Auto-sync interval |
| `CONFLICT_AUTO_RESOLVE` | true | Auto-resolve conflicts |

## Events Published

- `bridge.ready` - Service startup
- `bridge.sync.completed` - Successful sync
- `bridge.sync.failed` - Sync failure
- `bridge.progress.updated` - Progress push
- `bridge.pull.completed` - SUTAR data pulled
- `bridge.feedback.received` - Feedback captured

## Events Consumed (via /api/v1/event)

- `sutar.goal.progress-updated` → captures as progress feedback
- `sutar.goal.completed` → captures as completion feedback
- `sutar.goal.blocked` → captures as critical blocker feedback

## File Structure

```
boa-sutar-bridge/
├── package.json
├── tsconfig.json
├── CLAUDE.md (this file)
├── FEATURES.md
└── src/
    ├── index.ts                      # Main server
    ├── config.ts
    ├── types/index.ts
    ├── middleware/errorHandler.ts
    ├── utils/{logger,errors,eventBus}.ts
    ├── validators/syncValidator.ts
    ├── services/
    │   ├── boaClient.ts              # HTTP client to BOA
    │   ├── sutarClient.ts            # HTTP client to SUTAR
    │   ├── syncService.ts            # Core sync logic
    │   ├── goalMapper.ts             # 1:1, 1:N, N:1 mappings
    │   ├── alignmentChecker.ts       # Alignment scoring
    │   ├── feedbackService.ts        # Feedback capture
    │   ├── conflictResolver.ts       # Conflict resolution
    │   └── metricsAggregator.ts      # Metrics aggregation
    ├── models/{SyncRecord,AlignmentMetric,Feedback}.ts
    └── routes/{sync,alignment,feedback,metrics}.ts
```

## Key Formulas

### Alignment Score
```
avgDrift = sum(|boaProgress - sutarProgress|) / count
alignmentScore = max(0, 100 - avgDrift)
```

### Alignment Levels
- score ≥ 90 → fully-aligned
- score ≥ 70 → mostly-aligned
- score ≥ 50 → partially-aligned
- else → misaligned
