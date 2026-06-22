# Migration Guide — @rez/shared-types v1 → v2

This guide explains what changed in the v2 rewrite, who has to update, and
exactly which lines of code to change. If you're reading this as the main
developer after a long gap, start with §1 and skim the diff tables.

## Table of Contents

1. What's new in v2
2. Breaking changes (do these first)
3. Per-repo migration — backend / consumer / merchant / admin
4. Field-by-field diff tables
5. Cut-over plan (feature-flagged)
6. Verification checklist

---

## 1. What's new in v2

v1 was 80% stubs (optional fields, `.passthrough()` everywhere, `Record<string, any>`
escape hatches). v2 treats the package like a contract rather than a shape
library.

**Added:**

- **FSM helpers** — `isValidPaymentTransition`, `assertValidOrderTransition`,
  `canOrderBeCancelled`, `mapPaymentStatusToOrderPaymentStatus`. Import from
  the root package; all three FSMs (Payment, Order, Order.payment) live at
  `/fsm`. These are the single source of truth — every service that mutates
  status must route through them.

- **Branded IDs** — `OrderId`, `UserId`, `MerchantId`, `StoreId`, `ProductId`,
  `PaymentId`, `WalletId`, `CategoryId`, `CampaignId`, `CouponId`, `RefundId`.
  At runtime they're strings; at compile time they're distinct types so you
  can't accidentally pass `orderId` where `userId` is expected. Construct via
  `toOrderId(...)` which throws on malformed input.

- **Runtime guards** — `isOrderResponse`, `isPaymentResponse`, `isWalletResponse`,
  `isUserResponse`, `isProductResponse`, `asOrderStatus`, `asPaymentStatus`,
  `asCoinType`, `isArrayOf`. These have **no zod dependency**, so the consumer
  app can import them without bloating the bundle.

- **Discriminated gateway response** — `PaymentGatewayResponseSchema` is now a
  `z.discriminatedUnion('gateway', [...])`. UPI-specific fields (upiId, qrCode)
  no longer appear on card responses in type hints.

- **Deeper entity coverage** — `IOrderAddress`, `IFulfillmentDetails`, `IOrderTimelineEntry`,
  `IOrderAnalytics`, `IOrderDeliveryAttempt`, `IProductVariant`, `IProductInventory`,
  `IProductGST`, `IModifier`, `IServiceDetails`, `IUserPushToken`, `IUserPatchTest`,
  `IUserFraudFlags`, `IBrandedCoin`, `IPromoCoinDetails`, `IWalletStatistics`,
  `IWalletSettings`.

**Hardened:**

- Every zod object uses `.strict()` on requests and `.strip()` on responses.
  (`.passthrough()` is gone — it was the escape hatch that let drift survive
  unnoticed.)
- `WalletDebitSchema` / `WalletCreditSchema` require `idempotencyKey` (min 8
  chars). This was the #1 source of the "cashback credited twice" incidents.
- `ProductPricingSchema` enforces `selling ≤ original` via `.refine()`.
- IDs where we know the shape (user, merchantId, storeId) use
  `regex(/^[a-fA-F0-9]{24}$/)` rather than `z.string().min(1)`.

## 2. Breaking changes

| v1 | v2 | Who is affected |
|---|---|---|
| `CreateOrderSchema` accepts extra fields silently (`.passthrough()`) | `.strict()` — extra fields throw | backend, admin |
| `CreateOrderSchema.items[]` uses `z.any()`-ish OrderItem stub | Full `OrderItemSchema` — requires product, store, name, image, quantity, price, subtotal, itemType | consumer app checkout, merchant web-menu |
| `PaymentGatewayResponseSchema` accepts any `gateway: string` | Must be one of `razorpay / stripe / paypal / upi / wallet / cod` (discriminated) | any code creating Payment rows |
| `WalletDebitSchema.idempotencyKey` is optional | Required, min 8 chars | cashback subscriber, offer redemption, checkout |
| `WalletCreditSchema.idempotencyKey` is optional | Required, min 8 chars | every credit path (purchases, promos, referrals, scan-to-earn) |
| `ProductPricingSchema` accepts `selling > mrp` | `refine()` rejects it | merchant product create/edit |
| `OrderResponseSchema` allowed `_id` as `z.string()` | `OrderResponseSchema` accepts it but uses `.strip()` so unknown fields don't throw on response reads | nobody breaks — response is lax, requests are strict |
| `PaymentStatus` (zod enum) was also re-exported from order.schema | Only exported from payment.schema | anyone who imported it via `from './schemas/order.schema'` — switch to the root package |

