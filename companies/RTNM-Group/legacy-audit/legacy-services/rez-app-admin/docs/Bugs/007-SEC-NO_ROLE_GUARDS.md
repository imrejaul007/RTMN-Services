---
name: SEC-003 NO_ROUTE_ROLE_GUARDS
description: 100+ hidden dashboard routes have no role-based access control — support users can access wallet, fraud, and admin controls
type: security
fix_summary: Per-route role guards via ROUTE_ROLE_REQUIREMENTS map in constants/roles.ts
fixed_date: 2026-04-19
severity: HIGH
domain: Security / OWASP A01
status: FIXED
owner: unassigned
created: 2026-04-18
---

## Bug: SEC-003 — No Per-Route Role Guards

### Status: OPEN | Severity: HIGH | Domain: Security (OWASP A01: Broken Access Control)

---

### Summary

After the global `!isAuthenticated` check in `app/(dashboard)/_layout.tsx`, every hidden screen (100+) is accessible to any authenticated user regardless of role. A `support` role user can access:
- `wallet-adjustment` — manual balance changes
- `coin-governor` — emergency coin controls
- `fraud-config` — fraud threshold controls
- `admin-users` — manage admin accounts
- `merchant-plan-analytics` — revenue data
- `audit-log` — admin action history

### Files Affected

- `app/(dashboard)/_layout.tsx` — only auth check, no role check

### Fix

Create a `RoleGuard` component and wrap sensitive screens:

```typescript
// components/RoleGuard.tsx
import { useAuth } from '@/contexts/AuthContext';
import { Redirect } from 'expo-router';
import type { AdminRole } from '@/constants/roles';

interface RoleGuardProps {
  allowedRoles: AdminRole[];
  children: React.ReactNode;
  fallback?: string;
}

export function RoleGuard({ allowedRoles, children, fallback = '/' }: RoleGuardProps) {
  const { user } = useAuth();
  if (!user || !allowedRoles.includes(user.role)) {
    return <Redirect href={fallback} />;
  }
  return <>{children}</>;
}
```

Apply to sensitive screens:
```tsx
// In sensitive screen's _layout.tsx or screen file:
<RoleGuard allowedRoles={['super_admin', 'admin']}>
  <ActualContent />
</RoleGuard>
```

### Test Plan

1. Login as `support` role
2. Navigate directly to `/wallet-adjustment` — should redirect
3. Navigate directly to `/coin-governor` — should redirect
4. Navigate directly to `/admin-users` — should redirect
5. Login as `admin` role — should access all
6. Login as `super_admin` — should access all
