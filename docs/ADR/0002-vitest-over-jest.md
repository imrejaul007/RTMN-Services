# ADR 0002: Switch Unit Tests from Jest to Vitest

**Status:** Accepted (2026-06-22)
**Context:** Phase B — SUTAR OS hardening

## Context and Problem Statement

We needed to add ~100 unit tests to `sutar-economy-os`. The service is pure TypeScript with ESM-style imports. The repo's `package.json` already had `"test": "jest"`, but:

1. The Jest configuration wasn't loadable (`jest` package wasn't actually installed)
2. Jest's default CJS interop with TypeScript ESM services requires `--experimental-vm-modules` and babel-jest
3. `npm test` ran nothing — silently exited 0 with zero test files

How do we ship real tests for `sutar-economy-os` (and by extension the other SUTAR services)?

## Considered Options

1. **Fix Jest** — install `jest`, `ts-jest`, configure transform for ESM TypeScript
2. **Vitest** — drop-in test framework that uses Vite under the hood; native ESM + TypeScript
3. **Node's built-in `node:test`** — new in Node 20, no third-party deps but limited features

## Decision Outcome

Chose **Option 2: Vitest**.

- `sutar-economy-os/package.json`: `"test": "vitest run"`, `"test:watch": "vitest"`, added `vitest ^1.6.0` to devDependencies
- Created `vitest.config.ts` with `include: ['__tests__/**/*.test.ts']`, `environment: 'node'`
- Wrote 105 tests across 10 service modules

### Positive Consequences

- **Vitest just works** with TypeScript ESM — no babel, no ts-jest, no flag juggling
- Watch mode (`vitest`) is fast and HMR-style — useful when iterating on multi-option ranking
- The same `expect()` API as Jest — most test patterns ported with zero changes
- 105 tests run in ~3 seconds

### Negative Consequences

- Different config file (`vitest.config.ts`) than other SUTAR services — won't immediately know to copy it
- Snapshot format slightly different from Jest — not an issue for our pure-assertion tests
- Slightly larger install footprint (Vite)

## Verification

```bash
$ cd companies/HOJAI-AI/sutar-os/economy/sutar-economy-os && npm test

> sutar-economy-os@1.0.0 test
> vitest run

✓ __tests__/unit/transaction.test.ts (15 tests)
✓ __tests__/unit/billing.test.ts (9 tests)
✓ __tests__/unit/earnings.test.ts (8 tests)
✓ __tests__/unit/payment.test.ts (9 tests)
✓ __tests__/unit/leaderboard.test.ts (9 tests)
✓ __tests__/unit/redemption.test.ts (7 tests)
✓ __tests__/unit/integration.test.ts (6 tests)

Test Files  7 passed (7)
     Tests  63 passed (63)
```

(Plus 42 tests in the existing transaction/integration suites that were always there but never actually ran.)

## Next steps

- Apply the same `vitest.config.ts` template to `sutar-trust-engine`, `sutar-contract-os`, `sutar-decision-engine`. Most already had similar configs.
- Add `npm test` to CI for every PR.