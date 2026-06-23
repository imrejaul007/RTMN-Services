# Audit History — 2026-06-22 AdBazaar Dedup

> **Context:** During the Phase 5-10 cleanup (per `CLAUDE.md` "AUDIT & CLEANUP STATUS"),
> AdBazaar was audited for scope pollution and port conflicts. **44 non-ad services
> were moved** to their canonical homes, **71 cross-ecosystem port collisions**
> were resolved, and **69 within-AdBazaar port conflicts** were resolved. See
> [`SERVICES-AUDIT-2026-06-22.md`](../../../SERVICES-AUDIT-2026-06-22.md) for the
> final state and [`companies/AdBazaar/SCOPE-AUDIT.md`](../../../companies/AdBazaar/SCOPE-AUDIT.md)
> for the move log.

This folder preserves the **audit scripts** that ran during the cleanup. They are
one-off historical artifacts — not part of the regular dev workflow.

## Contents

| Subfolder | Purpose | Scripts |
|---|---|---|
| (root) | Top-level audit drivers | `audit.sh`, `audit-precise.sh`, `audit-summary.sh`, `final-audit.sh`, `deep-dup-audit.sh`, etc. |
| `dup-finders/` | Scripts that find duplicate service directories by name / content / md5 | `find-dups.sh`, `find-identical-dups.sh`, `check-dups.sh`, `list-dups.sh`, etc. |
| `removal-scripts/` | Scripts that removed or relocated duplicates | `rm-dups.sh`, `rm-dups-v2.sh`, `rm-root-files.sh`, `fix-ports.sh`, `migration-readme.sh`, `commit-legacy.sh` |
| `test-assert/` | Validation scripts that confirmed duplicates were correctly identified and removed | `test-assert.sh`, `tm-*.sh`, `recreate_check.sh` |

## How to re-run an audit (if AdBazaar scope creeps again)

```bash
# Find duplicate service directories across AdBazaar vs canonical homes
bash scripts/audit-history/2026-06-22-adbazaar-dedup/audit-precise.sh <company-name>

# Find ports in use
bash scripts/audit-history/2026-06-22-adbazaar-dedup/check-unique.sh
```

## When to delete this folder

Once you've moved to a different audit strategy (e.g. CI-enforced scope rules +
port collision detection in `scripts/dev-stack.sh`), this folder is purely
historical and can be deleted. Don't delete before then — the scripts are the
only record of HOW the dedup was performed.
