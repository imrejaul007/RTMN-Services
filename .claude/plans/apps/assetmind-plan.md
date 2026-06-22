# AssetMind — Financial Intelligence Platform (NEW PLAN)

> **Audit date:** 2026-06-22
> **Location:** `/Users/rejaulkarim/Documents/RTMN/companies/AssetMind/`
> **Status:** ⚠️ **REAL but monolithic** — 102,873 LOC all in single `codebase/` dir
> **Wave:** 3 (90+ days)

---

## 📊 Codebase Reality

| Metric | Value |
|---|---:|
| Total code files (excl legacy) | 373 |
| Total LOC (excl legacy) | **102,873** |
| `codebase/` (all Python) | 102,756 LOC / 372 files |
| `shared/` | 117 LOC / 1 file |
| Other top-level dirs (technical/, routes/, product/, etc.) | **0 LOC / 0 files** |

### What's in `codebase/` (the 102K LOC)

372 Python files in a single directory. Needs to be split into services.

---

## ✅ What's real

- **102K LOC of Python** — Bloomberg/TradingView competitor
- **CLAUDE.md** at root (14,340 bytes) — describes 5 Twins, 5 Moats, 20 layers
- **AUDI-June 2026 audit report** exists
- **DEPLOY-GUIDE.md**, **ECOSYSTEM-INTEGRATION.md** all present

## ❌ Critical issues

1. **102K LOC in single `codebase/` directory** — no service separation
2. **85 of 105 service dirs claimed in CLAUDE.md are empty** (per subagent audit — needs re-verification)
3. **Top-level dirs (product/, data-pipeline/, fundraising/, pitches/, technical/, routes/, agent-architecture/) are all empty**
4. **`start-all-services.sh` would try to start 75 services that don't exist**
5. **Massive node_modules at root** — workspace setup never completed

---

## 🎯 v1 Ship Plan (12+ weeks)

### Phase 1: Service split (4-6 weeks)
- Inventory what's actually in `codebase/` — what are the 372 files?
- Group by domain: data, predictions, twin-engine, intelligence, memory, knowledge-graph, etc.
- Split into 10-20 separate Python services
- Each service gets its own Dockerfile + requirements.txt

### Phase 2: Real DB + tests (4-6 weeks)
- Add PostgreSQL/TimescaleDB for time-series data
- Add Redis for caching
- Add pytest test suite (currently 0 tests)
- Wire CI/CD

### Phase 3: API surface (4 weeks)
- Expose REST/gRPC APIs for: data, predictions, twin queries
- Integrate with Karma (for trust scores on financial entities)
- Integrate with Sync Engine (for asset events)

---

## ❓ What needs verification first

Before committing to a 12-week plan:
1. **What's actually in `codebase/`** — 372 files of WHAT?
2. **Are the 85 "empty" service dirs really empty** — or do they have a few key files?
3. **Is there a working `start-all-services.sh`** or is it a wishlist?
4. **Does any service actually run end-to-end today?**

**Recommendation:** 1-week deep-dive audit before committing ship timeline.

---

## 📋 Sync Engine integration

AssetMind would consume Sync Engine events for:
- Asset price changes (stock, crypto, forex)
- Market news events
- User portfolio updates

But AssetMind is mostly READ-ONLY (Bloomberg competitor = query data), not WRITE-HEAVY. Lower Sync Engine priority.

**Dependency:** Probably none from Sync Engine; can ship standalone.

---

*Last updated: 2026-06-22 (NEW PLAN — needs verification before committing timeline)*