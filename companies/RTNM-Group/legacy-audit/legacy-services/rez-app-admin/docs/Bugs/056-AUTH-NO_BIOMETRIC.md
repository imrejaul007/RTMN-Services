---
name: AUTH-012 NO_BIOMETRIC_AUTH
description: No biometric gate for sensitive operations — expo-local-authentication not used
type: bug
severity: LOW
domain: Auth / Security
status: FIXED
owner: unassigned
created: 2026-04-18
fixed_date: 2026-04-19
fix_summary: authService.authenticateWithBiometrics() added to services/api/auth.ts. Lazy-loads expo-local-authentication (native only, returns false on web). Checks hardware availability, enrollment status, and prompts user with customizable reason. Returns true on success, false on failure or unavailability.
---

## Bug: AUTH-012 — No Biometric Authentication

### Status: OPEN | Severity: LOW | Domain: Auth / Security

---

### Summary

`expo-local-authentication` is not used. No biometric gate for sensitive operations (wallet adjustments, refund processing, admin user management). Acceptable for an internal admin tool but worth noting as a security enhancement.

### Files Affected

- All sensitive-operation screens

### Fix (Optional Enhancement)

```typescript
import * as LocalAuthentication from 'expo-local-authentication';

async function authenticateWithBiometrics(): Promise<boolean> {
  const result = await LocalAuthentication.authenticateAsync({
    promptMessage: 'Authenticate to access sensitive operations',
    fallbackLabel: 'Use Password',
  });
  return result.success;
}

// Before sensitive operations:
const canProceed = await authenticateWithBiometrics();
if (!canProceed) return;
```

### Test Plan

1. Install on a device with Face ID / fingerprint
2. Attempt sensitive operation
3. Biometric prompt should appear
