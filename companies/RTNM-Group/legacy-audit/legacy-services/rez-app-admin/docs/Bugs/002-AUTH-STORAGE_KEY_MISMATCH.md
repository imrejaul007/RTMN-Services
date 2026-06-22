---
name: AUTH-002 STORAGE_KEY_MISMATCH
description: Session restore never works — AuthContext reads 'admin_token' but authService writes 'admin_auth_token'
type: bug
severity: CRITICAL
domain: Authentication
status: FIXED
owner: unassigned
created: 2026-04-18
fixed_date: 2026-04-19
fix_summary: Both storage.ts and contexts/AuthContext.tsx now use the shared STORAGE_KEYS constant with AUTH_TOKEN='admin_auth_token'. Session restore works correctly after app restart.
---

## Bug: AUTH-002 — Storage Key Mismatch

### Status: OPEN | Severity: CRITICAL | Domain: Authentication

---

### Summary

Users are logged out on every app restart. `AuthContext` reads from key `'admin_token'` but `authService.login()` writes to key `'admin_auth_token'`. The keys are different, so session restore never finds the stored token.

### Files Affected

- `app/contexts/AuthContext.tsx:12` — `const TOKEN_KEY = 'admin_token'`
- `services/storage.ts:36` — `AUTH_TOKEN: 'admin_auth_token'`

### Root Cause

No shared constant for the auth token storage key. Two different constants with different values.

### Fix

Create a shared constant and use it in both files:
```typescript
// constants/authStorage.ts
export const AUTH_TOKEN_KEY = 'rez_admin_auth_token';
export const USER_DATA_KEY = 'rez_admin_user_data';
export const REFRESH_TOKEN_KEY = 'rez_admin_refresh_token';

// Then import in AuthContext.tsx and storage.ts
```

### Test Plan

1. Login → token stored under shared key
2. Kill and restart app → session restored from same key
3. Logout → token removed from shared key
4. Verify only ONE key is used in SecureStore (use debugger or `SecureStore.getItemAsync` for all known keys)
