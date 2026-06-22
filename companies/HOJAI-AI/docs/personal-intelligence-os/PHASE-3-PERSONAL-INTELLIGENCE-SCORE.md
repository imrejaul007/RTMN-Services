# Personal Intelligence OS — Phase 3: Personal Intelligence Score + Relationships

**Status:** 🟡 Planned (target: end of August 2026)
**Tagline:** *Genie measures what it knows about you — and you can see it grow.*

---

## What this phase ships

The user-facing "this is getting smarter" layer:

| # | Feature | What it does |
|---|---------|--------------|
| 3.1 | Personal Intelligence Score dashboard | Real-time score (0-100) with sub-scores for memory, context, learning, relationships, goals, wellness, reflection |
| 3.2 | `@hojai/relationship-graph` service | Model the user's relationships as a graph (people × strength × last_contact × context) |
| 3.3 | `@hojai/learning-os` v2 — actual spaced repetition | Surface things the user should review based on forgetting curves |
| 3.4 | Genie widget on mobile/web | A small "what Genie knows about you" card that grows over time |

---

## The Personal Intelligence Score

The PI Score is **the visible proof that Genie is getting smarter**. Without it, the user has no way to feel the system learning.

### Score components (7)

| Sub-score | What it measures | How it's computed |
|-----------|------------------|-------------------|
| **Memory** | How much Genie knows | Count of facts in memory-substrate, weighted by confidence |
| **Context** | How well Genie retrieves | Retrieval accuracy: did the right memory come up at the right time? |
| **Learning** | How much Genie has improved from feedback | # of times user accepted/corrected Genie's output |
| **Relationships** | Quality of relationship tracking | # of people tracked, freshness of last-contact, accuracy of "who matters" |
| **Goals** | Goal-tracking depth | # of goals, progress updates, milestone completion |
| **Wellness** | Wellness data richness | Days of sleep/mood/workout tracked |
| **Reflection** | Self-awareness | # of insights surfaced that the user acted on |

### Overall score

```javascript
overall = (
  memory * 0.20 +
  context * 0.15 +
  learning * 0.15 +
  relationships * 0.15 +
  goals * 0.15 +
  wellness * 0.10 +
  reflection * 0.10
)
```

The score is updated continuously but only "leveled up" when it crosses a meaningful threshold (10, 25, 50, 75, 90). Each level has a name and an unlock:

| Level | Score | Name | What unlocks |
|-------|-------|------|--------------|
| 1 | 0-9 | Newborn | Basic Q&A, no memory |
| 2 | 10-24 | Acquaintance | Genie remembers your name + a few facts |
| 3 | 25-49 | Friend | Genie tracks goals, relationships, calendar |
| 4 | 50-74 | Confidant | Genie gives proactive suggestions |
| 5 | 75-89 | Partner | Genie reasons across all domains, runs multi-step plans |
| 6 | 90-100 | Soulmate | Genie knows you better than you know yourself |

### Why this matters

- **Gamification done right** — the user isn't playing a game, they're watching Genie grow.
- **Trust calibration** — a low score honestly tells the user "Genie doesn't know you well yet."
- **Differentiation** — no other AI product has this. It's a moat.

---

## Relationship Graph

Right now Genie has `genie-relationship-os` (a specialist). That's fine, but it's just a list. We need a graph.

### Schema

```typescript
type Person = {
  id: string;
  name: string;
  relationshipType: 'family' | 'friend' | 'colleague' | 'acquaintance' | 'other';
  strength: number;  // 0-1, computed from interaction frequency + recency + sentiment
  lastContact: Date;
  context: {  // what Genie knows about them
    birthday?: Date;
    work?: string;
    interests?: string[];
    importantDates?: { date: Date; label: string }[];
  };
  mentions: {  // every time user mentioned this person
    timestamp: Date;
    sentiment: number;  // -1 to 1
    context: string;
  }[];
};
```

### Strength formula

```
strength = (
  (1 / (daysSinceLastContact + 1)) * 0.4 +
  avgSentiment * 0.3 +
  log(mentions_count + 1) / 10 * 0.3
)
```

### Features

- **"Who should I reach out to?"** — ranked by overdue-ness (strength × days since contact)
- **"Tell me about X"** — context dump on any tracked person
- **"Remember X's birthday"** — adds to context, schedules a reminder
- **"How is my relationship with X changing?"** — graph over time

