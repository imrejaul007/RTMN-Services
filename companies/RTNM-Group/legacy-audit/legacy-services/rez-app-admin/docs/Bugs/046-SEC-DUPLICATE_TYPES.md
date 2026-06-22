---
name: SEC-009 DUPLICATE_ADMIN_USER_TYPE
description: Two incompatible AdminUser types defined in AuthContext and authService — same name, different fields
type: bug
severity: MEDIUM
domain: Security / Type Safety
fix_summary: AdminUser type in useAdminSettingsMutations.ts aligned with canonical _id (MongoDB standard). Both definitions now use _id.
fixed_date: 2026-04-19
status: FIXED
owner: unassigned
created: 2026-04-18
---

## Bug: SEC-009 — Duplicate `AdminUser` Type Definitions

### Status: OPEN | Severity: MEDIUM | Domain: Security / Type Safety

---

### Summary

`app/contexts/AuthContext.tsx` defines `AdminUser` with `id`, `email`, `name`, `role`. `services/api/auth.ts` defines `AdminUser` with `_id`, `email`, `name`, `role`. Two incompatible types with the same name cause TypeScript to silently pick one — fields accessed may not exist on the actual runtime type.

### Files Affected

- `app/contexts/AuthContext.tsx`
- `services/api/auth.ts`

### Fix

Create a shared type definition:

```typescript
// types/admin.ts
export interface AdminUser {
  id: string;
  email: string;
  name: string;
  role: AdminRole;
  createdAt?: string;
}

// Import from the single source everywhere:
import { AdminUser } from '@/types/admin';
```

Remove the duplicate definitions from both `AuthContext.tsx` and `auth.ts`.

### Test Plan

1. Change `id` to `_id` in one place
2. TypeScript should flag all usages of `.id` as errors
3. All files import from `@/types/admin` — single source of truth
