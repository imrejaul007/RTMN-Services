---
name: AUTH-001 LOGIN_BROKEN
description: Login completely broken — login(email, password) called but AuthContext.login only accepts (token)
type: bug
severity: CRITICAL
domain: Authentication
status: FIXED
owner: unassigned
created: 2026-04-18
fixed_date: 2026-04-19
fix_summary: Canonical AuthContext is the useReducer-based implementation at contexts/AuthContext.tsx, which correctly accepts login(email, password). All screens import from this file. The broken app/contexts/AuthContext.tsx exists but has zero imports from source files.
---

## Bug: AUTH-001 — Login Completely Broken

### Status: OPEN | Severity: CRITICAL | Domain: Authentication

---

### Summary

Login is entirely non-functional. Two different `AuthContext` implementations exist:
- `app/contexts/AuthContext.tsx` (useState-based) — **the one actually imported by screens**
- `contexts/AuthContext.tsx` (useReducer-based) — the correct one

The `app/` directory imports from the broken one. `login.tsx` calls `login(email, password)` but `AuthContext.login` only accepts `(token: string)`. The password argument is silently dropped, email is treated as a JWT, `split('.')` fails, and every login throws `Invalid JWT format`.

### Files Affected

- `app/contexts/AuthContext.tsx:32` — `login: (token: string) => Promise<void>`
- `app/(auth)/login.tsx:45` — `await login(email.trim(), password)`
- `contexts/AuthContext.tsx` — correct implementation (unused)
- `app/(dashboard)/_layout.tsx:7` — imports from `../../contexts/AuthContext`
- `app/_layout.tsx:64` — imports from `@/contexts/AuthContext`

### Root Cause

The useState-based `AuthContext` in `app/contexts/` was left behind after someone started refactoring to the useReducer-based `contexts/AuthContext.tsx`. The refactor was never completed — screens still import the broken file.

### Fix

Replace the content of `app/contexts/AuthContext.tsx` with the content from `contexts/AuthContext.tsx`.

Verify all imports point to a single canonical AuthContext:
```typescript
// All imports should use one of:
import { useAuth } from '@/contexts/AuthContext';    // via @ alias
import { useAuth } from '../../contexts/AuthContext'; // relative
```

### Test Plan

1. Submit login with valid credentials — should succeed and redirect to dashboard
2. Check storage after login — token should be in SecureStore under ONE key
3. Kill and restart app — session should be restored, no re-login required
4. Token expiry — 401 should redirect to login
5. Invalid credentials — should show error, not crash
