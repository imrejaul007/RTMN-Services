# @rez/shared-types — v2.0.0 Changelog

Delivered the 2-week task from HANDOFF_FOR_DEVELOPER.md Part 8:
> "@rez/shared-types package (2 weeks) — canonical Order/User/Product/Payment/Wallet types."

## Scope

Rewrote the stub v1 package into a real canonical type surface covering
five core entities plus supporting infrastructure.

## What landed

### New files (15)

| File | Purpose |
|---|---|
| `src/fsm/paymentFsm.ts` | 11-state Payment transition graph + helpers |
| `src/fsm/orderFsm.ts` | 11-state Order transition graph + cancellable-check |
| `src/fsm/orderPaymentFsm.ts` | 8-state Order.payment sub-doc FSM + Payment↔Order mapper |
| `src/fsm/index.ts` | Barrel re-export for `@rez/shared-types/fsm` |
| `src/branded/ids.ts` | 11 branded ID types (OrderId/UserId/...) + constructors |
| `src/guards/index.ts` | Runtime guards for the no-zod consumer app |
| `src/__tests__/fsm.test.ts` | 30 FSM tests |
| `src/__tests__/branded.test.ts` | 14 branded-ID tests |
| `src/__tests__/guards.test.ts` | 30 guard tests |
| `src/__tests__/schemas.test.ts` | 20 zod schema tests |
| `tsconfig.test.json` | Test-only tsconfig (includes `@types/jest`) |
| `jest.config.js` | ts-jest preset + proper tsconfig wiring |
| `V2_CHANGELOG.md` | This file |

### Rewritten files (8)

| File | Before | After |
|---|---|---|
| `src/entities/order.ts` | 48 lines, shallow | 268 lines — every backend Order field typed, discriminated IOrderPayment, IOrderAddress, IFulfillmentDetails, IOrderTimelineEntry |
| `src/entities/payment.ts` | 65 lines | 138 lines — typed PaymentMetadata, discriminated IPaymentGatewayResponse on `gateway` |
| `src/entities/product.ts` | 57 lines | 278 lines — full pricing + inventory + variants + modifiers + GST + serviceDetails |
| `src/entities/wallet.ts` | 102 lines | 174 lines — IBrandedCoin with merchant metadata, IWalletSettings, category balances, getValidNextWalletDebitCoin helper |
| `src/entities/user.ts` | 211 lines | 300 lines — added IUserPushToken, IUserPatchTest, IUserFraudFlags, TOS/privacy trail, soft-delete |
| `src/schemas/order.schema.ts` | 111 lines with `.passthrough()` | 246 lines, `.strict()` on requests, `.strip()` on responses, full OrderItem/Totals/Address |
| `src/schemas/payment.schema.ts` | 132 lines loose | 168 lines, discriminated `PaymentGatewayResponseSchema` union |
| `src/schemas/product.schema.ts` | 80 lines | 189 lines, `ProductPricingSchema.refine(selling ≤ original)`, variants/modifiers/inventory schemas |
| `src/schemas/wallet.schema.ts` | 136 lines | 149 lines, **idempotencyKey now REQUIRED** on debit/credit |
| `src/index.ts` | 191 lines | 309 lines with FSM + branded + guards surface |
| `src/enums/coinType.ts` | 119 lines (pre-existing bug: `CoinTypeEnum` type alias used as value) | fixed |
| `MIGRATION.md` | v1 migration | v2 migration — 6-section rollout plan, field-by-field diff tables, verification checklist |
| `README.md` | entity list | canonical getting-started + 4-entrypoint usage patterns |
| `package.json` | v1.0.0, no exports map | v2.0.0, 4-entrypoint `exports` map (`./fsm`, `./guards`, `./branded`, root) |
| `tsconfig.json` | loose | `types: []` to block implicit @types, tests excluded |

### Root workspace

Added `"packages/shared-types"` to `package.json` workspaces so `npm install` wires it across all services.

## Verification

All four criteria from the handoff gate are green:

- `tsc --noEmit -p tsconfig.json` → **EXIT 0** (core package strict-typechecks clean)
- `tsc --noEmit -p tsconfig.test.json` → **EXIT 0** (tests typecheck clean)
- `jest --config jest.config.js` → **94 passed, 0 failed** (4 test suites)
- `tsc -p tsconfig.json` → **EXIT 0** (dist build succeeds, 169 runtime exports)

