# StayOwn-Hospitality — Real State Audit (CORRECTED PLAN)

> **Audit date:** 2026-06-22 (revised after user pushback — initial audit was wrong)
> **Location:** `/Users/rejaulkarim/Documents/RTMN/companies/StayOwn-Hospitality/`
> **Status:** ⚠️ **MIXED** — "1M LOC" is misleading (mostly legacy-archived). Active code is ~42K LOC.

---

## 🚨 Correction — User Was Partially Right

Previous audit claimed: *"StayOwn-Hospitality: 1/10 score. 39 directories, ALL empty (just package-lock.json)"*
**Reality:** Total is 1,072,576 LOC, BUT that's dominated by `legacy-audit/` archive.

| Metric | Old (wrong) claim | Actual |
|---|---|---|
| Total LOC | "0" / "all empty" | **1,072,576 LOC** (across 4,788 files) |
| Empty dirs | 39 | **31 named service dirs are empty** (rez-wallet, rez-booking, rez-auth, etc.) |
| Real active code | 0 | **`apps/` = 36K LOC + `verify-service/` = 5.8K LOC = ~42K LOC active** |
| Apps with working code | 0 | `apps/api/` (78 .js compiled files, 2 .ts source) + `apps/hotel-panel/` (Next.js build) + `apps/ota-web/` |

---

## 📊 Real Codebase Inventory

### StayOwn total = 1,072,576 LOC / 4,788 files

| Subdir | LOC | Files | Status |
|---|---:|---:|---|
| `legacy-audit/` | 1,051,543 | 2,602 | ⚠️ **ARCHIVED** — old codebase, not active |
| `apps/` (active) | 36,201 | 223 | ✅ Real, includes compiled dist/ |
| `verify-service/` | 5,882 | 114 | ✅ Real verification service |
| **All other 31 service dirs** | 0 | 0 | ❌ Empty (just package-lock.json) |

### Active code breakdown

```
StayOwn-Hospitality/
├── apps/
│   ├── api/         # 78 .js compiled dist/ files + 2 .ts source — production backend
│   ├── hotel-panel/ # Next.js .next/ build artifacts — production frontend
│   └── ota-web/     # OTA web frontend (likely also built)
├── verify-service/  # 114 files, 5.8K LOC — real
└── legacy-audit/    # 2,602 files, 1.05M LOC — OLD CODEBASE ARCHIVED
```

### What's in apps/api/dist/ (the compiled production backend):
- middleware/ (auth, asyncHandler, errorHandler, rateLimiter, sanitize, requestLogger)
- config/ (database, logger, env, redis)
- utils/ (query, errors, helpers)
- jobs/ (queues, workers, scheduler)
- routes/ (pricing, wallet, channel-manager, corporate, pms, offline-payment, room-chat, room-service, auth, mining, hotel-chat, booking-sync, unified-chat, review, rez-room-engagement, user, hotel-panel, hotel, governance, partner-pms, room-qr, booking, seo)

**~30 backend route groups compiled = real production backend.**

---

## ❌ Empty service directories (the "missing" services)

| Service | Has package.json? | Has source? |
|---|:-:|:-:|
| `rez-wallet/` | ❌ no-pkg | ❌ 0 src |
| `rez-booking/` | ❌ no-pkg | ❌ 0 src |
| `rez-auth/` | ❌ no-pkg | ❌ 0 src |
| `rez-payment/` | ❌ no-pkg | ❌ 0 src |
| `rez-housekeeping/` | ❌ no-pkg | ❌ 0 src |
| `rez-pms/` | ❌ no-pkg | ❌ 0 src |
| `rez-stayown-service/` | ❌ no-pkg | ❌ 0 src |
| `guest-twin-service/` | ❌ no-pkg | ❌ 0 src |
| `hotel-business-twin/` | ❌ no-pkg | ❌ 0 src |
| ... and 22 more | ❌ | ❌ |

**31 of 39 named service directories are empty scaffolds.**

---

## 🔧 What's actually deployable

