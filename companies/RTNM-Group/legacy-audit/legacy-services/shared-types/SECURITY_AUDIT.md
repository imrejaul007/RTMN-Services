# Security Audit Report - May 2, 2026

## Executive Summary

This comprehensive security audit covered the Rez Ecosystem codebase, including:
- `/Users/rejaulkarim/Documents/rez-intent-graph` - Intent graph service
- `/Users/rejaulkarim/Documents/ReZ Full App/rez-payment-service` - Payment processing
- `/Users/rejaulkarim/Documents/ReZ Full App/rez-wallet-service` - Digital wallet
- `/Users/rejaulkarim/Documents/ReZ Full App/rez-auth-service` - Authentication

**Overall Assessment: Multiple security issues found requiring immediate attention before production launch.**

---

## Critical Issues (Must Fix)

### 1. WebSocket Server Has No Authentication
**Location:** `/Users/rejaulkarim/Documents/rez-intent-graph/src/websocket/server.ts`
**Severity:** CRITICAL
**Status:** Unmitigated

**Finding:**
The WebSocket server accepts connections without any authentication mechanism. Any client can connect to `/ws` and:
- Subscribe to any channel (demand_signals, scarcity_alerts, nudge_events, etc.)
- Filter by merchantId/userId to receive sensitive business intelligence
- Access demand signals for any merchant
- Potentially flood the system with subscriptions

**Evidence:**
```typescript
// Lines 67-84: No auth check in connection handler
this.wss.on('connection', (ws: WebSocket) => {
  const clientId = `client_${++this.clientCounter}`;
  // NO AUTHENTICATION - anyone can connect
```

**Impact:**
- Unauthorized access to real-time business intelligence
- Potential data leakage of merchant demand signals
- DDoS amplification through connection flooding

**Recommendation:**
Implement WebSocket authentication:
1. Require JWT token in connection handshake (via query param or initial message)
2. Validate token before adding client to the server
3. Implement per-connection rate limiting
4. Add connection timeout for unused clients

---

### 2. Merchant Routes Missing Authorization Checks
**Location:** `/Users/rejaulkarim/Documents/rez-intent-graph/src/api/merchant.routes.ts`
**Severity:** CRITICAL
**Status:** Partial mitigation (auth exists but no ownership check)

**Finding:**
The `verifyMerchantAuth` middleware authenticates requests but does NOT verify that the requesting merchant owns the data they're accessing.

```typescript
// Lines 52-96: merchantId comes from URL param, not validated against token
router.get('/:merchantId/demand/dashboard', async (req: Request, res: Response) => {
  const { merchantId } = req.params;  // Attacker-controlled
  // No check that authenticated merchant === merchantId in URL
```

**Impact:**
- **IDOR Vulnerability**: Merchant A can access Merchant B's dashboard data
- Unauthorized access to competitor business intelligence
- Potential extraction of market demand data

**Recommendation:**
1. Extract merchantId from JWT token, not URL
2. Compare extracted merchantId with requested resource
3. Return 403 Forbidden if they don't match

---

## High Issues (Fix Before Launch)

### 3. Redis Fail-Open in Wallet Service Auth
**Location:** `/Users/rejaulkarim/Documents/ReZ Full App/rez-wallet-service/src/middleware/auth.ts`
**Severity:** HIGH
**Status:** Partial (only non-production)

**Finding:**
```typescript
// Lines 74-85
} catch (redisErr) {
  if (process.env.NODE_ENV !== 'production') {
    logger.warn('[AUTH] Redis unavailable — failing open (dev only)');
  } else {
    res.status(503).json({
      success: false,
      message: 'Auth service temporarily unavailable',
      code: 'AUTH_SERVICE_UNAVAILABLE',
    });
```

While this is acceptable for non-production, the fail-open in any environment creates risk during testing/QA where NODE_ENV might not be properly set.

**Recommendation:**
- Default to fail-closed (503) unless explicitly configured for fail-open
- Add explicit environment variable: `ALLOW_AUTH_FAIL_OPEN=true`

---

### 4. Webhook Secret Allows Bypass in Development
**Location:** `/Users/rejaulkarim/Documents/rez-intent-graph/src/api/webhooks.ts`
**Severity:** HIGH

**Finding:**
```typescript
// Lines 18-36
function verifyWebhookSecret(req: Request): boolean {
  const secret = process.env.INTENT_WEBHOOK_SECRET;
  if (!secret) {
    if (process.env.NODE_ENV === 'production') {
      logger.error('[Webhook] Production webhook received but no INTENT_WEBHOOK_SECRET configured');
      return false;
    }
    logger.warn('[Webhook] No webhook secret configured — allowing (dev mode only)');
    return true;  // BYPASS in development
  }
```

**Impact:**
- If NODE_ENV is misconfigured, webhooks bypass authentication
- Webhook endpoints could accept forged requests

**Recommendation:**
1. Require webhook secret in ALL environments
2. Use separate `ALLOW_DEV_BYPASS` flag if needed
3. Log security events to monitoring system

---

### 5. Input Validation Gaps in Intent Routes
**Location:** `/Users/rejaulkarim/Documents/rez-intent-graph/src/api/intent.routes.ts`
**Severity:** HIGH

**Finding:**
```typescript
// Line 53-61: userId from params not validated
router.get('/active/:userId', verifyInternalToken, async (req: Request, res: Response) => {
  const { userId } = req.params;  // No format validation
  const intents = await intentCaptureService.getActiveIntents(userId);
```

