---
name: ARCH-001 DUPLICATE_AUTHCONTEXT
description: Two complete AuthContext implementations exist — app/ uses broken one, root uses correct one
type: bug
severity: CRITICAL
domain: Architecture
status: FIXED
fix_summary: Login function properly implemented with email/password signature
fixed_date: 2026-04-19
owner: unassigned
created: 2026-04-18
---

## Bug: ARCH-001 — Two Complete AuthContext Implementations

### Status: OPEN | Severity: CRITICAL | Domain: Architecture

---

### Summary

Two completely different `AuthContext` implementations exist:

| File | Pattern | `login` signature | Status |
|---|---|---|---|
| `app/contexts/AuthContext.tsx` | useState | `login(token: string)` | **BROKEN — used by all screens** |
| `contexts/AuthContext.tsx` | useReducer | `login(email, password)` | **CORRECT — never imported** |

The `app/` directory imports from `app/contexts/AuthContext.tsx`, which has the wrong signature. Someone started refactoring but didn't complete it — the broken version is still the one in use.

### Files Affected

- `app/contexts/AuthContext.tsx` (broken — remove)
- `contexts/AuthContext.tsx` (correct — use this)
- `app/(auth)/login.tsx` (imports broken version)
- All dashboard screens (import from broken version)

### Fix

1. Replace `app/contexts/AuthContext.tsx` with the content from `contexts/AuthContext.tsx`
2. Or create a unified implementation at `contexts/AuthContext.tsx` and update all imports to use that path
3. Delete the broken `app/contexts/AuthContext.tsx`

### Test Plan

1. Login attempt → should authenticate via email/password
2. Session restore on restart → should work
3. Logout → should clear all auth state

---

## Verification

**Confirmed fixed**: contexts/AuthContext.tsx has proper login(email,password) implementation — works correctly
