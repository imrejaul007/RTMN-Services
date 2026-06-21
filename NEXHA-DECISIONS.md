# Nexha — Critical Decisions (D1-D5)

> **Date:** 2026-06-21
> **Companion to:** [NEXHA-ROADMAP.md](NEXHA-ROADMAP.md) and [NEXHA-VS-CODE-AUDIT-V2.md](NEXHA-VS-CODE-AUDIT-V2.md)
> **Status:** My recommendations are below. **Each decision needs your sign-off before implementation begins.**

---

## D1 — Workspace monorepo tooling

**Question:** What workspace tooling should Nexha use when fully extracted from RTMN?

### Options

| Option | Effort | Pros | Cons |
|---|---|---|---|
| **(A) pnpm + Turborepo** | Low | Already used by Nexha L2 and HOJAI-AI. Familiar to most JS teams. Cache layer is good enough for ~50 services. | Cache invalidation can be wrong on large graphs. Build graph harder to inspect than Nx. |
| (B) pnpm + Nx | Medium | Better caching, dependency graph visualization, run-many executor. | New tool for the team; learning curve. Nx Cloud paid tier for distributed caching. |
| (C) Bazel | High | The only option that scales past ~100 services. | Massive learning curve; only worth it if we expect 200+ services. Not us. |

### My recommendation: **(A) pnpm + Turborepo**

**Reasoning:**
- The Nexha L2 monorepo (`REZ-Workspace/companies/Nexha`) already uses `pnpm-workspace.yaml` + `turbo.json`. We have working pipelines.
- HOJAI-AI uses the same stack. When we eventually merge L2 services + HOJAI foundation, consistency matters.
- Turborepo's caching has known issues past ~50 services, but our projected service count is 30-40 (10 L2 services + ~20 HOJAI foundation services + ~10 industry OS = 40). Turborepo handles this fine.

**Sign-off needed before:** any code that creates a new service in the Nexha repo.

---

## D2 — Database strategy

**Question:** What database backs Nexha's Company Twin / Memory / Agent state?

### Options

| Option | Effort | Pros | Cons |
|---|---|---|---|
| **(A) MongoDB (current) + JSON for memory** | None | Already used. TwinOS schemas exist. Operational tooling already in place. | Relationships between twins, agents, suppliers, contracts are inherently relational. Mongo's $lookup joins are slower than SQL joins. Memory data isn't well-typed. |
| **(B) Postgres + JSONB** | Medium | Native joins for the relational core (companies, suppliers, contracts, payments, ratings). JSONB for flexible memory blobs. Mature tooling. | Requires migration. Some teams need retraining. |
| (C) Postgres + Neo4j (hybrid) | High | Right tool for each job: Postgres for transactional data, Neo4j for the Company Twin graph. | Operational complexity of two systems. Overkill until we have 100k+ twins. |

### My recommendation: **(B) Postgres + JSONB**

**Reasoning:**
- The Company Twin has natural relational structure: a company has many agents, each agent has many memories, memories relate to other memories, suppliers relate to companies through contracts.
- TwinOS currently uses Mongo with ~12 Mongoose schemas. A migration to Postgres + Prisma/Drizzle would touch those schemas but not the routes/controllers.
- JSONB handles the parts where memory is schemaless (memory bodies, agent skills metadata).
- Vector search (for memory recall) is a separate concern — pgvector extension covers this if we don't need Pinecone-scale recall.

**Caveat:** The existing L1 commerce-identity uses MongoDB. Phase 7 work has already shipped L1 with Mongo. The D2 choice is **forward-looking** — new code uses Postgres, existing L1 stays Mongo until we have a reason to migrate (probably never for L1 itself, only for new TwinOS-style services).

**Sign-off needed before:** any new service in the Nexha repo that creates persistent state (TwinOS, MemoryOS, Agent Network).

---

## D3 — Multi-agent runtime

**Question:** What's the runtime that lets Restaurant AI ↔ Distributor AI ↔ Manufacturer AI negotiate simultaneously?

### Options

| Option | Effort | Pros | Cons |
|---|---|---|---|
| **(A) Extend HOJAI SUTAR OS (in-house)** | High | Already designed for this (24 service dirs scaffolded). Full control. No vendor lock-in. | We have to actually build it. Currently 0 LOC. Realistically 8-12 weeks of focused work for 5-7 core services. |
| (B) LangGraph (Python, by LangChain) | Low | Mature, well-documented. Many examples. Production-ready. | Python (rest of stack is TypeScript). Re-implements agent memory that TwinOS/MemoryOS already provide. |
| (C) CrewAI / AutoGen (Python) | Low | Higher-level than LangGraph. | Same Python constraint. Less mature for production. |
| (D) Managed agent platform (Vertex AI Agents, Bedrock Agents) | Low | Production-grade. | Vendor lock-in. Per-message cost. Limited customization for our trust model. |

### My recommendation: **(A) Extend HOJAI SUTAR OS**

**Reasoning:**
- The vision document says "Everything runs through SUTAR" — this is the architectural commitment. If we use LangGraph or CrewAI, SUTAR becomes a thin wrapper around them, which contradicts the vision.
- HOJAI's `sutar-os/` already has 24 service dirs scaffolded with the right names: `sutar-agent-id`, `sutar-twin-os`, `sutar-agent-network`, `sutar-memory-bridge`, `sutar-gateway`. The structure matches the vision.
- We're not building from zero — we're filling in 24 directories with 200-500 LOC each. That's 6-10 weeks of focused work for the core runtime (agent-id, twin-os, agent-network, memory-bridge, gateway).
- Trust/reputation are already in `sada-os` (2,500 LOC). The trust model is non-negotiable for commerce.
- TypeScript matches the rest of the stack.