## 3. Per-repo migration

### 3.1 rezbackend (monolith)

Install: already in the workspace via `packages/shared-types`.

**Change 1** — Replace local state-machine constants with canonical FSM.

```ts
// BEFORE — src/config/financialStateMachine.ts (internal copy)
import { PAYMENT_TRANSITIONS } from '../config/financialStateMachine';

// AFTER
import {
  PAYMENT_STATE_TRANSITIONS,
  assertValidPaymentTransition,
} from '@rez/shared-types';
```

The backend file can still exist for backward compatibility but should
re-export from the canonical package:

```ts
// src/config/financialStateMachine.ts — compat shim
export {
  PAYMENT_STATE_TRANSITIONS as PAYMENT_TRANSITIONS,
  isValidPaymentTransition,
  assertValidPaymentTransition as assertValidTransition,
} from '@rez/shared-types';
```

**Change 2** — Branded IDs at controller boundaries.

```ts
// BEFORE
app.get('/orders/:id', async (req, res) => {
  const orderId = req.params.id; // string
  const order = await Order.findById(orderId);
});

// AFTER
import { toOrderId } from '@rez/shared-types';

app.get('/orders/:id', async (req, res) => {
  const orderId = toOrderId(req.params.id); // throws if not 24-hex
  const order = await Order.findById(orderId);
});
```

**Change 3** — Zod request validation at API boundaries.

```ts
// BEFORE
router.post('/orders', async (req, res) => {
  const body = req.body as any;
  // ... manual validation
});

// AFTER
import { CreateOrderSchema } from '@rez/shared-types';

router.post('/orders', async (req, res) => {
  const parsed = CreateOrderSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ errors: parsed.error.flatten() });
  }
  // parsed.data is fully typed
});
```

### 3.2 rez-app-consumer (React Native — no zod)

Install: add `"@rez/shared-types": "workspace:*"` to dependencies.

Import only the parts that don't need zod:

```ts
// GOOD — types + guards + enums only
import type { IOrder, IPayment, IWallet } from '@rez/shared-types';
import {
  OrderStatus,
  CoinType,
  isOrderResponse,
  asPaymentStatus,
  isArrayOf,
} from '@rez/shared-types';
```

**Usage pattern — check responses at the API-client boundary:**

```ts
// api/orders.ts
import { isOrderResponse, isArrayOf } from '@rez/shared-types';

export async function fetchOrder(id: string) {
  const res = await fetch(`/api/orders/${id}`);
  const data = await res.json();
  if (!isOrderResponse(data)) {
    throw new Error('Malformed order response');
  }
  return data; // typed as IOrder
}

export async function fetchOrders() {
  const res = await fetch('/api/orders');
  const data = await res.json();
  if (!isArrayOf(data, isOrderResponse)) {
    throw new Error('Malformed order list');
  }
  return data;
}
```

**Do NOT import from `@rez/shared-types/schemas/...`** on the consumer side —
those files pull in zod.

### 3.3 rez-app-marchant (React Native — has zod)

Same as backend patterns. Use the zod schemas for form validation:

```ts
import { CreateProductSchema, ProductPricingSchema } from '@rez/shared-types';

// react-hook-form integration
const resolver = zodResolver(CreateProductSchema);

// or ad-hoc
const parsed = ProductPricingSchema.safeParse(values.pricing);
```

### 3.4 rez-app-admin

Install + use schemas identically to the merchant app. Priority import:
`UpdateOrderStatusSchema`, `UpdatePaymentStatusSchema`, `WalletCreditSchema`
for the admin mutation endpoints.

### 3.5 Microservices (rez-payment-service, rez-wallet-service, etc.)

Each service should install `@rez/shared-types` and:

1. Delete their local entity copy.
2. Replace with a `re-export` shim if other service code imports from the old path.
3. Use `CreatePaymentSchema`, `WalletDebitSchema`, etc. at the API boundary.

Example — rez-payment-service:

```ts
// BEFORE — src/types/Payment.ts
export interface IPayment { ... }  // 60 lines of interface

// AFTER — same path
export type {
  IPayment,
  IPaymentUserDetails,
  IPaymentGatewayResponse,
  PaymentMetadata,
  PaymentPurpose,
} from '@rez/shared-types';
```

## 4. Field-by-field diff tables

### IOrder

