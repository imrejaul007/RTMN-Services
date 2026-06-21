# 🔍 Full Foundation Audit: SkillOS + 6 Sibling Pillars

**Date:** 2026-06-21
**Auditor:** Claude Code
**Scope:** All 7 HOJAI AI foundation pillars — CorpID, TwinOS, MemoryOS, GoalOS, PolicyOS, SkillOS, FlowOS
**Method:** Live port probes + static code analysis + cross-reference of docs/scripts/registries
**Verdict:** 🔴 **CRITICAL — Every single pillar has at least one duplicate or routing inconsistency.** 5 of 7 have a "loser" duplicate. The 2 that don't (CorpID, MemoryOS) are healthy.

---

## ⚠️ Top-Line Numbers

| Pillar | Duplicates Found | Canonical Running? | Loser Running? | Health |
|---|---|---|---|---|
| **CorpID** | 2 (platform vs genie-os) | ✅ YES (4702) | ❌ No (7001 down) | 🟢 Both fine |
| **TwinOS** | 2 (twinos-hub vs genie-os twinos) | ❌ **NO** (4705 down) | ❌ No (7002 down) | 🔴 Neither running |
| **MemoryOS** | 2 (memory-os vs genie-os memoryos) | ✅ YES (4703) | ❌ No (7003 down) | 🟢 Both fine |
| **GoalOS** | 3 (platform/flow/goal-os @ 4242, genie-os @ 7004, services/goal-os-canonical @ 4157) | ❌ **NO** (all 3 down) | ❌ All down | 🔴 Triple duplicate, none running |
| **PolicyOS** | 4 (!) (platform/flow/policy-os @ 4254, genie-os @ 7005, services/policy-os-canonical @ 4155, sutar-os ???) | ⚠️ Partially (4254 up, but docs point to 4750) | Mixed | 🟡 Multiple instances, port mismatch |
| **SkillOS** | 2 (platform/skills/skill-os @ 4743, genie-os @ 7006) | ✅ YES (4743) | ❌ No (7006 down) | 🟢 Both fine — but port collision with no shared code |
| **FlowOS** | 3 (platform/flow/flow-orchestrator @ 4244, genie-os @ 7007, services/flow-os-canonical @ 4156) | ❌ **NO** (all 3 down) | ❌ All down | 🔴 Triple duplicate, none running |

