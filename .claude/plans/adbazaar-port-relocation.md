# AdBazaar Port Relocation — Phase 6

**Date:** June 20, 2026
**Scope:** Cross-ecosystem collisions only (35 unique RTMN-canonical ports claimed by AdBazaar). Within-AdBazaar duplicates deferred.

---

## Goal

Move 35 AdBazaar services off ports that the RTMN canonical registry assigns to other RTMN services. Relocate them into AdBazaar-reserved ranges that don't conflict with anything.

---

## Source of truth

- `/Users/rejaulkarim/Documents/RTMN/CANONICAL-PORT-REGISTRY.md` — what RTMN owns
- `node scripts/audit-ports.js` — current conflicts (will go from 71 cross-ecosystem to 0)
- `node scripts/dump-conflicts.js` — full conflict list (already saved to `/tmp/adb-conflicts.txt`)

---

## AdBazaar-Reserved Port Ranges (NEW)

These ranges are confirmed empty in the canonical registry and not used by AdBazaar today. Allocated as AdBazaar's exclusive space for relocated services.

| Range | Size | Purpose |
|---|---|---|
| **4955-4979** | 25 ports | Reserved for cross-ecosystem relocation targets (ads, campaign, intelligence) |
| **5311-5349** | 39 ports | Reserved for cross-ecosystem relocation targets (marketing, social, integration bridges) |

---

## Relocation Mapping (35 services)

The script in Phase 3 will produce a JSON file `scripts/port-relocation-map.json` with this exact mapping. Below is the human-readable plan:

### Group A — Move into 4955-4969 (DSP/SSP-adjacent)

| Current Port | Current Owner (RTMN canonical) | AdBazaar Service | New Port |
|---|---|---|---|
| 4000 | graphql-federation | `adbazaar-api-gateway` | 4955 |
| 4000 | graphql-federation | `REZ-marketing-backend/services/marketing-service` | 4956 |
| 4510 | event-bus | `tenant-registry` | 4957 |
| 4600 | business-copilot | `REZ-rtb-service` | 4958 |
| 4600 | business-copilot | `hyperlocal-demand-service` | 4959 |
| 4701 | genie-gateway | `ssai-service` | 4962 |
| 4702 | corpid-service | `ctv-ad-server` | 4963 |
| 4703 | memory-os | `ott-streaming-sdk` | 4964 |
| 4722 | genie-learning-os | `adBazaar-hojai-integration` | 4965 |
| 4750 | analytics-os | `bi-reporting-dashboard` | 4966 |
| 4750 | analytics-os | `services/REZ-auto-responder` | 4967 |
| 4800 | acp-protocol | `intent-signal-aggregator` | 4968 |
| 4801 | acn-network | `intent-prediction-engine` | 4969 |

### Group B — Move into 5311-5349 (campaign/social/integration)

| Current Port | Current Owner (RTMN canonical) | AdBazaar Service | New Port |
|---|---|---|---|
| 4810 | merchant-agents | `in-ad-booking-service` | 5311 |
| 4810 | merchant-agents | `services/REZ-email-validator` | 5312 |
| 4820 | agent-reputation | `conversion-optimization-ai` | 5313 |
| 4820 | agent-reputation | `governance-service` | 5314 |
| 4830 | agent-contracts | `merchant-intelligence` | 5315 |
| 4830 | agent-contracts | `retail-media-network-hub` | 5316 |
| 4840 | agent-wallets | `ai-banner-generator` | 5317 |
| 4840 | agent-wallets | `autonomous-campaign-agent` | 5318 |
| 4870 | notification-service | `adbazaar-hojai-gateway` | 5319 |
| 4870 | notification-service | `cross-app-orchestration` | 5321 |
| 4870 | notification-service | `merchant-insights-os` | 5322 |
| 4881 | ai-intelligence | `wedding-graph-service` | 5323 |
| 4885 | customer-intelligence | `event-demand-forecaster` | 5324 |
| 4890 | asset-twin | `yield-optimization-brain` | 5325 |
| 4930 | finance-copilot | `autonomous-growth-orchestrator` | 5326 |
| 4954 | journey-intelligence | `corpperks-hr-integration` | 5327 |
| 5010 | restaurant-os | `agency-workspace-service` | 5328 |
| 5020 | healthcare-os | `creative-os-service` | 5329 |
| 5030 | retail-os | `email-campaign-service` | 5331 |
| 5040 | exhibition-os | `webhook-service` | 5332 |
| 5055 | sales-os | `sequence-automation` | 5333 |
| 5060 | education-os | `affiliate-tracking-service` | 5334 |
| 5070 | agriculture-os | `influencer-outreach-service` | 5335 |
| 5077 | workforce-os | `customer-onboarding-service` | 5336 |
| 5080 | automotive-os | `instagram-shop-integration` | 5337 |
| 5080 | automotive-os | `customer-success-playbook-service` | 5338 |
| 5090 | beauty-os | `hashtag-research-engine` | 5339 |
| 5090 | beauty-os | `data-warehouse-service` | 5341 |
| 5095 | fashion-os | `pinterest-integration` | 5342 |
| 5095 | fashion-os | `recommendation-engine-service` | 5343 |
| 5096 | procurement-os | `personalization-rules-service` | 5344 |
| 5100 | cxo-os | `content-repurposing-engine` | 5345 |
| 5100 | cxo-os | `coupon-management-service` | 5346 |
| 5110 | fitness-os | `reddit-integration` | 5347 |
| 5110 | fitness-os | `subscription-billing-service` | 5348 |
| 5170 | professional-os | `REZ-SalesMind` | 5349 |

