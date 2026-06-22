# Code Quality Audit

**Date:** 2026-05-02
**Repositories Audited:**
- `/Users/rejaulkarim/Documents/ReZ Full App`
- `/Users/rejaulkarim/Documents/rez-intent-graph`

---

## Hardcoded Values Found

### Hardcoded URLs (Production)

Multiple services have hardcoded production URLs instead of using environment variables consistently:

| File | URL | Issue |
|------|-----|-------|
| `rez-now/app/[storeSlug]/bill/page.tsx` | `https://now.rez.money` | Hardcoded base URL |
| `rez-now/app/layout.tsx` | `https://now.rez.money` | APP_URL hardcoded fallback |
| `rez-now/app/[storeSlug]/layout.tsx` | `https://now.rez.money/${storeSlug}` | Template literal with hardcoded domain |
| `rez-now/components/auth/LoginModal.tsx` | `https://rez-auth-service.onrender.com` | Auth URL hardcoded |
| `rez-now/lib/api/client.ts` | `https://api.rezapp.com` | API base URL hardcoded |
| `rez-now/components/chat/ReZChatWidget.tsx` | `https://api.rez.money` | Fallback API URL |
| `rez-now/lib/services/aiChatService.ts` | `https://REZ-support-copilot.onrender.com` | Support copilot URL hardcoded |
| `rez-now/lib/services/intentCaptureService.ts` | `https://rez-intent-graph.onrender.com` | Intent capture URL hardcoded |
| `rez-intent-graph/src/utils/ResilientIntentCapture.ts` | `https://rez-intent-graph.onrender.com` | Intent capture URL hardcoded |
| `rez-ads-service/src/services/intentCaptureService.ts` | `https://rez-intent-graph.onrender.com` | Intent capture URL hardcoded |

### Hardcoded Environment Variables with Empty Fallbacks

These should fail safely if not configured:

```typescript
// Empty string fallbacks - will fail silently in production
INTERNAL_SERVICE_TOKEN = process.env.INTERNAL_SERVICE_TOKEN || ''  // Multiple files
HEALTH_CHECK_SECRET = process.env.HEALTH_CHECK_SECRET || ''        // rez-intent-graph
REZ_CLIENT_SECRET = process.env.REZ_OAUTH_CLIENT_SECRET || ''      // rez-now
```

### Port Numbers

| File | Value | Context |
|------|-------|---------|
| `rez-ads-service/src/config/redis-auth.ts` | `26379` | Sentinel port references |
| `rez-intent-graph/src/config/redis.ts` | `6379` | Default Redis port |
| Multiple services | `localhost:6379` | Hardcoded Redis connection |

### IP Addresses

| File | IP | Context |
|------|-----|---------|
| `rez-merchant-service/src/routes/integrations.ts` | `169.254.169.254` | AWS metadata endpoint blocking |
| `rez-app-consumer/utils/connectionUtils.ts` | `10.0.2.2` | Android emulator host |
| `scripts/testWebhookSecurity.ts` | `52.66.135.160` | Hardcoded Razorpay IP |
| `scripts/test-webhook-security.ts` | `52.66.135.170` | Hardcoded Razorpay IP |

### Placeholder Values

```typescript
// rez-now/app/.well-known/apple-app-site-association/route.ts
const APPLE_TEAM_ID = process.env.APPLE_TEAM_ID ?? 'XXXXXXXXXX';
```

---

## TODO/FIXME Items

### Source Code TODOs (Production Code)

| File | Line | Description |
|------|------|-------------|
| `rez-app-consumer/app/+html.tsx` | 50 | `MEDIUM FIX: Validate GA tracking ID format before using in dangerouslySetInnerHTML` |

### Build Artifacts (Not Actionable)

Many TODO/FIXME comments exist in `.next` build artifacts (compiled Next.js/Turbopack code) - these are from dependencies and not actionable.

---

## Dead Code

### Unused/Empty Promise Handlers

