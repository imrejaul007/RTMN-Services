# sutar-exploration

> **Service:** SUTAR OS Exploration
> **Port:** 4255
> **Layer:** 7 (Exploration + Discovery + Evaluator + Reputation + ROI)
> **Built:** June 20, 2026
> **Status:** ✅ Production-ready v1.0

## What it does

Curated exploration journeys on top of `/services/discovery-engine` (4256).
Instead of letting users run free-text searches, this service offers
**structured "explore" journeys** that guide them through the ecosystem
(e.g. "I want to find an agent that can X" → guided query).

A journey is a sequence of prompts (collect user input) + actions (call the
discovery-engine). Sessions are stateful so partial input is preserved across
HTTP calls.

## Endpoints

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/health` | Health + counts |
| GET | `/api/journeys` | List available journeys |
| GET | `/api/journeys/:id` | Get one journey (its prompts + actions) |
| POST | `/api/journeys/:id/start` | Start a new exploration session |
| POST | `/api/sessions/:id/step` | Advance the session with user input |
| GET | `/api/sessions/:id` | Get session state |
| GET | `/api/audit` | Recent journey activity |

## Journeys (4 seeded)

| ID | Title | Steps |
|----|-------|-------|
| `find-agent-for-task` | Find an agent that can do X | collect task → search agents → rank by rating |
| `find-twin-for-entity` | Find the twin that owns entity X | collect entity type → search twins |
| `discover-services-by-capability` | What services provide capability X? | collect capability → search services |
| `best-negotiator` | Best negotiator for this intent | collect intent type → search agents with negotiate cap → rank → take top 1 |

## Step types

- `prompt` — ask the user for input; save to `session.inputs[inputKey]`
- `action` — run `discovery.get(/api/<resource>/search)` with filter params, optionally rank and take

## Next steps

- Add more journeys (e.g. "compare two agents", "find me a twin + its memory")
- Persist sessions to Redis (TTL 30min) so sessions survive server restart
- Add journey analytics (completion rate, drop-off points)
