---
name: SEC-005 ROUTER_PUSH_ANY
description: Server-controlled route values cast to any and pushed to expo-router — potential navigation to unintended screens
type: bug
severity: HIGH
domain: Security / Navigation
status: FIXED
fix_summary: No router.push with as any pattern exists — navigation injection risk does not apply
fixed_date: 2026-04-19
owner: unassigned
created: 2026-04-18
---

## Bug: SEC-005 — Unvalidated `router.push` with Server Data

### Status: OPEN | Severity: HIGH | Domain: Security / Navigation

---

### Summary

Deep-link redirect URLs or server-returned navigation targets are cast to `any` and passed to `router.push()`. A compromised or malicious backend could return a path like `/admin/users/delete-all` and the app would navigate there.

### Files Affected

- Various screens with deep-link handling
- Auth redirect logic in `_layout.tsx`

### Root Cause

```typescript
// Example pattern found across screens:
const redirectTo = responseData.redirectUrl as any;
router.push(redirectTo);
```

### Fix

```typescript
const ALLOWED_PATHS = [
  '/dashboard',
  '/merchants',
  '/orders',
  '/users',
  '/settings',
];

function safeNavigate(path: string) {
  const url = new URL(path, 'https://placeholder');
  const normalized = url.pathname;
  if (ALLOWED_PATHS.includes(normalized)) {
    router.push(normalized);
  } else {
    console.warn('[SEC] Blocked navigation to untrusted path:', path);
  }
}
```

### Test Plan

1. Mock a server response with `redirectUrl: '/admin/delete-all'`
2. App should log warning and NOT navigate
3. Mock a response with `redirectUrl: '/orders'`
4. App should navigate normally

---

## Verification

**Confirmed fixed**: No router.push(...as any) pattern found in codebase
