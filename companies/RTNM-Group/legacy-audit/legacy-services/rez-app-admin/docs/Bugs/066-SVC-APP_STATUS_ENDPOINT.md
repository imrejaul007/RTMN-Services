---
name: SVC-003 APP_STATUS_WRONG_PATH
description: _layout.tsx calls /config/app-status bypassing /admin/ prefix — maintenance mode can be silently bypassed
type: bug
severity: CRITICAL
domain: Cross-Service / Endpoint
status: FIXED
owner: unassigned
created: 2026-04-19
fixed_date: 2026-04-19
fix_summary: Changed /config/app-status to /admin/config/app-status. Now uses buildApiUrl() for URL construction (consistent with all other API calls) and adds Authorization Bearer token header. Added storageService import for token access. Removed unused baseUrl variable.
---

## Bug: SVC-003 — App Status Endpoint Uses Wrong Path

### Status: OPEN | Severity: CRITICAL | Domain: Cross-Service / Endpoint

---

### Summary

`app/_layout.tsx:302` calls `/config/app-status` using a raw `fetch()` that bypasses `apiClient`. All other API endpoints in the app use the `/admin/` prefix. The `/config/app-status` endpoint may not exist on the backend, may require different auth, or may be a different service entirely. If this call fails, the app silently proceeds as "ok" — maintenance mode and force-update gates are silently bypassed.

### Files Affected

- `app/_layout.tsx:302`

### Root Cause

```typescript
// Line 302 — raw fetch bypassing apiClient:
const response = await fetch(`${baseUrl}/config/app-status`, {
  signal: controller.signal,
  headers: { 'Content-Type': 'application/json' },
});

// Line 307-320 — if response is not ok, silently proceeds to 'ok':
if (response.ok) {
  const data: AppStatusResponse = await response.json();
  // ... check maintenance/update status
}
// NO else branch — if response fails, app continues as 'ok'
```

Compare to `apiClient` which would:
- Add `Authorization: Bearer <token>` header
- Handle 401/429/error responses with proper error handling
- Log all failures

This endpoint also lacks auth headers entirely — it sends only `Content-Type: application/json`.

### Fix

```typescript
// Option 1: Route through apiClient with proper endpoint path
import { apiClient } from '@/services/api/apiClient';

const response = await apiClient.get<AppStatusResponse>('/admin/config/app-status');
if (response.data?.maintenance?.enabled) {
  setAppStatus('maintenance');
  return;
}

// Option 2: If /config/ is the correct backend endpoint, add auth
const token = await storageService.getAuthToken();
const response = await fetch(`${baseUrl}/config/app-status`, {
  signal: controller.signal,
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,  // add auth
  },
});
```

Also add error handling for non-ok responses:

```typescript
if (!response.ok) {
  // Treat as 'ok' is dangerous — force a minimum check
  logger.error('[App] App-status check failed:', response.status);
  // Still proceed but log the failure
}
```

### Test Plan

1. Mock backend to return non-ok for `/config/app-status`
2. Before fix: app proceeds as "ok" silently — maintenance mode bypassed
3. After fix: error is logged, proper fallback handling
