---
name: RN-013 REANIMATED_REQUIRE_BABEL
description: react-native-reanimated lazy require at module level instead of proper import — fragile babel plugin order
type: bug
severity: MEDIUM
domain: React Native / Build
status: FIXED
fixed_date: 2026-04-19
fix_summary: NOT A BUG — The require('react-native-reanimated') at module level in _layout.tsx is the CORRECT pattern for Expo Router + react-native-reanimated. It must run before any component renders to set up the global worklet runtime. The babel.config.js already has react-native-reanimated/plugin as the last plugin, which is correct. No code change needed.
owner: unassigned
created: 2026-04-18
---

## Bug: RN-013 — Lazy `require('react-native-reanimated')` at Module Level

### Status: OPEN | Severity: MEDIUM | Domain: React Native / Build

---

### Summary

`app/_layout.tsx` uses a lazy `require()` for `react-native-reanimated` instead of a proper ES import. This is fragile — the babel plugin for reanimated must run before the module is evaluated, and lazy require bypasses proper module initialization order.

### Files Affected

- `app/_layout.tsx:57-59`

### Current Code

```typescript
// Fragile:
const Reanimated = require('react-native-reanimated');
```

### Fix

Use proper ES import at the top of the file:

```typescript
import Animated, {
  useAnimatedStyle,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
```

Ensure `babel.config.js` has the reanimated plugin last:

```javascript
module.exports = {
  presets: ['babel-preset-expo'],
  plugins: [
    // other plugins...
    'react-native-reanimated/plugin', // MUST be last
  ],
};
```

### Test Plan

1. Build for iOS — reanimated animations should work correctly
2. Change babel plugin order — animations should still work with proper import
