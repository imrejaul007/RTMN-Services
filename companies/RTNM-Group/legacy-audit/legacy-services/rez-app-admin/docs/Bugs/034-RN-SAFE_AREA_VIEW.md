---
name: RN-009 SAFE_AREA_VIEW_MISSING
description: 3 main screens missing SafeAreaView — content renders under notch on notched devices
type: bug
severity: HIGH
domain: React Native / UI
status: FIXED
fixed_date: 2026-04-19
fix_summary: Wrapped main return of settings.tsx, merchants.tsx, and orders.tsx with SafeAreaView (edges=['top']) and KeyboardAvoidingView (behavior: padding on iOS, height on Android). Added imports for SafeAreaView from react-native-safe-area-context and KeyboardAvoidingView/Platform from react-native.
owner: unassigned
created: 2026-04-18
---

## Bug: RN-009 — Missing SafeAreaView on 3 Screens

### Status: OPEN | Severity: HIGH | Domain: React Native / UI

---

### Summary

`settings.tsx`, `merchants.tsx`, and `orders.tsx` use `ScrollView` with `TextInput` fields but no `SafeAreaView`. Content renders under the notch and home indicator on notched devices (iPhone 14 Pro, etc.).

### Files Affected

- `app/(dashboard)/settings.tsx`
- `app/(dashboard)/merchants.tsx`
- `app/(dashboard)/orders.tsx`

### Root Cause

```typescript
// Current:
export default function OrdersScreen() {
  return (
    <ScrollView>
      {/* content renders under notch */}
    </ScrollView>
  );
}

// Fixed:
import { SafeAreaView } from 'react-native-safe-area-context';

export default function OrdersScreen() {
  return (
    <SafeAreaView edges={['top']} style={{ flex: 1 }}>
      <ScrollView>
        {/* content respects safe area */}
      </ScrollView>
    </SafeAreaView>
  );
}
```

### Test Plan

1. iPhone 14 Pro / any notched device — open Settings screen
2. Before fix: top content is cut off by the notch/dynamic island
3. After fix: all content is fully visible below the safe area