---

## What I will NOT touch (deferred)

- **Within-AdBazaar duplicates (69 conflicts)**: e.g., `ssp-gateway` vs `ssp-portal/ssp-gateway`, `REZ-pixel` vs `adbazaar-pixel`, all `services/`-container sub-services that duplicate top-level services. These need **service dedup** (delete the duplicate), not port relocation. Separate task.
- **`REZ-marketing` & `REZ-economic-engine` claiming port 4000**: They are also within-AdBazaar duplicates. Mark for dedup; not port-relocated.
- **CLAUDE.md port claims**: 18+ stale claims like `audience-twin-service: 4841` (actually 4805). Documented but not edited — that's a separate doc-fix task.
- **Hub `SERVICES` map**: The Hub references port 4061 (DSP) and 4961 (CDP), both already AdBazaar-canonical. No Hub changes needed for this phase.
- **Marketing OS / other RTMN services that import AdBazaar ports**: not changed.

---

## Implementation

### Phase 3a — Build the relocation map script

Create `scripts/port-relocation-map.json` with the full mapping above. Validate against `audit-ports.js` output to ensure no destination port is already claimed.

### Phase 3b — Build the relocation applier script

Create `scripts/apply-port-relocation.js` that:
1. Reads `port-relocation-map.json`
2. For each `(service_dir, old_port, new_port)`:
   - Finds every file in the service containing the old port
   - Rewrites `process.env.PORT || <OLD>` → `process.env.PORT || <NEW>`
   - Rewrites `.env` files (`PORT=<OLD>` → `PORT=<NEW>`)
   - Skips `.d.ts` and `dist/` artifacts
3. Dry-run mode (`--dry-run`) prints changes without writing
4. Skips files outside the named service dir (won't accidentally rewrite a comment elsewhere)

### Phase 3c — Run + verify

```bash
# 1. Dry run
node scripts/apply-port-relocation.js --dry-run | head -50

# 2. Apply
node scripts/apply-port-relocation.js

# 3. Verify zero cross-ecosystem collisions
node scripts/audit-ports.js | tail -10
# Expected: 🚨 Cross-ecosystem collisions: 0

# 4. Verify no new within-AdBazaar conflicts introduced
# (within-AdBazaar conflicts unchanged — they're duplicate services, separate problem)
```

### Phase 3d — Update CANONICAL-PORT-REGISTRY.md

Add an "AdBazaar Cross-Ecosystem Collision Resolution" appendix listing the 35 services and their new ports. Don't edit the main AdBazaar section (which is already mostly absent — AdBazaar services aren't in the canonical registry by design).

### Phase 3e — Update AdBazaar CLAUDE.md

Add a "Port Map (post-relocation 2026-06-20)" section listing the 35 services and their new ports, so future contributors don't use the old claims.

---

## Verification checklist

- [ ] `node scripts/audit-ports.js` → 🚨 Cross-ecosystem collisions: **0**
- [ ] Within-AdBazaar conflicts: still 69 (unchanged — separate task)
- [ ] `node --check` on Hub routes still passes
- [ ] Sample 5 relocated services: `cat .env` shows new ports
- [ ] No file outside the named service dir was modified (grep for `4968` — should only appear in `intent-signal-aggregator/`)

---

## Risks & mitigations

| Risk | Mitigation |
|---|---|
| Relocation script overwrites a comment in unrelated service | Scope every rewrite to the named service dir only |
| New ports 4955-4969/5311-5349 collide with each other | Validate destination ports in mapping step before applying |
| Tests reference old ports (e.g., `test-all-services.js`) | Also scan `tests/` and `__tests__/` dirs |
| Service `.env.example` files referenced in `docker-compose.yml` | Audit script already covers `.env*`; check `docker-compose.yml` separately if used |
| CLAUDE.md port claims (e.g., `rez-dsp-bidder: 4061`) lie | Update AdBazaar CLAUDE.md in Phase 3e |

---

## Estimated effort

- Phase 3a (map): 10 min
- Phase 3b (script): 20 min
- Phase 3c (run + verify): 10 min
- Phase 3d (canonical registry): 10 min
- Phase 3e (AdBazaar CLAUDE.md): 10 min

**Total: ~1 hour.**

---

## Files that will be created/modified

**Created:**
- `companies/AdBazaar/scripts/port-relocation-map.json`
- `companies/AdBazaar/scripts/apply-port-relocation.js`

**Modified (one rewrite per service, 2-4 files each):**
- 35 service dirs × ~3 files = ~100 files
- `companies/AdBazaar/CLAUDE.md` — port map appendix
- `/Users/rejaulkarim/Documents/RTMN/CANONICAL-PORT-REGISTRY.md` — appendix

**NOT modified:**
- RTMN Hub routes (DSP/audience/attribution/CDP already point to AdBazaar-canonical ports)
- Marketing OS config (already references AdBazaar correctly)
- Any service outside the 35 being relocated
- CLAUDE.md or port claims for non-relocated services (separate doc-fix task)