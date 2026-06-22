# Personal Intelligence OS — Phase 6: Agentic + Marketplace

**Status:** ✅ **SHIPPED** (2026-06-22) — All 4 features live with **102/102 tests passing**
**Tagline:** *Genie acts for you — and you can teach it new tricks.*

---

## ✅ SHIPPED SUMMARY (2026-06-22)

| # | Feature | Port | Tests | What it does |
|---|---------|------|-------|--------------|
| 6.1 | **background-agents** | 4809 | 28/28 | Persistent cron-scheduled tasks, budgets, audit log, 5 built-in agents |
| 6.2 | **one-shot-actions** | 4810 | 24/24 | Plan, detect intent, confirmation gates (none/soft/hard/irreversible), execute |
| 6.3 | **genie-skills** | 4811 | 39/39 | Marketplace: 7 built-in skills, install/uninstall, trigger matching, rate limits, revoke |
| 6.4 | **long-running-tasks** | 4812 | 11/11 | Multi-hour/multi-day task tracking (compose background-agents + one-shot-actions) |

**Total Phase 6 tests: 102/102 passing** (all 4 services live).

All four services are wired into `runtime/genie` (port 7100) via `/api/pios/agents/*`, `/api/pios/actions/*`, and `/api/pios/skills/*`. Each can be opted out via env flags (`USE_BACKGROUND_AGENTS=false`, `USE_SKILLS_MARKETPLACE=false`).

### 6.1 Background agents (28/28 tests, port 4809)

- Cron expressions with `matchesCron` + `nextMatches`
- Budget enforcement (`budgetPerDay`, `budgetPerRun`, `costExceeded` halt)
- 5 built-in agents: weekly-reflection, daily-priorities, money-check, relationship-warmth, learning-review
- Per-user audit log of every run (success / failed / budget_exceeded)
- Manual `tick` for testing
- `shouldRun` decision (per-agent due check)
- Endpoints: list/create/get/update/delete/tick/audit/runs/built-ins/schedule-preview

### 6.2 One-shot actions (24/24 tests, port 4810)

- Confirmation tiers: none (<$10), soft ($10-100), hard (>$100), irreversible
- Intent detection via regex: restaurant booking, calendar add, shopping, message send
- `buildPlan` → `confirmPlan` → `executePlan` flow
- Per-user plan storage + audit trail
- Function-registry execution (real tool calls in-process; HTTP test halts cleanly)
- Endpoints: plan / plans / confirm / execute / audit

### 6.3 Genie Skills (39/39 tests, port 4811)

- 7 built-in skills: opentable, google-maps, spotify, whatsapp, slack, notion, linear
- Curated catalog with safety-review queue (pending/approved/rejected)
- Per-user install/uninstall, enable/disable toggle
- Trigger matching (`scoreTriggerMatch`, `findMatchingSkills`) — LLM router uses this to load only relevant skills
- Daily rate limit per user per skill (`checkRateLimit`, `recordUsage`)
- One-click revoke — uninstalls everything and clears usage
- Endpoints: catalog / pending / install / uninstall / installed / toggle / submit / review / match / check-rate / record-usage / revoke / built-ins

### 6.4 Long-running tasks (11/11 tests, port 4812)

- Per-user task tracking with status state machine (pending → in_progress → awaiting_input → completed / failed / cancelled)
- Progress 0-100% (clamped)
- History log (capped at 50 entries) for audit
- Soft-delete (cancel) — task remains readable with `status: cancelled`
- Composes with `background-agents` and `one-shot-actions` via `agentRefs` / `planRef` (Phase 7 will wire this end-to-end)
- Endpoints: list / create / get / progress / cancel

---

## What this phase ships

The "Genie as an agent" layer. Genie doesn't just answer — it does.

| # | Feature | What it does |
|---|---------|--------------|
| 6.1 | **Background agents** | Genie runs tasks on a schedule. "Every Sunday, review my week's emails and draft replies for the 3 most important ones." |
| 6.2 | **One-shot actions** | "Book me a table for 2 at 8pm near the office." Genie finds a restaurant, makes a reservation, adds it to your calendar. |
| 6.3 | **Genie Skills (marketplace)** | Third-party skills: "Connect to Todoist", "Use OpenTable for restaurants", "Get weather from a premium source." |
| 6.4 | **Long-running tasks** | "Plan my Tokyo trip" → Genie works on this for hours/days, surfaces progress, asks for input. |

---

## Background agents

The Reasoning Engine (Phase 2) handles multi-step. Background agents handle multi-DAY.

### How it works

