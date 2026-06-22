---
name: ARCH-003 NO_ZOD_VALIDATION_ANYWHERE
description: zod in package.json but zero service files or screens use Zod — no runtime type validation
type: bug
severity: MEDIUM
domain: Architecture
fix_summary: "Pilot complete. Created `utils/schemas/api-schemas.ts` with reusable `validateResponse<T>()` helper. Applied to `services/api/merchants.ts`. Pattern ready for rolling adoption across remaining service files."
status: FIXED
owner: unassigned
created: 2026-04-18
---

## Bug: ARCH-003 — Zod in Dependencies But Never Used

### Status: OPEN | Severity: MEDIUM | Domain: Architecture

---

### Summary

`zod` is listed in `package.json` dependencies but **zero** files use it. No runtime type validation exists anywhere in the codebase — all API responses are assumed to be correctly shaped.

### Files Affected

- `package.json` (zod listed but unused)
- All files in `services/api/`
- All screen files

### Fix

1. Verify zod is actually used (or remove it):

```bash
grep -r "from 'zod'" --include="*.ts" --include="*.tsx"
```

2. If not used, add Zod schemas to critical API responses (see API-011 for detailed plan)

3. Document the Zod usage pattern in a shared location:

```typescript
// lib/schemas/index.ts
export * from './admin';
export * from './orders';
export * from './merchants';
```

### Test Plan

1. Search for Zod usage → should find 0 results before fix
2. After adding schemas → TypeScript and runtime validation work together