While `requireUserOrAuth` validates ObjectId format, several endpoints use `verifyInternalToken` directly without additional validation.

**Recommendation:**
Add explicit ObjectId validation on all userId/merchantId parameters:
```typescript
if (!mongoose.Types.ObjectId.isValid(userId)) {
  return res.status(400).json({ error: 'Invalid userId format' });
}
```

---

## Medium Issues (Fix Within 30 Days)

### 6. Rate Limiting Key Uses Potentially Spoofable Header
**Location:** `/Users/rejaulkarim/Documents/rez-intent-graph/src/middleware/rateLimit.ts`
**Severity:** MEDIUM

**Finding:**
```typescript
// Lines 19-21
keyGenerator: (req) => {
  return (req.headers['x-user-id'] as string) || req.ip || 'unknown';
},
```

The `x-user-id` header can be spoofed by attackers to:
- Evade rate limits by cycling through fake user IDs
- Target specific users with rate limit exhaustion

**Recommendation:**
1. Only use `x-user-id` when validated via authentication
2. Always fall back to IP-based rate limiting
3. Consider adding Redis-based sliding window rate limiting

---

### 7. No CORS Configuration Observed
**Severity:** MEDIUM

**Finding:**
No explicit CORS configuration found in the services examined. Default CORS behavior may allow unauthorized cross-origin requests.

**Recommendation:**
Implement explicit CORS policy:
```typescript
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || [],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-internal-token']
}));
```

---

### 8. Incomplete SQL/NoSQL Injection Protection
**Severity:** MEDIUM

**Finding:**
While MongoDB queries use parameterized queries, some dynamic query construction was observed:

```typescript
// Potential query injection in commerce-memory.routes.ts
const whereClause: Record<string, unknown> = { merchantId };
if (category) whereClause.category = category;  // Unsanitized category
```

**Recommendation:**
1. Validate all user inputs against allowlists
2. Use Zod or similar schema validation on all inputs
3. Audit all dynamic query construction

---

### 9. Missing Security Headers
**Severity:** MEDIUM

**Finding:**
No security headers are configured:
- `X-Content-Type-Options`
- `X-Frame-Options`
- `Content-Security-Policy`
- `Strict-Transport-Security`

**Recommendation:**
Add Helmet.js middleware:
```typescript
import helmet from 'helmet';
app.use(helmet());
```

---

## Low Issues (Nice to Have)

### 10. Error Messages May Leak Information
**Severity:** LOW

**Finding:**
Some error messages are too verbose for production:
```typescript
// Line 42 in intent.routes.ts
console.error('[IntentAPI] Capture failed:', error);  // Full error logged
res.status(500).json({ error: 'Failed to capture intent' });  // Generic message
```

While the HTTP response is generic, full errors are logged.

**Recommendation:**
Sanitize error logs in production, removing sensitive field values.

---

### 11. No Request Size Limits
**Severity:** LOW

**Finding:**
No explicit body size limits on endpoints accepting JSON bodies (e.g., batch webhook capture).

**Recommendation:**
Add body size limits:
```typescript
app.use(express.json({ limit: '1mb' }));
```

---

## Positive Security Findings

The audit also identified several **good security practices**:

1. **JWT Algorithm Constraint**: Payment and wallet services correctly use `{ algorithms: ['HS256'] }` to prevent algorithm confusion attacks (line 40 in payment-service auth.ts)

2. **Timing-Safe Comparison**: Auth middleware uses `crypto.timingSafeEqual` for token comparison (line 24 in auth.ts)

3. **Account Lockout**: Admin login implements account lockout after 5 failed attempts

4. **Token Blacklisting**: Redis-based token blacklist for logout

5. **TOTP Implementation**: Proper RFC 6238 TOTP with backup codes for MFA

6. **Input Validation with Zod**: Wallet routes use Zod schemas for validation

7. **Idempotency Keys**: Payment service implements idempotency for webhook processing

8. **Transaction-based Updates**: Payment and wallet services use MongoDB transactions for critical operations

---

## Recommendations Summary

### Immediate Actions (Before Launch)
1. **Fix WebSocket authentication** - CRITICAL
2. **Fix merchant IDOR vulnerability** - CRITICAL
3. **Remove webhook secret bypass** - HIGH
4. **Add ObjectId validation** - HIGH
5. **Fix Redis fail-open** - HIGH

### Short-term (Within 30 Days)
1. Add CORS configuration
2. Add security headers (Helmet.js)
3. Implement input allowlist validation
4. Fix rate limiting key generator
5. Add request size limits

### Long-term
1. Implement OAuth 2.0 / OpenID Connect
2. Add API key rotation mechanism
3. Implement mutual TLS for service-to-service communication
4. Add comprehensive audit logging
5. Regular penetration testing

---

## Appendix: Affected Files

| File | Issues |
|------|--------|
| `rez-intent-graph/src/websocket/server.ts` | No auth, unlimited connections |
| `rez-intent-graph/src/api/merchant.routes.ts` | IDOR, missing authorization |
| `rez-intent-graph/src/api/webhooks.ts` | Dev mode bypass |
| `rez-intent-graph/src/middleware/rateLimit.ts` | Spoofable rate limit keys |
| `rez-intent-graph/src/middleware/auth.ts` | Trusted header vulnerability |
| `rez-wallet-service/src/middleware/auth.ts` | Fail-open on Redis error |

---

*Report generated: May 2, 2026*
*Auditor: Claude Code Security Review*
