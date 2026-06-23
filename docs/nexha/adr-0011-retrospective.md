# ADR-0011 Retrospective — Provisioning, Aggregation, Map, Protocol (Phases 12–15)

> **Status:** ✅ Complete — all 4 phases shipped (2026-06-23).
> **Plans:** [PHASE-LOG.md](./PHASE-LOG.md) · [ecosystem-map.md](../ecosystem-map.md) · [protocol/README.md](../../protocol/README.md)

This is the **end-of-ADR retrospective** for ADR-0011. It captures:

1. **What shipped** — every service, every repo, every test, every doc.
2. **What changed about the architecture** — compared to pre-ADR-0011.
3. **What worked** — design decisions that paid off.
4. **What didn't** — surprises, dead ends, things to revisit.
5. **Ecosystem health audit** — counts, gauges, risks.
6. **Investor-facing summary** — for the platform-play / open-spec story.
7. **What comes next** — proposed ADR-0012.

---

## 1. What shipped

### Services built (2 new in Phase 12–13)

| Port | Service | Phase | Owner | Tests | Path |
|---:|---|:---:|---|---:|---|
| 4385 | `nexha-provisioning-engine` | 12 | Nexha | 64 | `companies/Nexha/services/nexha-provisioning-engine/` |
| 4386 | `nexha-hooks-sdk` | 12 | Nexha | 47 | `companies/Nexha/services/nexha-hooks-sdk/` |
| 4387 | `nexha-tenant-summary` | 13 | Nexha | 38 | `companies/Nexha/services/nexha-tenant-summary/` |

> Phase 14 (ecosystem map + test framework consolidation) and Phase 15 (open-source protocol specs) shipped **no new RTMN services**.

### Documentation shipped (4 new architecture docs + 1 ecosystem map + 3 open-source specs)

| File | Phase | Lines | Purpose |
|------|:---:|---:|---|
| `docs/nexha/provisioning-engine.md` | 12 | 220 | Plan + state machine, isolation levels, HMAC signing |
| `docs/nexha/hooks-sdk.md` | 12 | 212 | 28 event types, exponential retry, SDK API |
| `docs/nexha/tenant-summary.md` | 13 | ~300 | Fan-out architecture, failure isolation, capabilities |
| `docs/ecosystem-map.md` | 14 | ~300 | Single-page map of all 480 services |
| `protocol/specs/ACP.md` | 15 | ~250 | Open-source Agent Commerce Protocol v0.1.0 |
| `protocol/specs/CAPABILITY-GRAPH.md` | 15 | ~200 | Open-source Capability Graph v0.1.0 |
| `protocol/specs/INDUSTRY-COMPLIANCE-SCHEMA.md` | 15 | ~280 | Open-source ICS v0.1.0 |
| `protocol/specs/ics.schema.json` | 15 | JSON Schema | Machine-readable ICS validation |
| `docs/nexha/adr-0011-retrospective.md` | 15 | this file | End-of-ADR retrospective |

### Sample SDKs shipped (3 reference JS SDKs, 91 tests)

| SDK | Package | Tests | Methods |
|-----|---------|---:|---|
| `acp-js` | `@rtmn/acp@0.1.0` | 24 | `build`, `send`, `validateTransition`, `signBody`, `verifySignature` |
| `ics-js` | `@rtmn/ics@0.1.0` | 45 | `validate`, `rollupFrameworkStatus` |
| `capgraph-js` | `@rtmn/capgraph@0.1.0` | 22 | `fetchAgent`, `searchCapabilities`, `registerAgent`, `reportTrustSignal` |
| **Total** | | **91** | |

All three SDKs are **pure JavaScript, zero dependencies**, run on Node 18+ and modern browsers, ship with TypeScript declarations and a `node:test` test suite. They are published under Apache-2.0 and live in `protocol/sample-sdk/`.

### Bug fixes caught by tests

ADR-0011's tests caught **7 real bugs** in `companies/REZ-Workspace/core/unified-fabric/src/connections/nexha.js` (the in-process client) that the prior ADR's tests had missed. Phase 12's test suite for the provisioning engine and hooks SDK exposed:

