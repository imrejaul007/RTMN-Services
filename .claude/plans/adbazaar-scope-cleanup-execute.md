# AdBazaar Scope Cleanup — Execution Plan (Phase 9)

**Date:** 2026-06-20
**Scope:** Move 44 non-ad services from AdBazaar to their canonical homes, following the destinations in `SCOPE-AUDIT.md`.

---

## Critical constraints discovered

1. Each destination is a separate git repository. Cross-repo git mv not possible; use mv + git add.
2. RTNM-Group destinations go into `/Users/rejaulkarim/Documents/RTMN/services/` (root RTMN git repo).
3. RTMN CLAUDE.md has External Clients Policy naming Leverge explicitly. REZ-Merchant/CorpPerks are physically here with local git repos; treated as in-scope.

---

## Strategy: small batches, verify after each

44 services split into 7 destination groups. For each group:
1. Pre-check (grep for cross-references)
2. Move (git mv on AdBazaar side, git add on dest side)
3. Create/update CLAUDE.md at destination with provenance
4. Verify (port audit, sanity check)
5. Commit per group (so user can revert)

If a service has risky cross-references, skip it and continue with others.

---

## Group ordering

| # | Destination | Count |
|---|---|---:|
| 1 | CorpPerks | 2 |
| 2 | REZ-Consumer | 1 |
| 3 | RABTUL-Technologies | 1 |
| 4 | Karma-Foundation | 7 |
| 5 | RTNM-Group (RTMN root services/) | 7 |
| 6 | HOJAI-AI services | 6 |
| 7 | REZ-Merchant | 20 |

---

## Pre-flight: cross-reference scan

For each of the 44 services, grep across the entire RTMN repo (excluding the service's own dir) for references. Services with 0 external references are safe; 1-5 need manual check; 6+ are flagged.

---

## Per-service procedure

```bash
# In AdBazaar repo:
cd /Users/rejaulkarim/Documents/RTMN/companies/AdBazaar
git mv <service> /Users/rejaulkarim/Documents/RTMN/companies/<DEST>/

# In destination repo:
cd /Users/rejaulkarim/Documents/RTMN/companies/<DEST>
git add <service>
git commit -m "..."
```

For RTNM-Group destinations:
```bash
cd /Users/rejaulkarim/Documents/RTMN/companies/AdBazaar
git mv <service> /Users/rejaulkarim/Documents/RTMN/services/

# Then in root RTMN repo:
cd /Users/rejaulkarim/Documents/RTMN
git add services/<service>
git commit -m "..."
```

---

## CLAUDE.md at destination

```markdown
# <service>

> **Migrated from companies/AdBazaar/<service>/ on 2026-06-20.**
> Reason: this service is not advertising-related and belongs in <DEST>.
```

---

## Verification checklist

- [ ] 44 services moved
- [ ] AdBazaar dir count: 348 - 44 = 304
- [ ] Port audit: 0/0
- [ ] Destination CLAUDE.md for each
- [ ] Commits in both source and destination repos

---

## Estimated effort: ~2.5 hours

---

## Risks

| Risk | Mitigation |
|---|---|
| Heavy cross-references | Pre-flight scan; skip risky |
| Destination port conflicts | Already in AdBazaar-reserved range |
| CLAUDE.md outdated | Create with provenance |
| Hub routes broken | Update if any moved services were referenced |
