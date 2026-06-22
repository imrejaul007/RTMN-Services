---
name: RN-001 GESTUREHANDLER_NOT_WRAPPED
description: GestureHandlerRootView never wraps the app — all gesture-handler components crash on iOS with RNSScreen UIManager error
type: bug
severity: CRITICAL
domain: React Native / Expo
status: FIXED
fixed_date: 2026-04-19
fix_summary: Wrapped RootLayout return with GestureHandlerRootView from react-native-gesture-handler. Also added SafeAreaView and Notifications imports. Root now: GestureHandlerRootView > ErrorBoundary > QueryClientProvider > ThemeProvider > AdminThemeProvider > AuthProvider > AuthGuardedLayout.
owner: unassigned
created: 2026-04-18
---

## Bug: RN-001 — GestureHandlerRootView Missing

### Status: OPEN | Severity: CRITICAL | Domain: React Native

---

### Summary

`react-native-gesture-handler` v2.24.0 is installed but `GestureHandlerRootView` is never used to wrap the app. On iOS, all gesture-handler components (Swipeable, BottomSheet, gesture hooks) throw: `Invariant Violation: requireNativeComponent: "RNSScreen" was not found in the UIManager`. On Android, gestures are unresponsive.

### Files Affected

- `app/_layout.tsx` — root layout, missing wrapper
- `App.tsx` — entry point, missing wrapper
- Any file using `Swipeable`, `BottomSheet`, `DrawerLayout`, or gesture hooks

### Fix

```typescript
// app/_layout.tsx — add import
import { GestureHandlerRootView } from 'react-native-gesture-handler';

// In RootLayout return statement:
return (
  <GestureHandlerRootView style={{ flex: 1 }}>
    <ErrorBoundary>
      {/* existing app tree */}
    </ErrorBoundary>
  </GestureHandlerRootView>
);
```

### Test Plan

1. iOS Simulator — render a Swipeable list row → should not throw "RNSScreen not found"
2. Android device — swipe gestures should work in FlatLists
3. BottomSheet components (if any) should open/close properly