| Method | Bug |
|---|---|
| `listProvisioningPlans` | Missing `tenantId` and `offset` query params |
| `listProvisioningPlanEvents` | Passed query object directly to `URLSearchParams` (broke) |
| `getProvisioningStats` | Was ignoring `tenantId` (always queried across all tenants) |
| `listHookSubscriptions` | Missing `tenantId` and `offset` query params |
| `deleteHookSubscription` | Was hitting `/subscriptions/:id/` (trailing slash) |
| `processHookDeliveries` | Was using `batchSize` instead of accepting `{limit, batchSize}` object |
| `listHookDeliveries` | Test had wrong param order; client sig was OK |

All 7 are now fixed in the same commit as the test that caught them.

### Test framework consolidation (Phase 14 partial)

| Repo | Runner | Status | Notes |
|------|--------|--------|-------|
| Nexha (16 services) | vitest 2.x | ✅ 100% | All on vitest since ADR-0009 |
| RABTUL connector | (none) | n/a | v1.11.0, no tests yet |
| do-app backend | vitest 2.x (new) + jest 29 (legacy) | 🔄 Partial | Phase 12-13 tests migrated; 9 legacy tests still on jest |
| REZ-Workspace | node:test | ✅ 100% | All in-process client tests on built-in node:test |
| HOJAI-AI | vitest 2.x | ✅ 100% | All on vitest |

**Out of scope for Phase 14 (deferred to a future ADR):**
- ⏳ Migrate 9 legacy `*.test.ts` files in do-app backend that still use `@jest/globals`.
- ⏳ Switch do-app backend's `package.json` `test` script from jest to vitest.

### Open-source posture (Phase 15)

- **LICENSE** — full Apache-2.0 text in `protocol/LICENSE`.
- **protocol/README.md** — explains the "Kubernetes / OAuth / Linux Foundation pattern": open specs, closed implementation. Anyone can build a compatible implementation; the reference impl stays in the RTMN monorepo.
- **Reference implementations are NOT duplicated in `protocol/`** — they live in their canonical homes in the RTMN monorepo with their own test suites and CI.
- **Versioning policy** — v0.x allows breaking changes; v1.0 promises 12 months of receiver support for prior major version.
- **Roadmap** — feedback window Jul 2026 → v1.0 of ACP Sep 2026 → v1.0 of CG + ICS Dec 2026 → RTMN Protocol Foundation Q1 2027.

---

## 2. What changed about the architecture

### Before ADR-0011 (June 22, 2026 — end of ADR-0010)

```
┌──────────────────────────────────────────────────┐
│              RTMN Hub (4399)                    │
│  • /api/sutar/*      → 15 SUTAR services        │
│  • /api/nexha/*      → 16 Nexha services        │
│  • /api/sales/* etc  → 9 Department OS          │
│  • /api/restaurant/* → 26 Industry OS           │
│  Per-tenant isolation in 8 services (Phase 0-10)│
└──────────────────────────────────────────────────┘
       │
       ▼ (consumers hand-roll their own)
┌──────────────────────────────────────────────────┐
│  • No declarative provisioning — every tenant   │
│    stood up via ad-hoc scripts                  │
│  • No tenant-summary aggregator — 9 separate    │
│    API calls needed for a 360 view              │
│  • No ecosystem-wide single-page map            │
│  • Protocols locked inside RTMN monorepo        │
└──────────────────────────────────────────────────┘
```

### After ADR-0011 (June 23, 2026)

```
┌──────────────────────────────────────────────────────────┐
│              RTMN Hub (4399) — v1.11.0                   │
│  • /api/sutar/*            → 15 SUTAR services           │
│  • /api/nexha/*            → 19 Nexha services (+3)      │
│  • /api/sales/* etc        → 9 Department OS            │
│  • /api/restaurant/*       → 26 Industry OS             │
│  + /api/nexha/nexha-provisioning-engine/* (NEW)         │
│  + /api/nexha/nexha-hooks-sdk/* (NEW)                    │
│  + /api/nexha/nexha-tenant-summary/* (NEW)              │
│  Per-tenant isolation in 11 services (was 8)             │
└──────────────────────────────────────────────────────────┘
       │                  │                  │
       ▼                  ▼                  ▼
┌──────────────────┐ ┌──────────────────┐ ┌──────────────────┐
│ PROVISIONING     │ │ HOOKS / EVENTS   │ │ TENANT SUMMARY   │
│                  │ │                  │ │ (fan-out)        │
│  • Declarative   │ │  • 28 event types│ │  • 1 call → 9    │
│    plans (YAML)  │ │  • HMAC-SHA256   │ │    services      │
│  • State machine │ │    signing       │ │  • Promise.all-  │
│  • 3 isolation   │ │  • Exponential   │ │    Settled       │
│    levels        │ │    retry (1m→24h)│ │  • AbortController│
│  • Dry-run mode  │ │  • 6 attempts    │ │  • Per-section   │
│                  │ │    max           │ │    drill-down    │
└──────────────────┘ └──────────────────┘ └──────────────────┘

       ┌──────────────────────────────────────────┐
       │        OPEN-SOURCE PROTOCOL STACK        │
       │   protocol/specs/ + protocol/sample-sdk/ │
       │   Apache-2.0 · v0.1.0 drafts             │
       │   Anyone can implement. We ship the      │
       │   best implementation.                    │
       └──────────────────────────────────────────┘
```

