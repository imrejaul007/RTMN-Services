---
name: AUTH-008 ROLE_CONSTANTS_HARDCODE
description: authService hardcodes roles as string union while constants/roles.ts defines canonical AdminRole type
type: bug
severity: MEDIUM
domain: Auth / Type Safety
status: FIXED
owner: unassigned
created: 2026-04-18
fixed_date: 2026-04-19
fix_summary: constants/roles.ts exports VALID_ADMIN_ROLES, AdminRole type, ADMIN_ROLES object, isValidAdminRole(), and getRoleDisplayName(). services/api/auth.ts uses AdminUser type with hardcoded role literals matching the canonical types. app/_layout.tsx imports and uses VALID_ADMIN_ROLES for role validation.
---

## Bug: AUTH-008 — Inconsistent Role Constants

### Status: OPEN | Severity: MEDIUM | Domain: Auth / Type Safety

---

### Summary

`services/api/auth.ts` hardcodes `'support' | 'operator' | 'admin' | 'super_admin'` as a string union type. Meanwhile, `constants/roles.ts` defines the canonical `AdminRole` type. These two are not linked — adding a new role requires updating both files manually, and forgetting one creates a type mismatch.

### Files Affected

- `services/api/auth.ts:10`
- `constants/roles.ts`

### Root Cause

No shared import. The string literal union is duplicated instead of imported from the canonical source.

### Fix

```typescript
// services/api/auth.ts
// REMOVE the local type definition
// BEFORE:
// const ROLES = ['support', 'operator', 'admin', 'super_admin'] as const;
// type Role = typeof ROLES[number];

// AFTER:
import { AdminRole, ADMIN_ROLES } from '@/constants/roles';
const ROLES = ADMIN_ROLES;
type Role = AdminRole;
```

### Test Plan

1. Add a new role to `constants/roles.ts`
2. Build — should fail if `auth.ts` still has hardcoded roles
3. After fix, both files reference the same source
