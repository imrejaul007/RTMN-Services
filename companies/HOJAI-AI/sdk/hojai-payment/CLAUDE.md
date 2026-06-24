# @hojai/payment — Unified Payment SDK

> **Package:** `@hojai/payment` v1.0.0
> **TypeScript:** First-class with full type definitions
> **Runtime:** Node.js >= 18 (uses `node:test`, `node:crypto`)
> **Status:** ✅ **PRODUCTION-READY** — 37/37 tests pass. Wraps 6 RABTUL payment surfaces (rez-payment, rez-bill-payments, REZ-sepa, REZ-payment-gateway, settlement aggregation, webhook management) into a single ergonomic client.

---

## What this SDK is

**The official client for the RABTUL payment ecosystem.** Wraps the entire payment surface of HOJAI / RABTUL into a single, type-safe TypeScript SDK. Any developer building on HOJAI who needs to accept payments, pay bills, send SEPA transfers, route through the gateway, manage settlements, or configure webhooks should use this SDK.

It handles:
- HTTP transport (with retries, timeouts, exponential backoff)
- Authentication (Bearer token from `apiKey`)
- Error handling (`HttpError` with status + body)
- TypeScript types for every request and response
- Cross-rail routing (Razorpay, UPI, SEPA, wallet, BNPL, cards)
- Idempotency keys for safe retries
- Webhook signature verification (Razorpay-style HMAC-SHA256)

---

## Quick Start

```ts
import { Payment } from '@hojai/payment';

const payment = new Payment({
  apiKey: process.env.HOJAI_API_KEY!,
  baseUrl: 'https://api.hojai.ai'
});

// 1. Initiate a UPI payment
const p = await payment.pay.initiate({
  orderId: 'o-2026-001',
  amount: 49900,  // paise (₹499)
  paymentMethod: 'upi',
  orchestratorIdempotencyKey: 'idem-xyz-1'  // safe to retry
});

// 2. Capture after Razorpay callback
const captured = await payment.pay.capture({
  paymentId: p.id,
  razorpayPaymentId: 'pay_abc',
  razorpayOrderId: 'order_abc',
  razorpaySignature: 'sig-xyz'
});

// 3. Refund (full or partial)
const refunded = await payment.pay.refund({
  paymentId: captured.id,
  amount: 49900,
  reason: 'customer request'
});

// 4. Pay an electricity bill (BBPS)
const bill = await payment.bill.fetchBill({
  providerId: 'bijli-bescom',
  consumerNumber: '12345'
});

const paid = await payment.bill.payBill({
  billId: bill.billId,
  paymentMethod: 'upi'
});

// 5. Send a SEPA Instant EUR transfer
const transfer = await payment.sepa.createTransfer({
  scheme: 'sepa_instant_credit_transfer',
  beneficiaryId: 'ben-acme-de',
  amount: 500,
  reference: 'INV-2026-001'
});

// 6. Route through the smart gateway (auto-pick cheapest rail)
const routed = await payment.gateway.create({
  amount: 49900,
  currency: 'INR',
  preferredRails: ['upi_intent', 'upi_collect', 'card']
});

// 7. Check settlements
const settlements = await payment.settlement.list({
  merchantId: 'm-1',
  status: 'settled',
  from: '2026-06-01',
  to: '2026-06-30'
});

// 8. Configure webhook endpoint
const endpoint = await payment.webhook.createEndpoint({
  url: 'https://yourapp.com/webhooks/payment',
  events: ['payment.captured', 'payment.failed', 'settlement.settled']
});

// 9. Verify an incoming webhook signature (in YOUR handler)
const body = req.rawBody;  // string, not parsed
const sig = req.headers['x-razorpay-signature'];
const result = WebhookClient.verifyRazorpaySignature(body, sig, process.env.WEBHOOK_SECRET!);
if (!result.valid) return res.status(401).end();
```

---

## Sub-Clients (6 total, 46 methods)

