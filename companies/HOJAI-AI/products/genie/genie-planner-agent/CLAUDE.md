# genie-planner-agent — Planner Agent (D6)

> **Port:** 4744  
> **Tagline:** *Your daily cockpit. Todos, habits, time-blocks.*

## What it does

Daily/weekly planning workspace: todos (with priorities, tags, due dates), habits (with streaks), time-blocks, daily snapshot, and stats.

## Endpoints

```
GET    /health
GET    /
GET    /todos/by-user/:userId              — list todos (filter: status, date, priority)
POST   /todos/by-user/:userId              — create todo
PATCH  /todos/:todoId                      — update todo
DELETE /todos/:todoId                      — delete todo
POST   /todos/:todoId/complete             — mark complete
GET    /habits/by-user/:userId             — list habits + todayDone + currentStreak
POST   /habits/by-user/:userId             — create habit
POST   /habits/:habitId/log                — log habit (idempotent: 200 if already logged today)
DELETE /habits/:habitId                    — delete + cascade logs
GET    /blocks/by-user/:userId             — list time blocks (filter: date)
POST   /blocks/by-user/:userId             — create time block
DELETE /blocks/:blockId                     — delete block
GET    /today/:userId                      — today's snapshot (todos + habits + blocks)
GET    /stats/:userId                      — completion stats
```

## Seeded Data

- **6 todos** (priorities: 2 high, 2 medium, 2 low; statuses: 4 pending, 2 completed)
- **4 habits** (Meditate, Read, Exercise, No social media) + 14 habit logs
- **4 time blocks** today (Deep work, Lunch, Team standup, Gym)

## Run

```bash
PORT=4744 JWT_SECRET=... node src/index.js
```

## Tests

```bash
JWT_SECRET=... INTERNAL_SERVICE_TOKEN=... PORT=4744 node --test tests/planner-readiness.test.mjs
# 32 tests, 0 failures

JWT_SECRET=... INTERNAL_SERVICE_TOKEN=... PORT=4744 node src/index.js &
JWT_SECRET=... INTERNAL_SERVICE_TOKEN=... PORT=4744 bash tests/smoke.sh
# 28 smoke checks pass
```

## Status

✅ **D6 Complete** (Phase D — Agent gaps). Built 2026-06-25.