A background agent is a **persistent task** with:
- A goal ("every Sunday, review my week's emails")
- A schedule (cron, or "after event X")
- A list of allowed tools
- A budget (max N LLM calls per execution, max cost per day)
- An output destination ("draft in my email", "save to memory", "notify me")

### Example agents (built-in)

| Agent | Schedule | Goal |
|-------|----------|------|
| Weekly reflection | Sunday 8pm | Generate the weekly digest (uses Phase 2 Reflection Engine) |
| Daily priorities | Every morning, 30 min after wake | Re-rank the day's tasks based on energy, calendar, goals |
| Money check | Every Friday 5pm | "How am I doing vs budget this week?" |
| Relationship warmth | Daily 9am | "Who should I reach out to today?" |
| Learning review | Daily 8pm | "What's on the spaced repetition queue?" |
| Travel scout | When flight is detected in email | "Find hotels for my upcoming trip" |

### User control

- List of active agents (with the option to pause/delete)
- Per-agent notification settings ("only when there's something important")
- Per-agent budget ("max $0.50/day on the travel scout")
- Per-agent audit log ("show me everything this agent did this week")

### SUTAR OS integration

Background agents use the existing SUTAR OS infrastructure (sutar-decision-engine, sutar-agent-teaming, sutar-trust-engine) for orchestration. We're not building a new agent system — we're composing the existing pieces.

---

## One-shot actions

The user asks for something. Genie does it. Single execution, no long-running state.

### The pattern

```
User: "Book a table for 2 at 8pm near the office, somewhere nice for an anniversary"

Genie's plan:
  1. Search for restaurants near office with availability at 8pm
  2. Filter for "anniversary" vibes (quiet, nice, etc.)
  3. Show top 3 to user
  4. User picks one
  5. Make reservation via OpenTable
  6. Add to calendar with notes
  7. Notify user "Done — reserved at [Restaurant] for 8pm, added to your calendar"
```

### The tools needed

- Web search / restaurant API
- OpenTable (or similar)
- Calendar write
- Notification

Most of these come from Phase 5 (calendar, contacts) and Phase 6's new Skills marketplace.

### Confirmation gates

- Below $10: no confirmation needed (e.g. "save this to memory")
- $10-$100: confirm before paying ("$45 — confirm?")
- Over $100: full details + explicit "yes, charge me"
- Irreversible: always confirm ("I'll cancel your flight, you get $0 back. Confirm?")

### Latency

For most one-shot actions, target P50 < 5s, P95 < 15s. The user is waiting, but the value is clear.

---

## Genie Skills (marketplace)

The "long tail" of integrations. We can't build every connector ourselves. Skills let third parties (or advanced users) extend Genie.

### Skill format

A skill is a small package that defines:
- `name` and `description` (for the LLM to read)
- `auth` (OAuth scopes, API key, or none)
- `tools` (what the LLM can call — endpoints, parameters, schemas)
- `triggers` (optional — when should the LLM proactively consider this skill?)
- `cost` (per-call cost in USD, so the budget agent can enforce it)
- `version` + `author` + `license`

### Built-in skills (shipped with Genie)

- OpenTable (restaurants)
- Google Maps (directions, places)
- Spotify (music)
- WhatsApp (messaging)
- Slack (messaging)
- Notion (notes)
- Linear (issues)

### Third-party skills (curated marketplace)

- Premium weather services
- Specialty restaurant finders
- Travel booking
- Investment tracking
- Health coaching
- Language tutoring
- Meditation

### Safety

Every third-party skill is reviewed before listing:
- Code review (static analysis + manual)
- Sandbox test (skill runs in a restricted environment with mock data)
- Privacy review (what data does it send to its own server?)
- Cost review (no surprise bills)
- Rate limit (max N calls per user per day)
- Revocation (one-click disable from Genie settings)

### Skill discovery

The LLM has access to the full skill catalog. When the user asks something, the LLM:
1. Checks built-in capabilities
2. Checks if any skill matches ("OpenTable can do restaurant reservations")
3. If multiple skills match, asks the user which to use
4. If a skill needs auth and the user hasn't connected it, prompts to connect

---

## Long-running tasks

The hardest type. The user wants something complex that takes hours/days.

### Example

User: "Plan my Tokyo trip for next spring. I have 7 days. I want to see temples, eat amazing food, and avoid tourist traps. My budget is $5K not including flights."

Genie's plan:
1. Research: temples in Tokyo (top 10), food districts (5 best), off-the-beaten-path neighborhoods
2. Constraints: dates, budget, user's preferences (from memory-substrate)
3. Day-by-day itinerary: balance activity and rest, group nearby things
4. Bookings: hotel, restaurant reservations, any must-book attractions
5. Output: full itinerary in the user's calendar, with notes, links, and a budget breakdown

