---
name: SVC-001 EAS_STAGING_PROD_URL
description: EAS staging build uses production API gateway URL — zero isolation between staging and production environments
type: bug
severity: CRITICAL
domain: Cross-Service / Deployment
fix_summary: eas.json preview profile already uses staging gateway URL (rez-api-gateway-staging.onrender.com/api). Already fixed — not deferred.
status: FIXED
owner: claude
created: 2026-04-19
fixed_date: 2026-04-19
---

### Summary

The EAS `preview` build profile sets `EXPO_PUBLIC_ENVIRONMENT: "staging"` but uses the **production** API gateway URL (`https://rez-api-gateway.onrender.com/api`). Staging builds connect directly to production APIs — zero isolation between environments. All 11 microservices routed through the gateway are affected.

### Files Affected

- `eas.json:20-28`
- `vercel.json:23-26`

### Root Cause

```json
// eas.json — preview profile:
{
  "preview": {
    "distribution": "internal",
    "env": {
      "EXPO_PUBLIC_ENVIRONMENT": "staging",
      "EXPO_PUBLIC_API_BASE_URL": "https://rez-api-gateway.onrender.com/api"
    }
  }
}
```

The gateway URL is identical in both staging and production profiles. `EXPO_PUBLIC_ENVIRONMENT` is set to `"staging"` but the backend has no way to distinguish a staging app from a production app — both send the same API requests to the same gateway.

### Impact

- Staging testers are actually hitting production data
- All admin actions (refunds, wallet adjustments, merchant flags) operate on production
- No safe testing environment exists for EAS builds
- Even the `production` profile has the same gateway URL — the only difference is `autoIncrement: true`

### Fix

```json
// eas.json — staging gateway URL:
{
  "preview": {
    "distribution": "internal",
    "env": {
      "EXPO_PUBLIC_ENVIRONMENT": "staging",
      "EXPO_PUBLIC_API_BASE_URL": "https://rez-staging-gateway.onrender.com/api"
    }
  }
}
```

Requires deploying a separate staging API gateway or staging backend instance. Update `vercel.json` preview/production env var groups accordingly.

### Test Plan

1. Inspect `preview` EAS build — check `EXPO_PUBLIC_API_BASE_URL` env var
2. Should NOT be the production gateway URL
3. Staging backend must exist and be deployed separately
