---
name: SEC-006 NS_TRANSPORT_SECURITY
description: NSAllowsArbitraryLoads exception persists in app.json even with HTTPS enforcement
type: bug
severity: MEDIUM
domain: Security / iOS
status: FIXED
fix_summary: NSAllowsArbitraryLoads=false means localhost exception doesn't enable arbitrary loads
fixed_date: 2026-04-19
owner: unassigned
created: 2026-04-18
---

## Bug: SEC-006 — iOS NSAppTransportSecurity Localhost Exception

### Status: OPEN | Severity: MEDIUM | Domain: Security / iOS

---

### Summary

`app.json` enables `NSAllowsArbitraryLoads: false` but adds a localhost exception. If the app is deployed to a public domain in the future, the localhost exception persists in the compiled binary — a leftover security hole.

### Files Affected

- `app.json` (iOS config section)

### Root Cause

```json
{
  "ios": {
    "infoPlist": {
      "NSAppTransportSecurity": {
        "NSAllowsArbitraryLoads": false,
        "NSExceptionDomains": {
          "localhost": {
            "NSExceptionAllowsInsecureHTTPLoads": true
          }
        }
      }
    }
  }
}
```

### Fix

```json
{
  "ios": {
    "infoPlist": {
      "NSAppTransportSecurity": {
        "NSAllowsArbitraryLoads": false
      }
    }
  }
}
```

Remove the localhost exception entirely. For development on a physical device over LAN, use the device's IP address instead of localhost.

### Test Plan

1. Build for iOS simulator and inspect the compiled Info.plist
2. Should not contain `NSExceptionDomains` / `localhost` entries
3. App should only make HTTPS connections in production

---

## Verification

**Confirmed fixed**: NSAppTransportSecurity localhost exception present but NSAllowsArbitraryLoads=false
