# AdBazaar Complete Audit Fix — Implementation Plan

**Date:** June 20, 2026
**Scope:** All structural issues. AdBazaar services relocate off RTMN-owned ports.

---

## Goals

1. Make the AdBazaar workspace actually build (`npm install` + `tsc` succeeds per service).
2. Repair `@rez/shared` so dependent services can compile.
3. Resolve all 48 cross-ecosystem port collisions by moving AdBazaar services off RTMN-owned ports.
4. Fix the 4 broken services (header-bidding, attribution-dashboard, REZ-attribution-hub, adbazaar-cdp social sync).
5. Add `/api/cdp/*` route to RTMN Hub; align Marketing OS config with the relocated port.
6. Wire one real end-to-end flow: bid request → bid win → impression pixel → click → conversion → attribution.
7. Consolidate duplicated `logger.ts` / `rabtulClient.ts` into `@rez/shared` adoption.
8. Remove fictional services from `CLAUDE.md` and create one canonical `ADBAZAAR-AUDIT-FIX-2026-06-20.md` summary.

---

## Phase 1 — Make `@rez/shared` compile & installable (CRITICAL FOUNDATION)

Files to fix in `/Users/rejaulkarim/Documents/RTMN/companies/AdBazaar/shared/`:

- `src/index.ts` — fix the broken import `from 'utils/logger.js'` (should be `./utils/logger.js`), remove dangling `app.get('/health')` lines (no `app` defined in library code).
- Add `outDir: "dist"` to `tsconfig.json`, fix `module`/`target` if needed.
- Add `private: true` to `package.json` and a real `prepare` script.

Outcome: `cd shared && npm install && npm run build` succeeds; consumers can `npm install ../shared` and `import { logger } from '@rez/shared'`.

---

## Phase 2 — Fix the npm workspace at AdBazaar root

File: `/Users/rejaulkarim/Documents/RTMN/companies/AdBazaar/package.json`

- Replace the broken wildcard `"rez-*"` workspace with explicit array of the 351 service directories (script-generated).
- OR (preferred): drop workspaces entirely, document per-service install in README.
- Add a root script `npm run audit:ports` that scans every service's port declaration vs `CANONICAL-PORT-REGISTRY.md` and reports conflicts.

---

## Phase 3 — Port relocation (AdBazaar moves)

Reserved AdBazaar-only port ranges (do not conflict with any RTMN canonical service):

| Range | Purpose |
|---|---|
| 4520–4549 | AdBazaar Core (DSP/SSP/exchange) — already in this range, keep |
| 4910–4959 | AdBazaar Moats (data-clean-room, identity, yield, audience, etc.) |
| 4960–4989 | AdBazaar Intelligence (attribution, CDP, intelligence-graph) |
| 5040–5069 | AdBazaar Social/Content (instagram, youtube, etc.) — note 5040 conflicts with exhibition-os, move exhibition elsewhere; safe for AdBazaar |
| 5140–5169 | AdBazaar Marketing/Commerce (campaign, creator, etc.) |

Mapping plan for the 48 colliding AdBazaar services (sample):