### Proactive triggers

- Person not contacted in 3× the average contact interval
- Person's birthday in next 7 days
- Sentiment of recent mentions dropped > 0.3
- User mentioned a new person 3+ times but hasn't saved them

---

## Learning OS v2

The existing `genie-learning-os` is a stub. Phase 3 turns it into a real spaced-repetition system.

### What gets reviewed

- **People** — "Do you remember Sarah's birthday is March 14?" (asked once a month)
- **Goals** — "You set a goal to run a 5K by June. We're 2 weeks out. How's training?"
- **Commitments** — "You said you'd call mom every Sunday. How did that go this week?"
- **Facts** — "Last month you said you prefer bullet points. Has that changed?"

### Forgetting curve

Use the Ebbinghaus curve: a fact is "fresh" for 1 day, then decay begins. After 7 days it's at 30%. After 30 days it's at 10%. Genie resurfaces facts at the moment they're about to be forgotten — that's when the user actually wants a reminder.

```
freshness(t) = e^(-t / halfLife)
where halfLife depends on:
  - importance (1-5)
  - how often it's been recalled
  - emotional valence (high-valence facts last longer)
```

The Learning OS reads from memory-substrate's confidence scores and schedules reviews at the optimal moment.

---

## Genie widget

A small card on mobile/web that shows:

```
┌────────────────────────────────────────────┐
│  🧞 Your Genie    Personal Intelligence: 47 │
│  ─────────────────────────────────────────  │
│  Memory         ████████░░  78              │
│  Relationships  ██████░░░░  62              │
│  Goals          █████░░░░░  51              │
│  Learning       ████░░░░░░  43              │
│  Wellness       ███░░░░░░░  28              │
│  Context        ██░░░░░░░░  19              │
│  Reflection     ░░░░░░░░░░   0              │
│                                            │
│  This week:                                 │
│  • You reached 3 of 4 weekly goals          │
│  • You mentioned Sarah 4 times              │
│  • Your sleep averaged 6.2h (target: 7.5h)  │
│                                            │
│  [Tell me more]  [What can Genie do now?]   │
└────────────────────────────────────────────┘
```

Tapping "Tell me more" → opens a chat with the LLM explaining each line.
Tapping "What can Genie do now?" → shows the level-unlocked features list.

---

## Success metrics

- **PI Score engagement:** > 60% of users open the widget at least once/week
- **Level-ups:** > 30% of users reach Level 3 (Friend) within 30 days of signup
- **Relationship graph:** average user has 8+ people tracked by Day 30
- **Learning OS:** average user completes 3+ reviews/week
- **PI Score correlates with retention:** Day-30 retention is 2× higher for users with PI Score > 30

---

## Team (4 engineers)

| Engineer | Owns | Timeline |
|----------|------|----------|
| **Eng A** | PI Score engine + dashboard | Month 3 weeks 1-2 |
| **Eng B** | Relationship Graph service | Month 3 weeks 1-3 |
| **Eng C** | Learning OS v2 (spaced repetition) | Month 3 weeks 2-4 |
| **Eng D** | Genie widget (mobile + web) | Month 3 weeks 2-4 |
| **All** | Wire PI Score into morning-briefing-v2 + /api/ask response | Month 3 week 4 |

---

## Risks & mitigations

| Risk | Mitigation |
|------|------------|
| Users feel surveilled by the score | Show only the components; let users opt out of any sub-score |
| Relationship graph feels like a CRM | Frame it as "people you care about" not "contacts" |
| Learning OS becomes nagging | Limit to 1 review/day; respect quiet hours |
| Widget becomes noise | Default to collapsed; expand on tap; max 3 lines of insight |
| PI Score feels like a vanity metric | Tie score deltas to specific actions ("you reached out to 2 people → +3 in relationships") |

---

*Next: [PHASE-4-VOICE-AND-PROACTIVE.md](PHASE-4-VOICE-AND-PROACTIVE.md) — Month 4*

---

## 🚀 SHIPPED — Implementation Status (2026-06-22)

**Phase 3 is FULLY IMPLEMENTED and TESTED.**

### Services shipped