| Field | v1 | v2 | Notes |
|---|---|---|---|
| `orderNumber` | `string?` | `string` (required) | was required in DB already |
| `fulfillmentType` | missing | `FulfillmentType` (required) | new in v2 |
| `totals` | `IOrderTotals?` | required | matches DB |
| `totals.platformFee` | missing | `number` | was already being written |
| `totals.merchantPayout` | missing | `number` | same |
| `delivery.address` | `Record<string, any>?` | `IOrderAddress` (required) | strictly typed |
| `timeline` | missing | `IOrderTimelineEntry[]` | was on backend, not exported |
| `idempotencyKey` | missing | `string?` | required for POST /orders |
| `snapshotCashbackRate` | missing | `number?` | FT-D002 fix surface |
| `postPaymentProcessed` | missing | `boolean?` | webhook dedup flag |

### IPayment

| Field | v1 | v2 | Notes |
|---|---|---|---|
| `metadata` | `Record<string, any>` | `PaymentMetadata` (typed index signature) | razorpayOrderId / stripeWebhookId / paypalOrderId get IDE completion |
| `gatewayResponse` | loose object | discriminated union on `gateway` | UPI-specific fields narrow correctly |
| `gateway` | missing | `PaymentGateway?` | HOW vs WHO split clarified |
| `expiresAt` | `Date` | `Date / string` | accepts serialized form |

### IProduct

| Field | v1 | v2 | Notes |
|---|---|---|---|
| `pricing` | `{selling, mrp}` | `{original, selling, currency, bulk?, gst?}` | matches backend `Product.pricing` shape |
| `pricing.discount` | `0-100` | `0-100` | unchanged |
| `inventory` | missing | `IProductInventory` | unlimited flag, variants, reservedStock |
| `modifiers` | missing | `IModifier[]` | food ordering (add cheese / spice level / etc.) |
| `serviceDetails` | missing | `IServiceDetails` | for productType: 'service' |
| `ratings.distribution` | missing | `IProductRatingDistribution` | 5-bucket distribution |
| `is86d` | missing | `boolean?` | 86'd-item tracking |

### IWallet

| Field | v1 | v2 | Notes |
|---|---|---|---|
| `balance.cashback` | optional | required | was required in DB |
| `brandedCoins` | stub shape | `IBrandedCoin[]` with merchant metadata + expiresAt | |
| `categoryBalances` | missing | `Record<string, ICategoryBalance>` | per-MainCategory |
| `statistics` | 4 fields | 6 fields (+ totalRefunds, totalTopups, totalWithdrawals) | CV-25 fix |
| `settings` | missing | `IWalletSettings` | autoTopup, smartAlerts |
| `isFrozen` | optional | required | |

### IUser

| Field | v1 | v2 | Notes |
|---|---|---|---|
| `pushTokens` | missing | `IUserPushToken[]?` | multi-device |
| `patchTests` | missing | `IUserPatchTest[]?` | salon services |
| `fraudFlags` | missing | `IUserFraudFlags?` | coinVelocity + referralAbuse |
| `tosAcceptedAt / tosVersion` | missing | `?` | DPDP trail |
| `privacyPolicyAcceptedAt / privacyPolicyVersion` | missing | `?` | |
| `deletedAt / isDeleted` | missing | `?` | soft-delete |
| `deviceInfo` | missing | `unknown?` | cleared on deletion (BED-023) |

## 5. Cut-over plan (feature-flagged)

Rollout order — NO big bang. Each step is independently revertible.

**Week 1 — Plumbing only.**

1. Publish `@rez/shared-types@2.0.0` to the internal registry.
2. Install as `workspace:*` in rezbackend. Verify `tsc --noEmit` passes.
3. Install as workspace dep in rez-payment-service and rez-wallet-service.
   Do NOT swap any types yet — just prove it compiles alongside.

**Week 2 — Backend re-exports + FSM.**

4. Convert `src/config/financialStateMachine.ts` to a re-export shim of the
   canonical FSM. Run tests.
5. In rez-payment-service, change `src/types/Payment.ts` to a re-export
   shim. Ship behind `TYPES_V2=1` — only compile-time.

**Week 3 — Schemas at API boundaries.**

6. Wrap POST /orders, POST /payments, POST /wallet/debit, POST /wallet/credit
   with the v2 schemas. Log `.safeParse` failures to Sentry as `warn` for
   the first week. Do NOT 400 yet.
7. After 7 days of green logs (zero parse failures in prod), flip the wrap
   to `return 400` on parse fail.