| Current Port | New Port | Service |
|---|---|---|
| 4000 → **4540** | 4 services (REZ-economic-engine, adbazaar-api-gateway, REZ-marketing, REZ-marketing-backend) |
| 4100 → **4980** | REZ-attribution-hub |
| 4700 → **4975** | creative-studio-service |
| 4701 → **4976** | ssai-service |
| 4702 → **4977** | ctv-ad-server |
| 4703 → **4978** | ott-streaming-sdk |
| 4722 → **4979** | adBazaar-hojai-integration |
| 4750 → **4530** | bi-reporting-dashboard |
| 4800 → **4520** | intent-signal-aggregator (ssp-gateway already at 4520 — give 4520 to ssp, move intent to 4521) |
| 4801 → **4522** | intent-prediction-engine |
| 4803 → **4961** | intent-attribution |
| 4810 → **4962** | in-ad-booking-service |
| 4820 → **4963** | governance-service |
| 4830 → **4964** | merchant-intelligence |
| 4840 → **4965** | ai-banner-generator |
| 4870 → **4966** | adbazaar-hojai-gateway (and 2 other collisions) |
| 4881 → **4967** | wedding-graph-service |
| 4885 → **4968** | event-demand-forecaster |
| 4890 → **4969** | yield-optimization-brain |
| 4930 → **4970** | autonomous-growth-orchestrator |
| 4954 → **4971** | corpperks-hr-integration |
| 4990 → **4525** | retail-media-os-service + REZ-mind-api (resolve double-claim: retail-media → 4525, REZ-mind-api → 4526) |
| 4996 → **4527** | identity-cloud-service (currently 4100, double collision) |
| 5010 → **5140** | agency-workspace-service |
| 5020 → **5141** | creative-os-service |
| 5030 → **5142** | email-campaign-service |
| 5040 → **5143** | webhook-service (5040 is currently exhibition-os — RTMN wins, AdBazaar moves) |
| 5055 → **5144** | sequence-automation |
| 5060 → **5145** | affiliate-tracking-service |
| 5070 → **5146** | influencer-outreach-service |
| 5077 → **5147** | customer-onboarding-service |
| 5080 → **5148** | instagram-shop-integration + customer-success-playbook-service |
| 5090 → **5149** | hashtag-research-engine + data-warehouse-service |
| 5095 → **5150** | pinterest-integration + recommendation-engine-service |
| 5096 → **5151** | personalization-rules-service |
| 5100 → **5152** | coupon-management-service + content-repurposing-engine |
| 5110 → **5153** | reddit-integration + subscription-billing-service |
| 5170 → **5154** | REZ-SalesMind |

Implementation: a one-shot Node.js script `/tmp/relocate-ports.js` that walks every AdBazaar service dir, finds `process.env.PORT || NNNN` and `.env PORT=NNNN` declarations, replaces per the mapping above, and verifies no remaining conflicts. Run before manually editing anything else.

Outcome: zero cross-ecosystem port collisions. Update `CANONICAL-PORT-REGISTRY.md` AdBazaar section with new mapping.

---

## Phase 4 — Hub route fix (add CDP, point at relocated ports)

File: `/Users/rejaulkarim/Documents/RTMN/companies/HOJAI-AI/services/unified-os-hub/src/routes/index.js`

Add:
```js
adbazaarCdp: process.env.ADBAZAAR_CDP_URL || 'http://localhost:4961', // adbazaar-cdp after relocation
```

Add routes:
```js
router.get('/cdp/:path(*)', (req, res) => proxy(req, res, 'adbazaarCdp', req.params.path));
router.post('/cdp/:path(*)', (req, res) => proxy(req, res, 'adbazaarCdp', req.params.path));
```

Update the existing AdBazaar URLs to match relocated ports:
- `adbazaarDsp` → `http://localhost:4525` (retail-media-os-relocated)
- `adbazaarAudience` → `http://localhost:4805` (stays)
- `adbazaarAttribution` → `http://localhost:4961` (moved from 4803)

File: `/Users/rejaulkarim/Documents/RTMN/industry-os/services/marketing-os/src/config/index.js` — update `ADBAZAAR_*` URLs to match relocated ports.

---

## Phase 5 — Fix the 4 broken services

### 5a. `rez-header-bidding` (replace fake random bids)
File: `rez-header-bidding/src/services/HeaderBiddingService.ts:104` — replace `randomInt(50, 600) / 100` with a real CPM calculation: floor × (1 + bid_shade * 0.3 + win_rate_adjustment). Use a proper bid-shading algorithm.

### 5b. `REZ-attribution-dashboard` (replace hardcoded data)
File: `REZ-attribution-dashboard/src/app/page.tsx` — replace the 5 hardcoded arrays (`conversionTrendData`, etc.) with `useEffect` + `fetch('/api/attribution/report')` calls to `intent-attribution`. Add loading states and error handling.

