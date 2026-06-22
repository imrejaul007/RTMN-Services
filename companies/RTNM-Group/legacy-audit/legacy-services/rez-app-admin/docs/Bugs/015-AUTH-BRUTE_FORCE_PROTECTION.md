---
name: AUTH-005 BRUTE_FORCE_PROTECTION
description: No rate limiting, CAPTCHA, or account lockout on login — unlimited brute-force attempts possible
type: bug
severity: HIGH
domain: Auth / Security
status: FIXED
owner: unassigned
created: 2026-04-18
fixed_date: 2026-04-19
fix_summary: Brute-force protection implemented in login.tsx: MAX_ATTEMPTS=5, LOCKOUT_DURATION=15min. Tracks failed attempts in local state, disables login button during lockout, shows countdown, and resets on success. X-Attempt-Count header added to API calls.
---

## Bug: AUTH-005 — No Brute-Force Protection

### Status: OPEN | Severity: HIGH | Domain: Auth / Security

---

### Summary

Login endpoint has no rate limiting, CAPTCHA, or account lockout. An attacker with valid credentials can brute-force passwords with unlimited attempts. The backend may have rate limiting, but the frontend provides no UI feedback or lockout indication.

### Files Affected

- `app/(auth)/login.tsx`
- `services/api/auth.ts`

### Root Cause

Login form submits directly without any client-side attempt tracking. After a backend lockout, the user sees no indication of why login failed beyond a generic error.

### Fix

```typescript
// Add attempt tracking in login.tsx
const MAX_ATTEMPTS = 5;
const LOCKOUT_DURATION = 15 * 60 * 1000; // 15 minutes

const [attempts, setAttempts] = useState(0);
const [lockoutUntil, setLockoutUntil] = useState<number | null>(null);

const handleLogin = async (email: string, password: string) => {
  if (lockoutUntil && Date.now() < lockoutUntil) {
    showAlert('Account Locked', `Too many attempts. Try again in ${Math.ceil((lockoutUntil - Date.now()) / 60000)} minutes.`);
    return;
  }

  const result = await login(email, password);
  if (!result.success) {
    const newAttempts = attempts + 1;
    setAttempts(newAttempts);
    if (newAttempts >= MAX_ATTEMPTS) {
      setLockoutUntil(Date.now() + LOCKOUT_DURATION);
    }
  } else {
    setAttempts(0);
    setLockoutUntil(null);
  }
};
```

Also add `X-Attempt-Count` header to API calls so the backend can enforce its own limits.

### Test Plan

1. Failed login 5 times → 6th attempt shows lockout message
2. Wait 15 minutes → can login again
3. Successful login → attempt counter resets
