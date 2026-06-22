---
name: BUILD-001 JEST_CONFIG_BROKEN
description: All 28 test suites fail — jest.config references expo/tsconfig.base which cannot be resolved
type: bug
fix_summary: tsconfig.base.json created, tsconfig.json updated, expo-constants mock added — 174 tests passing
fixed_date: 2026-04-19
severity: CRITICAL
domain: Build / Tests
status: FIXED
owner: unassigned
created: 2026-04-18
---

## Bug: BUILD-001 — All 28 Test Suites Fail

### Status: OPEN | Severity: CRITICAL | Domain: Build / Tests

---

### Summary

`jest.config.js` references `expo/tsconfig.base` which cannot be resolved at runtime. Every test file fails immediately on import — the entire test suite is dead. 28 test suites produce 0 passing tests.

### Files Affected

- `jest.config.js`
- `tsconfig.json`
- `__tests__/services/*.test.ts` (14 files)
- `__tests__/globals.ts`
- `__tests__/setup.ts`

### Root Cause

```javascript
// jest.config.js:
module.exports = {
  preset: 'jest-expo',
  roots: ['<rootDir>'],
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?)|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@sentry/react-native|native-base|react-native-svg)',
  ],
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx'],
  collectCoverageFrom: ['**/*.{ts,tsx}', '!**/node_modules/**'],
};
```

The `tsconfig.json` extends `expo/tsconfig.base` which Expo provides at build time but not at test runtime.

### Fix

Create a test-specific `tsconfig.json`:

```json
// tsconfig.json (test config):
{
  "extends": "expo/tsconfig.base",
  "compilerOptions": {
    "strict": true,
    "jsx": "react-native",
    "module": "commonjs",
    "target": "esnext",
    "moduleResolution": "node",
    "allowSyntheticDefaultImports": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "resolveJsonModule": true
  },
  "include": ["**/*.ts", "**/*.tsx"],
  "exclude": ["node_modules"]
}
```

Or install `jest-expo` and ensure it's properly configured:

```bash
npm install --save-dev jest-expo @types/jest
```

And create `jest.setup.js`:

```javascript
// jest.setup.js
import '@testing-library/jest-native/extend-expect';

// Mock expo modules
jest.mock('expo-status-bar', () => ({
  StatusBar: 'StatusBar',
}));

jest.mock('react-native/Libraries/Animated/NativeAnimatedHelper');
```

### Test Plan

1. `npm test` runs all 28 test suites
2. Tests pass (or fail with meaningful error messages, not config failures)
3. Test coverage report generated
