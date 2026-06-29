# SUTAR Goal OS

> **Goal decomposition engine for autonomous agents**

**Port:** 4242
**Layer:** 4 (Decision + Execution)
**Package:** `@hojai/sutar-goal-os`

## Overview

SUTAR Goal OS provides:
- Goal creation and management
- Automatic task decomposition
- Progress tracking
- Execution management
- Critical path identification

## Quick Start

```bash
cd sutar-os/core/sutar-goal-os
npm install
npm run dev
# Service runs on http://localhost:4242
```

## Features

| Feature | Status |
|---------|--------|
| Goal creation | ✅ Implemented |
| Task decomposition | ✅ Implemented |
| Progress tracking | ✅ Implemented |
| Critical path | ✅ Implemented |
| Execution management | ✅ Implemented |

---

## API Examples

### Health Check

```bash
curl http://localhost:4242/health
```

Response:
```json
{
  "status": "ok",
  "service": "sutar-goal-os",
  "port": 4242,
  "layer": "Decision + Execution",
  "goals": 15,
  "timestamp": "2026-06-28T12:00:00.000Z"
}
```

### Create Goal

```bash
curl -X POST http://localhost:4242/api/goals \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <jwt_token>" \
  -d '{
    "title": "Expand Restaurant to 3 New Locations",
    "description": "Open new branches in locations A, B, and C",
    "type": "business",
    "priority": "high",
    "deadline": "2026-09-30T00:00:00.000Z",
    "createdBy": "agent-restaurant-001"
  }'
```

Response:
```json
{
  "id": "goal_abc123",
  "title": "Expand Restaurant to 3 New Locations",
  "description": "Open new branches in locations A, B, and C",
  "type": "business",
  "priority": "high",
  "status": "created",
  "tasks": [],
  "progress": 0,
  "createdAt": "2026-06-28T12:00:00.000Z",
  "deadline": "2026-09-30T00:00:00.000Z"
}
```

### List Goals

```bash
curl "http://localhost:4242/api/goals?status=running&priority=high"
```

Response:
```json
{
  "total": 15,
  "returned": 5,
  "goals": [
    {
      "id": "goal_abc123",
      "title": "Expand Restaurant to 3 New Locations",
      "priority": "high",
      "status": "running",
      "progress": 45
    }
  ]
}
```

### Get Goal with Tasks

```bash
curl http://localhost:4242/api/goals/goal_abc123
```

Response:
```json
{
  "id": "goal_abc123",
  "title": "Expand Restaurant to 3 New Locations",
  "description": "Open new branches in locations A, B, and C",
  "type": "business",
  "priority": "high",
  "status": "planned",
  "tasks": [
    {
      "id": "task-abc123-1",
      "title": "Research & Discovery",
      "type": "milestone",
      "estimatedHours": 8,
      "priority": "high",
      "status": "completed"
    },
    {
      "id": "task-abc123-2",
      "title": "Planning & Strategy",
      "type": "milestone",
      "estimatedHours": 4,
      "priority": "high",
      "status": "in_progress"
    }
  ],
  "progress": 45,
  "createdAt": "2026-06-28T12:00:00.000Z"
}
```

### Decompose Goal into Tasks

```bash
curl -X POST http://localhost:4242/api/goals/goal_abc123/decompose \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <jwt_token>" \
  -d '{
    "strategy": "auto",
    "depth": 3,
    "maxTasks": 50
  }'
```

Response:
```json
{
  "goal": { "id": "goal_abc123", "status": "planned" },
  "taskCount": 12,
  "criticalPath": [
    { "id": "task-abc123-1", "title": "Research & Discovery", "hours": 8 },
    { "id": "task-abc123-3", "title": "Location Survey A", "hours": 4 }
  ]
}
```

### Start Goal Execution

```bash
curl -X POST http://localhost:4242/api/goals/goal_abc123/execute \
  -H "Authorization: Bearer <jwt_token>"
```

Response:
```json
{
  "id": "goal_abc123",
  "title": "Expand Restaurant to 3 New Locations",
  "status": "running",
  "startedAt": "2026-06-28T12:00:00.000Z"
}
```

### Get Goal Progress

```bash
curl http://localhost:4242/api/goals/goal_abc123/progress
```

Response:
```json
{
  "goalId": "goal_abc123",
  "status": "running",
  "progress": 45,
  "totalTasks": 12,
  "completedTasks": 5,
  "blockedTasks": 1,
  "inProgressTasks": 3,
  "totalHours": 48,
  "completedHours": 22,
  "remainingHours": 26,
  "estimatedCompletion": "2026-09-30T00:00:00.000Z"
}
```

---

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `GOAL_PORT` | 4242 | Service port |
| `NODE_ENV` | development | Environment (development/production) |

---

## Tech Stack

- Node.js 20+
- Express.js
- JavaScript
- @rtmn/shared (security)

---

**Last Updated:** 2026-06-28
