---
name: RN-012 OFFLINE_BANNER_ANIMATED_TIMING
description: OfflineBanner uses Animated.timing with useNativeDriver false for opacity — JS thread animation
type: bug
severity: MEDIUM
domain: React Native / Animation
status: FIXED
fixed_date: 2026-04-19
fix_summary: Changed OfflineBanner animation from useState(new Animated.Value(0)) to useRef(new Animated.Value(0)).current for correct Animated.Value lifecycle management. Also changed useNativeDriver: false to useNativeDriver: true for smooth UI-thread animations instead of JS-thread animations.
owner: unassigned
created: 2026-04-18
---

## Bug: RN-012 — OfflineBanner Animation on JS Thread

### Status: OPEN | Severity: MEDIUM | Domain: React Native / Animation

---

### Summary

`components/ui/OfflineBanner.tsx:60` uses `Animated.timing` with `useNativeDriver: false` for opacity animation. This runs on the JS thread instead of the UI thread, causing jank on lower-end devices.

### Files Affected

- `components/ui/OfflineBanner.tsx:60`

### Fix

```typescript
// BEFORE:
Animated.timing(animValue, {
  toValue: 1,
  duration: 300,
  useNativeDriver: false, // JS thread — janky
}).start();

// AFTER:
Animated.timing(animValue, {
  toValue: 1,
  duration: 300,
  useNativeDriver: true, // UI thread — smooth
}).start();
```

`useNativeDriver: true` works for opacity and transform animations.

### Test Plan

1. Show/hide offline banner on a low-end Android device
2. Before fix: janky animation
3. After fix: smooth 60fps animation
