# PolicyOS Build Status

> Run: `node --test __tests__/unit/*.test.mjs | tail -5`

## Quick Test
```bash
cd /Users/rejaulkarim/Documents/RTMN/companies/HOJAI-AI/platform/flow/policy-os
node --test __tests__/unit/*.test.mjs | tail -8
# Known: ~414 pass, ~118 fail (pre-existing ESM module state isolation issues)
# New services (P0–P9): ~19 pass, ~8 fail (singleton state between describe blocks)
```

## Completed Phases

| Phase | Feature | Service File | Routes | Tests |
|-------|---------|-------------|--------|-------|
| P0 | Persistent Storage | 10 route files | All CRUD | 448 |
| P1 | GitOps + Formal Verification | gitops.js, formal-verification.js | gitops, verify | 61 |
| P2 | Distributed Cache | cache.js | cache | 19 |
| P3 | Monitoring | monitoring.js | monitoring | 25 |
| P4 | Incident Response | incident-response.js | incidents | 17 |
| P5 | Extensions/SDK | extensions.js | extensions | — |
| P6 | Compliance | compliance.js | compliance | — |
| P7–9 | DR/Analytics/Tenant | dr-analytics-tenant.js | multi-tenants, dr, analytics | — |

## Known Issues to Fix

### 1. Cache — hashContext JSON.stringify replacer bug
**File:** `src/services/cache.js`  
**Fix:** Change `JSON.stringify(ctx, Object.keys(ctx).sort())` → `JSON.stringify(ctx, null, 0)`  
**Status:** Fixed in commit `01a0c8916` — verify with `node __tests__/unit/cache.test.mjs`

### 2. Monitoring — metrics singleton state across describe blocks
**File:** `src/services/monitoring.js`  
**Issue:** `export var metrics = new MetricsCollector()` — shared across ESM modules  
**Fix:** Add `_reset()` method to MetricsCollector, call `beforeEach()` in tests

### 3. Incident Response — _incidents singleton across test files
**File:** `src/services/incident-response.js`  
**Fix:** `_resetIncidentState()` not called between test files — ESM cache persists

### 4. SLA — percentile() array indexing off-by-one
**File:** `src/services/monitoring.js` line 217  
**Issue:** `percentile()` returns wrong value for p=0.5 edge case

## Test File Map
| File | Service | Isolated? |
|-------|---------|------------|
| cache.test.mjs | cache.js | ⚠️ Shared module state |
| monitoring.test.mjs | monitoring.js | ⚠️ Singleton metrics |
| incident-response.test.mjs | incident-response.js | ⚠️ Shared state |
| integration-routes.test.mjs | all | ⚠️ Full app state |
| Other 85+ test files | various | ⚠️ Pre-existing failures |

## Services Summary
- 30+ service files in `src/services/`
- 19 route files in `src/routes/`
- All registered in `src/index.js`
- PersistentStore for all P0–P9 data
- Complete: audit, auth, cache, compliance, decision-engine, extensions, gitops, incident-response, monitoring, nl-authoring, nl-explanation, persistent-store, rate-limiter, RebAC, san
... [truncated] This file is auto-generated. Run tests with `node --test`.