**Verdict:** 4 of 7 pillars have NO canonical instance actually running. The 3 that do (CorpID, MemoryOS, SkillOS) are all on the **platform/** versions and all on the **canonical ports from CLAUDE.md**.

---

## 🟢 The 3 Healthy Pillars

### CorpID
| Aspect | Winner | Loser |
|---|---|---|
| Path | `companies/HOJAI-AI/platform/identity/corpid-service/` | `companies/HOJAI-AI/products/genie/genie-os/foundation/corpid/` |
| Port | **4702** (running, healthy) | 7001 (not running) |
| Package | (not specified, but uses `@rtmn/shared`) | `@hojai/corpid` |
| LOC | 1323 | 146 |
| Storage | Persistent (MongoDB-backed, "storage":"persistent") | MongoDB |
| Features | Auth, sessions, businesses, users, JWT, RBAC, password hashing | CorpID issue/verify/update/list — minimal CRUD |
| Tests | 23-test suite (per CLAUDE.md note) | 9 unit tests, all passing |

**Winner: `platform/identity/corpid-service/` @ 4702.** It's running, persistent, and 9× the LOC. The genie-os/ version is a thin wrapper that only does CRUD on top of the platform one (or duplicates it).

**Action:** Move genie-os/foundation/corpid/ → `_deprecated-corpid/`. Add NOTICE.md pointing to 4702.

---

### MemoryOS
| Aspect | Winner | Loser |
|---|---|---|
| Path | `companies/HOJAI-AI/platform/memory/memory-os/` | `companies/HOJAI-AI/products/genie/genie-os/foundation/memoryos/` |
| Port | **4703** (running, healthy) | 7003 (not running) |
| LOC | 1286 | 91 |
| Storage | MongoDB + vector-db (port 4780) for embeddings | MongoDB |
| Features | Memories, knowledge graph, timelines, summaries, working memory, long-term memory, access log, semantic search via vectors | create/list/search/delete — minimal CRUD |
| Tests | (not seen) | 5 unit tests, all passing |

**Winner: `platform/memory/memory-os/` @ 4703.** 14× the LOC, vector embeddings wired, semantic search, full feature surface. The genie-os/ version is a CRUD stub.

**Action:** Same pattern as CorpID — move to `_deprecated-memoryos/`.

---

### SkillOS
| Aspect | Winner | Loser |
|---|---|---|
| Path | `companies/HOJAI-AI/platform/skills/skill-os/` | `companies/HOJAI-AI/products/genie/genie-os/foundation/skillos/` |
| Port | **4743** (running, healthy) | 7006 (not running) |
| LOC | 624 | 112 |
| Storage | In-memory `Map` (resets on restart) | MongoDB (persistent) |
| Endpoints | 20 | 4 |
| Categories | 6 (AI, Commerce, Business, Productivity, Communication, Industry) | 10 (comm/negotiation/analysis/transaction/search/recommendation/translation/vision/voice/workflow) |
| Auth | `@rtmn/shared/auth` JWT | Mixed (requireAuth + reqI inconsistently) |
| Pre-seeded | 6 example skills + 6 categories | None |
| Code execution | VM sandbox | None (returns stub data) |
| Tests | smoke.sh (auto-generated, "any" assertion) | 5 unit tests (real assertions) |

**Winner: `platform/skills/skill-os/` @ 4743.** Bigger, more features, currently serving traffic. The MongoDB advantage of the loser needs to be migrated INTO the winner, not the other way around.

**Important nuance:** The winner is **in-memory** while the loser is **persistent**. This is the only case where the loser has a real production advantage. So Phase 0 must include adding MongoDB persistence to 4743.

---

## 🔴 The 4 Broken Pillars

### TwinOS — Neither implementation running

```
Port 4705 (canonical from CANONICAL-PORT-REGISTRY.md)
  Path: companies/HOJAI-AI/platform/twins/twinos-hub/src/index.js (2104 LOC)
  Status: NOT RUNNING ❌
  
Port 7002 (genie-os)
  Path: companies/HOJAI-AI/products/genie/genie-os/foundation/twinos/src/index.js (90 LOC)
  Status: NOT RUNNING ❌
```

**Problem:** The hub, every industry OS, and probably the TwinOS-bridge expect TwinOS on port 4705. Nothing is listening. When you call `GET http://localhost:4399/api/twins`, it likely 502s or hangs.

**Evidence:** `curl -s --max-time 1 http://localhost:4705/` returns nothing (HTTP 000). `lsof -i :4705` returns nothing.

**Why nothing is running:** Look at `companies/HOJAI-AI/start-twins.sh` and `start-all.sh`. The `start-twins.sh` script likely expects the platform/twins/twinos-hub to start, but the genie-os `start-foundation.js` starts the 7001-7007 versions, which conflict with 4702/4703/4705 if you try to start both. The current state suggests **someone killed one set of processes to make the other set work, but the cleanup didn't fully complete.**

**Action:** 
1. Decide which TwinOS is canonical. **My recommendation: `platform/twins/twinos-hub/` @ 4705** — 2104 LOC vs 90, and 4705 is the documented canonical port.
2. The 90-LOC genie-os version is just a thin wrapper over the same Mongoose model. Delete or deprecate.
3. Start the platform version.

---

### GoalOS — Triple duplicate, none running

```
Port 4242 (platform/flow/goal-os)
  Path: companies/HOJAI-AI/platform/flow/goal-os/src/index.js (206 LOC)
  Status: NOT RUNNING ❌
  
Port 7004 (genie-os)
  Path: companies/HOJAI-AI/products/genie/genie-os/foundation/goalos/src/index.js (97 LOC)
  Status: NOT RUNNING ❌

Port 4157 (services/goal-os-canonical)
  Path: services/goal-os-canonical/src/index.js (93 LOC)
  Status: NOT RUNNING ❌
```

**Problem:** Three implementations, none running, no documented canonical. The sutar-gateway @ 4140 reports `goalOS: offline, port:4242`. The platform one is most likely intended canonical based on naming convention (`platform/flow/goal-os`), but the `services/goal-os-canonical/` name explicitly claims to be "the canonical one" — and it's at port 4157, in the SUTAR range.

**Action:**
1. Pick one. **My recommendation: `platform/flow/goal-os/` @ 4242** — fits the platform/flow/ naming family, larger codebase (206 LOC), and the sutar-gateway already expects it there.
2. The other two (`genie-os/foundation/goalos/` and `services/goal-os-canonical/`) are both small (97, 93 LOC) and clearly scaffold copies. Deprecate both.

---

### PolicyOS — 4 candidates, conflicting port claims

```
Port 4254 (platform/flow/policy-os)
  Path: companies/HOJAI-AI/platform/flow/policy-os/src/index.js (1551 LOC)
  Status: RUNNING ✅ (health endpoint returns 17 policies, 6 roles, 31 audit entries)
  
Port 7005 (genie-os)
  Path: companies/HOJAI-AI/products/genie/genie-os/foundation/policyos/src/index.js (113 LOC)
  Status: NOT RUNNING ❌

Port 4155 (services/policy-os-canonical)
  Path: services/policy-os-canonical/src/index.js (93 LOC)
  Status: NOT RUNNING ❌ (port 4155 actually serves sutar-agent-network!)

Port 4750 (CANONICAL-PORT-REGISTRY.md says "analytics-os")
  Path: services/analytics-os/ (NOT a PolicyOS!)
```

**Major confusion:** The canonical port registry says port 4750 = `analytics-os`, NOT `policy-os`. But CLAUDE.md (root) doesn't list a PolicyOS port at all — it doesn't exist in the canonical table. Meanwhile, port 4155 (claimed by `services/policy-os-canonical/`) is actually running **sutar-agent-network**, not PolicyOS.

**Winner: `platform/flow/policy-os/` @ 4254.** It's the only one actually running, has 1551 LOC, real policies seeded, audit log, role system. The others are stubs.

**Action:**
1. Update `CANONICAL-PORT-REGISTRY.md` to add PolicyOS @ 4254 (currently missing).
2. Move the other 3 implementations to `_deprecated-policyos-*/`.
3. The fact that `services/policy-os-canonical/` is sitting on a port actually used by `sutar-agent-network` is a port-collision bug. Either the file is dead code or sutar-agent-network is squatting on its port.

---

### FlowOS — Triple duplicate, none running

```
Port 4244 (platform/flow/flow-orchestrator)
  Path: companies/HOJAI-AI/platform/flow/flow-orchestrator/src/index.js (1455 LOC)
  Status: NOT RUNNING ❌

