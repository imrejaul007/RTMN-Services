---
name: RN-005 UPDATES_NO_LISTENERS
description: expo-updates configured but no event listeners — forced updates silently fail to apply
type: bug
severity: HIGH
domain: React Native / Updates
status: FIXED
fixed_date: 2026-04-19
fix_summary: Added Updates.addListener useEffect in RootLayout that handles UPDATE_AVAILABLE, UPDATE_FINISHED, and ERROR events. Also calls Updates.checkForUpdateAsync() on mount and fetches updates when available. Non-web only.
owner: unassigned
created: 2026-04-18
---

## Bug: RN-005 — expo-updates Configured But Not Wired

### Status: OPEN | Severity: HIGH | Domain: React Native / Updates

---

### Summary

`expo-updates` v0.26.0 is in `app.json` plugins and `package.json`, but no `Updates.addListener` or `useUpdates()` hook is set up. When a forced update is deployed, the app silently continues running the old bundle.

### Files Affected

- `app/_layout.tsx`

### Root Cause

```typescript
// app.json has expo-updates plugin configured, but:
import * as Updates from 'expo-updates';
// ... never imported or used anywhere
```

### Fix

```typescript
// In app/_layout.tsx:
import * as Updates from 'expo-updates';

useEffect(() => {
  const subscription = Updates.addListener((event) => {
    if (event.update === true) {
      // New update downloaded — show prompt
      showUpdatePrompt();
    }
  });

  // Check for updates on mount
  async function checkForUpdates() {
    try {
      const update = await Updates.checkForUpdateAsync();
      if (update.isAvailable) {
        await Updates.fetchUpdateAsync();
        // Update downloaded — will apply on next restart
        showUpdatePrompt();
      }
    } catch (error) {
      logger.error('[Updates]', error);
    }
  }

  checkForUpdates();
  return () => subscription.remove();
}, []);
```

### Test Plan

1. Deploy a new OTA update via EAS Update
2. Before fix: app continues running old bundle with no notification
3. After fix: app detects update, downloads it, and prompts user to restart