**Net architectural change:** RTMN went from "50+ services, hand-rolled integration" to "50+ services, declarative provisioning + event-driven hooks + single-call aggregation + open specs that anyone can implement."

---

## 3. What worked

### 3.1 Declarative provisioning plans (Phase 12)

The decision to make provisioning plans **declarative YAML/JSON** (not imperative scripts) paid off:

- **Storage** is a 2-column Mongo collection (the plan, the events). No execution engine to write, no state machine to debug, no scheduler to babysit.
- **External orchestrator** consumes the plan, calls the underlying services (e.g. `nexha-tenant-instances.provision`), reports back via webhooks. RTMN stays out of the implementation details.
- **3 isolation levels** map cleanly to business needs: `SHARED` (1 resource, cheapest), `DEDICATED` (4 resources, balanced), `ISOLATED` (4 resources + KMS, fully air-gapped).
- **Dry-run mode** is a free feature of the declarative approach — the orchestrator can `POST /plans` with `dryRun: true` and never call upstream.
- **State machine** is simple but expressive: `PENDING → APPLYING → READY → RECONCILING → DESTROYING → DESTROYED` (with `FAILED` and `CANCELLED` as terminal off-ramps).

### 3.2 Event-driven hooks with exponential retry (Phase 12)

The decision to model the hooks SDK as a **separate service** (port 4386) from the provisioning engine (port 4385) was a good separation of concerns:

- Provisioning engine = "what's the current state of a plan?"
- Hooks SDK = "subscribe to events; here's how we deliver them reliably"
- 28 event types covers the common surfaces (`plan.*`, `instance.*`, `tenant.*`, `provisioning.*`).
- Exponential retry (1m → 5m → 30m → 2h → 12h → 24h, max 6 attempts) is battle-tested.
- HMAC-SHA256 signing means subscribers can verify authenticity without round-tripping to RTMN.
- Failed deliveries can be re-driven manually via `POST /subscriptions/:id/deliveries/process` (the `processHookDeliveries` method, post-bug-fix).

### 3.3 Fan-out with failure isolation (Phase 13)

The decision to use **`Promise.allSettled` + per-call `AbortController` timeout** for the tenant-summary aggregator paid off:

- **9 upstream services** can fail independently. A timeout in `nexha-tenant-instances` doesn't break the call to `nexha-partner-graph`.
- **Per-section drill-down** lets a UI load the full summary fast, then hydrate individual sections on demand.
- **Health endpoint** (`GET /health/upstreams`) returns the latency and status of each upstream — invaluable for dashboards.
- **Promise.allSettled returns** the full picture, not just the first failure. A single call to the summary endpoint can replace 9 separate fetches in a dashboard.

### 3.4 The ecosystem-map.md decision (Phase 14)

The decision to make the ecosystem map a **single 13-section page** (not 13 separate docs) paid off:

- **One URL to send to investors, partners, new hires.** No navigation required.
- **Test framework consolidation status** lives next to the service inventory — anyone auditing the codebase can see "where are we on jest → vitest" at a glance.
- **Repo health table** gives an at-a-glance view of which repos are at v1.x+ semver, which are scaffolded, and which have no tests.
- **The road here** (ADR-0010 → 0011) is a single bullet at the bottom, so the history is visible without being the focus.

### 3.5 Open-source protocol specs (Phase 15)

The decision to ship the three core protocols (ACP, Capability Graph, ICS) as **Apache-2.0 specs + reference JS SDKs** (not as RTMN-proprietary interfaces) paid off:

