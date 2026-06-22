# adBazaar: localStorage to HttpOnly Cookie Migration Plan

**Document Version:** 1.0
**Created:** 2026-04-30
**Status:** PLANNING
**Effort Estimate:** 3-4 weeks
**Risk:** Medium (requires careful testing)

---

## Executive Summary

The adBazaar application currently uses localStorage for storing authentication tokens in client-side code. This creates a security vulnerability where XSS attacks can steal user credentials.

This document outlines a complete migration plan to use HttpOnly cookies via `@supabase/ssr`, which provides:
- **HttpOnly**: JavaScript cannot access tokens (prevents XSS theft)
- **Secure**: Cookies only sent over HTTPS
- **SameSite**: CSRF protection

---

## Current Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     Current Architecture                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Browser                                                        │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐     │
│  │   Pages      │───▶│  localStorage │───▶│ Supabase    │     │
│  │  (createClient)   │  (tokens)     │    │  Direct     │     │
│  └──────────────┘    └──────────────┘    └──────────────┘     │
│         │                                        │              │
│         └────────────────────────────────────────┘              │
│                    Direct token access                            │
│                                                                  │
│  Vulnerable to:                                                 │
│  - XSS token theft                                              │
│  - localStorage enumeration                                      │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Target Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    Target Architecture                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Browser                                                        │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐     │
│  │   Pages      │───▶│   Cookies   │───▶│ @supabase/ssr│     │
│  │  (SSR Client)   │  (HttpOnly)   │    │  Browser     │     │
│  └──────────────┘    └──────────────┘    └──────────────┘     │
│         │                                        │              │
│         │                                        ▼              │
│         │                                 ┌──────────────┐     │
│         │                                 │  Supabase    │     │
│         │                                 │   Server     │     │
│         └────────────────────────────────▶│              │     │
│                    Via Authorization Header (for API routes)      │
│                                                                  │
│  Protected from:                                                │
│  ✓ XSS token theft (HttpOnly)                                   │
│  ✓ CSRF attacks (SameSite)                                      │
│  ✓ localStorage enumeration                                      │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Files That Need Changes

### Priority 1: Auth Pages (Critical)

| File | Changes Required |
|------|------------------|
| `app/(auth)/login/page.tsx` | Migrate to `createBrowserClient` with cookie storage |
| `app/(auth)/register/page.tsx` | Migrate to `createBrowserClient` with cookie storage |
| `app/(auth)/reset-password/page.tsx` | Migrate to `createBrowserClient` with cookie storage |
| `app/(auth)/forgot-password/page.tsx` | Migrate to `createBrowserClient` with cookie storage |
| `app/(auth)/verify-2fa/page.tsx` | Migrate to `createBrowserClient` with cookie storage |

### Priority 2: Dashboard Pages (High)

| File | Changes Required |
|------|------------------|
| `app/(buyer)/buyer/dashboard/page.tsx` | Replace `getSession()` with cookie-based client |
| `app/(vendor)/vendor/dashboard/page.tsx` | Replace `getSession()` with cookie-based client |
| `app/(vendor)/vendor/bulk-upload/page.tsx` | **FIX BUG**: Remove `localStorage.getItem('accessToken')` |

### Priority 3: API Routes (Medium)

| File | Changes Required |
|------|------------------|
| All `app/api/**/route.ts` | Use `createServerClient` instead of `createClient` |

### Priority 4: Components (Medium)

| File | Changes Required |
|------|------------------|
| `components/NotificationBell.tsx` | Use cookie-based client for `getSession()` |
| `components/auth/AuthProvider.tsx` | Create new provider with SSR client |
| `lib/supabase.ts` | Add browser client factory |

---

## Migration Steps

### Phase 1: Infrastructure Setup (1-2 days)

#### Step 1.1: Create Browser Client Factory
**File:** `src/lib/supabase-browser.ts` (NEW)

```typescript
// src/lib/supabase-browser.ts
import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
```

#### Step 1.2: Create Server Component Helper
**File:** `src/lib/supabase-server.ts` (NEW)

