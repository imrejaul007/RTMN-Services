# Personal Intelligence OS — Roadmap

**The 6-month transformation of Genie from a service router into a Personal Intelligence OS.**

> **Status:** Phase 1 (Foundation) ✅ shipped 2026-06-22. Phases 2-6 planned, see below.

---

## The vision

Genie is no longer "an AI that can do things." Genie is **the layer under your life** — it knows you, remembers you, plans with you, and grows with you.

The 23 specialist services in `products/genie/` are the **muscles**. The Personal Intelligence OS is the **nervous system** that connects them to a brain.

---

## The 6 phases

| Phase | Month | Theme | What ships | Status |
|-------|-------|-------|------------|--------|
| **1** | June 2026 | Foundation | LLM abstraction, Memory Substrate, Intent Engine, Cold-start Onboarding, Morning Briefing v2, runtime/genie wiring | ✅ **Shipped** |
| **2** | July 2026 | Reasoning + Reflection | Multi-step Reasoning Engine, weekly Reflection Engine, Proactive Engine | 📋 [Plan](PHASE-2-REASONING-AND-REFLECTION.md) |
| **3** | August 2026 | Score + Relationships | Personal Intelligence Score dashboard, Relationship Graph, Learning OS v2, Genie widget | 📋 [Plan](PHASE-3-PERSONAL-INTELLIGENCE-SCORE.md) |
| **4** | September 2026 | Voice + Ambient | Continuous listening, voice-first Genie, ambient briefings, cross-device sync | 📋 [Plan](PHASE-4-VOICE-AND-PROACTIVE.md) |
| **5** | October 2026 | Life OS Integration | Health, Calendar, Email, Contacts, Photos, Tasks | 📋 [Plan](PHASE-5-LIFE-OS-INTEGRATION.md) |
| **6** | November 2026 | Agentic + Marketplace | Background agents, one-shot actions, Genie Skills marketplace, long-running tasks | 📋 [Plan](PHASE-6-AGENTIC-AND-MARKETPLACE.md) |

---

## Core principles (across all phases)

1. **Memory is the substrate.** Every other service reads from and writes to the memory-substrate. No service talks to MemoryOS + TwinOS + Bridge separately.
2. **The LLM is replaceable.** The shared abstraction layer means Anthropic → OpenAI → Google → local Ollama is an env change.
3. **All 23 specialists stay.** New layers compose on top. No rewrites of existing services.
4. **Opt-in everything.** Continuous listening, integrations, proactive notifications — all OFF by default.
5. **Privacy is non-negotiable.** Audit log for every read/write. One-tap disconnect. No data leaves the device unless the user asks.
6. **Test before ship.** Each phase has its own test suite. All tests pass before commit.

---

## The 5 new services shipped in Phase 1

| Service | Port | Purpose |
|---------|------|---------|
| `shared/lib/llm/` | library | Multi-provider LLM abstraction (Anthropic, OpenAI, Google, Ollama) |
| `platform/memory/memory-substrate` | 4791 | Unified read/write across MemoryOS + TwinOS + Bridge + Confidence + Context |
| `platform/intelligence/intent-engine` | 4792 | LLM-based intent extraction + specialist routing (replaces keyword router) |
| `platform/onboarding/cold-start-onboarding` | 4793 | 12-question onboarding that seeds memory + Personal Intelligence Score v0 |
| `platform/intelligence/morning-briefing-v2` | 4794 | LLM-composed daily briefing (replaces static genie-briefing-service) |

Plus: `runtime/genie` updated to use the new intent engine (with `USE_INTENT_ENGINE=false` opt-out).

**Tests:** 54/54 pass (5 + 5 + 7 + 9 + 9 + 19).

---

## How to read this roadmap

1. Start with [PHASE-1-FOUNDATION.md](PHASE-1-FOUNDATION.md) — what's already shipped
2. Then [PHASE-2-REASONING-AND-REFLECTION.md](PHASE-2-REASONING-AND-REFLECTION.md) — what makes Genie actually useful
3. Each phase is **independent in design** but **dependent in capability** (Phase 3 needs Phase 1's memory-substrate; Phase 5 needs Phase 4's voice loop)

---

## Team & timeline

- **Team size:** 5-10 engineers across all phases
- **Phases:** 6 monthly milestones
- **Re-planning:** every quarter, the next 3 phases get re-scoped based on what shipped and what users actually use
- **Backwards compat:** every phase has a kill switch (`USE_INTENT_ENGINE`, `USE_REASONING_ENGINE`, etc.) so we can roll back without redeploying

---

## Open questions

- [ ] Do we need a separate mobile app, or is the existing do-app the right surface? (TBD end of Phase 2)
- [ ] Should PI Score be visible to other users (e.g. "your mom's Genie knows she's your mom")? (Privacy review needed)
- [ ] Marketplace: in-house only, or open third-party? (Decision needed before Phase 6 starts)

---

*Last updated: 2026-06-22 (Phase 1 shipped)*
*Next review: end of July 2026 (after Phase 2 ships)*
