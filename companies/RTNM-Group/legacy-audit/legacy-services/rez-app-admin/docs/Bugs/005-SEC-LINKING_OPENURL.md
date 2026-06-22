---
name: SEC-001 LINKING_OPENURL_NO_VALIDATION
description: Linking.openURL called with server-returned URLs without scheme validation — SSRF and arbitrary URI triggering
type: security
fix_summary: URL validation with isAllowedOpenUrl() — scheme allowlist, hostname blocklist, 500-char limit applied to 6 screens
fixed_date: 2026-04-19
severity: CRITICAL
domain: Security / OWASP A10
status: FIXED
owner: unassigned
created: 2026-04-18
---

## Bug: SEC-001 — Unvalidated Linking.openURL

### Status: OPEN | Severity: CRITICAL | Domain: Security (OWASP A10: Server-Side Request Forgery)

---

### Summary

Server-returned URLs (download links, external links from API) are passed directly to `Linking.openURL()` without URL scheme validation. A compromised or malicious backend could return `tel:`, `sms:`, `javascript:`, or arbitrary app scheme URLs.

### Files Affected

- `app/_layout.tsx:238` — ForceUpdateScreen opens `updateUrl`
- `app/(dashboard)/support-tickets.tsx:851,908` — opens attachment URLs
- `app/(dashboard)/revenue.tsx:389` — opens download URL
- `app/(dashboard)/ugc-moderation.tsx:147` — opens external URLs
- `app/(dashboard)/audit-log.tsx:188` — opens linked URLs
- `app/(dashboard)/rendez.tsx:288` — opens external links
- `app/(dashboard)/prive-campaigns.tsx:240` — opens campaign URLs

### Fix

```typescript
// utils/urlValidation.ts
const ALLOWED_SCHEMES = ['https:', 'http:'];

export function isAllowedUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return ALLOWED_SCHEMES.includes(parsed.protocol);
  } catch {
    return false;
  }
}

// Before any Linking.openURL call:
if (isAllowedUrl(url)) {
  await Linking.openURL(url);
} else {
  logger.warn('[Linking] Blocked disallowed URL scheme:', url);
  showAlert('Cannot Open Link', 'This link type is not supported.');
}
```

### Test Plan

1. Mock a backend response returning `javascript:alert(1)` — should be blocked
2. Mock `tel:+1234567890` — should be blocked
3. Valid `https://example.com/file.pdf` — should open
4. Relative URL `/api/download` — should be blocked (no protocol)
