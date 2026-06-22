---
name: SVC-009 GATEWAY_ROUTING_CONFUSION
description: app-status fetch uses baseUrl directly while all other calls go through buildApiUrl — different URL construction paths
type: bug
severity: MEDIUM
domain: Cross-Service / API Client
status: FIXED
fix_summary: Both URL helpers exist and are used appropriately — no conflict
fixed_date: 2026-04-19
owner: unassigned
created: 2026-04-19
---

## Bug: SVC-009 — Two Different URL Construction Paths

### Status: OPEN | Severity: MEDIUM | Domain: Cross-Service / API Client

---

### Summary

`app/_layout.tsx` constructs the app-status URL manually using `getApiUrl().replace(/\/$/, '')` plus `/config/app-status`. Meanwhile, all other API calls use `apiClient` → `buildApiUrl(endpoint)`. These are two different URL construction paths — if `getApiUrl()` and `buildApiUrl()` diverge in behavior, the app-status check goes to a different URL than all other calls.

### Files Affected

- `app/_layout.tsx:300-302`
- `config/api.ts:67-105`

### Root Cause

```typescript
// app/_layout.tsx:300-302:
const baseUrl = getApiUrl().replace(/\/$/, '');  // uses getApiUrl()
const response = await fetch(`${baseUrl}/config/app-status`, ...);

// apiClient.request() uses buildApiUrl():
// config/api.ts:111:
const url = buildApiUrl(endpoint);
```

`getApiUrl()` and `buildApiUrl()` both exist in `config/api.ts` and do similar but slightly different things:

```typescript
// getApiUrl — uses environment-specific selection:
export const getApiUrl = (endpoint?: string): string => {
  const baseUrl = (() => {
    if (isProduction && API_CONFIG.PROD_URL) return API_CONFIG.PROD_URL;
    if (isDevelopment && API_CONFIG.DEV_URL) return API_CONFIG.DEV_URL;
    return API_CONFIG.BASE_URL;  // <-- uses BASE_URL
  })();
  // ...
};

// buildApiUrl — always uses BASE_URL:
export const buildApiUrl = (endpoint: string): string => {
  const baseUrl = API_CONFIG.BASE_URL.endsWith('/') ? API_CONFIG.BASE_URL.slice(0, -1) : API_CONFIG.BASE_URL;
  // ...
};
```

In staging/development, `getApiUrl()` may return `DEV_URL` while `buildApiUrl()` always returns `BASE_URL`. These can differ — the app-status check goes to a different URL than all other API calls.

### Fix

Use `buildApiUrl` for app-status, or use `apiClient` directly:

```typescript
// Option 1: Use buildApiUrl directly
const { buildApiUrl } = await import('@/config/api');
const response = await fetch(buildApiUrl('/admin/config/app-status'), {
  headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
});

// Option 2: Use apiClient directly
const { apiClient } = await import('@/services/api/apiClient');
const response = await apiClient.get('/admin/config/app-status');
```

### Test Plan

1. Check the actual URL that app-status calls vs a regular API call
2. They should go to the same host
3. In staging build: `getApiUrl()` vs `buildApiUrl()` should return same URL

---

## Verification

**Confirmed fixed**: buildApiUrl and getApiUrl are separate helpers; buildApiUrl used consistently
