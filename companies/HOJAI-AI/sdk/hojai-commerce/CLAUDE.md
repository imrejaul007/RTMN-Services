# @hojai/commerce — RABTUL Commerce SDK

> **Version:** 1.0.0
> **Last Updated:** 2026-06-24
> **Status:** ✅ **PRODUCTION-READY** — 14/14 tests pass. Wraps 9 rez-* commerce services into a single ergonomic TypeScript client.

---

## What it is

`@hojai/commerce` is the official TypeScript SDK for the **RABTUL commerce ecosystem** — the closed-loop commerce stack that powers REZ. It wraps every commerce-related rez-* service into a single, ergonomic client.

This is the SDK for: **wallets, payments, catalog, bookings, cashback, gift cards, invoices, bill payments, and loyalty points** — the full commerce loop.

---

## What it covers

| Module | Service | Purpose | Methods |
|---|---|---|---|
| `wallet` | rez-wallet-service | Consumer + merchant wallets, BNPL, savings | 15 |
| `payment` | rez-payment-service | Razorpay integration, refunds | 8 |
| `catalog` | rez-catalog-service | Products, inventory, categories, search | 13 |
| `booking` | rez-booking-service | Availability, bookings, calendar sync | 10 |
| `cashback` | rez-cashback-service | Accrual, redemption, rates | 8 |
| `giftCard` | rez-gift-card-service | Issue, redeem, balance, transactions | 6 |
| `invoice` | rez-invoice-service | CRUD, payments, GST, reminders, PDF | 17 |
| `billPayments` | rez-bill-payments-service | BBPS bill pay, providers, refunds | 6 |
| `loyalty` | rez-loyalty-gateway | Tiers, balance, earn, events, health | 18 |

**101+ methods total** across 9 sub-clients.

---

## Quick start

```bash
npm install @hojai/commerce
```

```ts
import { Commerce } from '@hojai/commerce';

const commerce = new Commerce({
  apiKey: process.env.HOJAI_API_KEY!,
  baseUrl: 'https://api.hojai.ai'
});

// 1. Get user wallet
const wallet = await commerce.wallet.get('user-123');

// 2. Create Razorpay payment order
const order = await commerce.payment.create({
  orderId: 'ord-1',
  userId: 'user-123',
  amount: 50000,
  method: 'upi'
});

// 3. Verify payment signature (after user pays)
const verified = await commerce.payment.verify({
  razorpayOrderId: order.id,
  razorpayPaymentId: 'pay-xyz',
  razorpaySignature: 'sig'
});

// 4. Credit cashback to user
await commerce.cashback.accrue({
  userId: 'user-123',
  amount: 500,
  source: 'order:ord-1'
});

// 5. Issue gift card
const giftCard = await commerce.giftCard.create({
  initialBalance: 1000,
  currency: 'INR',
  issuedTo: 'user-123'
});

// 6. Generate + send invoice
const invoice = await commerce.invoice.create({
  customerId: 'cust-1',
  customerName: 'Maya Collective',
  issueDate: '2026-06-24',
  dueDate: '2026-07-24',
  currency: 'INR',
  lineItems: [{ description: 'Consulting', quantity: 1, unitPrice: 50000 }]
});
await commerce.invoice.send(invoice.id);

// 7. Pay utility bill (BBPS)
const bill = await commerce.billPayments.fetchBill({
  billerId: 'electricity-board',
  parameters: { consumerNumber: '123456' }
});
await commerce.billPayments.payBill({
  billerId: 'electricity-board',
  parameters: { consumerNumber: '123456' },
  amount: bill.amount,
  customerId: 'user-123',
  paymentMethod: 'upi'
});

// 8. Earn loyalty points
await commerce.loyalty.earn({
  userId: 'user-123',
  coinType: 'rez-coin',
  amount: 100,
  reason: 'order'
});
```

---

## Subpath imports

For tree-shaking:

```ts
import { WalletClient } from '@hojai/commerce/wallet';
import { PaymentClient } from '@hojai/commerce/payment';
import { InvoiceClient } from '@hojai/commerce/invoice';
```

---

## Architecture

```
@hojai/commerce
├── Commerce                   # Main client (facade)
│   ├── wallet                 # WalletClient — 15 methods (consumer + merchant + BNPL + savings)
│   ├── payment                # PaymentClient — 8 methods (Razorpay + refunds)
│   ├── catalog                # CatalogClient — 13 methods (products + inventory + search)
│   ├── booking                # BookingClient — 10 methods (availability + lifecycle)
│   ├── cashback               # CashbackClient — 8 methods (accrual + redemption)
│   ├── giftCard               # GiftCardClient — 6 methods (issue + redeem + balance)
│   ├── invoice                # InvoiceClient — 17 methods (CRUD + GST + reminders + PDF)
│   ├── billPayments           # BillPaymentsClient — 6 methods (BBPS bill pay)
│   └── loyalty                # LoyaltyClient — 18 methods (tiers + earn + events)
├── HojaiConfig                # Shared config interface
└── resolveConfig()            # Apply defaults
```

Built on `@hojai/foundation`:
- Same `HojaiConfig` (apiKey, baseUrl, timeout, maxRetries, fetchImpl, logger)
- Same `request()` helper (retries, exponential backoff, JSON/text response handling)
- Same graceful error pattern
- Same 5xx-retry/4xx-throw behavior

---

## Configuration

```ts
const commerce = new Commerce({
  apiKey: 'hojai_live_...',    // required
  baseUrl: 'https://api.hojai.ai', // required
  timeout: 10_000,              // optional, default 10s
  maxRetries: 3,                // optional, default 3
  fetchImpl: customFetch,       // optional, for testing/proxies
  logger: (level, msg, meta) => {} // optional
});
```

---

## Error handling

```ts
try {
  await commerce.wallet.credit('user-1', { amount: 100, reason: 'topup' });
} catch (err) {
  // err.message = "HTTP 404: ..." or "HTTP 500: ..."
  // SDK retries 5xx automatically (up to maxRetries)
  // SDK throws on 4xx immediately
}
```

---

## Tests

14/14 tests passing:

```bash
cd companies/HOJAI-AI/sdk/hojai-commerce
npm install
npm run build
npm test
```

Tests cover:
- Commerce client instantiation (all 9 sub-clients)
- Wallet get + credit
- Payment create + verify (Razorpay)
- Catalog createProduct
- Booking createBooking
- Cashback accrue
- Gift card create
- Invoice create
- Bill payBill
- Loyalty earn
- Retry on 5xx (3 calls before success)
- Throw on 4xx

---

## See also

- [@hojai/foundation](../hojai-foundation/CLAUDE.md) — CorpID, Memory, Twin, Trust, Flow, Policy
- [@hojai/sutar](../hojai-sutar/CLAUDE.md) — SUTAR agent runtime
- [@hojai/nexha](../hojai-nexha/CLAUDE.md) — Nexha federation network
- [@hojai/marketplace](../hojai-marketplace/CLAUDE.md) — BLR AI Marketplace (parallel dev)
- [REZ Economy Specs](../../../../../.claude/plans/agentic-marketing-playbook.md)