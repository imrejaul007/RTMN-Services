# Genie Life Replay

> Phase C/C3 moat feature. AI-generated monthly / yearly / life-to-date personal reviews.

## Port

**4730** (default)

## What it does

Life Replay pulls together a user's memories, moods, prayers, gratitudes, and meditation sessions over a period, then synthesizes them into a warm narrative summary + highlight reel. It is the "year-in-review" feature for your personal life.

### Three core modules

| Module | Purpose | Key endpoints |
|---|---|---|
| **Replay** | Generate and store life-replay summaries | `/replay/period`, `/replay/history`, `/replay/get` |
| **Stats** | Quick aggregated stats over a date range | `/stats/summary`, `/stats/thematic` |
| **Insights** | Highlight moments + theme discovery | `/insights/highlights`, `/insights/themes` |

## Endpoints (summary)

```
GET    /health
GET    /ready
GET    /api/llm-health
GET    /api/db-health
GET    /api/readiness

POST   /replay/period/:userId       # Generate a replay for monthly/yearly/life
GET    /replay/history/:userId      # List all replays for a user
GET    /replay/get/:replayId        # Get a specific replay

GET    /stats/summary/:userId       # Quick stats for last 30 days
GET    /stats/thematic/:userId      # Theme frequency

GET    /insights/highlights/:userId # Curated highlight moments
GET    /insights/themes             # Cross-user theme discovery
```

## How a replay is generated

1. **Period computation** — `monthly` (last calendar month), `yearly` (last calendar year), `life` (2000 to today), or custom date range
2. **Data aggregation** — fetches in parallel from:
   - `memory-inbox` (`/api/timeline`)
   - `wellness-os` (`/api/wellness/moods`)
   - `spiritual-os` (`/api/spiritual/{prayers,gratitude,meditations}`)
3. **Stats computation** — counts + averages per category
4. **Theme extraction** — keyword frequency over 22 themes
5. **AI summary** — calls `@rtmn/shared/lib/llm` with `claude-3-haiku`, prompting for JSON `{title, summary, highlights[]}`
6. **Graceful fallback** — if LLM unavailable / fails, uses deterministic template
7. **Persist** — saves to `replayStore` (PersistentMap)

## Architecture

- **Express + CORS + Helmet**, Bearer JWT auth via `@rtmn/shared/auth`
- **PersistentMap** for replay history (JSON file-backed)
- **Aggregates 4 upstream services** with graceful degradation
- **LLM routing** via `@rtmn/shared/lib/llm` (inference-gateway at :4746)
- **Idempotent seeding** — 2 example replays (monthly + yearly)

## Run

```bash
cd companies/HOJAI-AI/products/genie/genie-life-replay
npm install
PORT=4730 JWT_SECRET=$(openssl rand -hex 32) npm start
```

## Test

```bash
# Smoke (works without upstream specialists)
bash tests/smoke.sh

# Full readiness suite
JWT_SECRET=$(openssl rand -hex 32) node tests/replay-readiness.test.mjs
```

## Phase context

C3 in the **Phase C / 10 moat features** plan (genie-100-percent-plan.md).
- Tier: **10** (highest personal value)
- Effort: **1 week** (estimate)
- Status: ✅ Built and tested (2026-06-24)

## How users interact

1. **End of month**: tap "Replay" → see "May 2026 — A Month of Quiet Wins"
2. **End of year**: yearly replay reads like a Spotify Wrapped for your life
3. **Highlight reel**: pull up curated "best moments" anytime
4. **Stats snapshot**: see counts at a glance

The dashboard shows: total memories captured, gratitude entries, meditation minutes, answered prayers, top themes, and a 2-3 sentence AI narrative.