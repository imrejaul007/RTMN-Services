---
name: RN-007 ANIMATABLE_NEW_ARCH_INCOMPATIBLE
description: react-native-animatable v1.4.0 incompatible with New Architecture — animations silently fail
type: bug
severity: HIGH
domain: React Native / Architecture
status: FIXED
fixed_date: 2026-04-19
fix_summary: NOT A CODE BUG — No source files import react-native-animatable anywhere in the codebase. The package is in dependencies but unused. Recommendation: remove react-native-animatable from package.json dependencies to reduce bundle size. New Architecture compatibility is irrelevant since the library is not used.
owner: unassigned
created: 2026-04-18
---

## Bug: RN-007 — `react-native-animatable` Incompatible with New Architecture

### Status: OPEN | Severity: HIGH | Domain: React Native / Architecture

---

### Summary

`newArchEnabled: true` in `app.json` but `react-native-animatable` v1.4.0 only supports the legacy bridge. Animations silently fail on New Architecture devices (iPhone 15 Pro, Pixel 8, etc.) with no error.

### Files Affected

- `package.json` / `app.json`
- All components using `react-native-animatable`

### Root Cause

```json
// app.json
{
  "expo": {
    "newArchEnabled": true
  }
}
```
`react-native-animatable` uses the old bridge architecture — not compatible with Fabric.

### Fix

Replace `react-native-animatable` with `react-native-reanimated` throughout:

```typescript
// BEFORE (animatable):
import Animated, { FadeIn, SlideInDown } from 'react-native-animatable';

// AFTER (reanimated):
import Animated, { FadeIn, SlideInDown } from 'react-native-reanimated';
```

Then update `babel.config.js` to include the reanimated plugin:

```javascript
module.exports = {
  presets: ['babel-preset-expo'],
  plugins: ['react-native-reanimated/plugin'], // must be last
};
```

### Test Plan

1. iPhone 15 Pro (New Architecture) — run animations
2. Before fix: animations don't play
3. After fix: animations play correctly
