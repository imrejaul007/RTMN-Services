# ADR-0009 Phase 1 — Execution Log

> **Date:** 2026-06-22
> **Phase:** 1 of 11 (ADR-0009 build plan)
> **Status:** ✅ **COMPLETE**
> **Owner:** HOJAI + Nexha joint team
> **Duration:** ~30 minutes (single session)

## Summary

Removed the 5 deprecation aliases (`sutar-supplier-registry`, `sutar-logistics`,
`sutar-warehouse-network`, `sutar-trade-finance`, `sutar-pricing-intelligence`)
from the Hub and updated all consumers to use the canonical `nexha-*` paths.
The old sutar-* names now return 404 from the Hub.

This completes the rename introduced in Phase 0.

---

## What changed

### 1. Hub — `companies/RABTUL-Technologies/REZ-ecosystem-connector/`

- **Removed** 5 deprecation-alias entries from `NEXHA_SERVICES` map
- **Removed** 5 deprecation-alias entries from `/api/nexha/capabilities` payload
- **Rebuilt** `dist/index.js` from updated `src/index.ts`
- **Restarted** the running Hub process to pick up the new dist

### 2. do-app client — `companies/do-app/backend/src/services/hojaiClient.ts`

Updated 5 methods to use canonical `nexha-*` Hub paths:
- `nexhaSutar.listSuppliers()`   → `/api/nexha/nexha-supplier-network/api/v1/suppliers`
- `nexhaSutar.quoteShipping()`   → `/api/nexha/nexha-distribution-network/api/v1/quote`
- `nexhaSutar.getCreditOffer()`  → `/api/nexha/nexha-trade-finance-network/api/v1/credit-offers`
- `nexhaSutar.getFxQuote()`      → `/api/nexha/nexha-trade-finance-network/api/v1/fx/quote`
- `nexhaWarehouses.discover()`   → `/api/nexha/nexha-warehouse-network/api/v1/warehouses`
- `nexhaWarehouses.createTransfer()` → `/api/nexha/nexha-warehouse-network/api/v1/transfers`
- `nexhaPricing.comparePrices()` → `/api/nexha/nexha-pricing-network/api/v1/compare`
- `nexhaPricing.recommendPrice()`→ `/api/nexha/nexha-pricing-network/api/v1/dynamic-price`

Comments updated to reflect that deprecation aliases are no longer used.
`backend/package.json` bumped 1.1.0 → 1.2.0; root `package.json` bumped 1.1.0 → 1.2.0.

### 3. do-app tests — `companies/do-app/backend/__tests__/unit/hojaiClient.nexha.test.ts`

All 12 test assertions updated to canonical `nexha-*` paths.

### 4. Demo script — `demos/full-stack-demo.sh`

All 12 URL endpoints updated to canonical `nexha-*` paths.
Removed a stale `check_2xx` line that referenced a deleted L1 stub.

### 5. Dev stack script — `scripts/dev-stack.sh`

Rewritten to:
- Remove the 3 L1 stub commands (procurement-os, distribution-os, trade-finance)
- Add 5 nexha-* service start commands
- Fix stale warehouse-network path → `nexha-warehouse-network`
- Fix stale economy port 4251 → 4294
- Update `status()` and `stop_all()` to match the new service list

### 6. Docker compose — `docker-compose.dev.yml`

- Removed 3 L1 stub service blocks (nexha-procurement :4320, nexha-distribution :4300, nexha-trade-finance :4340)
- Removed warehouse-network block (sutar-warehouse-network was in HOJAI)
- Added 5 nexha-* service blocks (supplier, distribution, warehouse, trade-finance, pricing)
- Updated Hub environment vars (`SUTAR_WAREHOUSE_NETWORK_URL` removed, replaced with `NEXHA_*_URL` set for all 5)
- Fixed `SUTAR_ECONOMY_URL` 4251 → 4294

