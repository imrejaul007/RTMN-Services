---
name: RN-002 NOTIFICATION_PERMISSION_MISSING
description: expo-notifications configured but requestPermissionsAsync never called — push notifications fail silently on Android 13+
type: bug
severity: HIGH
domain: React Native / Expo
status: FIXED
fixed_date: 2026-04-19
fix_summary: Added requestNotificationPermission() useEffect in RootLayout that calls Notifications.getPermissionsAsync() and Notifications.requestPermissionsAsync() on app start (non-web only). Permission status is checked before requesting.
owner: unassigned
created: 2026-04-18
---

## Bug: RN-002 — Notification Permission Never Requested

### Status: OPEN | Severity: HIGH | Domain: React Native / Expo

---

### Summary

`expo-notifications` is in the `app.json` plugins but `Notifications.requestPermissionsAsync()` is never called. On Android 13+ (API 33+), runtime notification permission is required. Push notifications silently fail on first use.

### Files Affected

- `app/_layout.tsx` — missing permission request
- `app.json:52-61` — plugin declared but permission not requested

### Fix

```typescript
// In app/_layout.tsx — add to RootLayout useEffect or a dedicated NotificationsManager
import * as Notifications from 'expo-notifications';

async function requestNotificationPermission() {
  const { status: existing } = await Notifications.getPermissionsAsync();
  if (existing === 'granted') return;

  const { status } = await Notifications.requestPermissionsAsync();
  if (status !== 'granted') {
    logger.warn('[Notifications] Permission denied — push notifications disabled');
  }
}
```

Also update `app.json` Android permissions:
```json
"permissions": ["INTERNET", "ACCESS_NETWORK_STATE", "VIBRATE", "POST_NOTIFICATIONS"]
```

### Test Plan

1. Android 13+ device — fresh install, try to send push notification
2. Before fix: notification silently fails
3. After fix: permission prompt appears, notification delivers