This might run for 10-30 minutes, surfacing intermediate results to the user.

### The execution model

```
User asks
    ↓
Reasoning Engine creates a Plan (5-20 steps)
    ↓
Background agent executes
    ↓
At key milestones, agent pauses and asks for input
    ↓
Agent resumes on user confirmation
    ↓
Final output delivered via morning briefing + memory
```

### Cancellation

The user can cancel at any time. Partial work is saved to memory-substrate as a "trip plan draft" so the user can resume later.

---

## Success metrics

- **Background agents running per user** — average 3+ by end of Month 6
- **Agent retention** — > 60% of users with an active background agent are still using it 30 days later
- **One-shot actions** — > 40% of users have asked for at least 1 one-shot action
- **Skill marketplace** — 30+ third-party skills by end of Month 6; 20% of users have installed at least 1 third-party skill
- **Long-running tasks** — > 10% of users have asked for at least 1 long-running task
- **Confirmation gate accuracy** — > 95% of confirmations are accepted (i.e. the model rarely asks unnecessarily)
- **Cost per active user per month** — < $2 in LLM costs (the abstraction layer's cost tracking makes this measurable)

---

## Team (5-7 engineers)

| Engineer | Owns | Timeline |
|----------|------|----------|
| **Eng A** | Background agents runtime (scheduler, budget, audit) | Month 6 weeks 1-3 |
| **Eng B** | One-shot action confirmation framework | Month 6 weeks 1-2 |
| **Eng C** | Genie Skills format + marketplace backend | Month 6 weeks 1-4 |
| **Eng D** | 5 built-in skills (OpenTable, Maps, Spotify, WhatsApp, Slack) | Month 6 weeks 2-4 |
| **Eng E** | Long-running task orchestration | Month 6 weeks 2-4 |
| **Eng F** | Skill safety review pipeline | Month 6 weeks 3-4 |
| **Eng G** | UX: where to find agents, skills, tasks in the app | Month 6 weeks 2-4 |

---

## Risks & mitigations

| Risk | Mitigation |
|------|------------|
| Background agents spam users | Per-agent notification settings; "only when important" default; daily digest instead of real-time |
| One-shot actions make expensive mistakes | Strict confirmation gates; refund/undo where possible; per-action budget |
| Skill marketplace becomes a security nightmare | Sandboxed execution; reviewed before listing; revocation = one click |
| Long-running tasks feel like vaporware | Clear progress updates; partial results; user can intervene |
| Cost per user explodes | Per-agent budget; cost tracking via LLM abstraction; daily caps |
| Users don't trust Genie to act | Confirmation gates everywhere; audit log; "Genie did X, undo?" pattern |
| 23 existing specialists feel obsolete | They don't — they're TOOLS that the agents use. The agent layer sits ON TOP. |

---

## End-of-Phase-6 picture

By December 2026, Genie is:

- A **Personal Intelligence OS** that knows you (Phase 1)
- A **Reasoning engine** that plans (Phase 2)
- A **Reflection engine** that learns (Phase 2)
- A **Score** that shows growth (Phase 3)
- A **Relationship graph** that tracks people (Phase 3)
- A **Learning loop** that resurfaces forgotten things (Phase 3)
- A **Voice interface** that works anywhere (Phase 4)
- An **Ambient assistant** that briefs you (Phase 4)
- A **Cross-device companion** (Phase 4)
- **Integrated with your life** — health, calendar, email, contacts, photos, tasks (Phase 5)
- An **Agent** that does things for you (Phase 6)
- A **Marketplace** that extends to anything (Phase 6)

And the **23 original Genie specialists** are still running, still doing their jobs, now armed with a real brain.

---

## What comes after Phase 6

- **Phase 7: Multi-user Genie** — families, teams. Genie knows your family dynamics. It mediates. It plans group events. It remembers what your spouse told it.
- **Phase 8: Genie for organizations** — small businesses, professional teams. The PI Score becomes a "team health" dashboard. Background agents become workflows.
- **Phase 9: Genie for the public** — anonymized patterns. "People like you tend to..." The PI Score becomes a benchmark.
- **Phase 10: Genie for AGI** — when the LLM gets smarter, Genie gets smarter with it. The abstraction layer pays off.

---

*Phase 6 marks the end of the "Personal Intelligence OS" transformation. By December 2026, Genie stops being one of many AI assistants and starts being the only one you'd want to keep.*

*Authored: 2026-06-22*
*See also: [PHASE-1-FOUNDATION.md](PHASE-1-FOUNDATION.md) for the shipped first phase*