```typescript
// src/lib/supabase-server.ts
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'

export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // Server Component - ignore
          }
        },
      },
    }
  )
}
```

#### Step 1.3: Create Auth Context Provider
**File:** `src/contexts/AuthContext.tsx` (NEW)

```typescript
// src/contexts/AuthContext.tsx
'use client'

import { createClient } from '@/lib/supabase-browser'
import { createContext, useContext, useEffect, useState } from 'react'

interface User {
  id: string
  email: string
  // ... other fields
}

interface AuthContextType {
  user: User | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<void>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      setLoading(false)
    })

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })

    return () => subscription.unsubscribe()
  }, [])

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
  }

  const signOut = async () => {
    const { error } = await supabase.auth.signOut()
    if (error) throw error
  }

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
```

---

### Phase 2: Auth Pages Migration (2-3 days)

#### Step 2.1: Update Login Page
**File:** `src/app/(auth)/login/page.tsx`

**Before:**
```typescript
import { createClient } from '@supabase/supabase-js'

export default function LoginPage() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  const handleLogin = async () => {
    await supabase.auth.signInWithPassword({ email, password })
    // Tokens stored in localStorage by default
  }
}
```

**After:**
```typescript
import { createBrowserClient } from '@supabase/ssr'

export default function LoginPage() {
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  const handleLogin = async () => {
    await supabase.auth.signInWithPassword({ email, password })
    // Tokens stored in HttpOnly cookies automatically
  }
}
```

#### Step 2.2: Update Register Page
**File:** `src/app/(auth)/register/page.tsx`

Same pattern as login page.

#### Step 2.3: Update Password Pages
**Files:**
- `src/app/(auth)/forgot-password/page.tsx`
- `src/app/(auth)/reset-password/page.tsx`

---

### Phase 3: Dashboard Pages Migration (2-3 days)

#### Step 3.1: Update Buyer Dashboard
**File:** `src/app/(buyer)/buyer/dashboard/page.tsx`

**Before:**
```typescript
const supabase = createClient(url, key)
const { data: { user } } = await supabase.auth.getUser()
```

**After:**
```typescript
const supabase = createBrowserClient(url, key)
const { data: { user } } = await supabase.auth.getUser()
// getUser() reads from cookies automatically
```

#### Step 3.2: Update Vendor Dashboard
**File:** `src/app/(vendor)/vendor/dashboard/page.tsx`

Same pattern.

#### Step 3.3: Fix Bulk Upload Bug
**File:** `src/app/(vendor)/vendor/bulk-upload/page.tsx`

**Before (BUG):**
```typescript
// This doesn't work with Supabase!
const accessToken = localStorage.getItem('accessToken')
```

**After:**
```typescript
// Use proper Supabase client
const supabase = createBrowserClient(url, key)
const { data: { session } } = await supabase.auth.getSession()
const accessToken = session?.access_token
```

---

### Phase 4: API Routes Migration (2-3 days)

#### Step 4.1: Update All API Routes
All routes in `src/app/api/**/route.ts` should use:

```typescript
// Instead of:
import { createClient } from '@supabase/supabase-js'
const supabase = createClient(url, key)

// Use:
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function GET(request: Request) {
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // Ignore errors in read-only contexts
          }
        },
      },
    }
  )

  // Now supabase.auth.getUser() reads from cookies
  const { data: { user } } = await supabase.auth.getUser()
}
```

---

### Phase 5: Middleware Update (1 day)

#### Step 5.1: Verify Middleware Configuration
**File:** `src/middleware.ts`

Already updated to use `@supabase/ssr`. Verify:

```typescript
import { createServerClient } from '@supabase/ssr'

export async function middleware(request: NextRequest) {
  // ... rate limiting ...

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            request.cookies.set(name, value)
          )
          return NextResponse.next({
            request: {
              headers: request.cookies,
            },
          })
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  // ... rest of middleware ...
}
```

---

### Phase 6: Testing (3-5 days)

#### Step 6.1: Unit Tests
- Test cookie storage and retrieval
- Test auth state persistence
- Test token refresh flow

#### Step 6.2: Integration Tests
- Test full login/logout flow
- Test session persistence across page refreshes
- Test token refresh