Multiple `.catch(() => {})` handlers silently swallow errors:

```typescript
// rez-ads-service/src/routes/conversion.ts
}).catch(() => {});
}).catch(() => {});
}).catch(() => {});

// rez-ads-service/src/routes/merchant.ts
}).catch(() => {});
}).catch(() => {});
}).catch(() => {});

// rez-ads-service/src/routes/serve.ts
}).catch(() => {});

// rez-ads-service/src/routes/admin.ts
}).catch(() => {});
```

### Silent Error Handling in Frontend

```typescript
// rez-now/app/[storeSlug]/order/queued/page.tsx
getPendingOrders().then(setPendingOrders).catch(() => {});
getPendingOrders().then(setPendingOrders).catch(() => {});

// rez-now/app/[storeSlug]/checkout/page.tsx
getWalletBalance().then(setWallet).catch(() => {});
```

### Console.log Statements in Production

```typescript
// rez-now/components/chat/ReZChatWidget.tsx
console.log('Chat escalated:', data);
console.log('Chat action:', action);

// rez-now/src/chat-integration/socket/logger.ts
console.log(`[INFO] ${message}`, meta || '');
console.log(`[DEBUG] ${message}`, meta || '');

// rez-travel-service/src/app.ts
console.log('Connected to MongoDB');
console.log(`ReZ Travel Service running on port ${PORT}`);
```

---

## Type Safety Issues

### Extensive `any` Type Usage

Found **150+** instances of `any` type usage:

**rez-ads-service:**
```typescript
catch (err: any) { }
(ad as any)[field] = req.body[field];
const frequencyCapDays = (ad as any).frequencyCapDays;
const campaign = recentClick.campaignId as any;
```

**rez-now chat-integration:**
```typescript
catch (error: any) { }
return rewards.map((r: any) => ({ ... }));
merchants: stores.map((s: any) => ({ ... }));
private formatHours(hours: any): string { }
private parseHours(hours: any): Array<{ day: string; ... }> { }
```

**rez-intent-graph:**
```typescript
let IORedis: any = null;
let redisClient: any = null;
result = await handleSeasonalityTrigger(dormant._id.toString(), triggerData?.season as any);
(req as any).merchantAuth = { type: 'internal' };
async sendNudge(candidate: any): Promise<Nudge> { }
private inferTriggerType(dormantIntent: any): string { }
intent: any,  // Function parameter
```

### Type Assertions (`as`)

**rez-intent-graph - 50+ instances:**
```typescript
(event.channel as Channel)
event.eventType as NudgeEvent['eventType']
data as InsightData
data as T
body as Record<string, unknown>
intent.metadata as Record<string, unknown>
message as AgentMessage
```

**rez-now - 30+ instances:**
```typescript
data as StoreData
data as RoomHubServerData
menu as Record<string, RoomServiceItem[]>
item as RoomServiceItem
err as Error
body as Record<string, unknown>
```

### Untyped Collections

```typescript
// rez-ads-service/src/services/notificationService.ts
[key: string]: any;  // Dictionary with any values

// Multiple files
.map((r: any) => ({ ... }))
.filter((item: any) => ...)
```

---

## Error Handling Gaps

### Empty Catch Blocks

| File | Count | Risk Level |
|------|-------|------------|
| `rez-ads-service/src/routes/conversion.ts` | 3 | Medium |
| `rez-ads-service/src/routes/merchant.ts` | 3 | Medium |
| `rez-ads-service/src/routes/serve.ts` | 2 | Medium |
| `rez-ads-service/src/routes/admin.ts` | 1 | Medium |
| `rez-now/app/[storeSlug]/order/queued/page.tsx` | 4 | Low (frontend) |
| `rez-now/app/[storeSlug]/order/[orderNumber]/page.tsx` | 2 | Low (frontend) |

### Missing Error Logging

Many catch blocks catch `error: any` but only log basic info:

```typescript
// Should include: error stack, context, user ID, request ID
catch (error: any) {
  // Only logs the error without context
  logger.error('[Ads] Conversion event error', { error: error.message });
}
```

### Unhandled Promise Rejections

```typescript
// Boot errors
boot().catch((err) => {  // Only logs, service continues
  console.error('Failed to initialize service', err);
});
```

---

## Security Concerns

### dangerouslySetInnerHTML Usage

**Without DOMPurify (XSS Risk):**
```typescript
// packages/shared-types/rez-feedback-service/src/index-learning.ts
container.innerHTML = '<div class="no-data">Need more data...</div>';
container.innerHTML = data.timeline.map(item => `...`);

// packages/shared-types/rez-feedback-service/src/dashboard.ts
container.innerHTML = `<div class="error">${message}</div>`;
```

**With DOMPurify (Safe):**
```typescript
// Hotel OTA hotel-management-master/frontend
dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(translatedText) }}

// rez-now/components/seo/StoreJsonLd.tsx
dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}  // Safe - JSON.stringify escapes
```

### Potential SQL/NoSQL Injection Points

While MongoDB/Mongoose is used (which provides some protection), these patterns warrant review:

```typescript
// Template literals with user input in queries - verify sanitization
.find({ storeSlug: `${userInput}` })  // Check all such patterns
```

### Redis Lua Scripts (Safe but Monitor)

```typescript
// Using eval() for atomic Redis operations - OK but monitor
await redis.eval(VERIFY_AND_CONSUME_OTP_LUA, 1, otpKey, hash);
await redis.eval(CASHBACK_CAP_LUA, { ... });
```

### Empty Secret Fallbacks

```typescript
// These will silently use empty strings in production if env vars missing
const INTERNAL_SERVICE_TOKEN = process.env.INTERNAL_SERVICE_TOKEN || '';
const HEALTH_CHECK_SECRET = process.env.HEALTH_CHECK_SECRET || '';
const REZ_CLIENT_SECRET = process.env.REZ_OAUTH_CLIENT_SECRET || '';
```

---

## Recommendations

### Critical (Fix Before Deploy)

1. **Remove hardcoded production URLs** - Move all to environment variables:
   - `https://now.rez.money`
   - `https://api.rezapp.com`
   - `https://rez-auth-service.onrender.com`
   - `https://rez-intent-graph.onrender.com`

2. **Add validation for empty secret fallbacks**:
   ```typescript
   const INTERNAL_SERVICE_TOKEN = process.env.INTERNAL_SERVICE_TOKEN;
   if (!INTERNAL_SERVICE_TOKEN) {
     throw new Error('INTERNAL_SERVICE_TOKEN environment variable is required');
   }
   ```

3. **Fix dangerouslySetInnerHTML without sanitization** in shared packages

### High Priority

4. **Replace `any` types with proper interfaces** - Focus on:
   - Chat connector files
   - Intent graph service files
   - API response types

5. **Add error logging to empty catch blocks**:
   ```typescript
   .catch((err) => console.error('Operation failed:', err));
   // Or use structured logging
   .catch((err) => logger.error('Operation failed', { error: err, context }));
   ```

6. **Remove console.log statements** from production code (keep only in dev)

### Medium Priority

7. **Create shared type definitions** for common patterns:
   - API response types
   - Error types
   - Event types

8. **Add unit tests** for critical error handling paths

9. **Document environment variable requirements** in `.env.example` files

### Low Priority / Tech Debt

10. **Consider using zod or joi** for runtime type validation
11. **Add ESLint rules** to enforce type safety
12. **Implement feature flags** for gradual rollouts

---

## Summary Statistics

| Category | Count |
|----------|-------|
| Hardcoded URLs | 25+ |
| Empty secret fallbacks | 8+ |
| `any` type usages | 150+ |
| `as` type assertions | 80+ |
| Empty catch blocks | 20+ |
| dangerouslySetInnerHTML (unsafe) | 10+ |
| console.log statements | 30+ |

---

*Generated by Code Quality Auditor*