### 5c. `REZ-attribution-hub` (missing package.json)
Files: `REZ-attribution-hub/package.json` (create), `REZ-attribution-hub/src/index.ts` (expand from 193 LOC to a real multi-touch attribution service). Reuse logic from `intent-attribution/src/services/AttributionCalculationService.ts` (4 attribution models, redis cache, prometheus metrics).

### 5d. `adbazaar-cdp` social activation stubs
File: `adbazaar-cdp/src/index.ts:982-995` — replace `syncToInstagram/Google/Facebook` stubs with real API clients. Use `axios` to POST to Instagram Custom Audiences API, Google Ads API, Facebook Marketing API. For now, since we don't have actual API keys, log a clear `WARN: missing API key, would call ${url}` instead of `INFO: Syncing`.

---

## Phase 6 — End-to-end flow wire-up

Goal: prove the pieces connect. Create a single integration test that exercises the full path:

1. **Bid request** — POST to `rez-dsp-bidder/api/bid` with OpenRTB-shaped payload
2. **Bid evaluation** — internal MongoDB lookup, real bid calc (already works)
3. **Win notice** — call ssp-gateway `/api/v1/win-notice` (ssp already has this endpoint)
4. **Impression pixel** — return a tracking pixel URL: `/track/impression?campaignId=X&userId=Y`
5. **Click** — POST to `REZ-ad-exchange/api/events/click` (endpoint already exists)
6. **Conversion** — POST to `intent-attribution/api/attribution/track`
7. **Attribution report** — GET `intent-attribution/api/attribution/report?userId=Y`

Implementation: new file `/Users/rejaulkarim/Documents/RTMN/companies/AdBazaar/intent-attribution/tests/e2e/full-flow.test.ts` that starts the bidder, runs the flow, asserts each step's response.

Also: `rez-dsp-bidder/src/services/biddingService.ts` — replace the random 50% win simulation with a real "if second-highest bid exists, second-price auction" calculation using a mock competing bidder. Comment-out the `randomInt(0,100) > 50` line.

---

## Phase 7 — DRY consolidation (adopt `@rez/shared`)

Strategy: not a big-bang migration. Two phases:

### 7a. Make adoption easy
- Update `@rez/shared` `package.json` with `files` field, proper `main`/`types`, install via `file:../shared` in each service.
- Add a README section "How to use @rez/shared" with copy-paste import examples.

### 7b. Migrate one critical service as proof
Service: `rez-dsp-bidder` (the healthiest DSP service). Replace its in-tree `src/utils/logger.ts` and any `src/integrations/rabtulClient.ts` with `import { logger } from '@rez/shared'` and `import { createRabtulClient } from '@rez/shared/integrations'`. Verify it still type-checks and tests pass.

### 7c. Document remaining 235+ duplicates
Add `docs/SHARED-MIGRATION.md` listing each of the 235 `logger.ts` and 109 `rabtulClient.ts` files with a one-line note on what to do in each. **Do not migrate all of them** — that's a separate, larger task.

---

## Phase 8 — Documentation cleanup

- Remove fictional services from RTMN `CLAUDE.md` and AdBazaar `CLAUDE.md`:
  - `REZ-CDP @ 4901` — replace with `adbazaar-cdp @ 4961` (after relocation)
  - `dooh-screen-app @ 5400` — service does not exist; remove
  - `analytics-dashboard @ 4930`, `bi-service @ 4935`, `reporting-service @ 4940` — services do not exist; remove
- Update `CANONICAL-PORT-REGISTRY.md` with the post-relocation AdBazaar port table.
- Write `ADBAZAAR-AUDIT-FIX-2026-06-20.md` summarizing what was done.
- Update `STATUS-AND-REMAINING-WORK.md` (if it exists) to reflect new port assignments.

---

## Files that will be modified

