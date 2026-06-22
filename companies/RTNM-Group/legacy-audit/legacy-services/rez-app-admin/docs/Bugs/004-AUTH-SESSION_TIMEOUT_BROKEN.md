---
name: AUTH-004 SESSION_TIMEOUT_BROKEN
description: Session timeout fires after 30 minutes of elapsed time, not 30 minutes of inactivity — updateActivity never called
type: bug
severity: HIGH
domain: Authentication
status: FIXED
owner: unassigned
created: 2026-04-18
fixed_date: 2026-04-19
fix_summary: Session timeout was replaced with JWT-expiry-based validation (AuthContext.tsx:257-348). Instead of elapsed time from login, the system decodes the JWT exp claim and schedules a refresh 2 minutes before expiry. Falls back to 5-minute polling if JWT has no exp. updateActivity pattern from the broken app/contexts/AuthContext.tsx is not applicable.
---

## Bug: AUTH-004 — Session Timeout Is Elapsed Time, Not Inactivity

### Status: OPEN | Severity: HIGH | Domain: Authentication

---

### Summary

`lastActivityAt` is set on login and restore but never updated. The 30-minute session timeout fires based on elapsed time from login, not inactivity. An admin actively using the panel is kicked out after exactly 30 minutes regardless of activity.

### Files Affected

- `app/contexts/AuthContext.tsx:147-149` — `updateActivity` defined but never called
- `app/contexts/AuthContext.tsx:151-164` — `updateActivity` not included in `useMemo` value

### Root Cause

`updateActivity` is defined as a `useCallback` but never added to the context value object, so no consumer can call it. The session timeout `setInterval` always compares against the initial `Date.now()` from login.

### Fix

1. Add `updateActivity` to the `AuthContextValue` interface and `useMemo` value object
2. Wire it in the dashboard layout via a global `Pressable` overlay that calls `updateActivity` on every touch
3. Alternative: extend `SESSION_TIMEOUT_MS` to a more reasonable duration (e.g., 8 hours) since the panel is for internal admin use

### Test Plan

1. Login → note session timeout fires at exactly 30 min from login time
2. After fix: interact with dashboard → timeout should reset
3. Verify `lastActivityAt` updates on tap/press
