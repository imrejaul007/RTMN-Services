# Genie Future Self

> Phase C/C4 moat feature. Time-shifted advice from your future self + AI-generated letters.

## Port

**4731** (default)

## What it does

Future Self gives the user a perspective from 5/10/20 years in the future. It uses their current values, goals, fears, and hopes to project thoughtful advice — both as quick answers to questions ("Should I take this job?") and as full letters from "you-at-50" to "you-at-35".

### Three core modules

| Module | Purpose | Key endpoints |
|---|---|---|
| **Profile** | Store the user's values, goals, priorities, fears, hopes | `/profile/get`, `/profile/update` |
| **Advice** | Quick answers from future self (any year, any question) | `/advice/ask`, `/advice/history`, `/advice/get` |
| **Letter** | AI-generated letters from future self to present self | `/letter/write`, `/letter/list`, `/letter/read` |

## Endpoints (summary)

```
GET    /health
GET    /ready
GET    /api/llm-health
GET    /api/db-health
GET    /api/readiness

GET    /profile/get/:userId
POST   /profile/update/:userId

POST   /advice/ask/:userId          # body: { question, year? }
GET    /advice/history/:userId
GET    /advice/get/:adviceId

POST   /letter/write/:userId        # body: { year?, subject? }
GET    /letter/list/:userId
GET    /letter/read/:letterId
```

## How advice/letter is generated

1. **Load profile** (values, goals, fears, hopes) — falls back to defaults if missing
2. **Try LLM** — `claude-3-haiku` via `@rtmn/shared/lib/llm` with system prompt "you are the user's future self, N years older"
3. **Parse JSON response** — `{advice, themes}` for ask; `{subject, body}` for letters
4. **Template fallback** — if LLM unavailable / fails / JSON malformed, deterministic template that references their #1 value
5. **Persist** — saves to `adviceStore` / `lettersStore` (PersistentMap)

## Architecture

- **Express + CORS + Helmet**, Bearer JWT auth via `@rtmn/shared/auth`
- **PersistentMap** for profiles, advice, letters
- **LLM routing** via `@rtmn/shared/lib/llm` with deterministic fallback
- **Idempotent seeding** — 1 example profile + 2 advice + 1 letter

## Run

```bash
cd companies/HOJAI-AI/products/genie/genie-future-self
npm install
PORT=4731 JWT_SECRET=$(openssl rand -hex 32) npm start
```

## Test

```bash
# Smoke
bash tests/smoke.sh

# Full readiness suite
JWT_SECRET=$(openssl rand -hex 32) node tests/future-readiness.test.mjs
```

## Phase context

C4 in the **Phase C / 10 moat features** plan (genie-100-percent-plan.md).
- Tier: **10** (highest personal value)
- Effort: **1 week** (estimate)
- Status: ✅ Built and tested (2026-06-24)

## How users interact

1. **Set your profile** — list values, goals, fears, hopes
2. **Ask the future** — "Should I move abroad?", "What should I focus on this year?", etc.
3. **Read letters** — pull up a letter from 2040 on your birthday
4. **Look back** — see your question history and how the answers aged

The dashboard shows: latest advice, latest letter, profile summary with editable fields.