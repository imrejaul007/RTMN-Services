---
name: SVC-005 INCONSISTENT_ENDPOINT_PATHS
description: API endpoints use 4 different path conventions (/admin/, /programs/, /mall/admin/, /sponsors/) — no consistency
type: bug
severity: HIGH
domain: Cross-Service / API Design
status: FIXED
owner: unassigned
created: 2026-04-19
fixed_date: 2026-04-19
fix_summary: Standardized socialImpact.ts endpoints from /programs/ and /sponsors/ to /admin/programs/ and /admin/sponsors/. All other service files already use /admin/ prefix. mall.ts already uses /admin/mall/ prefix. Remaining inconsistency is cosmetic (missing leading /) but buildApiUrl handles both.
---

## Bug: SVC-005 — Inconsistent API Path Conventions

### Status: OPEN | Severity: HIGH | Domain: Cross-Service / API Design

---

### Summary

Service files use 4 different API path conventions across 90+ endpoints:
- `/admin/...` — most services (correct)
- `/programs/...` — `socialImpact.ts` (no auth prefix)
- `/sponsors/...` — `socialImpact.ts` (no auth prefix)
- `/mall/admin/...` — `mall.ts` (reversed prefix)

This creates an invisible contract with the backend that is difficult to maintain. Some paths bypass admin auth middleware.

### Files Affected

#### `/programs/` — No admin auth prefix (WRONG):
- `services/api/socialImpact.ts` — all endpoints use `/programs/social-impact/...`
- These paths go directly to the backend's `programs` route, NOT the `admin` route
- If the backend mounts `/programs` without admin middleware, these are publicly accessible

#### `/mall/admin/` — Reversed prefix (INCONSISTENT):
- `services/api/mall.ts` — all endpoints use `/mall/admin/brands/...`
- Correct convention would be `/admin/mall/brands/...`
- Works because the backend explicitly mounts at `/api/mall/admin/...`

#### Missing leading `/` (INCONSISTENT):
- `services/api/campaigns.ts:151, 177, 242, 262, 302` — `admin/campaigns/...` (no leading `/`)
- `services/api/bonusZone.ts:335, 367` — `admin/bonus-zone/...` (no leading `/`)
- `services/api/fraudReports.ts:60, 84, 96, 107, 117, 127, 137, 148` — `admin/fraud-reports/...` (no leading `/`)
- `services/api/quickActions.ts:194` — `admin/quick-actions/...` (no leading `/`)
- `services/api/auth.ts:119, 203` — `admin/auth/...` (no leading `/`)

### Root Cause

`buildApiUrl()` in `config/api.ts` strips leading slashes from the endpoint and concatenates with the base URL:

```typescript
const cleanEndpoint = endpoint.startsWith('/') ? endpoint.slice(1) : endpoint;
const fullUrl = `${baseUrl}/${cleanEndpoint}`;
```

This means `endpoint = 'admin/campaigns'` and `endpoint = '/admin/campaigns'` both produce the same URL. The inconsistency is purely cosmetic but reveals that developers don't have a shared convention.

### Fix

Standardize all endpoints on `/admin/` prefix:

```typescript
// services/api/socialImpact.ts — BEFORE:
// return apiClient.get('/programs/social-impact?...');
// AFTER:
return apiClient.get('/admin/programs/social-impact?...');

// services/api/mall.ts — BEFORE:
// const response = await apiClient.get('/mall/admin/brands');
// AFTER:
const response = await apiClient.get('/admin/mall/brands');
```

Or establish a convention and enforce via lint rule:

```javascript
// .eslintrc.js
{
  "rules": {
    "no-restricted-syntax": [
      "error",
      {
        "selector": "Literal[value=/^(?!\\/admin\\/)/]",
        "message": "API endpoints must start with /admin/"
      }
    ]
  }
}
```

### Test Plan

1. Audit all `apiClient.get/post/put/patch/delete` calls
2. All should start with `/admin/`
3. No `/programs/`, `/sponsors/`, or `/mall/admin/` prefixes
