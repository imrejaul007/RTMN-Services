---
name: RN-010 KEYBOARD_AVOIDING_VIEW_MISSING
description: 3 main screens missing KeyboardAvoidingView — keyboard covers form inputs on these screens
type: bug
severity: HIGH
domain: React Native / UI
status: FIXED
fixed_date: 2026-04-19
fix_summary: Fixed as part of BUG-034 fix. Added KeyboardAvoidingView with Platform-specific behavior (padding on iOS, height on Android) to settings.tsx, merchants.tsx, and orders.tsx.
owner: unassigned
created: 2026-04-18
---

## Bug: RN-010 — Missing KeyboardAvoidingView

### Status: OPEN | Severity: HIGH | Domain: React Native / UI

---

### Summary

`settings.tsx`, `merchants.tsx`, and `orders.tsx` have multiple `TextInput` fields but no `KeyboardAvoidingView`. When the keyboard opens, it covers form inputs — users cannot see what they're typing.

### Files Affected

- `app/(dashboard)/settings.tsx`
- `app/(dashboard)/merchants.tsx`
- `app/(dashboard)/orders.tsx`

### Root Cause

Forms have multiple TextInput fields but no keyboard-dodging behavior.

### Fix

```typescript
import { KeyboardAvoidingView, Platform } from 'react-native';

export default function OrdersScreen() {
  return (
    <SafeAreaView edges={['top']} style={{ flex: 1 }}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView keyboardShouldPersistTaps="handled">
          <TextInput placeholder="Order ID" />
          <TextInput placeholder="Customer Name" />
          {/* ... */}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
```

### Test Plan

1. Open Settings screen on any device
2. Tap on a form field — keyboard should push content up so the field is visible
3. Before fix: keyboard covers the input
4. After fix: input is visible above the keyboard
