# REZ-Merchant Audit Fixes Applied
**Date:** May 18, 2026

---

## Summary of Fixes Applied

### 1. JWT Bypass Vulnerability (CRITICAL) - FIXED
**File:** `industry-os/rez-hotel-service/src/middleware/auth.ts`

**Issue:** Auth middleware skipped validation when JWT_SECRET was not set, allowing unsigned tokens.

**Fix:** Added production check that fails fast if JWT_SECRET is missing in production:
```typescript
const IS_PRODUCTION = process.env.NODE_ENV === 'production';
if (IS_PRODUCTION && !JWT_SECRET) {
  console.error('[FATAL] JWT_SECRET is required in production');
  process.exit(1);
}
```

---

### 2. CORS Wildcard Issues - FIXED

Applied fixes to 4 services:

| Service | File |
|---------|------|
| rez-restaurant-crm-service | src/index.ts |
| rez-fitness-service | src/index.ts |
| rez-pharmacy-service | src/index.ts |
| rez-mind-healthcare-service | src/index.ts |

**Fix:** Replaced `origin: '*'` with:
- Dynamic origin whitelist from `CORS_ORIGIN` env var
- Fail-fast in production if no origins configured
- Development fallback to localhost only

---

### 3. Hardcoded Secrets - FIXED

Fixed in 4 services:

| Service | File | Issue |
|---------|------|-------|
| rez-salon-pos-service | src/config/index.ts | `default-secret-change-me` |
| rez-salon-qr-service | src/services/QRService.ts | `default-secret-change-me` |
| rez-mind-hotel-service | src/routes/event-routes.ts | `hotel-pms-secret-key-change-in-production` |
| rez-merchant-intelligence-service | src/config/index.ts | `default-secret-change-in-production` |

**Fix:** Added fail-fast for production, warning for development.

---

### 4. EXPO_PUBLIC_INTERNAL_TOKEN Exposure (CRITICAL) - FIXED
**File:** `REZ-kds-mobile/src/services/api.ts`

**Issue:** Server-side internal token exposed in client code via `EXPO_PUBLIC_INTERNAL_TOKEN`.

**Fix:** Removed X-Internal-Token from client-side interceptor. Internal tokens are for server-to-server only.

---

### 5. Healthcare Authentication - ADDED

Created auth middleware and applied to 2 services:

| Service | Files Added/Modified |
|---------|-------------------|
| rez-pharmacy-service | Created `middleware/auth.ts`, updated routes |
| rez-mind-healthcare-service | Created `middleware/auth.ts`, updated index.ts |

**Features Added:**
- JWT token validation
- Internal service token support
- Role-based access control
- Fail-fast in production if JWT_SECRET missing

---

### 6. Rate Limiting - ADDED

**File:** `rez-pharmacy-service/src/index.ts`

**Features Added:**
- General rate limiter: 100 requests per 15 minutes per IP
- Auth rate limiter: 5 requests per 15 minutes per IP
- Standard headers for client visibility
- Request body size limits

---

### 7. Security Headers (Helmet) - VERIFIED

All services now have Helmet enabled:
- rez-pharmacy-service ✓
- rez-restaurant-crm-service ✓
- rez-fitness-service ✓
- rez-mind-healthcare-service ✓

---

## Files Modified

### Critical Security Fixes (7 files)
1. `industry-os/rez-hotel-service/src/middleware/auth.ts`
2. `REZ-kds-mobile/src/services/api.ts`

### CORS Fixes (4 files)
3. `industry-os/rez-restaurant-crm-service/src/index.ts`
4. `industry-os/rez-fitness-service/src/index.ts`
5. `industry-os/rez-pharmacy-service/src/index.ts`
6. `industry-os/rez-mind-healthcare-service/src/index.ts`

### Hardcoded Secret Fixes (4 files)
7. `industry-os/rez-salon-pos-service/src/config/index.ts`
8. `industry-os/rez-salon-qr-service/src/services/QRService.ts`
9. `industry-os/rez-mind-hotel-service/src/routes/event-routes.ts`
10. `rez-merchant-intelligence-service/src/config/index.ts`

### Authentication Middleware (4 files)
11. `industry-os/rez-pharmacy-service/src/middleware/auth.ts` (NEW)
12. `industry-os/rez-pharmacy-service/src/routes/medicines.routes.ts`
13. `industry-os/rez-pharmacy-service/src/routes/orders.routes.ts`
14. `industry-os/rez-pharmacy-service/src/index.ts`
15. `industry-os/rez-mind-healthcare-service/src/middleware/auth.ts` (NEW)
16. `industry-os/rez-mind-healthcare-service/src/index.ts`

### Rate Limiting (2 files)
17. `industry-os/rez-pharmacy-service/package.json`
18. `industry-os/rez-pharmacy-service/src/index.ts`

---

## Remaining Action Items

### HIGH PRIORITY (Not Fixed Yet)
1. **restauranthub/admin123 in seed.ts** - Need to remove demo password hash
2. **rez-fitness-service** - Add authentication middleware
3. **rez-mind-salon-service** - Add authentication middleware
4. **rez-salon-crm-service** - Add authentication middleware
5. **Empty services** - Complete or remove:
   - rez-restaurant-reviews-service
   - rez-restaurant-inventory-service
   - restauranthub auth-service (stub)
   - restauranthub order-service (stub)

### MEDIUM PRIORITY
1. Add rate limiting to other services
2. Add MongoDB sanitize middleware
3. Complete RABTUL integration for healthcare services
4. Add HIPAA compliance logging for health data

---

## Verification Checklist

After deployment, verify:
- [ ] `NODE_ENV=production` enforces all fail-fast checks
- [ ] CORS_ORIGIN is set with allowed domains
- [ ] JWT_SECRET is set in all services
- [ ] Internal tokens use JSON map format, not shared secrets
- [ ] Healthcare endpoints require valid JWT
- [ ] Rate limiting prevents abuse
