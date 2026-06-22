---
name: RN-008 ANDROID_PERMISSIONS_MISSING
description: Android manifest missing POST_NOTIFICATIONS, RECEIVE_BOOT_COMPLETED, SCHEDULE_EXACT_ALARM
type: bug
severity: HIGH
domain: React Native / Android
status: FIXED
fixed_date: 2026-04-19
fix_summary: Added POST_NOTIFICATIONS, RECEIVE_BOOT_COMPLETED, and SCHEDULE_EXACT_ALARM to app.json android.permissions array. Runtime notification permission request also added in BUG-009 fix.
owner: unassigned
created: 2026-04-18
---

## Bug: RN-008 — Missing Android Permissions

### Status: OPEN | Severity: HIGH | Domain: React Native / Android

---

### Summary

`app.json` Android permissions only include `INTERNET`, `ACCESS_NETWORK_STATE`, `VIBRATE`. Critical permissions are missing:
- `POST_NOTIFICATIONS` (Android 13+) — push notifications won't work
- `RECEIVE_BOOT_COMPLETED` — scheduled notifications won't survive reboot
- `SCHEDULE_EXACT_ALARM` — precise notification scheduling blocked

### Files Affected

- `app.json` (Android permissions section)

### Root Cause

```json
// app.json — current Android permissions:
"android": {
  "permissions": [
    "INTERNET",
    "ACCESS_NETWORK_STATE",
    "VIBRATE"
  ]
}
```

### Fix

```json
// app.json — add missing permissions:
"android": {
  "permissions": [
    "INTERNET",
    "ACCESS_NETWORK_STATE",
    "VIBRATE",
    "POST_NOTIFICATIONS",
    "RECEIVE_BOOT_COMPLETED",
    "SCHEDULE_EXACT_ALARM"
  ],
  "package": "com.rez.admin"
}
```

Also request `POST_NOTIFICATIONS` at runtime:

```typescript
import * as Notifications from 'expo-notifications';

async function requestNotificationPermission() {
  const { status } = await Notifications.requestPermissionsAsync();
  if (status !== 'granted') {
    showAlert('Notifications Disabled', 'Enable notifications in settings to receive updates.');
  }
}
```

### Test Plan

1. Android 13+ device — install app
2. Push notification should work (requires POST_NOTIFICATIONS)
3. Scheduled notification should persist after device reboot (requires RECEIVE_BOOT_COMPLETED)
