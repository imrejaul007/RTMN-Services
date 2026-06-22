# BuzzLocal Docs Honesty Update

**Date:** 2026-06-22
**Scope:** Documentation update only — no code changes, no service starts
**Targets:** Only BuzzLocal (Axom) — RiderCircle and MyRisa docs are fresh and left alone

---

## Background

The user asked for feature audits of BuzzLocal, MyRisa, and RiderCircle. While reporting, I observed real drift in BuzzLocal documentation:

| Doc | Stated Date | Reality |
|---|---|---|
| `buzzlocal-app/SPEC.md` | "Last Updated: 2026-05-19" | ~5 weeks stale |
| `buzzlocal-app/STRATEGIC-VISION.md` | "Last Updated: May 19, 2026" | ~5 weeks stale |
| `buzzlocal-app/CLAUDE.md` | No date header | Cannot verify freshness |
| `buzzlocal-services/SOT.md` | "Date: June 4, 2026" | ~18 days stale |
| `buzzlocal-app/CITY-OS-SPEC.md` | "Last Updated: 2026-05-19" | ~5 weeks stale |
| `buzzlocal-app/AUDIT.md` | "Date: May 14, 2026" | ~5 weeks stale, lists only 18 screens / 9 services — but actual code has 30+ screen files and 27 service directories |

Additionally, port spot-checks for the documented service URLs (4000, 4001, 4003, 4004, 4008, 4010, 4020) all returned HTTP 000 (connection refused) — **none of the documented services are actually live**.

The user chose: **"Update docs to match reality — fix stale dates, add notes about code drift, mark services as 'documented but not verified running'"** for BuzzLocal only, and **leave RiderCircle and MyRisa alone** since they were touched June 19-21.

---

## Plan

### File 1: `companies/Axom/buzzlocal-app/SPEC.md`
**Changes:**
- Bump "Last Updated: 2026-05-19" → "Last Updated: 2026-06-22"
- Bump "Version: 2.0.0" → "Version: 2.1.0" (doc refresh, not product)
- Add a new section "## 12. Documentation Status & Drift Notes (2026-06-22)" near the end (before "## 11. Environment Variables") containing:
  - Note that SPEC.md was last edited ~5 weeks ago and reflects the May 19 City OS pivot
  - Note that the app/ directory has grown beyond what this spec describes (30+ screen files including new areas: `corpperks/`, `creators/`, `delivery/`, `kiosks.tsx`, `movement/`, `offers/`, `onboarding/`, `rides/`, `stayown/`)
  - Note that all service ports listed in §9 (4000-4008) are documented but **not verified as running** as of 2026-06-22
  - Cross-reference `AUDIT.md` (which lists only 18 screens) as the older count

### File 2: `companies/Axom/buzzlocal-app/STRATEGIC-VISION.md`
**Changes:**
- Bump "Last Updated: May 19, 2026" → "Last Updated: 2026-06-22"
- Add a small "## Status Update (2026-06-22)" section at the end noting:
  - Strategic positioning still valid (City OS / Digital Twin of the City)
  - No updates to the 8-layer differentiation
  - No new revenue streams or success metrics added since original

### File 3: `companies/Axom/buzzlocal-app/CLAUDE.md`
**Changes:**
- Add a date line "**Last Updated:** 2026-06-22" near the top (currently has no date)
- Add a short "## Documentation Status" section noting:
  - This file is a navigation/index file; primary content lives in SPEC.md, CITY-OS-SPEC.md, AUDIT.md
  - Service ports listed in §"Backend Services" are documented but **not verified as live** as of 2026-06-22
  - Code has grown to 30+ screen files vs the 18 in AUDIT.md — see `app/` for current state

### File 4: `companies/Axom/buzzlocal-services/SOT.md`
**Changes:**
- Bump "Date: June 4, 2026" → "Date: 2026-06-22"
- Bump "Version: 2.0" → "Version: 2.1"
- Add "## Status (2026-06-22)" section at the end noting:
  - 27 service directories exist on disk vs 22 listed in the table (missing from table: z-events-service, buzzlocal-business-service, buzzlocal-bulkorder-service, buzzlocal-crowd-service, buzzlocal-store-discovery)
  - Port table has two conflicting entries for "buzzlocal-api-gateway" — CLAUDE.md says 4020, SOT.md says 4000. This is a known inconsistency; pending resolution.
  - **No services verified live** as of 2026-06-22 (spot-checks on 4000, 4001, 4003, 4004, 4008, 4010, 4020 all returned connection refused)
  - All services are **documented as ✅** but the doc should be re-read with that caveat

### File 5: `companies/Axom/buzzlocal-services/CLAUDE.md`
**Changes:**
- Add "**Last Updated:** 2026-06-22" near the top
- No content changes (this file is a navigation doc)

### File 6: `companies/Axom/buzzlocal-app/AUDIT.md`
**Changes:**
- Bump "Date: May 14, 2026" → "Date: 2026-05-14 (reaffirmed 2026-06-22, screen count superseded)"
- Add a "## Reaffirmation Note (2026-06-22)" section at the end:
  - The May 14 audit listed 18 screens and 9 backend services. This count is now superseded.
  - Current code has 30+ screen files under `app/` (new areas: ask/, safe/, crisis/, marketplace/, services/, society/, corpperks/, creators/, delivery/, movement/, offers/, onboarding/, rides/, stayown/, analytics/, kiosk.tsx)
  - 27 service directories now exist under `buzzlocal-services/`
  - The architecture described in this AUDIT.md (V1 social-focused) is no longer the current scope — see `SPEC.md` and `CITY-OS-SPEC.md` for the current City OS scope
  - This file is preserved as a historical snapshot, not the current state

### Files NOT touched
- `CITY-OS-SPEC.md` — describes the current City OS scope well; user didn't ask to bump it. Will leave alone since adding stale-drift notes to the very doc that defines the current state would be confusing.
- All other docs (RiderCircle, MyRisa, etc.) — fresh, user said leave alone
- No code changes anywhere
- No service starts

---

## What this does NOT do

- Does not start any services
- Does not fix the actual code/port drift
- Does not delete the older AUDIT.md
- Does not consolidate the conflicting gateway port claim (4000 vs 4020)
- Does not touch RiderCircle or MyRisa docs
- Does not update the root RTMN CLAUDE.md

## Risk assessment

- **Low risk.** Only markdown changes, all additive (new sections at the end of files) plus date/version bumps.
- No API/contract changes, no service port changes, no code modifications.
- Reversible: a single `git checkout` on the 6 files.

## Success criteria

- All 6 BuzzLocal doc files have "2026-06-22" as their last-updated date
- Each file has a clearly labeled "Status" or "Drift" or "Reaffirmation" note dated 2026-06-22
- No content removed — all changes are additive
- No code files modified
- RiderCircle and MyRisa docs unchanged