#### Step 6.3: E2E Tests
- Test complete user journeys
- Test protected routes redirect to login
- Test XSS cannot access tokens

#### Step 6.4: Security Verification
- Verify HttpOnly flag is set
- Verify Secure flag is set in production
- Verify SameSite attribute is set
- Verify XSS cannot read tokens

---

## Rollback Plan

If migration fails:

1. **Feature Flag**: Keep old `createClient` import path working
2. **Gradual Rollout**: Use % traffic split in Vercel
3. **Quick Revert**: Keep old code in separate branch

---

## Environment Variables Required

No new environment variables needed. Supabase handles cookie configuration automatically when using `@supabase/ssr`.

---

## Testing Checklist

- [ ] Login flow works
- [ ] Logout clears cookies
- [ ] Session persists across page refresh
- [ ] Protected routes redirect to login
- [ ] Token refresh works
- [ ] Logout from one tab clears all tabs
- [ ] Mobile Safari cookie handling works
- [ ] Firefox privacy settings don't block cookies
- [ ] Dev tools show HttpOnly cookies (not accessible to JS)

---

## Success Metrics

| Metric | Target |
|--------|--------|
| XSS token theft possible | 0 |
| Login success rate | > 99% |
| Session persistence | > 95% |
| Test coverage | > 80% |
| Critical bugs | 0 |

---

## Timeline

| Phase | Duration | Deliverables |
|-------|----------|--------------|
| Phase 1: Infrastructure | 1-2 days | Browser client factory, server client, auth context |
| Phase 2: Auth Pages | 2-3 days | Login, register, password reset pages |
| Phase 3: Dashboards | 2-3 days | Buyer, vendor dashboard pages |
| Phase 4: API Routes | 2-3 days | All API routes updated |
| Phase 5: Middleware | 1 day | Middleware verified |
| Phase 6: Testing | 3-5 days | All tests passing |
| **Total** | **11-16 days** | Full migration complete |

---

## Files Summary

### New Files to Create

| File | Purpose |
|------|---------|
| `src/lib/supabase-browser.ts` | Browser client factory |
| `src/lib/supabase-server.ts` | Server component helper |
| `src/contexts/AuthContext.tsx` | Auth context provider |

### Files to Modify

| File | Changes |
|------|---------|
| `src/app/(auth)/login/page.tsx` | Use createBrowserClient |
| `src/app/(auth)/register/page.tsx` | Use createBrowserClient |
| `src/app/(auth)/forgot-password/page.tsx` | Use createBrowserClient |
| `src/app/(auth)/reset-password/page.tsx` | Use createBrowserClient |
| `src/app/(auth)/verify-2fa/page.tsx` | Use createBrowserClient |
| `src/app/(buyer)/buyer/dashboard/page.tsx` | Use createBrowserClient |
| `src/app/(vendor)/vendor/dashboard/page.tsx` | Use createBrowserClient |
| `src/app/(vendor)/vendor/bulk-upload/page.tsx` | FIX BUG + use createBrowserClient |
| `src/components/NotificationBell.tsx` | Use createBrowserClient |
| `src/middleware.ts` | Already updated (verify) |

### API Routes to Update (~30 files)

All files in `src/app/api/**/route.ts` that use Supabase client.

---

## Notes

1. **Supabase SSR handles everything**: Cookie storage, HttpOnly, Secure, SameSite - all automatic.

2. **No breaking changes for users**: After migration, users just have more secure auth.

3. **Supabase Dashboard Configuration**: Ensure in Supabase Dashboard:
   - Go to Authentication > URL Configuration
   - Set Site URL to your production URL
   - Set Redirect URLs to include production + localhost

4. **Cookie Names**: Supabase uses these cookie names:
   - `sb-access-token`
   - `sb-refresh-token`
   - `sb-auth-token` (optional, for SSR)

5. **Testing in Development**: Use `http://localhost:3000` as Site URL in Supabase.

---

**Migration Lead:** TBD
**Review Required:** Yes (before Phase 2)
**Go-Live Target:** 2 weeks from start
