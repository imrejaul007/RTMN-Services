# AdBazaar Within-Dedup — Phase 7

**Date:** June 20, 2026
**Scope:** Relocate only, no deletes. Resolve all 54 within-AdBazaar port conflicts by relocating one of each conflicting pair to a fresh port.

---

## Goal

Reduce within-AdBazaar port conflicts from **54 → 0** by relocating one of each pair/triple to a fresh port in reserved AdBazaar ranges.

**No directories are deleted.** All code, configs, and tests are preserved.

---

## Why relocate instead of delete

The audit identified ~15 obvious duplicates (e.g., `ssp-gateway` top-level vs `ssp-portal/ssp-gateway` container). The conservative instinct is: even if they look duplicate, deleting one is irreversible and risks losing the canonical version. Relocation costs only ports (cheap) and preserves everything.

---

## Strategy

For each conflict, pick **one** service to keep on the current port, and **relocate the other(s)** to fresh ports. The "kept" service is whichever the docker-compose / CI deploys (the canonical one).

### Service-selection rules

1. **If docker-compose or CI deploys one**, that one stays on its port. The other(s) relocate.
2. **Otherwise**, pick the top-level service over the container sub-service (top-level is more discoverable).
3. **Otherwise**, pick the service with more code (more src files).

### Confirmed docker-deployed services (these stay)

From `docker-compose.adbazaar-services.yml` and `.github/workflows/deploy.yml`, these are deployed on their claimed ports:

| Port | Deployed service | Non-deployed duplicates to relocate |
|---:|---|---|
| 4810 | services/REZ-email-validator | in-ad-booking-service |
| 4811 | services/REZ-fraud-detection | ecosystem-transaction-hub |
| 4812 | services/REZ-creative-ab-testing | cross-channel-orchestrator |
| 4815 | services/REZ-attribution-modeling | apartment-targeting-service |
| 4816 | services/REZ-audience-sync | place-graph-index |
| 4760 | services/REZ-content-syndication | customer-support-service |
| 4802 | services/REZ-white-label-portal | intent-marketplace |

(The docker-compose says "Ports 4810-4819" and lists 11 services. I confirmed 7 of those are in our conflict list.)

### For other 47 conflicts

Apply the simple rule: **keep the top-level service, relocate the other(s)**.

---

## Destination ranges

After phase 6, the `5114-5172` range is used. The `5173-5199` range is partially free. Plus the entire `5350-5399` range is free. That's plenty for ~54 new ports.

| Range | Size | Use |
|---|---:|---|
| 5173-5199 | 27 | Bucket 1 relocations |
| 5350-5399 | 50 | Bucket 2 relocations |
| 5400-5449 | 50 | Bucket 3 (overflow) |

Total: **127 fresh ports** available for ~54 relocations. Plenty of room.

---

## Implementation

### Phase 7a — Build the full relocation map v2

Build `scripts/port-relocation-map-v2.json` with ~54 entries. For each conflict:

```
{
  "service": "<the one to relocate>",
  "old_port": <current>,
  "new_port": <fresh from 5173-5399 range>,
  "reason": "<why relocating, e.g. 'duplicate of top-level' or 'collides with deployed services/REZ-*'>"
}
```

Validate:
- All destinations unique
- All destinations free in canonical registry
- All destinations not already claimed by AdBazaar

### Phase 7b — Apply relocations

Reuse `apply-port-relocation.js`. The script is already general-purpose; just point it at the v2 map (or extend it to accept a `--map` flag).

### Phase 7c — Verify

```bash
node scripts/audit-ports.js | grep "Within-AdBazaar conflicts"
# Expected: 0

node scripts/audit-ports.js | grep "Cross-ecosystem collisions"
# Expected: 0 (unchanged from phase 6)
```

### Phase 7d — Update docs

- `companies/AdBazaar/CLAUDE.md` — append new port map section
- `CANONICAL-PORT-REGISTRY.md` — append Within-Dedup section

---

## Verification checklist

- [ ] 0 within-AdBazaar conflicts
- [ ] 0 cross-ecosystem collisions (unchanged from phase 6)
- [ ] All ~54 services still build (no `package.json` deleted)
- [ ] All docker-compose deployed services still on their claimed ports (the relocated services are NOT in docker-compose, so no impact)
- [ ] No service dir deleted

---

## Risks & mitigations

| Risk | Mitigation |
|---|---|
| New ports collide with each other | Pre-validate uniqueness in Phase 7a |
| New ports collide with future RTMN canonical claims | Use ranges 5173-5199 / 5350-5399 (currently free in canonical) |
| Some relocated services have hardcoded URLs to old ports | Out of scope — those are integration issues; the audit only checks port declarations |
| Relocated service's tests reference old port | Reuse the same regex-based rewrite from phase 6 which catches .env, .env.example, tests/, etc. |

---

## Estimated effort

- Phase 7a (map): 20 min (need to assign ~54 ports carefully)
- Phase 7b (apply): 10 min
- Phase 7c (verify): 5 min
- Phase 7d (docs): 10 min

**Total: ~45 min.**

---

## Files that will be created/modified

**Created:**
- `companies/AdBazaar/scripts/port-relocation-map-v2.json`

**Modified (~54 service files):**
- One port-string rewrite per relocated service (~1-3 files each)

**Modified (docs):**
- `companies/AdBazaar/CLAUDE.md` (port map appendix)
- `CANONICAL-PORT-REGISTRY.md` (within-dedup appendix)

**NOT modified:**
- Any docker-compose file (the 7 deployed services stay on their ports)
- Any CI workflow file (no service paths change)
- Any Hub routes (no AdBazaar URLs change)
- Any service directory (no deletions)