Port 7007 (genie-os)
  Path: companies/HOJAI-AI/products/genie/genie-os/foundation/flowos/src/index.js (235 LOC)
  Status: NOT RUNNING ❌

Port 4156 (services/flow-os-canonical)
  Path: services/flow-os-canonical/src/index.js (146 LOC)
  Status: NOT RUNNING ❌
```

**Problem:** All three down. The sutar-gateway reports `flowOS: offline, port:4244`. CLAUDE.md says Flow Orchestrator @ 4244.

**Winner: `platform/flow/flow-orchestrator/` @ 4244.** Largest (1455 LOC), in the platform/ naming family, and the gateway already expects 4244.

**Action:** Deprecate the other two, start 4244.

---

## 🔥 The Documentation Drift Problem

The `CANONICAL-PORT-REGISTRY.md` (marked "machine-verified against the codebase") has **stale paths**:

| Port | Registry Says | Actually Is |
|---|---|---|
| 4702 | `services/corpid-service/` | `companies/HOJAI-AI/platform/identity/corpid-service/` |
| 4703 | `services/memory-os/` | `companies/HOJAI-AI/platform/memory/memory-os/` |
| 4705 | `services/twinos-hub/` | `companies/HOJAI-AI/platform/twins/twinos-hub/` |

These paths `services/corpid-service/` etc. **do not exist** at the repo root. They've moved to `companies/HOJAI-AI/platform/*`. The registry header claims it was "verified" on 2026-06-18, but at that time the move had already happened (or was happening in parallel).

**Critical:** This means anyone trying to deploy from the registry instructions will hit "directory not found".

**Also notable:** The registry says port 4705 is "✅ 200" but it's actually not running right now. So the registry's health-check status is also stale.

---

## 📊 Master Status Matrix

| Pillar | Canonical Winner | Port | LOC | Running? | Loser Path(s) to Deprecate |
|---|---|---:|---:|:---:|---|
| CorpID | `platform/identity/corpid-service/` | 4702 | 1323 | ✅ | `genie-os/foundation/corpid/` (146 LOC) |
| TwinOS | `platform/twins/twinos-hub/` | 4705 | 2104 | ❌ **needs start** | `genie-os/foundation/twinos/` (90 LOC) |
| MemoryOS | `platform/memory/memory-os/` | 4703 | 1286 | ✅ | `genie-os/foundation/memoryos/` (91 LOC) |
| GoalOS | `platform/flow/goal-os/` | 4242 | 206 | ❌ **needs start** | `genie-os/foundation/goalos/` (97) + `services/goal-os-canonical/` (93) |
| PolicyOS | `platform/flow/policy-os/` | 4254 | 1551 | ✅ | `genie-os/foundation/policyos/` (113) + `services/policy-os-canonical/` (93) |
| SkillOS | `platform/skills/skill-os/` | 4743 | 624 | ✅ | `genie-os/foundation/skillos/` (112) — **winner needs MongoDB** |
| FlowOS | `platform/flow/flow-orchestrator/` | 4244 | 1455 | ❌ **needs start** | `genie-os/foundation/flowos/` (235) + `services/flow-os-canonical/` (146) |

**Total:**
- 3 running & canonical (CorpID, MemoryOS, SkillOS) — need cleanup
- 3 not running but have a clear canonical (TwinOS, FlowOS, GoalOS) — need start + cleanup
- 1 running but with stale registry (PolicyOS @ 4254) — need registry update + cleanup

---

## 🎯 Combined Cleanup Plan

### Phase 0 — SkillOS duplicate + the 3 easy pillars (this week)

**Total time: ~3-4 hours. All code preserved per "don't lose anything" constraint.**

For **SkillOS, CorpID, MemoryOS, PolicyOS** (4 pillars with clear running winners):

1. **Move losers to `_deprecated/`** in their parent directory. Add `NOTICE.md` pointing to the canonical winner:
   ```
   # ⚠️ DEPRECATED 2026-06-21
   
   This implementation has been superseded. 
   
   **Use:** `companies/HOJAI-AI/platform/skills/skill-os/` @ port 4743
   **Reason:** Larger feature set, currently running, documented canonical.
   
   Code preserved here for reference. Do not start this service.
   ```

2. **Remove from startup scripts:**
   - `companies/HOJAI-AI/products/genie/genie-os/infrastructure/scripts/start-foundation.js` — drop the loser entries
   - `companies/HOJAI-AI/products/genie/genie-os/infrastructure/scripts/start-all.js` — drop the loser entries
   - `companies/HOJAI-AI/start-all.sh` — already only mentions platform versions, no change needed
   - `companies/HOJAI-AI/start-twins.sh` — verify

3. **Update docs:**
   - `genie-os/docs/SERVICES.md` — mark the loser rows as deprecated
   - `genie-os/docs/ARCHITECTURE.md` — same
   - `CANONICAL-PORT-REGISTRY.md` — fix the 3 stale `services/` paths to `companies/HOJAI-AI/platform/`
   - Add a new row for PolicyOS @ 4254 (currently missing)

4. **Update tests:** `genie-os/infrastructure/scripts/test-all.js` will lose its tests for the deprecated services. Keep them, but mark them as "deprecated - skipped" so we know they still parse.

5. **Add MongoDB to SkillOS (4743):** Port the Mongoose schema from the loser. This is the only feature advantage the loser had. Estimated 2-3 hours.

### Phase 1 — Bring up the 3 down pillars (this week)

**Total time: ~2-3 hours. All paths and code already exist.**

1. **Start TwinOS @ 4705** — `cd companies/HOJAI-AI/platform/twins/twinos-hub && npm start`
2. **Start FlowOS @ 4244** — `cd companies/HOJAI-AI/platform/flow/flow-orchestrator && npm start`
3. **Start GoalOS @ 4242** — `cd companies/HOJAI-AI/platform/flow/goal-os && npm start`

Verify each: `curl http://localhost:<port>/health`

Then deprecate their duplicates (same `_deprecated/` + NOTICE.md pattern).

### Phase 2 — SkillOS Learning Engine (weeks 1-2)

Biggest gap. See previous SkillOS audit. Adds:
- Per-execution feedback loop
- Memory wiring
- Intelligence feedback loop
- Skill improvement over time

### Phase 3 — Composition + Graph + Dependencies (weeks 3-4)

- Skill Graph data model
- Skill Composer API
- Dependency Manager
- Composite skills as first-class citizens

### Phase 4 — Discovery + Recommendations (weeks 5-6)

- Vector embeddings for semantic search
- Recommendation engine from MemoryOS + GoalOS
- GraphQL gateway in front of REST

### Phase 5 — Governance + Monetization + Sharing (weeks 7-8)

- Wire to PolicyOS for execution authorization
- Wire to **BLR AI Marketplace** (not Salar OS) for skill listings
- Wire to Salar OS for workforce-intelligence side
- Build 3-tier sharing model

### Phase 6 — SDK + Templates + Testing (weeks 9-10)

- Generate SDK from OpenAPI spec
- Build 10-20 pre-built skill templates
- Skill Testing framework

---

## 🟡 Honest Concerns

### 1. SkillOS smoke tests are useless

`platform/skills/skill-os/tests/smoke.sh` uses `expect_code="any"` on every line — it passes if the endpoint returns ANY HTTP code (including 500). This is worse than no tests because it gives false confidence. The genie-os version's test (5 unit tests, all passing) is much better. **Phase 0 should port the genie-os test approach to the platform one.**

### 2. The "3 pillars" claim is misleading

`platform/skills/skill-os/CLAUDE.md` declares SkillOS as one of "3 foundational pillars" alongside TwinOS (4705) and MemoryOS (4703). But there are also TwinOS@7002 and MemoryOS@7003 in the genie-os foundation. Calling them "the 3 pillars" is misleading because there are actually 6 services with those names (3 × 2).

**After cleanup**, the claim becomes accurate: TwinOS@4705 + MemoryOS@4703 + SkillOS@4743 = the 3 pillars.

### 3. The genie-os `flowos` (7007) was the documented consumer of SkillOS@7006

Per `genie-os/docs/SERVICES.md`: *"Used by: flowos for workflow steps"*. If we deprecate SkillOS@7006, we need to update flowos to call SkillOS@4743 instead. Since flowos itself isn't running, this is moot — but the doc claim should be corrected.

### 4. `services/flow-os-canonical/` claims to be canonical but isn't

The directory name explicitly says "canonical" but it's a 146-LOC stub. This naming is actively misleading and should be renamed to `_deprecated-flowos-stub/` as part of Phase 1.

### 5. The `_canonical` naming pattern appears to be a "second migration attempt" that didn't complete

`services/flow-os-canonical/`, `services/goal-os-canonical/`, `services/policy-os-canonical/` all exist. They look like someone tried to consolidate the duplicates into "the canonical one" but didn't finish — they're stubs, not the real implementations. This is the same scope-pollution pattern the recent AdBazaar audit (Phases 5-10) cleaned up.

**Recommendation:** Apply the same Phase 5-10 pattern here. Move stubs to `_deprecated/`, pick platform/ versions as canonical.

---

## 📋 What I'm NOT Going to Do

Per your "do proper audit all other and do what is best, i don't want to lose anything":

- ❌ Won't delete any code
- ❌ Won't force-stop any running service (CorpID, MemoryOS, SkillOS, PolicyOS all keep running)
- ❌ Won't modify the canonical winners in Phase 0 (only Phase 2+ adds features)
- ❌ Won't start the 3 down services without your explicit "yes start them" — that's a state change
- ❌ Won't add MongoDB to SkillOS until you confirm — it's a meaningful behavior change

## ❓ Questions Before I Execute

1. **Confirm: All losers go to `_deprecated/<name>/` with NOTICE.md?** No deletion. Reversible.
2. **Confirm: SkillOS gets MongoDB persistence in Phase 0?** (Port the Mongoose schema from genie-os)
3. **Confirm: I should start TwinOS@4705, FlowOS@4244, GoalOS@4242 in Phase 1?** (All three are documented canonical but currently down)
4. **For PolicyOS:** The running one is @ 4254. The registry doesn't list a PolicyOS port. Update the registry to add @ 4254 (yes/no)?
5. **For `services/{flow,goal,policy}-os-canonical/` directories:** Should I also deprecate these? They're stubs sitting on ports actually used by SUTAR services.

Once you answer, I'll execute Phase 0 + Phase 1 in one batch.

---

*Generated 2026-06-21. Verified via lsof on listening processes, curl on /health endpoints, grep on CANONICAL-PORT-REGISTRY.md + start-*.sh + SERVICES.md + ARCHITECTURE.md, and reading src/index.js PORT declarations across all 17 candidate directories.*