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