| Sub-client | Endpoint prefix | Service | Methods |
|---|---|---|---|
| `payment.pay` | `/api/payment/*` | rez-payment-service (port 4001) | `initiate`, `capture`, `refund`, `status`, `getRazorpayConfig`, `createRazorpayOrder`, `getMerchantSettlements` |
| `payment.bill` | `/api/bill/*` | rez-bill-payments-service (port 4030) | `listProviders`, `getProvider`, `fetchBill`, `payBill`, `getHistory`, `getPayment`, `refundBill` |
| `payment.sepa` | `/api/sepa/*` | REZ-sepa-payment-service | `listBeneficiaries`, `getBeneficiary`, `saveBeneficiary`, `deleteBeneficiary`, `createTransfer`, `getTransfer`, `listTransfers`, `createMandate`, `getMandate`, `listMandates`, `revokeMandate` |
| `payment.gateway` | `/api/gateway/*` | REZ-payment-gateway | `create`, `get`, `list`, `capture`, `void`, `refund`, `listRefunds` |
| `payment.settlement` | `/api/settlement/*` | Cross-rail settlement aggregator | `list`, `get`, `reconcile`, `getDiscrepancies`, `requestPayout`, `getPayoutStatus` |
| `payment.webhook` | `/api/webhook/*` | Webhook configuration + delivery | `listEndpoints`, `getEndpoint`, `createEndpoint`, `updateEndpoint`, `deleteEndpoint`, `listDeliveries`, `getDelivery`, `retryDelivery`, `verifyRazorpaySignature` (static helper) |

---

## Subpath Imports

For tree-shaking and smaller bundles, import individual clients:

```ts
import { PayClient } from '@hojai/payment/pay';
import { BillClient } from '@hojai/payment/bill';
import { SepaClient } from '@hojai/payment/sepa';
import { GatewayClient } from '@hojai/payment/gateway';
import { SettlementClient } from '@hojai/payment/settlement';
import { WebhookClient, verifyRazorpaySignature } from '@hojai/payment/webhook';
```

Each subpath export contains only that client — useful for browser-bundled apps where bundle size matters.

---

## Architecture

```
@hojai/payment
├── PaymentClient             # Main facade
│   ├── pay                   # PayClient          — 7 methods (rez-payment-service)
│   ├── bill                  # BillClient         — 7 methods (rez-bill-payments-service)
│   ├── sepa                  # SepaClient         — 11 methods (REZ-sepa-payment-service)
│   ├── gateway               # GatewayClient      — 7 methods (REZ-payment-gateway)
│   ├── settlement            # SettlementClient   — 6 methods (cross-rail aggregator)
│   └── webhook               # WebhookClient      — 8 HTTP + 1 static helper
├── HojaiConfig               # Shared config interface
├── resolveConfig()           # Apply defaults (timeout, maxRetries, baseUrl)
├── request()                 # HTTP helper with retries + exponential backoff
├── HttpError                 # Tagged HTTP error (status + body)
└── verifyRazorpaySignature() # Static webhook signature helper
```

