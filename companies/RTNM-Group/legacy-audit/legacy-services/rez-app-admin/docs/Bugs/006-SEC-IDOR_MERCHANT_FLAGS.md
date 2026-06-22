---
name: SEC-002 IDOR_MERCHANT_FLAGS
description: merchantId from URL params passed directly to API — any authenticated admin can access/modify any merchant's flags by guessing IDs
type: security
fix_summary: Added merchant-flags/[merchantId] to ROUTE_ROLE_REQUIREMENTS in constants/roles.ts — ADMIN and SUPER_ADMIN only; SUPPORT/OPERATOR are blocked at the route level
severity: HIGH
domain: Security / OWASP A01
status: FIXED
owner: claude
created: 2026-04-18
fixed_date: 2026-04-19
---

## Bug: SEC-002 — IDOR on Merchant Feature Flags

### Status: OPEN | Severity: HIGH | Domain: Security (OWASP A01: Broken Access Control)

---

### Summary

The merchant feature flags screen uses `merchantId` directly from URL params (`merchant-flags/[merchantId].tsx`) without verifying the admin has authorization to access that merchant's data. Any authenticated admin can access any merchant's flags by manipulating the URL.

### Files Affected

- `app/(dashboard)/merchant-flags/[merchantId].tsx`

### Fix

Add authorization check before fetching:
```typescript
// In merchant-flags/[merchantId].tsx
useEffect(() => {
  const checkAccess = async () => {
    const merchant = await merchantsService.getMerchant(merchantId);
    // Verify admin's permissions for this merchant's scope
    const { user } = useAuth();
    if (!canAccessMerchant(user, merchant)) {
      router.replace('/(dashboard)/merchants');
      showAlert('Access Denied', 'You do not have permission to manage this merchant.');
    }
  };
  checkAccess();
}, [merchantId]);
```

Also add tenant/scope validation on the backend for all merchant-flag endpoints.

### Test Plan

1. Login as support role
2. Navigate to `/merchant-flags/OTHER_MERCHANT_ID`
3. Should redirect or show "Access Denied"
4. Admin role should still access any merchant
