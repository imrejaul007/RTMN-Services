---
name: RN-003 STATUSBAR_CURRENT_HEIGHT_DEPRECATED
description: StatusBar.currentHeight removed in React Native 0.79 — used in 5 files causing incorrect padding on modern devices
type: bug
severity: HIGH
domain: React Native / Expo
status: FIXED
fixed_date: 2026-04-19
fix_summary: Replaced StatusBar.currentHeight usage in 5 files with useSafeAreaInsets() from react-native-safe-area-context. Removed RNStatusBar import, added useSafeAreaInsets import, added insets hook to each component, replaced paddingTop formula from Platform.OS === 'ios' ? 54 : (RNStatusBar.currentHeight || 40) + 10 to Platform.OS === 'ios' ? 54 : insets.top + 10. Files fixed: coin-governor.tsx, trial-approvals.tsx (2x), bundle-management.tsx, campaign-management.tsx, fraud-alerts.tsx.
owner: unassigned
created: 2026-04-18
---

## Bug: RN-003 — StatusBar.currentHeight Deprecated

### Status: OPEN | Severity: HIGH | Domain: React Native

---

### Summary

`StatusBar.currentHeight` was removed in React Native 0.79. The codebase uses it in 5 files to calculate top padding. With `edgeToEdgeEnabled: true` in `app.json`, this returns `0` on modern devices, causing content to be offset by ~50px from the top (incorrect padding instead of using safe area insets).

### Files Affected

- `app/(dashboard)/coin-governor.tsx:559`
- `app/(dashboard)/trial-approvals.tsx:1050, 1412`
- `app/(dashboard)/bundle-management.tsx:713`
- `app/(dashboard)/campaign-management.tsx:594`
- `app/(dashboard)/fraud-alerts.tsx:76`

### Fix

Replace all instances across the 5 files:
```typescript
// OLD:
import { StatusBar as RNStatusBar } from 'expo-status-bar';
paddingTop: Platform.OS === 'ios' ? 54 : (RNStatusBar.currentHeight || 40) + 10,

// NEW:
import { useSafeAreaInsets } from 'react-native-safe-area-context';
const insets = useSafeAreaInsets();
paddingTop: Platform.OS === 'ios' ? 54 : insets.top + 10,
```

### Test Plan

1. iPhone 14 Pro / Pixel 8 (with notch) — header content should be fully visible, not cut off
2. Android with status bar hidden — content should not be offset incorrectly
3. Safe area insets should be respected on all devices
