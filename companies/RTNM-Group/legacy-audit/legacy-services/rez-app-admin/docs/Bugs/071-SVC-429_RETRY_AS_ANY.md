---
name: SVC-008 429_RETRY_AS_ANY_LEAK
description: 429 retry leaks internal _retryCount through options interface using as any — fragile type safety
type: bug
severity: MEDIUM
domain: Cross-Service / Type Safety
status: FIXED
fix_summary: retryCount passed as function parameter — no as any cast needed
fixed_date: 2026-04-19
owner: unassigned
created: 2026-04-19
---

## Bug: SVC-008 — 429 Retry Leaks Internal State Through `as any`

### Status: OPEN | Severity: MEDIUM | Domain: Cross-Service / Type Safety

---

### Summary

The 429 retry mechanism in `apiClient.ts` hides `_retryCount` inside the `options` parameter and uses `as any` to cast it. The internal retry state leaks into the public `RequestOptions` interface, and the recursive call uses `as any` to pass it back. This is fragile — if `options` is `undefined`, the retry state is silently lost.

### Files Affected

- `services/api/apiClient.ts:185-198`

### Root Cause

```typescript
// Line 185-198 — current code:
if (response.status === 429) {
  const retryCount = (options as any)?._retryCount ?? 0;
  if (retryCount < MAX_RETRIES) {
    const delay = Math.random() * 2000; // jitter: 0-2s
    await new Promise(resolve => setTimeout(resolve, delay));
    return this.request<T, B>(
      method,
      endpoint,
      body,
      { ...options, _retryCount: retryCount + 1 } as any // as any leak
    );
  }
}
```

Problems:
1. `_retryCount` is an internal implementation detail that leaks into the public `RequestOptions` type
2. `as any` used on the options spread — any type mismatch is silently ignored
3. `Math.random()` for jitter is acceptable but only 2s max delay may not be enough for 60-second rate-limit windows
4. The recursive `this.request()` call with `as any` bypasses TypeScript error checking

### Fix

Use an internal wrapper instead of leaking state into `options`:

```typescript
// Create an internal-only options type:
interface InternalRequestOptions extends RequestOptions {
  _retryCount?: number;
}

// Store retry state in a closure or WeakMap instead of options:
async request<T, B>(
  method: string,
  endpoint: string,
  body?: B,
  options?: RequestOptions,
  retryCount: number = 0
): Promise<ApiResponse<T>> {
  // ... existing code ...

  if (response.status === 429) {
    if (retryCount < MAX_RETRIES) {
      const baseDelay = parseInt(
        response.headers.get('Retry-After') ?? '1'
      ) * 1000;
      const jitter = Math.random() * Math.min(baseDelay, 5000);
      const delay = Math.max(baseDelay, jitter);
      await new Promise(resolve => setTimeout(resolve, delay));
      return this.request<T, B>(method, endpoint, body, options, retryCount + 1);
    }
  }
}
```

Also use `Retry-After` header from 429 response for more accurate backoff.

### Test Plan

1. Trigger 429 response from any endpoint
2. Before fix: retry count tracked via `as any` — fragile
3. After fix: retry count passed through function parameter, `Retry-After` header respected
4. Build: no `as any` in retry path

---

## Verification

**Confirmed fixed**: apiClient.ts 429 retry uses retryCount as function parameter — no as any leakage
