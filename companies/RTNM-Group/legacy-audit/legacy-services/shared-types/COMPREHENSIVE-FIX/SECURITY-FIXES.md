# Security Fixes - Comprehensive Audit Report

## Executive Summary

This document details the security vulnerabilities discovered and fixed during a comprehensive security audit of the ReZ ecosystem. All critical and high-severity issues have been addressed.

---

## Fixed Vulnerabilities

### 1. IDOR (Insecure Direct Object Reference) - CRITICAL

#### Issue Description
Multiple endpoints in the CorpPerks module allowed unauthorized access to resources belonging to other companies by manipulating resource IDs in the URL. An attacker could guess or enumerate IDs to access, modify, or delete resources belonging to other companies.

#### Affected Files

**File:** `/Users/rejaulkarim/Documents/ReZ Full App/CorpPerks/src/backend/corpPerksRoutes.ts`

| Endpoint | Method | Severity | Status |
|----------|--------|----------|--------|
| `/api/corp/benefits/:id` | GET | CRITICAL | FIXED |
| `/api/corp/benefits/:id` | PUT | CRITICAL | FIXED |
| `/api/corp/employees/:id` | GET | CRITICAL | FIXED |
| `/api/corp/employees/:id/benefits` | POST | CRITICAL | FIXED |

**File:** `/Users/rejaulkarim/Documents/ReZ Full App/CorpPerks/src/backend/corpGSTRoutes.ts`

| Endpoint | Method | Severity | Status |
|----------|--------|----------|--------|
| `/api/gst/invoices/:invoiceNumber` | GET | CRITICAL | FIXED |
| `/api/gst/einvoice/:invoiceNumber` | POST | CRITICAL | FIXED |

#### Fix Applied

Added company ownership verification to all resource access endpoints:

```typescript
// Before (VULNERABLE):
router.get('/api/corp/benefits/:id', requireAdminAuth, async (req, res) => {
  const benefit = await CorporateBenefit.findById(req.params.id);
  // No verification that benefit belongs to the requesting company
});

// After (SECURE):
router.get('/api/corp/benefits/:id', requireAdminAuth, async (req, res) => {
  const companyId = req.headers['x-company-id'] as string;
  if (!companyId) {
    return res.status(400).json({ success: false, message: 'Company ID required' });
  }
  const benefit = await CorporateBenefit.findOne({
    _id: new mongoose.Types.ObjectId(req.params.id),
    companyId: new mongoose.Types.ObjectId(companyId),
  });
  if (!benefit) {
    return res.status(404).json({ success: false, message: 'Benefit not found' });
  }
});
```

#### Impact
- Prevents unauthorized access to other companies' benefits, employees, and GST invoices
- Added audit logging for IDOR attempt detection

---

### 2. CORS Wildcard Configuration - HIGH

#### Issue Description
Services were using CORS configurations that could inadvertently allow wildcard origins if the environment variable was misconfigured, potentially allowing malicious websites to make authenticated requests.

#### Affected Files

| Service | File | Status |
|---------|------|--------|
| rez-auth-service | `src/index.ts` | FIXED |
| rez-wallet-service | `src/index.ts` | FIXED |

#### Fix Applied

Added validation to reject wildcard origins at startup:

```typescript
// SECURITY FIX: Reject wildcards in CORS origins (prevents accidentally allowing all origins)
for (const origin of allowedOrigins) {
  if (origin === '*' || origin.includes('*')) {
    logger.error(`[FATAL] CORS_ORIGIN contains wildcard: "${origin}". This is insecure.`);
    process.exit(1);
  }
}

app.use(cors({
  origin: (origin, cb) => {
    if (!origin || allowedOrigins.includes(origin)) return cb(null, true);
    cb(new Error(`CORS blocked: ${origin}`));
  },
  credentials: true,
}));
```

#### Impact
- Prevents accidental deployment with insecure wildcard CORS
- Service will refuse to start if misconfigured

---

### 3. Missing Input Validation - MEDIUM

#### Issue Description
Hotel routes in CorpPerks accepted user input without proper validation, potentially allowing injection attacks or malformed data processing.

#### Affected Files

| File | Endpoints | Status |
|------|-----------|--------|
| `CorpPerks/src/backend/hotelRoutes.ts` | `/:id`, `/:id/rooms`, `/cancel`, `/bookings/:id` | FIXED |

#### Fix Applied

Added input validation for all path and query parameters:

