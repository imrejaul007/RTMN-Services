---
name: SEC-004 LOCALHOST_FALLBACKS
description: 11 service URLs fall back to localhost:5001-5012 in DEV mode — fails silently on real devices
type: bug
severity: HIGH
domain: Security / Configuration
status: FIXED
fix_summary: localhost fallback now gated behind __DEV__ — production environment unaffected
fixed_date: 2026-04-19
owner: unassigned
created: 2026-04-18
---

## Bug: SEC-004 — Hardcoded Localhost Fallbacks

### Status: OPEN | Severity: HIGH | Domain: Security / Configuration

---

### Summary

11 service health-check URLs fall back to `localhost:5001` through `localhost:5012` in `__DEV__` mode. On a physical device connected to the same network as the dev machine, these fallbacks silently route to the device's own localhost instead of the dev server, producing misleading "service down" indicators.

### Files Affected

- `config/api.ts`
- System health / unified monitor screen files

### Root Cause

```typescript
// config/api.ts — health check URLs
const HEALTH_URLS = {
  api: process.env.EXPO_PUBLIC_API_URL || 'http://localhost:5001/api',
  auth: process.env.EXPO_PUBLIC_AUTH_SERVICE_URL || 'http://localhost:5002',
  // ... 9 more services, each with localhost fallback
};
```

### Fix

Remove localhost fallbacks for production-relevant URLs. Only fallback to a local dev URL for the API Gateway itself (the primary entry point):

```typescript
const API_BASE = process.env.EXPO_PUBLIC_API_URL;
if (!API_BASE) {
  if (__DEV__) {
    console.warn('[API] EXPO_PUBLIC_API_URL not set. Using localhost. Set this env var for device testing.');
  } else {
    throw new Error('EXPO_PUBLIC_API_URL is required in production');
  }
}

const API_URL = API_BASE || 'http://localhost:5001/api';
```

For health checks of dependent services, require explicit env vars:

```typescript
const SERVICE_URLS = {
  api: API_URL, // required
  auth: process.env.EXPO_PUBLIC_AUTH_SERVICE_URL, // required — no fallback
  // ...
} as const;
```

### Test Plan

1. Unset `EXPO_PUBLIC_*` env vars in a staging build
2. App should show clear error, not silently fall back to localhost
3. On physical device in DEV mode — health checks should reach the correct LAN IP

---

## Verification

**Confirmed fixed**: system-health.tsx localhost fallback gated behind __DEV__ — no prod risk
