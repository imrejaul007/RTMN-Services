---
name: SVC-007 SOCIAL_IMPACT_NO_ADMIN_PREFIX
description: socialImpact.ts uses /programs/ and /sponsors/ endpoints without /admin/ — may bypass admin auth middleware
type: bug
severity: HIGH
domain: Cross-Service / Security
status: FIXED
owner: unassigned
created: 2026-04-19
fixed_date: 2026-04-19
fix_summary: All socialImpact.ts endpoints now use /admin/programs/ and /admin/sponsors/ prefix. This ensures admin auth middleware is applied. Combined with BUG-068 fix.
---

## Bug: SVC-007 — Social Impact Endpoints Bypass Admin Auth

### Status: OPEN | Severity: HIGH | Domain: Cross-Service / Security

---

### Summary

`socialImpact.ts` calls `/programs/...` and `/sponsors/...` endpoints without the `/admin/` prefix. These paths may not be protected by admin authentication middleware on the backend. A user with a consumer token (or no token) could potentially access or modify social impact programs if the backend routes these paths differently.

### Files Affected

- `services/api/socialImpact.ts` — all 20 endpoints

### Root Cause

```typescript
// All socialImpact.ts endpoints use these paths:
'/programs/social-impact?'       // no /admin/ prefix
'/programs/social-impact/{id}'
'/programs/social-impact/pending'
'/programs/social-impact/{id}/approve'
'/programs/social-impact/{id}/reject'
'/programs/social-impact/{id}/participants'
'/programs/social-impact/{eventId}/check-in'
'/programs/social-impact/{eventId}/complete'
'/programs/social-impact/{eventId}/bulk-complete'
'/programs/social-impact/{eventId}/generate-qr'
'/programs/social-impact/{eventId}/verify-qr'
'/programs/social-impact/{eventId}/generate-otp'
'/sponsors'                      // no /admin/ prefix
'/sponsors/{id}'
'/sponsors/{id}/activate'
'/sponsors/{id}/events'
'/sponsors/{id}/analytics'
'/sponsors/{sponsorId}/fund'
'/sponsors/{sponsorId}/budget'
'/sponsors/{sponsorId}/allocate'
'/sponsors/{sponsorId}/ledger'
```

Compare to `achievements.ts` which correctly uses `/admin/achievements/...`, `/admin/game-config/...`, etc.

### Impact

If the backend mounts `/programs` and `/sponsors` without admin middleware, these admin operations are accessible to any authenticated user. Critical operations like:
- `/programs/social-impact/{id}/approve` — approve a social impact program
- `/programs/social-impact/{eventId}/complete` — mark participant complete, award coins
- `/sponsors/{sponsorId}/fund` — fund a sponsor budget

...could be accessed by non-admin users.

### Fix

Prefix all social impact endpoints with `/admin/`:

```typescript
// socialImpact.ts — fix every endpoint:
// BEFORE:
return apiClient.get('/programs/social-impact');
// AFTER:
return apiClient.get('/admin/programs/social-impact');

// BEFORE:
return apiClient.post('/sponsors', data);
// AFTER:
return apiClient.post('/admin/sponsors', data);
```

Also verify the backend has admin middleware on `/admin/programs/...` and `/admin/sponsors/...` routes.

### Test Plan

1. Login as `support` role (lowest privilege)
2. Try to approve social impact program
3. Should return 403 Forbidden (not 200 OK)
4. Verify backend actually has admin middleware on these routes
