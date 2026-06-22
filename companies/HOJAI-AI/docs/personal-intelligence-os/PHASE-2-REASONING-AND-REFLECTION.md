# Personal Intelligence OS — Phase 2: Reasoning + Reflection

**Status:** 🟡 Planned (target: end of July 2026)
**Tagline:** *Genie stops answering questions and starts actually helping.*

---

## What this phase ships

The "wow" layer. The features that turn Genie from "useful tool" into "I can't live without it":

| # | Service | Port | What it does | Status |
|---|---------|------|--------------|--------|
| 2.1 | `@hojai/reasoning-engine` | 4795 | Multi-step planning — LLM decomposes a complex request into steps, picks a tool for each, executes, and re-plans on errors | 📋 planned |
| 2.2 | `@hojai/reflection-engine` | 4796 | Weekly insights generated from memory-substrate activity. "This week you had 12 conversations, 3 were about money..." | 📋 planned |
| 2.3 | `@hojai/proactive-engine` | 4797 | Opt-in notifications when the system spots something worth surfacing. "You haven't called your mom in 23 days." | 📋 planned |
| 2.4 | Reasoning-aware `/api/ask` in runtime/genie | 7100 | The runtime decides: single LLM call vs. multi-step reasoning vs. just route to specialist | 📋 planned |

---

## The big idea: a Reasoning Engine, not a smarter router

Right now `/api/ask` does: *intent → route → call specialist → return answer.* One step.

Real users ask things like:
- "Plan me a weekend trip to Tokyo with my wife, under $3K, focused on food, and add the dates to my calendar."
- "I just got paid. Move $500 to savings, pay the Visa bill, and tell me what's left for the month."
- "I'm feeling burned out. Look at my last 2 weeks of sleep and meetings and tell me what to cut."

These are not single-intent requests. They need:
1. Decomposition into sub-tasks
2. Tool selection per sub-task (calendar, money, wellness, memory)
3. Sequential or parallel execution
4. Re-planning when a tool returns bad data
5. Synthesis of all results into one coherent answer

That's what the **Reasoning Engine** does. It's a ReAct / Plan-and-Execute loop on top of the existing 23 specialists + 4 Phase 1 services.

### Reasoning Engine design

```javascript
// Plan-and-Execute loop
async function reason(userId, question) {
  // 1. Plan
  const plan = await llm.plan({
    question,
    availableTools: TOOL_REGISTRY,  // 27+ tools (23 specialists + 4 Phase 1)
    userContext: await memorySubstrate.getContext(userId),
  });
  // → { steps: [{ tool: 'genie-money-os', args: { ... }, dependsOn: [] }] }

  // 2. Execute (parallel where possible)
  const results = {};
  for (const step of plan.steps) {
    if (step.dependsOn.every(d => results[d])) {
      results[step.id] = await executeTool(step, results);
    }
  }

  // 3. Re-plan if needed
  if (plan.steps.some(s => results[s.id]?.error)) {
    const replan = await llm.replan({ plan, results });
    // ... execute replan steps ...
  }

  // 4. Synthesize
  return await llm.synthesize({ question, plan, results });
}
```

### Tool Registry (27+ tools)

The tool registry is a thin wrapper around the existing services. Each tool declares:
- `name` (e.g. "get_today_calendar")
- `service` (genie-calendar-service)
- `endpoint` (GET /api/events/today)
- `argsSchema` (zod schema)
- `description` (for the LLM to read)

The reasoning engine doesn't talk to MemoryOS directly — it talks to the memory-substrate (Phase 1.2). This is the architectural payoff of having a substrate layer.

### Reflection Engine design

The Reflection Engine runs weekly (Sunday 8pm user-local, configurable). It:

1. Pulls all memory writes from the last 7 days (via memory-substrate audit log)
2. Counts by category: conversations, goals touched, relationships reached out to, money decisions
3. Asks the LLM: "What patterns do you see? What went well? What did the user struggle with?"
4. Returns a "Weekly Reflection" object:

```json
{
  "weekOf": "2026-06-15",
  "stats": {
    "conversations": 47,
    "byIntent": { "calendar": 12, "money": 8, "wellness": 3, ... },
    "goals_touched": 3,
    "relationships_reached_out": 2,
    "money_decisions": 4
  },
  "insights": [
    "Your mood-tracking score went up 8% this week. Sleep was the main driver.",
    "You mentioned your dad 3 times but haven't called him in 23 days.",
    "You completed 2 of 3 weekly goals. The missed one was the reading goal — same as last week."
  ],
  "questions_for_you": [
    "What's one thing from this week you want to remember?",
    "Should I block 30 min on your calendar to call your dad?"
  ],
  "next_week_focus": "Relationships"
}
```

The reflection is delivered via morning-briefing-v2 (or as a standalone weekly digest).

### Proactive Engine design

The Proactive Engine is opt-in. When enabled, it watches the memory-substrate for patterns that warrant a notification:

- **Time-based:** "You haven't called your mom in 23 days. Want me to remind you?"
- **Anomaly:** "Your spending is 40% higher this week. Want to look at it together?"
- **Opportunity:** "You have 2 free hours tomorrow afternoon. Want to work on your reading goal?"
- **Milestone:** "You're 5 days from your 90-day fitness goal. Final push!"

Each notification is generated by the LLM with the user's communication style preference (captured during onboarding).

The user can configure:
- Which categories are allowed (relationships, money, wellness, etc.)
- Quiet hours (no notifications 10pm-7am)
- Daily limit (max 3 proactive notifications/day)

---

## Success metrics

- **Reasoning Engine handles 5+ step plans** without falling back to single-shot LLM
- **Reflection Engine ships 1 weekly digest per user** that they actually read (open rate > 50%)
- **Proactive Engine has < 5% "mute this" rate** (i.e. users find the notifications useful, not annoying)
- **P50 latency for multi-step reasoning < 8s** (acceptable for the kind of value delivered)
- **All 23 specialists still run untouched**

---

## Team (3 engineers, parallel workstreams)

| Engineer | Owns | Timeline |
|----------|------|----------|
| **Eng A** | Reasoning Engine + tool registry | Month 2 weeks 1-3 |
| **Eng B** | Reflection Engine + weekly digest | Month 2 weeks 1-3 |
| **Eng C** | Proactive Engine + notification system | Month 2 weeks 2-4 |
| **All** | Wire reasoning into runtime/genie (replaces single-shot LLM in /api/ask) | Month 2 week 4 |

---

## Dependencies on Phase 1

- Memory Substrate (4791) — Reflection and Proactive engines read from it
- Intent Engine (4792) — Reasoning Engine uses it to know which tools are relevant
- LLM abstraction (shared/lib/llm) — All three new engines use it
- Onboarding's PI Score v0 — Reflection Engine will fill in actual scores

---

## Risks & mitigations

| Risk | Mitigation |
|------|------------|
| Multi-step reasoning is slow (10+ seconds) | Cache plans by intent+entities; stream intermediate results to the UI |
| LLM hallucinates a tool that doesn't exist | Strict tool registry; unknown tool names → error → re-plan |
| Proactive notifications annoy users | Default to OFF; clear mute-this feedback loop; daily cap |
| Reflection feels generic | Use the user's own words (from memory-substrate) in insights, not LLM's summary |
| Reasoning engine replaces the LLM router in ways that break existing specialists | Tool registry version-pinned; specialists don't need to change |

---

*Next: [PHASE-3-PERSONAL-INTELLIGENCE-SCORE.md](PHASE-3-PERSONAL-INTELLIGENCE-SCORE.md) — Month 3*
