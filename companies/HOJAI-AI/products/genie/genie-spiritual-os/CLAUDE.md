# Genie Spiritual OS

> Phase C/C8 moat feature. Personal spiritual practice tracker — prayer, gratitude, reflection, and meditation.

## Port

**4729** (default)

## What it does

The Spiritual OS helps users track and grow a personal spiritual practice. It is **non-denominational** and **secular-friendly** — useful whether the user follows a religion, meditates, or just wants a space for gratitude and reflection.

### Five core modules

| Module | Purpose | Key endpoints |
|---|---|---|
| **Prayer** | Track prayer requests, mark them answered, compute prayer streaks | `/prayer/list`, `/prayer/add`, `/prayer/answered`, `/prayer/streak` |
| **Gratitude** | Daily gratitude entries (3-10 items), themes, streaks | `/gratitude/today`, `/gratitude/add`, `/gratitude/history`, `/gratitude/themes` |
| **Reflection** | Journaling with prompts, themes, search | `/reflection/prompts`, `/reflection/add`, `/reflection/list`, `/reflection/search` |
| **Meditation** | Session logging (8 types), stats, streaks | `/meditation/types`, `/meditation/log`, `/meditation/stats`, `/meditation/recent` |
| **Insights** | Daily focus + weekly verse, computed from date | `/insights/daily-focus`, `/insights/weekly-verse`, `/insights/overview` |

## Endpoints (summary)

```
GET    /health
GET    /ready
GET    /api/llm-health
GET    /api/db-health
GET    /api/readiness

GET    /prayer/categories
GET    /prayer/list/:userId
POST   /prayer/add/:userId
POST   /prayer/answered/:userId/:prayerId
GET    /prayer/streak/:userId

GET    /gratitude/today/:userId
POST   /gratitude/add/:userId
GET    /gratitude/history/:userId
GET    /gratitude/themes/:userId

GET    /reflection/prompts
POST   /reflection/add/:userId
GET    /reflection/list/:userId
GET    /reflection/search/:userId

GET    /meditation/types
POST   /meditation/log/:userId
GET    /meditation/stats/:userId
GET    /meditation/recent/:userId

GET    /insights/overview/:userId
GET    /insights/daily-focus
GET    /insights/weekly-verse

GET    /api/spiritual/prayers         # persistent map (seeded)
GET    /api/spiritual/gratitude
GET    /api/spiritual/reflections
GET    /api/spiritual/meditations
```

## Architecture

- **Express + CORS + Helmet**, Bearer JWT auth via `@rtmn/shared/auth`
- **Persistent stores** via `@rtmn/shared/lib/persistent-map` (JSON file-backed)
- **Readiness routes** via `@rtmn/shared/lib/genie-readiness` (LLM + DB + combined)
- **Demo data** seeded at startup (idempotent — only seeds if empty)

## Run

```bash
cd companies/HOJAI-AI/products/genie/genie-spiritual-os
npm install
PORT=4718 JWT_SECRET=$(openssl rand -hex 32) npm start
```

## Test

```bash
# Smoke test
bash tests/smoke.sh

# Full readiness suite (30+ assertions)
JWT_SECRET=$(openssl rand -hex 32) node tests/spiritual-readiness.test.mjs
```

## Phase context

C8 in the **Phase C / 10 moat features** plan (genie-100-percent-plan.md).
- Tier: **10** (highest personal value)
- Effort: **3 days** (smallest of the 10 features)
- Status: ✅ Built and tested (2026-06-24)

## How users interact

1. **Morning**: open "daily focus" prompt + log gratitude
2. **Midday**: add a prayer request, or mark one as answered
3. **Evening**: write a reflection journal entry
4. **Anytime**: start a meditation session and log it when done

The dashboard shows: today's gratitude ✓, current streaks (prayer / gratitude / meditation), reflection count, last meditation, and the weekly verse.