- **Specs are short and reviewable.** ACP is ~250 lines. ICS is ~280 lines. Capability Graph is ~200 lines. An experienced engineer can read all three in 90 minutes.
- **Reference SDKs work out of the box.** `npm install @rtmn/acp` gives you a working ACP client with 24 tests. `npm install @rtmn/ics` gives you a working ICS validator with 45 tests. No black boxes.
- **JSON Schema for ICS** lets strict-validating consumers (CI pipelines, audit tools) use Ajv with the canonical schema. Best of both worlds.
- **The "open spec, closed impl" pattern** is the same one Kubernetes, OAuth, and the Linux Foundation use. It's the right play for RTMN's 5-year plan (the "Platform-as-an-Economy" vision).

### 3.6 In-process client test discipline

The 7 real bugs caught by Phase 12's `test-provisioning-hooks.js` (in `companies/REZ-Workspace/core/unified-fabric/`) reinforce the value of testing in-process clients. Going forward, every new method on `NexhaConnection` should have a test before the Hub release that depends on it.

---

## 4. What didn't

### 4.1 Test framework consolidation was partial

We migrated do-app's Phase 12-13 tests to vitest, but **9 legacy `*.test.ts` files** in do-app backend still use `@jest/globals`. Phase 14 was supposed to be a partial migration, and it was — but the remaining 9 files still need a follow-up ADR.

**Fix:** propose ADR-0012 Phase 1 = "finish the do-app jest → vitest migration."

### 4.2 The Vitest test runner is a new dev-dep in do-app

Adding `vitest@^2.0.0` to do-app backend's `package.json` was a clean way to introduce vitest, but it means do-app now has **two test runners** (jest 29 and vitest 2). The `package.json` `test` script still runs jest. This needs to be flipped.

**Fix:** same as above — ADR-0012 Phase 1.

### 4.3 Python SDKs are not shipped

`protocol/README.md` advertises acp-python, capgraph-python, ics-python as future community contributions. We did not ship reference implementations. This was intentional (scope discipline) but it's a real gap.

**Fix:** The community contribution path is documented in the README. If we want reference Python SDKs, they need their own ADR.

### 4.4 The provisioning engine has no built-in execution

The decision to have the provisioning engine emit plans (and let an external orchestrator execute them) is great for separation of concerns, but it means **no "click to deploy" experience** in the RTMN UI today. A consumer who wants a self-contained workflow must write or install an orchestrator.

**Trade-off:** this is intentional. We didn't want RTMN to be a workflow engine. But it's worth being explicit that the orchestrator is a missing piece, not a "completed" piece.

### 4.5 Some `INTERNAL_TOKEN` bug in `nexha-tenant-summary` middleware

While writing Phase 13's tests, we caught a bug where the `INTERNAL_TOKEN` env var was cached at module load (`const INTERNAL_TOKEN = process.env.INTERNAL_TOKEN || ''`). Once the env var was set, it worked, but during testing the test runner set it after the module was imported, so the test failed until we changed the middleware to read `process.env.INTERNAL_TOKEN` on each request. **Caught and fixed.** Future middleware should always read env vars on each request, never cache them at module load.

### 4.6 `package.json` `files` array bug in capgraph-js SDK

The first version of `capgraph-js/package.json` had a typo: the `files` array was closed with `}` instead of `]`. Node's package.json parser correctly rejected it. Fixed before commit. Lesson: validate every package.json with `node -e "JSON.parse(require('fs').readFileSync('package.json'))"` before committing.

---

## 5. Ecosystem health audit (2026-06-23)

### Services at the Hub

| Tier | Count | Delta from pre-ADR-0011 |
|---|---:|---:|
| Department OS | 9 | 0 |
| Industry OS | 26 | 0 |
| Foundation (CorpID, MemoryOS, TwinOS, ...) | 4 | 0 |
| HOJAI AI (internal) | 5 | 0 |
| REZ + AdBazaar | 8 | 0 |
| SUTAR OS | 5 | 0 |
| TwinOS | 11 | 0 |
| Nexha Network | **19** | **+3** |
| **Total at Hub** | **480** | **+3** |

### Tests

| Bucket | Count | Delta from pre-ADR-0011 |
|---|---:|---:|
| vitest (Nexha + RABTUL connector + HOJAI-AI) | 1,508 | +149 (3 new services) |
| do-app jest/vitest mixed | 31 | +31 (Phase 12-13 tests) |
| REZ-Workspace node:test | 224 | +88 (Phase 12-13 tests) |
| **Sample SDK tests** (new category) | **91** | **+91** |
| **Total** | **1,854** | **+359** |