Built on the **same `HojaiConfig` + `request()` pattern** used across all `@hojai/*` SDKs (foundation, sutar, nexha, marketplace, commerce, etc.):
- Same `HojaiConfig` shape (apiKey, baseUrl, timeout, maxRetries, fetchImpl, logger)
- Same `request()` helper (retries on 5xx, throws `HttpError` on 4xx, JSON/text response handling)
- Same exponential backoff strategy (capped at 30s)
- Same idempotency-key story (caller's responsibility to provide)

---

## Configuration

```ts
const payment = new Payment({
  apiKey: 'sk_live_...',         // required — Bearer token for Authorization header
  baseUrl: 'https://api.hojai.ai', // required — payment hub URL
  timeout: 15_000,                // optional, default 10s
  maxRetries: 5,                  // optional, default 3
  fetchImpl: customFetch,         // optional — for testing/proxies
  logger: (level, msg, meta) => {} // optional
});
```

---

## Error handling

```ts
import { HttpError } from '@hojai/payment';

try {
  await payment.pay.initiate({ orderId: 'o-1', amount: 100, paymentMethod: 'upi' });
} catch (err) {
  if (err instanceof HttpError) {
    console.log(err.status);   // 400, 404, 500, etc.
    console.log(err.body);     // raw error message from upstream
  } else {
    console.error('Network / unknown error:', err);
  }
}

// SDK retries 5xx automatically (up to maxRetries)
// SDK throws HttpError immediately on 4xx
```

---

## Tests

37/37 tests passing:

```bash
cd companies/HOJAI-AI/sdk/hojai-payment
npm install
npm run build
npm test
```

Tests cover:
- Facade wiring (6 sub-clients instantiated, config passed through)
- Pay client (7 methods — initiate/capture/refund/status/Razorpay config/Razorpay order/settlements)
- Bill client (7 methods — providers/fetch/pay/history/refund)
- SEPA client (10 methods — beneficiaries, transfers, mandates)
- Gateway client (7 methods — create/get/list/capture/void/refund/listRefunds)
- Settlement client (6 methods — list/get/reconcile/discrepancies/payouts)
- Webhook client (9 methods including static `verifyRazorpaySignature` helper)
- Retry behavior (5xx retries with backoff; 4xx throws HttpError)
- Auth header (`Authorization: Bearer ${apiKey}` when apiKey present)
- Custom `fetchImpl` (testing/proxy support)
- Default config resolution (timeout=10000, maxRetries=3)
- Method count smoke (≥44 public methods)

---

## Build

```bash
npm install
npm run build
npm test
```

Build outputs `dist/` with `.js` + `.d.ts` + sourcemaps for every module.

---

## Files

```
hojai-payment/
├── CLAUDE.md                  # This file
├── README.md                  # Quick start
├── package.json               # npm config with subpath exports
├── tsconfig.json
├── src/
│   ├── foundation-config.ts   # HojaiConfig + resolveConfig
│   ├── utils.ts               # request(), sleep, backoff, HttpError, buildUrl
│   ├── pay.ts                 # PayClient (7 methods)
│   ├── bill.ts                # BillClient (7 methods)
│   ├── sepa.ts                # SepaClient (11 methods)
│   ├── gateway.ts             # GatewayClient (7 methods)
│   ├── settlement.ts          # SettlementClient (6 methods)
│   ├── webhook.ts             # WebhookClient (9 methods)
│   ├── index.ts               # Main PaymentClient facade + re-exports
│   └── __tests__/
│       └── index.test.ts      # 37 tests
└── dist/                      # Compiled output
    ├── index.js, index.d.ts, index.js.map
    ├── pay.js, pay.d.ts, ...
    ├── bill.js, bill.d.ts, ...
    ├── sepa.js, sepa.d.ts, ...
    ├── gateway.js, gateway.d.ts, ...
    ├── settlement.js, settlement.d.ts, ...
    ├── webhook.js, webhook.d.ts, ...
    ├── utils.js, utils.d.ts, ...
    ├── foundation-config.js, foundation-config.d.ts, ...
    └── __tests__/index.test.js
```

---

## Environment Variables

| Variable | Default | Description |
|---|---|---|
| `HOJAI_API_KEY` | (none) | API key for HOJAI Cloud / RABTUL (required for production) |
| `HOJAI_BASE_URL` | `https://api.hojai.ai` | Override base URL |

---

## Cross-rail Routing

The `GatewayClient.create()` method is the **smart routing** layer — it picks the cheapest/most-appropriate rail for a payment:

- **India:** `razorpay`, `upi_collect`, `upi_intent`, `card`, `netbanking`, `wallet`, `bnpl`
- **Europe:** `sepa_sct` (SEPA Credit Transfer), `sepa_inst` (SEPA Instant), `sdd` (SEPA Direct Debit)
- **Cross-rail:** gateway picks based on `preferredRails`, amount, currency, and historical success rates

For most use cases, **start with `payment.gateway.create()`** instead of `payment.pay.initiate()`. The gateway normalizes status events across all rails into a single shape.

---

## Idempotency

All mutating methods accept an idempotency key:

- `pay.initiate({ orchestratorIdempotencyKey: 'idem-1' })`
- `pay.refund({ idempotencyKey: 'rf-1' })`

If you retry the same call with the same key, the service returns the cached response instead of charging twice. **Always provide an idempotency key in production.**

---

## See also

- [@hojai/foundation](../hojai-foundation/CLAUDE.md) — CorpID, Memory, Twin, Trust, Flow, Policy clients
- [@hojai/sutar](../hojai-sutar/CLAUDE.md) — SUTAR agent runtime (use these together: SUTAR agents → payment actions)
- [@hojai/commerce](../hojai-commerce/CLAUDE.md) — RABTUL commerce SDK (orders, checkout, fulfillment)
- [RABTUL Payments Architecture](../../../RABTUL-Technologies/CLAUDE.md) — How the payment services fit together