---
name: SVC-002 ANALYTICS_RAW_FETCH_NO_AUTH
description: analytics-dashboard.tsx uses raw fetch() bypassing apiClient — no Authorization headers sent to analytics service
type: bug
severity: CRITICAL
domain: Cross-Service / Auth
status: FIXED
fix_summary: Authorization Bearer token now attached to analytics service raw fetch
fixed_date: 2026-04-19
owner: unassigned
created: 2026-04-19
---

## Bug: SVC-002 — Analytics Service Raw Fetch Without Auth

### Status: OPEN | Severity: CRITICAL | Domain: Cross-Service / Auth

---

### Summary

`analytics-dashboard.tsx:191` uses raw `fetch()` to call the analytics service (`EXPO_PUBLIC_ANALYTICS_SERVICE_URL`) without `Authorization` headers. All other API calls in the app go through `apiClient` which injects `Authorization: Bearer <token>`. If the analytics service requires authentication, every call fails with 401.

### Files Affected

- `app/(dashboard)/analytics-dashboard.tsx:190-191`

### Root Cause

```typescript
// Line 190-191:
const platformFetch: Promise<Response | null> = ANALYTICS_SERVICE_URL
  ? fetch(`${ANALYTICS_SERVICE_URL}/api/analytics/platform/summary?period=30d`)
  : Promise.resolve(null);
```

Raw `fetch()` — no `Authorization` header, no auth token forwarding. The `apiClient` is bypassed entirely for this call.

Compare to the REST of the same file (line 195-197):
```typescript
dashboardService.getStats(),         // goes through apiClient with Bearer token
dashboardService.getAnalyticsDashboard(),  // goes through apiClient with Bearer token
```

### Fix

Either route through `apiClient`:

```typescript
// Option 1: Use apiClient (cleanest)
const response = await apiClient.get<PlatformSummary>(
  '/api/analytics/platform/summary',
  { baseUrl: ANALYTICS_SERVICE_URL }
);
```

Or add headers manually:

```typescript
// Option 2: Add auth headers to raw fetch
const token = await storageService.getAuthToken();
const response = await fetch(`${ANALYTICS_SERVICE_URL}/api/analytics/platform/summary?period=30d`, {
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
  },
});
```

Option 1 is preferred — all auth, retry, and error handling flows through `apiClient`.

### Test Plan

1. Load analytics dashboard
2. Check network tab for the analytics service call
3. Should have `Authorization: Bearer <token>` header
4. If analytics service requires auth: should return 200, not 401

---

## Verification

**Confirmed fixed**: analytics-dashboard.tsx passes Authorization Bearer token header on raw fetch