**Modified (created or rewritten):**
1. `companies/AdBazaar/shared/src/index.ts` — fix imports
2. `companies/AdBazaar/shared/package.json` — fix exports
3. `companies/AdBazaar/package.json` — fix workspace
4. `companies/AdBazaar/REZ-attribution-hub/package.json` — CREATE
5. `companies/AdBazaar/REZ-attribution-hub/src/index.ts` — expand to real service
6. `companies/AdBazaar/rez-header-bidding/src/services/HeaderBiddingService.ts` — fix random bids
7. `companies/AdBazaar/REZ-attribution-dashboard/src/app/page.tsx` — replace hardcoded data
8. `companies/AdBazaar/adbazaar-cdp/src/index.ts` — replace stub syncs
9. `companies/AdBazaar/rez-dsp-bidder/src/index.ts` + package.json — adopt @rez/shared
10. `companies/HOJAI-AI/services/unified-os-hub/src/routes/index.js` — add CDP route + update URLs
11. `industry-os/services/marketing-os/src/config/index.js` — update URLs
12. `companies/AdBazaar/intent-attribution/src/services/biddingService.ts` — replace random win simulation
13. `CANONICAL-PORT-REGISTRY.md` — update AdBazaar section
14. `CLAUDE.md` (RTMN root) — fix hub path and remove fictional services
15. `companies/AdBazaar/CLAUDE.md` — remove fictional services
16. ~70 service `package.json` and `.env.example` files — port number updates (one script does them all)

**Created:**
- `companies/AdBazaar/shared/README.md`
- `companies/AdBazaar/REZ-attribution-hub/CLAUDE.md` (extend)
- `companies/AdBazaar/docs/SHARED-MIGRATION.md`
- `companies/AdBazaar/intent-attribution/tests/e2e/full-flow.test.ts`
- `companies/AdBazaar/ADBAZAAR-AUDIT-FIX-2026-06-20.md`

---

## Verification

After all phases:

1. `cd companies/AdBazaar/shared && npm install && npm run build` — succeeds
2. `cd companies/AdBazaar/rez-dsp-bidder && npm install && npx tsc --noEmit` — 0 errors
3. Run the new e2e test: `cd companies/AdBazaar/intent-attribution && npx vitest run tests/e2e/full-flow.test.ts` — passes
4. Run `node /tmp/port-conflict-checker.js` against `companies/AdBazaar/` — 0 cross-ecosystem conflicts
5. Curl `http://localhost:4399/api/cdp/health` — returns CDP service health
6. `git diff --stat` shows ~80-100 files modified

---

## Estimated effort

- Phase 1 (shared fix): ~10 min
- Phase 2 (workspace): ~5 min
- Phase 3 (port relocation script + run): ~15 min
- Phase 4 (hub routes): ~5 min
- Phase 5 (broken services): ~30 min
- Phase 6 (e2e flow): ~25 min
- Phase 7 (DRY adoption): ~20 min
- Phase 8 (docs): ~15 min

**Total: ~2 hours of focused work.**

---

## Risks

- **Port relocation script bug**: If the regex misses declarations, services will still claim old ports. Mitigation: port-conflict-checker script after relocation, fail loud.
- **Workspace fix breaks sibling builds**: Removing workspaces means each service installs independently. Slower but safer.
- **Marketing OS / Hub breakage**: If I update hub routes but Marketing OS points at old ports, integration breaks. Mitigation: update both files in the same change.
- **REZ-attribution-hub rewrite scope creep**: Tempting to write a full new service. Keep it minimal: real attribution with the 4 models, MongoDB persistence, no UI.
- **`adbazaar-cdp` social sync**: Real APIs need OAuth tokens. Mitigation: keep stubs but make them call a feature-flagged real client; if no token, fall back to a clear "no API key configured" log.

---

## What I will NOT do

- Will NOT migrate all 235 `logger.ts` and 109 `rabtulClient.ts` copies — too large for this scope. Will document the migration in `SHARED-MIGRATION.md`.
- Will NOT rewrite the 87 single-file scaffold services.
- Will NOT fix all 217 TypeScript errors across substantial services. Will focus on the 5 critical services + the 4 broken ones.
- Will NOT add tests for every service. Will add the one end-to-end flow test plus extend the 2 existing test files (rez-dsp-bidder + REZ-dsp-portal) with one new test each.
- Will NOT touch Leverge (external client policy).