```typescript
// Validate hotel/booking ID format
if (!id || !/^[a-zA-Z0-9_-]+$/.test(id) || id.length > 100) {
  return res.status(400).json({ success: false, message: 'Invalid ID format' });
}

// Encode IDs for URL safety
const response = await fetch(`${HOTEL_OTA_URL}/hotels/${encodeURIComponent(id)}`, ...);

// Validate date formats
if (checkIn && !/^\d{4}-\d{2}-\d{2}$/.test(checkIn as string)) {
  return res.status(400).json({ success: false, message: 'Invalid date format' });
}

// Sanitize reason parameter
const sanitizedReason = reason ? String(reason).slice(0, 500) : undefined;
```

#### Impact
- Prevents injection attacks via URL parameters
- Ensures data integrity with validated inputs
- Limits maximum input length to prevent buffer issues

---

## Existing Security Measures (Confirmed Secure)

The following security measures were verified and confirmed to be properly implemented:

### Authentication

| Service | Implementation | Status |
|--------|---------------|--------|
| rez-auth-service | JWT with HS256, token blacklist | VERIFIED |
| rez-wallet-service | JWT with role-based access | VERIFIED |
| rez-merchant-service | Merchant JWT with CSRF protection | VERIFIED |
| rez-api-gateway | Multi-secret JWT verification | VERIFIED |

### Rate Limiting

| Service | Implementation | Status |
|--------|---------------|--------|
| rez-auth-service | Redis-backed sliding window | VERIFIED |
| rez-merchant-service | Express-rate-limit with MemoryStore | VERIFIED |
| rez-api-gateway | Redis-backed distributed rate limit | VERIFIED |

### Security Headers

| Header | Implementation | Status |
|--------|---------------|--------|
| HSTS | helmet middleware | VERIFIED |
| X-Frame-Options | DENY | VERIFIED |
| X-Content-Type-Options | nosniff | VERIFIED |
| Referrer-Policy | strict-origin-when-cross-origin | VERIFIED |
| Content-Security-Policy | Configured per service | VERIFIED |

### Input Sanitization

| Feature | Implementation | Status |
|---------|---------------|--------|
| MongoDB Injection | express-mongo-sanitize | VERIFIED |
| Request Size Limits | 100kb-1mb per service | VERIFIED |
| JSON Parsing | express.json with limits | VERIFIED |

### X-Forwarded-For Validation

| Service | Protection | Status |
|---------|-----------|--------|
| rez-auth-service | Trust proxy = 1 | VERIFIED |
| rez-wallet-service | Loopback/private IP detection | VERIFIED |
| rez-payment-service | Spoofing detection | VERIFIED |
| rez-merchant-service | Validated trust hops (1-3) | VERIFIED |

---

## Recommendations

### Immediate Actions Required

1. **Deploy Fixed Services**: The following services need to be redeployed with the security fixes:
   - CorpPerks (IDOR fixes)
   - rez-auth-service (CORS validation)
   - rez-wallet-service (CORS validation)

2. **Audit Logs Review**: Review logs for any IDOR attempts that may have occurred:
   ```bash
   grep -r "IDOR attempt" /var/log/rez/
   ```

3. **Company ID Header Enforcement**: Ensure all API clients are including the `x-company-id` header on all CorpPerks requests.

### Security Best Practices Going Forward

1. **Always verify resource ownership** - Any endpoint that accesses resources by ID must verify the resource belongs to the requesting company/user.

2. **Input validation at boundaries** - Use Zod or similar schemas for all user inputs, including path parameters.

3. **CORS validation** - Validate CORS origins at startup and reject wildcards.

4. **Regular security audits** - Conduct quarterly security reviews of all services.

---

## Files Modified

| File | Changes |
|------|---------|
| `CorpPerks/src/backend/corpPerksRoutes.ts` | Added company ownership verification to 4 endpoints |
| `CorpPerks/src/backend/corpGSTRoutes.ts` | Added company ownership verification to 2 endpoints |
| `CorpPerks/src/backend/hotelRoutes.ts` | Added input validation to 4 endpoints |
| `rez-auth-service/src/index.ts` | Added CORS wildcard validation |
| `rez-wallet-service/src/index.ts` | Added CORS wildcard validation |

---

## Test Verification

After deploying the fixes, verify:

```bash
# Test IDOR protection
curl -H "Authorization: Bearer $TOKEN" \
     -H "x-company-id: COMPANY_A" \
     "https://api.corpperks.com/api/corp/benefits/INVALID_ID_FOR_OTHER_COMPANY"

# Expected: 404 Not Found (not 403 which reveals existence)

# Test CORS wildcard rejection
CORS_ORIGIN="*" node src/index.js

# Expected: FATAL error and process.exit(1)
```

---

**Date:** 2026-05-02
**Audit Type:** Comprehensive Security Review
**Severity:** Critical, High, Medium
**Status:** All critical and high issues fixed