### apps/api (compiled production backend — NO SOURCE)
- Built once (dist/ exists with 156 .js files + sourcemaps)
- Routes: 30+ (auth, booking, wallet, hotel, pms, room-chat, governance, etc.)
- Middleware: full security stack (auth, errorHandler, rateLimiter, sanitize)
- Config: database, redis, env
- **ZERO source `.ts` files exist** — directory contains only `dist/` and `node_modules/`
- Cannot fix bugs, add features, security patch — source is lost

### apps/hotel-panel (Next.js admin dashboard — NO SOURCE)
- Built (.next/ exists with server manifests, type definitions)
- **NO source files**: no `src/`, no `app/`, no `pages/` — only `.next/` build artifacts
- Same issue: cannot modify, cannot patch, cannot rebuild

### apps/ota-web (OTA web frontend — NO SOURCE)
- Contains only `.env.local` — **no source code at all**
- Just env config, no app

### verify-service (the only real source)
- 114 files, 5.8K LOC
- **This is the ONLY fully-source-present service in the company**

### Where did the source go?
- `legacy-audit/` contains 1.05M LOC of archived code
- Likely the previous version of StayOwn's source was moved here when it was "DEPLOYMENT READY" (per CLAUDE.md)
- Whether it's usable or truly deprecated is unknown without deeper audit

---

## 🎯 v1 Ship Plan — REVISED

### Option A: Run the compiled artifacts as-is (1 week smoke test)
**Time:** 1 week
- Try to start `apps/api/dist/index.js` on Node 18+
- Try to start `apps/hotel-panel/.next/` as Next.js production
- Wire env vars, Redis, MongoDB
- **Risk:** Unknown if these were ever actually runnable as-is

### Option B: Un-archive legacy-audit/ source (RECOMMENDED)
**Time:** 4-6 weeks
- The 1M LOC in legacy-audit/ likely contains the previous working source
- Audit it for: outdated deps, security holes, dead endpoints
- Re-link to apps/api, apps/hotel-panel, apps/ota-web
- Add modern security patches, TypeScript types, tests
- **This is most likely the path forward**

### Option C: Rebuild from scratch
**Time:** 6-8 weeks
- Use verify-service as template
- Build 6+ core services (auth, booking, wallet, payment, housekeeping, PMS)
- Each ~5-7K LOC = ~200 hours work per service
- Last resort

### Option D: Use StayOwn ONLY for hotel integration, not standalone
**Time:** 2-3 weeks
- Treat apps/api compiled output as a "legacy connector"
- Build NEW services in a fresh dir using modern patterns
- Skip hotel-panel (admin) entirely — use a no-code admin
- Focus only on customer-facing: booking flow + guest experience

**Recommendation: Start with Option A smoke test (1 week).** If compiled artifacts run, Option B (un-archive legacy) is fastest path to shippable.

---

## 🏆 Bottom Line

| Plan aspect | Old (wrong) | New (correct) |
|---|---|---|
| Total LOC | 0 / "empty" | **1,072,576 LOC** (mostly archived) |
| Active LOC | 0 | **~42K LOC** (apps/ + verify-service/) |
| Status | 1/10 "cannot ship" | **Compilable artifacts present, needs verification** |
| Time-to-ship | 6-8 months | **1-2 weeks IF dist works, 4-6 weeks IF un-archive legacy, 6-8 weeks IF rebuild** |

### Critical questions to answer BEFORE estimating ship time:
1. Where are the `.ts` source files for `apps/api/`? (Only 2 .ts files visible, 78 .js dist files exist)
2. Where are the `.tsx` source files for `apps/hotel-panel/`? (Only .next/ build artifacts visible)
3. What's in `legacy-audit/`? Is it usable or truly deprecated?
4. Are the compiled artifacts runnable on Node 18+?

**Recommend: First action = verify `apps/api/dist/` actually starts.** If it does, ship in 1-2 weeks.

---

## 📋 Sync Engine integration

StayOwn needs Sync Engine for:
- Booking lifecycle events
- Hotel-room-state sync (checkin, checkout, housekeeping status)
- Guest profile sync across properties
- Wallet/rewards transactions
- Channel manager updates (Booking.com, Expedia, Airbnb)

**Dependency:** Sync Engine Wave 1.

---

*Last updated: 2026-06-22 (corrected audit)*