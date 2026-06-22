# REZ-Merchant Security Audit - CRITICAL FINDINGS

**Date:** 2026-05-16
**Scope:** REZ-Merchant Services (21 services)
**Agents Completed:** 8 services audited

---

## Executive Summary

**Overall Risk: CRITICAL** - Multiple services have critical security vulnerabilities requiring immediate attention.

| Service | Risk Level | Critical Issues | High Issues |
|---------|------------|----------------|------------|
| REZ-merchant-service | ⭐⭐⭐⭐⭐ | 0 | 0 |
| REZ-kds-mobile | CRITICAL | 3 | 5 |
| REZ-merchant-intelligence-service | CRITICAL | 3 | 4 |
| rez-merchant-integrations | CRITICAL | 5 | 5 |
| rez-app-merchant | CRITICAL | 1 | 3 |
| rez-app-merchant (dashboard) | MEDIUM | 0 | 2 |
| REZ-multi-warehouse | CRITICAL | 6 | 0 |
| REZ-franchise-management | IN PROGRESS | - | - |

---

## CRITICAL Issues Requiring Immediate Action

### 1. REZ-kds-mobile 🔴

| Issue | File | Impact |
|-------|------|--------|
| **Internal token hardcoded in source** | `src/services/api.ts:44` | System compromise |
| **Auth validation disabled** | `App.tsx:133-134` | Unauthenticated access |
| **Customer PII in AsyncStorage** | `src/services/api.ts:374-383` | Data breach risk |

**Fix Required:**
```typescript
// Remove from src/services/api.ts:44
config.headers['X-Internal-Token'] = process.env.EXPO_PUBLIC_INTERNAL_TOKEN || '';

// REPLACE with:
if (process.env.EXPO_PUBLIC_INTERNAL_TOKEN) {
  config.headers['X-Internal-Token'] = process.env.EXPO_PUBLIC_INTERNAL_TOKEN;
}
```

---

### 2. REZ-merchant-intelligence-service 🔴

| Issue | File | Impact |
|-------|------|--------|
| **Hardcoded credentials in .env** | `.env:6,27` | Database breach |
| **Wildcard CORS (`origin: '*'`)** | `src/index.ts:28` | Unauthorized access |
| **No authentication middleware** | All routes | Public data exposure |

**Fix Required:**
```typescript
// src/index.ts - Fix CORS
app.use(cors({
  origin: function (origin, callback) {
    const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || [];
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
}));
```

---

### 3. rez-merchant-integrations 🔴

| Issue | File | Impact |
|-------|------|--------|
| **No authentication on ANY endpoint** | `src/index.ts` | Attribution fraud |
| **In-memory storage (data loss)** | `roiTrackingService.ts:254-263` | Revenue loss |
| **No input validation** | All routes | Injection attacks |
| **No webhook verification** | `src/index.ts:257-266` | Delivery fraud |

**Fix Required:**
```typescript
// Add to all routes
import { requireInternalToken } from '@rez/shared/middleware/auth';
app.use('/api', requireInternalToken);

// Add Zod validation
import { z } from 'zod';
const trackClickSchema = z.object({
  campaignId: z.string().min(1),
  merchantId: z.string().min(1),
});
```

---

### 4. rez-app-merchant (Mobile) 🔴

| Issue | File | Impact |
|-------|------|--------|
| **.env COMMITTED to repository** | `.env` | Infrastructure exposed |
| **No auth headers on API calls** | Multiple service files | Public API access |

**Fix Required:**
```bash
# IMMEDIATE ACTIONS:
# 1. Rotate all credentials
# 2. Remove from git history:
git filter-branch --force --index-filter \
  "git rm --cached --ignore-unmatch .env" \
  --prune-empty --tag-name-filter cat -- --all

# 3. Add to .gitignore
echo ".env" >> .gitignore
```

---

### 5. REZ-multi-warehouse 🔴

**Status: SKELETON PROJECT** - Service is non-functional
- No entry point (`src/index.ts`)
- No routes, controllers, models
- No authentication middleware
- No rate limiting implementation

**Action Required:** Complete service implementation before audit.

---

## High Priority Issues

### Missing Security Middleware

| Service | Missing | Priority |
|---------|---------|----------|
| rez-merchant-integrations | Auth, validation, webhook verification | CRITICAL |
| REZ-multi-warehouse | All security middleware | CRITICAL |
| REZ-kds-mobile | Auth validation, SecureStore for PII | CRITICAL |
| REZ-merchant-intelligence-service | Proper CORS, rate limiting | HIGH |

---

## Verified Good Services

### REZ-merchant-service ✅

**Security Features:**
- Explicit CORS origin whitelist
- Redis-backed rate limiting
- HSTS headers configured
- Security fixes already applied (MA-BACK-007, MA-BACK-009)

---

## Remediation Priority Matrix

| Service | Issue | Priority | Effort |
|---------|-------|----------|--------|
| rez-app-merchant | Remove .env from git | P0 | 1 hour |
| rez-app-merchant | Add auth headers to APIs | P0 | 2 hours |
| rez-merchant-integrations | Add authentication | P0 | 1 day |
| rez-merchant-integrations | Add Zod validation | P0 | 1 day |
| rez-merchant-integrations | Replace in-memory with Redis | P0 | 2 hours |
| REZ-kds-mobile | Remove hardcoded token | P0 | 30 min |
| REZ-kds-mobile | Enable auth validation | P1 | 1 hour |
| REZ-merchant-intelligence-service | Fix CORS wildcard | P1 | 30 min |
| REZ-merchant-intelligence-service | Add auth middleware | P1 | 1 hour |
| REZ-multi-warehouse | Complete implementation | P0 | 1 week |

---

## Security Checklist

- [ ] Remove all committed .env files
- [ ] Rotate all exposed credentials
- [ ] Add authentication to rez-merchant-integrations
- [ ] Add Zod validation to rez-merchant-integrations
- [ ] Replace in-memory storage with Redis
- [ ] Fix CORS in REZ-merchant-intelligence-service
- [ ] Enable auth validation in REZ-kds-mobile
- [ ] Complete REZ-multi-warehouse implementation

---

**Audit Date:** 2026-05-16
**Critical Issues Found:** 18
**Services Needing Fix:** 5
