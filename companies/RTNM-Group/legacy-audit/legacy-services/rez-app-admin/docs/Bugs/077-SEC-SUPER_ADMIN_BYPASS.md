---
name: SEC-006 SUPER_ADMIN_BLANKET_BYPASS
description: super_admin role has a hardcoded blanket bypass in hasPermission() — any user with super_admin role ignores all permission checks
type: bug
severity: CRITICAL
domain: Security / Authorization
status: FIXED
owner: unassigned
created: 2026-04-19
fixed_date: 2026-04-19
fix_summary: Removed the super_admin blanket bypass from hasPermission() in contexts/AuthContext.tsx:413-425. Now relies solely on the backend-issued permissions array. The backend is authoritative and must populate the permissions array correctly for all roles including super_admin.
---

## Bug: SEC-006 — `super_admin` Blanket Permission Bypass

### Status: OPEN | Severity: CRITICAL | Domain: Security / Authorization

---

### Summary

`contexts/AuthContext.tsx:414-415` contains a hardcoded bypass: if `state.user?.role === 'super_admin'`, `hasPermission()` returns `true` regardless of what permission is requested or what permissions the user actually has. This means any account with `super_admin` role has unrestricted access to every action in the admin panel — bypassing all fine-grained permission checks.

### Files Affected

- `contexts/AuthContext.tsx:414-415`
- `contexts/AuthContext.tsx:428-436` (`hasRole` — also lacks super_admin check)

### Root Cause

```typescript
// contexts/AuthContext.tsx:413-415:
const hasPermission = (permission: string): boolean => {
  // BUG-077: super_admin always has all permissions regardless of the permissions array.
  if (state.user?.role === 'super_admin') return true;  // <-- BLANKET BYPASS
  // ...
};
```

The bypass exists in `hasPermission()` but NOT in `hasRole()`:
```typescript
// hasRole() — no super_admin bypass:
const hasRole = (role: string): boolean => {
  if (!state.user?.role) return false;
  const roleHierarchy: Record<string, number> = {
    support: 60,
    operator: 70,
    admin: 80,
    super_admin: 90,  // listed in hierarchy but no bypass
  };
  return (roleHierarchy[state.user.role] ?? 0) >= (roleHierarchy[role] ?? 0);
};
```

### Security Impact

- **Privilege escalation**: A `super_admin` account can perform any action regardless of the actual permissions array returned by the backend
- **Defense in depth violated**: Permission checks are decorative — the role bypass makes them unreliable
- **Audit trail gap**: Actions taken under `super_admin` bypass cannot be filtered by individual permissions in logs
- **Backend dependency**: The fix assumes the backend correctly scopes JWT claims — if the backend issues a `super_admin` JWT incorrectly, the frontend cannot mitigate

### Fix

Remove the blanket bypass and rely on the actual permissions array. If `super_admin` should have all permissions, populate the `permissions` array on the backend:

```typescript
// Option 1: Remove bypass — use backend-issued permissions
const hasPermission = (permission: string): boolean => {
  if (!state.user?.permissions) {
    if (__DEV__)
      console.warn(
        `[Admin] hasPermission("${permission}") called but user.permissions is undefined. Denying.`
      );
    return false;
  }
  return state.user.permissions.includes(permission);
};

// Option 2: Keep bypass but log it for audit
const hasPermission = (permission: string): boolean => {
  if (state.user?.role === 'super_admin') {
    if (__DEV__) console.warn(`[Admin] super_admin bypassing permission check: ${permission}`);
    return true;
  }
  if (!state.user?.permissions) return false;
  return state.user.permissions.includes(permission);
};
```

Also add the same check to `hasRole()` for consistency:
```typescript
const hasRole = (role: string): boolean => {
  if (state.user?.role === 'super_admin') return true;  // super_admin has all roles
  if (!state.user?.role) return false;
  // ...
};
```

### Test Plan

1. Create a `super_admin` user with an empty or partial `permissions` array
2. Call `hasPermission('some_arbitrary_permission')` — should return `true` (bypass) before fix
3. After fix: should return `false` if `permission` is not in the array
4. Verify no screens break when the bypass is removed