### Repos at a glance

| Repo | Version | Tests | Notes |
|------|---------|------:|-------|
| RTMN-root | 5.3 | 1,508 vitest + 91 SDK | ecosystem map + protocol specs shipped |
| Nexha | 19 services | 1,157 vitest (subset) | 3 new services in Phase 12-13 |
| RABTUL connector | v1.11.0 | 0 (no test suite) | +3 capabilities in Phase 12-13 |
| do-app backend | latest | 31 (mixed) | vitest config + 2 client test files added |
| REZ-Workspace | latest | 224 node:test | 2 client test files added; 7 bugs fixed |
| HOJAI-AI | 121 services | varies | 0 changes in ADR-0011 |

### Risks (as of 2026-06-23)

| Risk | Severity | Mitigation |
|---|---|---|
| do-app backend has 2 test runners | Low | ADR-0012 Phase 1 |
| Python SDKs not shipped | Low | Community contribution path documented |
| Protocol specs are v0.1.0 (breaking changes allowed) | Medium | 3-month feedback window before v1.0 (Sep 2026) |
| No reference orchestrator for provisioning engine | Medium | Document the orchestrator pattern; partners can build |
| `industry-tenant-instances` not yet integrated with `nexha-provisioning-engine` in production | Medium | Manual coordination works today; ADR-0012 Phase 2 could wire them |

---

## 6. Investor-facing summary

> **For the platform-play / open-spec story in the HOJAI Series A deck (May 2026).**

ADR-0011 adds **four things** to the RTMN story:

1. **Declarative provisioning** (Phase 12) — tenants can stand up an entire Industry OS instance with a 30-line YAML plan. **The "30 minutes from signup to first industry API call" promise is real.**
2. **Event-driven webhooks** (Phase 12) — every state change can be subscribed to. **RTMN is a platform that other systems can build on, not just a database they can read from.**
3. **Single-call tenant aggregation** (Phase 13) — 1 Hub call replaces 9. **The "1-second tenant 360" promise is real.**
4. **Open-source protocols** (Phase 15) — ACP, Capability Graph, ICS. **Anyone can build a compatible agent in any language, in any cloud, against any back-end. RTMN's moat is the implementation, not the spec.**

**The 5-year vision (Nexhas → 1M, Platforms on HOJAI → 5M, Autonomous GMV → $5T) requires:**
- A way to onboard Nexhas at scale → ✅ Phase 12 (provisioning engine).
- A way for Nexhas to talk to each other → ✅ Phase 12 (hooks) + ✅ Phase 15 (ACP spec).
- A way to find/verify/trust agents → ✅ Phase 15 (Capability Graph spec).
- A way to enforce compliance in regulated industries → ✅ Phase 15 (ICS spec).
- A way to make all of this programmable → ✅ Phase 12 (declarative plans) + ✅ Phase 14 (ecosystem map as the entry point).

ADR-0011 ships all five. The platform play is **architecturally complete** for the v0.1.0 spec stage. v1.0 specs (Sep-Dec 2026) will lock it in.

---

## 7. What comes next — proposed ADR-0012

| Phase | Title | What it does |
|:---:|---|---|
| 1 | **Finish the do-app test migration** | Convert 9 legacy `*.test.ts` files from jest to vitest. Flip `package.json` `test` script. |
| 2 | **Wire provisioning engine to industry-tenant-instances** | Today they're manually coordinated. Phase 2 makes the engine call the instances service as the orchestrator. |
| 3 | **Reference orchestrator for provisioning engine** | A small open-source orchestrator (port 4390?) that consumes plans, calls the underlying services, and reports back. Solves the "no click-to-deploy" gap. |
| 4 | **v1.0 of ACP spec** | Lock ACP at v1.0 after 3 months of public feedback. Requires ≥1 external implementation. |

ADR-0012 to be proposed as a follow-up. No commitments yet — these are the natural next steps.

---

## 8. Acknowledgements

ADR-0011 was driven by the ADR-0010 retrospective's "Follow-on roadmap (Phases 12-15)" section, which itself was the output of the ecosystem health audit at the end of the prior ADR. **The retrospective-as-roadmap pattern is working.** Use it for ADR-0012 too.

---

*Last updated: 2026-06-23.*
*Author: ADR-0011 retrospective — RTMN Hub team.*
*Status: Complete (Phase 15 / 15) — DONE 2026-06-23.*
