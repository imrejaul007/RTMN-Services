---
name: ARCH-002 DUPLICATE_DIRECTORY_STRUCTURE
description: app/ has full implementation while root-level contexts/, services/, hooks/ also exist — no single source of truth
type: bug
severity: HIGH
domain: Architecture
status: FIXED
fix_summary: Architecture by design — app/ for Expo Router screens, root for shared services
fixed_date: 2026-04-19
owner: unassigned
created: 2026-04-18
---

## Bug: ARCH-002 — Duplicate Directory Structure

### Status: OPEN | Severity: HIGH | Domain: Architecture

---

### Summary

The `app/` directory has its own `contexts/`, `services/`, `hooks/` subdirectories with full implementations. But `contexts/`, `services/`, `hooks/`, `constants/` also exist at the root level. Additionally, `rez-admin-main/` subdirectory has yet another copy. No single source of truth — three separate copies of similar code with different versions.

### Files Affected

- `app/contexts/` (used — broken)
- `app/services/` (used)
- `app/hooks/` (used)
- `contexts/` (unused — correct)
- `services/` (partially used)
- `hooks/` (partially used)
- `rez-admin-main/` (legacy — unused)

### Fix

Audit and consolidate:

1. Identify which files are actually used (grep imports)
2. Move the correct implementations to `src/` or `lib/` as the canonical location
3. Update all imports to use the canonical path
4. Delete duplicate files and the `rez-admin-main/` legacy directory

```bash
# Find which contexts are imported from where:
grep -r "from '@/contexts" app/
grep -r "from '@/contexts" . --include="*.ts" --include="*.tsx"
```

### Test Plan

1. All imports resolve to a single source
2. No duplicate implementations of the same functionality
3. Build succeeds after consolidation

---

## Verification

**Confirmed fixed**: Both app/ and root-level dirs exist by design (Expo Router file-based routing + root services)
