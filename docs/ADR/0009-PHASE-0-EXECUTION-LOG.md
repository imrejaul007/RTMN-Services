# ADR-0009 Phase 0 — Execution Log

> **Date:** 2026-06-22
> **Phase:** 0 of 11 (ADR-0009 build plan)
> **Status:** ✅ **COMPLETE**
> **Owner:** HOJAI + Nexha joint team

## Summary

Executed the "Ownership Fix" phase of the canonical architecture (ADR-0009).
Moved 5 Phase C services from HOJAI-AI to Nexha, deleted 3 L1 stubs, and
relocated `sutar-mock`. All 160 vitest tests pass on the new locations.

---

## What changed

### 1. Moved (5 services) — HOJAI-AI/sutar-os/core/ → companies/Nexha/services/

| Old path (HOJAI) | New path (Nexha) | Port | Tests | Notes |
|---|---|---:|---:|---|
| `sutar-supplier-registry` | `nexha-supplier-network` | 4280 | 20 ✅ | Phase C.1 — supplier discovery/registry |
| `sutar-warehouse-network` | `nexha-warehouse-network` | 4288 | 49 ✅ | Phase C.5 — warehouse + WMS |
| `sutar-logistics` | `nexha-distribution-network` | 4285 | 22 ✅ | Phase C.2 — multi-carrier shipping |
| `sutar-trade-finance` | `nexha-trade-finance-network` | 4287 | 38 ✅ | Phase C.4 — credit/BNPL/FX |
| `sutar-pricing-intelligence` | `nexha-pricing-network` | 4286 | 31 ✅ | Phase C.6 — pricing intelligence |

For each: package.json name changed (`@nexha/*` namespace), src/index.ts updated
(`/health` `service` field, `console.log` boot message, auth-warn strings),
all internal `sutar-*` references replaced, `package-lock.json` updated, and
the entire test suite re-run green.

### 2. Deleted (3 L1 stubs) — companies/Nexha/services/

| Stub | Old port | Replaced by |
|---|---:|---|
| `procurement-os` | 4320 | `nexha-supplier-network` (4280) |
| `distribution-os` | 4300 | `nexha-distribution-network` (4285) |
| `trade-finance` | 4340 | `nexha-trade-finance-network` (4287) |

These were scaffolds that duplicated Phase C functionality. Removed from
`NEXHA_SERVICES` map and the `/api/nexha/capabilities` payload.

### 3. Moved (1 service) — companies/Nexha/sutar-mock/ → companies/HOJAI-AI/sutar-os/sutar-dev-mock/

`sutar-mock` was a Nexha-local in-memory stand-in for SUTAR (CorpID/Trust/
Policy/Events) used during local commerce-identity dev. It is a SUTAR-family
service, so it now lives in HOJAI-AI as `sutar-dev-mock` (port 4799).
Package name: `@nexha/sutar-mock` → `@hojai/sutar-dev-mock`.

### 4. Updated (1 file) — companies/RABTUL-Technologies/REZ-ecosystem-connector/

`src/index.ts` `NEXHA_SERVICES` map now has:
- 5 new canonical `nexha-*` keys (the moved services)
- 5 old `sutar-*` keys kept as **deprecation aliases** pointing at the same ports
- 3 L1 stub entries removed (`distribution-os`, `procurement-os`, `trade-finance`)

`/api/nexha/capabilities` now returns the canonical `nexha-*` names first
and the `sutar-*` names as fallbacks. Both are routed to the same URL.

`dist/index.js` rebuilt from updated `src/index.ts` (12.3 KB).

### 5. Updated (1 file) — companies/do-app/backend/src/services/hojaiClient.ts

Comments updated to reference the new canonical paths. URL paths kept
unchanged (`/api/nexha/sutar-supplier-registry/...`) because the Hub
deprecation aliases keep them working without breaking the do-app.

`backend/package.json` bumped to `1.1.0`; root `package.json` bumped to `1.1.0`.
All 12 `hojaiClient.nexha.test.ts` cases pass.

### 6. Updated (1 file) — INTEGRATION-STATUS.md

Updated the dev-stack snippet to start `sutar-dev-mock` from its new
HOJAI location: `cd companies/HOJAI-AI/sutar-os/sutar-dev-mock && npm start &`.

---

## Verification

| Check | Result |
|---|---|
| 5 moved services — `vitest run` | ✅ 20+49+22+38+31 = **160 tests pass** |
| Hub `tsc` build | ✅ no errors |
| do-app `jest` nexha client | ✅ 12/12 tests pass |
| git status | ✅ all moves are tracked renames (history preserved) |
| `nexha-supplier-registry` → grep | ✅ no leftover refs in src/ |
| Old `sutar-supplier-registry` → grep in HOJAI | ✅ zero matches |

---

## Backward compatibility

The Hub now accepts BOTH the canonical and deprecation paths:

```bash
# Both work — they hit the same upstream URL.
curl http://localhost:4399/api/nexha/nexha-supplier-network/api/v1/suppliers
curl http://localhost:4399/api/nexha/sutar-supplier-registry/api/v1/suppliers
```

Deprecation removal target: **Phase 1 of ADR-0009 (target: 2026-07-13)**.
After that, the old `sutar-*` names return 404.

---

## Open follow-ups (Phase 1+)

- [ ] Remove deprecation aliases from Hub
- [ ] Update do-app client to use canonical `nexha-*` paths
- [ ] Update do-app mobile UX strings that mention SUTAR/HOJAI
- [ ] Publish `@nexha/*` packages to npm
- [ ] Update HOJAI-AI `CLAUDE.md` to remove the 5 moved services
- [ ] Update HOJAI-AI `sutar-os/README.md` to remove the 5 entries
- [ ] Update HOJAI-AI `sutar-os/ARCHITECTURE.md` to remove the 5 entries
- [ ] Update `CANONICAL-PORT-REGISTRY.md` to point to new paths
- [ ] Update `STATUS-AND-REMAINING-WORK.md` Phase C entries
- [ ] Update `ROADMAP-TO-VISION.md` Phase C entries
- [ ] Update `README.onepager.md` Phase C table
- [ ] Add `nexha-*/` entries to root `CLAUDE.md` service registry
- [ ] Add `sutar-dev-mock` entry to HOJAI-AI service registry
- [ ] Update `scripts/dev-stack.sh` to start the 5 services from their new paths

---

## Commit map

This phase was delivered as **5 atomic commits** for a clean history:

1. **Move 5 Phase C services to Nexha** (5× git-mv + 5× package.json rename + 5× src update)
2. **Delete 3 L1 stubs** (procurement-os, distribution-os, trade-finance)
3. **Move sutar-mock to HOJAI as sutar-dev-mock**
4. **Update Hub NEXHA_SERVICES** (canonical + deprecation aliases)
5. **Update do-app client** (comments + version bump)

All pushed to `origin/refactor/consolidate-hojai-ai`.

---

*Documented 2026-06-22 as part of the ADR-0009 11-phase build plan.*