**Week 4 — Consumer + merchant.**

8. Consumer app imports guards (`isOrderResponse`, etc.) at the API client.
   No runtime behavior change, just stricter narrowing for the UI.
9. Merchant app uses `CreateProductSchema` on the product-create form.
   react-hook-form with `zodResolver`.

**Week 5+ — Branded IDs.**

10. Introduce `toOrderId` / `toUserId` at the monolith's controller layer,
    one route at a time. Each PR: one route.
11. Phase out local `string` + manual `ObjectId.isValid()` checks.

## 6. Verification checklist

Run before landing each PR in the cut-over:

- [ ] `tsc --noEmit` in the target repo passes
- [ ] Relevant jest tests pass (`npm test -- <pattern>`)
- [ ] `rg "\.passthrough\(\)" src/` — any new usage in non-legacy code is a regression
- [ ] `rg "Record<string, any>" src/` — should trend down
- [ ] `rg "as any" src/` — should trend down
- [ ] Arch fitness suite passes (`bash scripts/arch-fitness/run-all.sh`)
- [ ] Sentry `v2-schema-parse-failure` tag is empty for 24h after rollout
- [ ] No spike in 400s on `/api/orders`, `/api/payments`, `/api/wallet/*`

When all six boxes are green in prod for 48h, delete the v1 shims.

---

## Appendix A — Where each type now lives

| Type | Old path | New path |
|---|---|---|
| `PAYMENT_TRANSITIONS` | `rezbackend/src/config/financialStateMachine` | `@rez/shared-types` (as `PAYMENT_STATE_TRANSITIONS`) |
| `IPayment` | `rezbackend/src/models/Payment` (compat) | `@rez/shared-types` |
| `IOrder` | `rezbackend/src/models/Order` (compat) | `@rez/shared-types` |
| `CoinType` | `rezbackend/src/constants/coinTypes` | `@rez/shared-types` |
| `CreateOrderSchema` | `rez-contracts/schemas/order` | `@rez/shared-types` |
| `WalletDebitSchema` | `rez-contracts/schemas/wallet` | `@rez/shared-types` |

## Appendix B — FSM drift from rezbackend (intentional)

Diffed `src/fsm/paymentFsm.ts` against `rezbackend/src/config/financialStateMachine.ts`
PAYMENT_TRANSITIONS. One intentional addition in canonical:

| State | Backend | Canonical (v2) | Why |
|---|---|---|---|
| `partially_refunded` | **missing from PAYMENT_TRANSITIONS map** | `partially_refunded: [refund_initiated]` | Backend's Payment enum accepts `partially_refunded` as a status value, but the PAYMENT_TRANSITIONS map has no row for it. Any save that tried to transition out of `partially_refunded` would throw at the pre-save hook. Canonical v2 adds the transition row explicitly. |
| `refund_processing` | `[refunded, refund_failed]` | `[refunded, partially_refunded, refund_failed]` | Required to reach the new `partially_refunded` state. |

**Action for the Week 2 cutover:** when `financialStateMachine.ts` switches to
re-export from `@rez/shared-types`, this drift resolves automatically and the
backend gains the `partially_refunded` transition handling it was missing.
File a small follow-up to verify any refund-flow tests still pass after the shim
lands (they should — the backend bug was latent, not exercised).

ORDER_PAYMENT_TRANSITIONS (order sub-doc FSM) is field-for-field identical to
the backend. No drift.

## Appendix C — zod schema behavior matrix

| Schema | Unknown fields | Required fields enforced |
|---|---|---|
| `CreateOrderSchema` | **reject** (`.strict()`) | user, store, items[1+], totals, payment, delivery |
| `UpdateOrderStatusSchema` | **reject** | status |
| `OrderResponseSchema` | **strip** | status, orderNumber, user, fulfillmentType, items, totals, payment, delivery, timestamps |
| `CreatePaymentSchema` | **reject** | paymentId, orderId, user (24hex), amount (>0), currency, paymentMethod, userDetails |
| `PaymentResponseSchema` | **strip** | all core fields |
| `CreateProductSchema` | **reject** | name, category, store, sku, pricing, inventory |
| `ProductResponseSchema` | **strip** | all core fields + ratings |
| `WalletDebitSchema` | **reject** | user, amount (>0), source, description, **idempotencyKey (min 8)** |
| `WalletCreditSchema` | **reject** | user, coinType, amount (>0), source, description, **idempotencyKey (min 8)** |