**Concrete next step:** Implement `sutar-agent-id` first (it's the simplest — just a CorpID-style minting endpoint for agents). Then `sutar-twin-os` (wraps TwinOS for agent twins). Then `sutar-agent-network` (the actual message routing).

**Sign-off needed before:** any agent-to-agent communication code is written.

---

## D4 — Mobile app priority

**Question:** When does the mobile app (React Native per vision) get built?

### Options

| Option | Effort | Pros | Cons |
|---|---|---|---|
| **(A) Web-first, mobile deferred to P5** | None now | Most B2B users work at a desk. Portal works in mobile browsers. We can validate the vision with web first. | The vision says "mobile-native". If users want push notifications or offline, we'd need to retrofit. |
| (B) React Native from P3 (alongside verticals) | Medium | Mobile-native from day one for the chosen vertical. Push notifications, camera, GPS work out of the box. | Doubles the work per vertical. Risk of mobile bugs slowing vertical delivery. |
| (C) Native iOS + Android from P5 | High | Best UX on each platform. | Two codebases to maintain. Slow to start. |

### My recommendation: **(A) Web-first, mobile deferred to P5**

**Reasoning:**
- The vision says mobile, but the value is in the **business network** (companies, agents, contracts), not in the device. A restaurant manager checking inventory on a phone browser is fine for v1.
- Push notifications (vision: "Restaurant AI needs rice" alerts) can come via WhatsApp (which we already integrate for OTP). That's mobile-channel without a mobile app.
- Mobile becomes important when we have **field workers** (delivery drivers, warehouse staff) who need camera/GPS. That's P5.
- Time saved on mobile = more time on the agent runtime (D3), which is the harder problem.

**Sign-off needed before:** no specific code; relevant when P5 begins.

---

## D5 — Open-source vs proprietary

**Question:** What's the licensing model for Nexha?

### Options

| Option | Effort | Pros | Cons |
|---|---|---|---|
| (A) Fully open-source (Apache 2.0) | None | Community contribution. Standard for agent platforms. | No moat. Someone forks and competes. |
| **(B) Open-core (runtime open, orchestration SaaS)** | Medium | The runtime is the standard (community grows it). The orchestration + agent marketplace + memory + intelligence are the moat (hosted, paid). | Two-track development. Community vs. proprietary code discipline. |
| (C) Fully proprietary | Low | Cleanest IP story. Maximum moat. | Can't leverage community. Network effects don't compound. |

### My recommendation: **(B) Open-core**

**Reasoning:**
- The vision calls for an "Autonomous Business Network" — network effects matter. Open-source the runtime (SUTAR OS, TwinOS, MemoryOS) so any ERP/POS/bank can build a compatible agent.
- The moat is **the network**: once agents are on the platform, they discover each other, build trust, execute contracts. Network effects compound.
- Hosted services (Nexha Cloud) provide: agent orchestration, intelligence, marketplace, premium features. These are paid.
- Apache 2.0 for the runtime; proprietary for the hosted intelligence layer.

**Concrete licensing:**
- `nexha-agent-runtime` (SUTAR OS, TwinOS, MemoryOS) → Apache 2.0
- `nexha-orchestration` (business logic, multi-agent coordination) → Source-available, no resale
- `nexha-intelligence` (ML models, training pipelines) → Proprietary

**Sign-off needed before:** before publishing Nexha to a public repo / before any community contribution flow.

---

## Recommended implementation order (after sign-offs)

Assuming all 5 are approved, here's what I'd work on in what order:

1. **D2 Postgres + JSONB** — 1-2 weeks. Sets the persistence model for everything else. Migration tooling for future.
2. **D3 SUTAR OS core** — 6-10 weeks. Implement `sutar-agent-id`, `sutar-twin-os`, `sutar-agent-network`, `sutar-memory-bridge`, `sutar-gateway`. Each ~200-500 LOC. Total ~2k LOC.
3. **D1 pnpm + Turborepo** — already in place; just verify as we extract.
4. **Wire HOJAI TwinOS + MemoryOS into L1 commerce-identity** (P0) — 2-3 weeks. Auto-create twins on registration.
5. **Restaurant demo** (P2) — 4-6 weeks. Fill restaurant-os mock data with real backends.

**Total time to demo: 16-24 weeks with one engineer, or 8-12 weeks with three.**

---

## What I'm NOT deciding (you should)

These are not in D1-D5 but matter:

- **Pricing model** — Subscription vs. per-transaction vs. freemium. Recommend subscription for agents + per-transaction for contracts, but this is a sales question.
- **Initial customer** — Restaurant vertical is the demo, but who is the first paying customer? Recommend: a single restaurant chain with 5-20 locations in one geography.
- **Geography** — India-first (HOJAI infra supports India-specific GST/DPDP), or US/EU-first? Recommend India-first (most of the existing industry-OS schemas are India-oriented).

---

*Decisions prepared 2026-06-21. Sign off on D1-D5 to unblock architecture work.*

# Last updated: 2026-06-21 (Phase 6 of NEXHA-DEEP-AUDIT.md)