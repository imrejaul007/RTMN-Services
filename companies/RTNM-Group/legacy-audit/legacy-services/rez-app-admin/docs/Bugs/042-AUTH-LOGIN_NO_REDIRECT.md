---
name: AUTH-009 LOGIN_NO_AUTH_REDIRECT
description: Authenticated users can see login page — no redirect to dashboard when already logged in
type: bug
severity: MEDIUM
domain: Auth / UX
status: FIXED
owner: unassigned
created: 2026-04-18
fixed_date: 2026-04-19
fix_summary: login.tsx calls router.replace('/(dashboard)') on successful login (line 46). Authenticated users are also redirected from the login page via AuthGuardedLayout useEffect (app/_layout.tsx:139-146).
---

## Bug: AUTH-009 — Login Page Has No Authenticated-User Redirect

### Status: OPEN | Severity: MEDIUM | Domain: Auth / UX

---

### Summary

If an authenticated user navigates to `/login`, they see the login form instead of being redirected to the dashboard. This can confuse support users who bookmarked the login URL.

### Files Affected

- `app/(auth)/login.tsx`

### Fix

```typescript
// In login.tsx:
useEffect(() => {
  if (isAuthenticated) {
    router.replace('/');
  }
}, [isAuthenticated]);

// Also import useAuth:
import { useAuth } from '@/contexts/AuthContext';
const { isAuthenticated } = useAuth();
```

### Test Plan

1. Login successfully → navigate to `/login` manually
2. Before fix: shows login form (confusing)
3. After fix: immediately redirects to `/`
