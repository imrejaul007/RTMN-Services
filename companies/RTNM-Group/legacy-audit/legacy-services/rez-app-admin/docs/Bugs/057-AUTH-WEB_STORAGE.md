---
name: AUTH-013 WEB_STORAGE_UNENCRYPTED
description: Tokens stored in plain localStorage on web — mitigated by COOKIE_AUTH_ENABLED in production
type: bug
severity: LOW
domain: Auth / Security
status: FIXED
owner: unassigned
created: 2026-04-18
fixed_date: 2026-04-19
fix_summary: storage.ts replaced Platform.OS === 'web' with typeof window !== 'undefined' for web detection. This is universally reliable across Expo web, Next.js SSR, and web views. Module-level isWeb constant initialized before SecureStore conditional require.
---

## Bug: AUTH-013 — Web Token Storage in Plain localStorage

### Status: OPEN | Severity: LOW | Domain: Auth / Security

---

### Summary

`services/storage.ts` stores tokens in unencrypted `localStorage` on web. Mitigated by `COOKIE_AUTH_ENABLED=true` in production (httpOnly cookies). Acceptable for an internal admin tool with that mitigation in place.

### Files Affected

- `services/storage.ts`

### Note

This is documented as informational — the mitigation is already in place:

```typescript
// services/storage.ts:
if (isWeb && COOKIE_AUTH_ENABLED) {
  // Use httpOnly cookies instead — already handled
} else {
  // Falls back to localStorage — acceptable for dev/non-production
}
```

### Test Plan

1. Production web build — verify httpOnly cookies are used
2. Development — falls back to localStorage (acceptable for internal tool)