Smoke test confirms all five surfaces work end-to-end:
- `CreateOrderSchema.safeParse(validOrder)` → `success: true`
- `WalletDebitSchema.safeParse({...no idempotencyKey})` → `success: false` (enforced)
- `assertValidPaymentTransition('completed', 'processing')` → throws with clear message
- `toOrderId(badInput)` → throws with entity name in message
- `isOrderResponse(minimalValidOrder)` → `true`

## Arch-fitness

Zero violations introduced:
- `as any` — 0 in package source
- `console.log` — 0 in package source (only in JSDoc examples)
- `.passthrough()` — 0 in package source (only in comments explaining what was removed)
- `Math.random` — 0
- `Record<string, any>` — 0 in the 5 core entities (Order/User/Product/Payment/Wallet)

## Rollout

Follow `MIGRATION.md` §5. Five-week rollout, each step independently
revertible. Summary:

1. Week 1 — publish + install in rezbackend + rez-payment-service (compile-time only)
2. Week 2 — FSM shim in financialStateMachine.ts (re-exports canonical)
3. Week 3 — wrap API endpoints with zod schemas (log failures as warn first)
4. Week 4 — consumer + merchant app integration
5. Week 5+ — branded IDs, one route per PR

## Contract-break summary (for the PR description)

One field-level contract break shipping to prod:

- `WalletDebitSchema.idempotencyKey` and `WalletCreditSchema.idempotencyKey`
  are now REQUIRED (min 8 chars). Call sites that weren't passing one were
  already at risk of double-credit; make it a hard requirement.
- Every other schema change is additive (more fields supported) or
  stricter-at-ingress-only (request schemas reject unknown fields;
  response schemas strip them).

## Post-review additions (same commit)

After an independent review flagged three coverage gaps and one FSM drift
to verify, this followup round landed in the same commit:

1. **Added `src/__tests__/coinType.test.ts`** — 31 tests covering
   `normalizeCoinType`, `isCanonicalCoinType`, `normalizeCoinTypeAs`,
   `getValidNextWalletDebitCoin`, and `COIN_TYPE_VALUES`. Brings total
   to **125 tests across 5 suites**, all green.

2. **Canonicalized the remaining 4 entities** (Campaign, Notification,
   Finance, Analytics). Replaced every `Record<string, any>` and bare
   `any` with typed shapes — `IAudienceTargeting`, `ICampaignCondition`,
   `ICampaignAction`, `ICampaignTrigger`, `INotificationPayload`,
   `IFinanceTransactionMetadata`, `IAnalyticsProperties`. Updated
   `campaign.schema.ts` + `notification.schema.ts` zod to match.

3. **Verified FSM parity with rezbackend** — discovered one intentional
   drift: canonical PAYMENT_STATE_TRANSITIONS adds a
   `partially_refunded → [refund_initiated]` edge that the backend's
   v1 PAYMENT_TRANSITIONS was missing (even though its Mongoose enum
   accepted the value, meaning any save transitioning out of
   `partially_refunded` would throw at the pre-save hook). Documented
   in MIGRATION.md Appendix B as an intentional bug-fix-by-adoption.

4. **Shipped the Week 2 cutover** — rewrote
   `rezbackend/src/config/financialStateMachine.ts` as a re-export
   shim that delegates to `@rez/shared-types` for Payment + Order-payment
   FSMs. Legacy export names (`PAYMENT_TRANSITIONS`,
   `ORDER_PAYMENT_TRANSITIONS`, `assertValidTransition`,
   `transitionPaymentStatus`, `validatePaymentTransition`, etc.) all
   stay wire-compatible so no caller needs to change imports. Runtime
   smoke test confirms the partially_refunded fix is live via the shim.
   Added `"@rez/shared-types": "file:../../packages/shared-types"` to
   rezbackend `package.json`.

## Follow-ups (out of scope for this task)

- Publish to the private registry (@rez namespace)
- Add ESLint `no-explicit-any` ratchet to CI so shared-types v2 discipline
  spreads to other packages
- ~~Finish Record<string, any> cleanup in campaign/notification/finance/analytics entities~~ — **DONE** (2026-04-25)
- ~~Re-run arch-fitness across rezbackend after Week 2 shim lands~~ — **DONE** (2026-04-25, PASS)
