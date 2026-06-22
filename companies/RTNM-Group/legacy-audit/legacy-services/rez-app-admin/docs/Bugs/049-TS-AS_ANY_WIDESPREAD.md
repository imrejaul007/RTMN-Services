---
name: TS-005 AS_ANY_WIDESPREAD
description: as any used 38+ times across app files — bypasses TypeScript entirely, silent type mismatches
type: bug
severity: MEDIUM
domain: TypeScript / Type Safety
fix_summary: Removed 35+ as any casts from 5 service files: users.ts, extraRewards.ts, surpriseCoinDrops.ts, priveConfig.ts, polls.ts. Used proper apiClient<T,B> generics with typed response wrappers.
fixed_date: 2026-04-19
status: FIXED
owner: unassigned
created: 2026-04-18
---

## Bug: TS-005 — Widespread `as any` Usage (38+ instances)

### Status: OPEN | Severity: MEDIUM | Domain: TypeScript / Type Safety

---

### Summary

`as any` appears 38+ times across dashboard screens, service files, and hook files. Each `as any` bypasses TypeScript's type system entirely — backend field changes silently break the UI with no compile-time warning.

### Files Affected

- Multiple files across `app/`, `services/`, `hooks/`

### Fix

Run the arch-fitness check to identify all instances:

```bash
bash scripts/arch-fitness/no-as-any.sh
```

Replace `as any` with proper types or Zod validation:

```typescript
// BEFORE:
const data = response as any;

// AFTER:
// Define proper type:
interface DashboardStats {
  totalUsers: number;
  activeMerchants: number;
  totalRevenue: number;
}
// Use:
const data = response as DashboardStats;
// Or better — use Zod to validate at runtime
```

Enable strict TypeScript in `tsconfig.json`:
```json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true
  }
}
```

### Test Plan

1. Run `no-as-any.sh` — should report 0 violations after fix
2. Change a backend field name — TypeScript should flag affected usages
