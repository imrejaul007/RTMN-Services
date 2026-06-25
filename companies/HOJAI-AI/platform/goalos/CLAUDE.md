# CLAUDE.md — GoalOS (Phase 13 of the 40-phase plan)

> **Path:** `platform/goalos/`
> **Port:** 4297
> **Version:** v0.1.0
> **Status:** Built and tested (2/2 tests passing)

## What it is

**GoalOS — Persistent Objectives service.** Tracks OKRs / goals with key results. Implements Phase 13 ("GoalOS - Persistent Objectives") of the 40-phase plan.

v0.1 covers: CRUD, decompose (goal → key results), progress tracking. v0.2 will back with PostgreSQL.

## Endpoints

| Method | Path | Auth | Purpose |
|---|---|---|---|
| GET | `/api/v1/health` | none | Service health |
| GET | `/api/v1/goals` | none | List goals (filter by status, owner) |
| POST | `/api/v1/goals` | Bearer | Create goal |
| GET | `/api/v1/goals/:id` | none | Get one goal |
| PATCH | `/api/v1/goals/:id` | Bearer | Update name/status/dueDate/owner |
| DELETE | `/api/v1/goals/:id` | Bearer | Delete goal |
| POST | `/api/v1/goals/:id/decompose` | Bearer | Auto-generate 3-5 KRs from goal text |
| POST | `/api/v1/goals/:id/key-results/:krId/progress` | Bearer | Update KR value (0-100) |

## Architecture

```
goalos/
├── package.json
├── CLAUDE.md          ← you are here
├── src/
│   └── index.js      (~160 LOC, Express, in-memory store)
└── __tests__/
    └── goalos.test.js  (2 tests: health + full lifecycle)
```

## Build & test

```bash
npm install
npm test        # 2/2 passing
npm start       # http://localhost:4297
```

## Key design

- **In-memory store** for v0.1 — no DB dependency
- **Bearer auth** on POST/PATCH/DELETE; GET is open (read-only view)
- **Decompose** uses keyword heuristics (launch/ship → release KRs, revenue → finance KRs, users → growth KRs, etc.) — v0.2 will call an LLM
- **Progress** is auto-computed as average of all KR values
- **Graceful degradation** — if auth is disabled via `HOJAI_GOALOS_REQUIRE_AUTH=false`, all endpoints are open

## Related

- Phase 13 docs: `docs/30-phase-roadmap/phase-13-goalos/`
- `@hojai/skills` — SkillOS (Phase 12), wraps this
- `@hojai/copilots` — executive copilot exposes board reports that reference goals