| Service | Port | Tests | Status |
|---------|------|-------|--------|
| **`pi-score`** (`@hojai/pi-score`) | 4798 | **16/16 ✅** | ✅ Running |
| **`relationship-graph`** (`@hojai/relationship-graph`) | 4799 | **25/25 ✅** | ✅ Running |
| **`learning-os-v2`** (`@hojai/learning-os-v2`) | 4800 | **24/24 ✅** | ✅ Running |
| **runtime/genie widget wiring** | — | **11/11 ✅** | ✅ Running |
| **morning-briefing-v2 integration** | 4794 | **9/9 ✅** | ✅ Running |

**Total: 85 new tests, 0 failures.**

### Deliverables

| # | What was built |
|---|---|
| **3.1** | `pi-score` service — 7 weighted sub-scores, 6 levels (Newborn → Soulmate), widget endpoint, feedback logging, 1-hour cache, override API for testing/debugging |
| **3.2** | `relationship-graph` service — people × strength × last_contact × context. Strength formula: 50% base + 30% recency (Ebbinghaus decay) + 20% interaction volume. 5 strength levels: inner_circle → close → active → fading → dormant. Endpoints: list, get, upsert, delete, interaction, stale (reach-out), by-context, summary, seed |
| **3.3** | `learning-os-v2` service — Ebbinghaus-style spaced repetition. `retention = e^(-t/S)` where S = stability. Stability doubles on remembered, halves on forgotten. Endpoints: facts CRUD, review, due (facts below retention threshold), stats (tier counts), seed |
| **3.4** | `/api/pios/widget/:userId` on runtime/genie — aggregates PI Score, stale relationships, facts to refresh, last reflection, proactive suggestions in ONE call. Mobile/web renders directly |
| **3.5** | Wired PI Score, relationship-graph, learning-os-v2, reflection-engine, proactive-engine into morning-briefing-v2. Briefing now shows 🌱 PI Score line and 🧠 facts-to-refresh line in the message |
| **3.5b** | Added 3 new services to `/api/pios/health` on runtime/genie |

### Code locations

```
companies/HOJAI-AI/platform/intelligence/
├── pi-score/
│   ├── lib/scoring.js                   # 7 sub-score algorithms + 6 levels
│   ├── src/index.js                     # service (port 4798)
│   └── tests/pi-score.test.mjs          # 16 tests
├── relationship-graph/
│   ├── lib/strength.js                  # computeStrength, strengthLevel, stale, summary
│   ├── src/index.js                     # service (port 4799)
│   └── tests/relationship-graph.test.mjs # 25 tests
└── learning-os-v2/
    ├── lib/ebbinghaus.js                # retention, review, dueForReview, stabilityTier
    ├── src/index.js                     # service (port 4800)
    └── tests/learning-os-v2.test.mjs    # 24 tests

products/genie/genie-os/runtime/genie/
├── src/index.js                         # /api/pios/widget/:userId + health wiring
└── test/widget.test.cjs                 # 11 tests
```

### Opt-out / env flags

All new services are opt-in via env vars (defaults to local URLs — disable by pointing to unreachable host or unsetting env):

```bash
PI_SCORE_URL=http://localhost:4798            # disable by setting to ""
RELATIONSHIP_GRAPH_URL=http://localhost:4799
LEARNING_OS_V2_URL=http://localhost:4800
```

Morning briefing gracefully degrades — any one service down → that section just doesn't render.

### Try it

```bash
# Start all three services
cd companies/HOJAI-AI/platform/intelligence/pi-score && node src/index.js &
cd companies/HOJAI-AI/platform/intelligence/relationship-graph && node src/index.js &
cd companies/HOJAI-AI/platform/intelligence/learning-os-v2 && node src/index.js &

# Get the widget for a user
curl http://localhost:4799/api/relationships/user-alice/widget

# Add a fact
curl -X POST http://localhost:4800/api/learning/facts \
  -H 'x-internal-token: <TOKEN>' -H 'Content-Type: application/json' \
  -d '{"userId":"u","factId":"likes-pizza","text":"User loves pizza"}'

# Compute PI Score
curl -X POST http://localhost:4798/api/pi-score/u/compute \
  -H 'x-internal-token: <TOKEN>' -H 'Content-Type: application/json' \
  -d '{"overrides":{"memories":100,"contacts":20,"reflections":10}}'
```
