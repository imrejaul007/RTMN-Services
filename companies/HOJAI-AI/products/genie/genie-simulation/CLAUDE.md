# genie-simulation — Personal Simulation Engine (C1)

> **The "what-if" engine of the Genie ecosystem.**
> "What if I move to Dubai?" / "What if I take that job?" / "What if we have a kid?"
> Runs structured simulations of life decisions using LLM (with template fallback) and
> lets the user compare 2-3 scenarios side-by-side.

| Aspect | Value |
|---|---|
| **Service name** | `genie-simulation` |
| **Port** | `4732` |
| **Category** | C1 — Personal Simulation Engine (Phase C moat) |
| **Status** | ✅ Production-ready |
| **Auth** | Bearer JWT (`@rtmn/shared/auth`) + `x-internal-token` |
| **Persistence** | Two JSON-file stores: `simulations`, `simulation-templates` |
| **AI** | `@rtmn/shared/lib/llm` (inference-gateway :4746 + claude-3-haiku, stub fallback) |
| **Owner** | HOJAI-AI / genie product line |

## Quick start

```bash
npm install
JWT_SECRET=test PORT=4732 INTERNAL_SERVICE_TOKEN=demo node src/index.js
# in another shell
bash tests/smoke.sh
node tests/simulation-readiness.test.mjs
```

## Endpoints

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/health` | open | Health check (no auth) |
| GET | `/api/llm-health` | bearer | LLM gateway status + stub_mode |
| GET | `/api/db-health` | bearer | Mongo connection status (file-mode default) |
| GET | `/api/readiness` | bearer | Overall readiness (LLM + DB + seed) |
| GET | `/templates/list` | bearer | List 7 templates (`?category=career\|life\|finance\|family`) |
| GET | `/templates/get/:id` | bearer | Get a single template |
| POST | `/scenarios/run/:userId` | bearer | Run a simulation `{title, scenario, variables, useAI?}` |
| GET | `/scenarios/list/:userId` | bearer | List all simulations for a user |
| GET | `/scenarios/get/:scenarioId` | bearer | Get one simulation |
| POST | `/scenarios/compare/:userId` | bearer | Compare 2-3 simulations `{scenarioIds:[…]}` |

### Scenario types

| Type | Category | Variables | Outcomes |
|---|---|---|---|
| **move** | life | location, job, salary | financial, lifestyle, career |
| **job** | career | company, role, salary, commute | financial, career, lifestyle |
| **quit** | career | next_step, runway_months | financial, career, mental |
| **buy** | finance | asset, price, down_payment | financial, lifestyle, risk |
| **marriage** | family | partner, age, culture | relationship, lifestyle, social |
| **child** | family | age, support, location | financial, lifestyle, career |
| **relocate** | life | location, family_size, climate | family, lifestyle, cost |

### Run a simulation

```bash
curl -X POST http://localhost:4732/scenarios/run/user-001 \
  -H "Authorization: Bearer $TOKEN" \
  -H "x-internal-token: $INTERNAL_TOKEN" \
  -H 'content-type: application/json' \
  -d '{
    "title":"Moving to Dubai",
    "scenario":"move",
    "variables":{"location":"Dubai","salary":"AED 420k","job":"Senior PM"}
  }'
```

Returns `201` with:
```json
{
  "success": true,
  "data": {
    "id": "sim-1a2b3c4d",
    "userId": "user-001",
    "title": "Moving to Dubai",
    "scenario": "move",
    "outcomes": {
      "financial": { "short_term": "...", "long_term": "..." },
      "lifestyle": { "climate": "...", "cost_of_living": "...", "social": "..." },
      "career":   { "growth": "...", "network": "..." },
      "risks": ["..."],
      "opportunities": ["..."],
      "recommendation": "A strong move if..."
    },
    "pros": ["Tax-free salary", "Travel hub"],
    "cons": ["Distance from family", "Cultural adjustment"],
    "aiUsed": true,
    "createdAt": "2026-06-24T12:00:00Z"
  }
}
```

### Compare scenarios

```bash
curl -X POST http://localhost:4732/scenarios/compare/user-001 \
  -H "Authorization: Bearer $TOKEN" \
  -H "x-internal-token: $INTERNAL_TOKEN" \
  -H 'content-type: application/json' \
  -d '{"scenarioIds":["sim-aaa","sim-bbb"]}'
```

Returns a 5-dimension score matrix (financial / lifestyle / career / risk / relationship)
heuristically computed from pros/cons keyword overlap. Use it to show a side-by-side
"which option wins where" chart in the UI.

## Architecture

```
genie-simulation (4732)
├── src/index.js                       # Express bootstrap, seed data, readiness routes
├── src/routes/scenarios.js            # run, list, get, compare
└── src/routes/templates.js            # list, get
        │
        ├─→ @rtmn/shared/auth          # Bearer JWT (CorpID-backed)
        ├─→ @rtmn/shared/lib/llm       # LLM gateway :4746 with stub fallback
        ├─→ @rtmn/shared/lib/genie-readiness  # installReadinessRoutes + autoSeed
        └─→ PersistentMap              # JSON-file-backed stores
              ├── simulations/         # user scenarios
              └── simulation-templates/
```

## Seed data (Phase A)

- **1 seeded scenario**: `sim-1` — "Moving to Dubai" for `user-001`
- **7 templates** across 4 categories:
  - life: `tpl-move`, `tpl-relocate`
  - career: `tpl-job`, `tpl-quit`, `tpl-relocate-flip` (rename pending)
  - finance: `tpl-buy`
  - family: `tpl-marriage`, `tpl-child`

## Tests

| Suite | File | Assertions | Status |
|---|---|---|---|
| Readiness (Node, in-process) | `tests/simulation-readiness.test.mjs` | 42 | ✅ |
| Smoke (curl) | `tests/smoke.sh` | 9 checks | ✅ |

Run them all:
```bash
JWT_SECRET=test PORT=4732 INTERNAL_SERVICE_TOKEN=demo node src/index.js &
node tests/simulation-readiness.test.mjs
bash tests/smoke.sh
```

## Why C1 matters

Decision fatigue is the #1 friction point in personal AI. People don't want
**advice**, they want **structured comparison**. Personal Simulation Engine:

1. Surfaces 7 common life decisions as one-click templates
2. Uses LLM to generate domain-aware outcomes (financial, lifestyle, career)
3. Falls back to curated templates if LLM is offline
4. Lets the user **compare 2-3 scenarios** to make the trade-off visible
5. Becomes more valuable over time as we log the user's actual decisions

## Roadmap (future)

- [ ] Connect to real TwinOS data (use user's actual income, age, family as defaults)
- [ ] Pull real estate / salary data via HOJAI Foundation services
- [ ] "Reverse simulation": describe a life goal, get the path that gets you there
- [ ] Multi-user decision rooms (compare with partner on `tpl-marriage`)
- [ ] Auto-trigger from Genie briefings when a major life event is detected

## Related

- `genie-life-replay` (4730) — past period reflections
- `genie-future-self` (4731) — ask your older self for advice
- `genie-spiritual-os` (4729) — spiritual growth tracking
- Web UI: `genie-os/frontend/web/src/screens/SimulationScreen.tsx`