### 7. Dockerfiles — `companies/Nexha/services/nexha-*/Dockerfile`

The 4 missing Dockerfiles (warehouse-network already had one) were created
using the same generic Node 20-alpine pattern. All 5 now have a Dockerfile
that npm ci's the production deps and runs `npm start`.

### 8. Docs — updated to remove deprecation language

| File | Change |
|---|---|
| `CANONICAL-PORT-REGISTRY.md` | Removed "deprecation alias" notes from 5 port rows |
| `STATUS-AND-REMAINING-WORK.md` | Updated Phase C line: deprecation aliases were removed in Phase 1 |
| `README.onepager.md` | Updated ADR-0009 note: "Phase 0+1", aliases removed |
| `CLAUDE.md` | Renamed `sutar-pricing-intelligence` → `nexha-pricing-network` (line 1024) |
| `companies/HOJAI-AI/CLAUDE.md` | Phase B+C table now reflects moved services (4 services → nexha-* with their new locations); ports fixed (4251→4294, 4185→4292) |
| `companies/HOJAI-AI/divisions/12-sutar-os/CLAUDE.md` | Updated status line: 4 Phase C services moved to Nexha with new names |

---

## Verification

| Check | Result |
|---|---|
| 5 nexha services — `vitest run` | ✅ 20+49+22+38+31 = **160 tests pass** |
| do-app `jest` nexha client | ✅ **12/12 tests pass** |
| Hub `tsc` build | ✅ no errors |
| Hub `/api/nexha/capabilities` (live) | ✅ only canonical `nexha-*` names in payload |
| Hub `/api/nexha/sutar-supplier-registry/health` (live) | ✅ returns **404** (alias removed) |
| Hub `/api/nexha/sutar-logistics/api/v1/quote` POST (live) | ✅ returns **404** (alias removed) |
| git status | ✅ all changes tracked |

---

## Hub live state (canonical only)

```json
{
  "capabilities": {
    "supplier-registry":    ["nexha-supplier-network"],
    "warehouse-network":    ["nexha-warehouse-network"],
    "logistics":            ["nexha-distribution-network"],
    "banking":              ["nexha-trade-finance-network"],
    "pricing-intelligence": ["nexha-pricing-network"],
    "orchestrator":         ["ecosystem-connector"],
    "franchise":            ["franchise-os"],
    "manufacturing":        ["manufacturing-os"],
    "demand-forecast":      ["intelligence-layer"]
  },
  "services": {
    "nexha-gateway":               "http://localhost:5002",
    "franchise-os":                "http://localhost:4310",
    "manufacturing-os":            "http://localhost:4330",
    "intelligence-layer":          "http://localhost:4350",
    "ecosystem-connector":         "http://localhost:4399",
    "nexha-supplier-network":      "http://localhost:4280",
    "nexha-distribution-network":  "http://localhost:4285",
    "nexha-warehouse-network":     "http://localhost:4288",
    "nexha-trade-finance-network": "http://localhost:4287",
    "nexha-pricing-network":       "http://localhost:4286"
  }
}
```

---

## Out of scope (deferred to later phases)

- **Publish `@nexha/*` packages to npm** — Phase 3+
- **Update HOJAI-AI submodule CLAUDE.md to remove the moved services from its inventory** — already partially done; the remaining work is in the HOJAI-AI repo (not the RTMN root)
- **Update HOJAI-AI `sutar-os/CLAUDE.md` and `sutar-os/ARCHITECTURE.md`** — these live in the HOJAI-AI submodule and will be updated in the next submodule bump

---

## What is now possible

With Phase 1 complete, ADR-0009's Phase 2 (multi-tenancy for SUTAR) can begin —
the Hub is now exclusively the canonical routing surface, so adding a tenant
filter in `NEXHA_SERVICES` becomes a clean change.

---

*Documented 2026-06-22 as part of the ADR-0009 11-phase build plan.*
