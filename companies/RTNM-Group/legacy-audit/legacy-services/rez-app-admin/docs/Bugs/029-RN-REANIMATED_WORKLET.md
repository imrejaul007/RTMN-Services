---
name: RN-004 REANIMATED_WORKLET_DIRECTIVE
description: useAnimatedStyle used without 'worklet' directive — animations run on JS thread instead of UI thread
type: bug
severity: HIGH
domain: React Native / Animation
status: FIXED
fixed_date: 2026-04-19
fix_summary: Added 'worklet'; directive as first line inside useAnimatedStyle callback in AnimatedPressable.tsx and PrimaryButton.tsx. Also fixed useNativeDriver: false to true in OfflineBanner.tsx for smooth UI-thread animations.
owner: unassigned
created: 2026-04-18
---

## Bug: RN-004 — Missing `worklet` Directive on Animated Styles

### Status: OPEN | Severity: HIGH | Domain: React Native / Animation

---

### Summary

`useAnimatedStyle` in `AnimatedPressable.tsx` and `PrimaryButton.tsx` is called without the `'worklet'` directive. Animations run on the JS thread instead of the UI thread, causing jank and potential frame drops on complex screens.

### Files Affected

- `components/ui/AnimatedPressable.tsx:105`
- `components/ui/PrimaryButton.tsx:153`

### Root Cause

```typescript
// WRONG:
const animatedStyle = useAnimatedStyle(() => ({
  opacity: pressed.value ? 0.7 : 1,
}));

// CORRECT:
const animatedStyle = useAnimatedStyle(() => {
  'worklet';
  return {
    opacity: pressed.value ? 0.7 : 1,
  };
}, []);
```

### Fix

Add `'worklet';` as the first line inside the `useAnimatedStyle` callback function.

### Test Plan

1. Press buttons rapidly on a screen with AnimatedPressable and PrimaryButton
2. Before fix: janky animations on JS-thread-bound components
3. After fix: smooth 60fps animations on UI thread
