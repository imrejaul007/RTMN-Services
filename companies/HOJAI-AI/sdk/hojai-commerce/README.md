# @hojai/commerce

> TypeScript SDK for the RABTUL commerce ecosystem. One client for every commerce service.

[![Status](https://img.shields.io/badge/status-production--ready-brightgreen)]()
[![Tests](https://img.shields.io/badge/tests-14%2F14%20passing-brightgreen)]()
[![Version](https://img.shields.io/badge/version-1.0.0-blue)]()

## What is the RABTUL Commerce Ecosystem?

The **closed-loop commerce stack** that powers REZ — including wallets, payments, BNPL, catalogs, bookings, cashback, gift cards, invoices, bill payments, and loyalty points.

This SDK wraps all of it into a single ergonomic client.

## What's inside

- 💰 **Wallet** — consumer + merchant wallets, BNPL credit, savings
- 💳 **Payment** — Razorpay integration, refunds, webhook handling
- 📦 **Catalog** — products, inventory, categories, search
- 📅 **Booking** — availability, bookings, calendar sync
- 💵 **Cashback** — accrual, redemption, rates management
- 🎁 **Gift Card** — issue, redeem, balance, transactions
- 📄 **Invoice** — CRUD, payments, GST reports, reminders, PDF
- ⚡ **Bill Payments** — BBPS utility bill pay (electricity, gas, water, etc.)
- 🏆 **Loyalty** — tier management, points earning, events, health

## Install

```bash
npm install @hojai/commerce
```

## Quick start

```ts
import { Commerce } from '@hojai/commerce';

const commerce = new Commerce({
  apiKey: process.env.HOJAI_API_KEY!,
  baseUrl: 'https://api.hojai.ai'
});

// Get user wallet
const wallet = await commerce.wallet.get('user-123');

// Create Razorpay payment
const order = await commerce.payment.create({
  orderId: 'ord-1',
  userId: 'user-123',
  amount: 50000,
  method: 'upi'
});

// Verify payment
await commerce.payment.verify({
  razorpayOrderId: order.id,
  razorpayPaymentId: 'pay-xyz',
  razorpaySignature: 'sig'
});

// Credit cashback
await commerce.cashback.accrue({
  userId: 'user-123',
  amount: 500,
  source: 'order:ord-1'
});

// Issue gift card
const giftCard = await commerce.giftCard.create({
  initialBalance: 1000,
  currency: 'INR',
  issuedTo: 'user-123'
});

// Generate + send invoice
const invoice = await commerce.invoice.create({
  customerId: 'cust-1',
  customerName: 'Maya Collective',
  issueDate: '2026-06-24',
  dueDate: '2026-07-24',
  currency: 'INR',
  lineItems: [{ description: 'Consulting', quantity: 1, unitPrice: 50000 }]
});
await commerce.invoice.send(invoice.id);
```

## Subpath imports

For tree-shaking:

```ts
import { WalletClient } from '@hojai/commerce/wallet';
import { PaymentClient } from '@hojai/commerce/payment';
import { InvoiceClient } from '@hojai/commerce/invoice';
```

## Modules

| Module | Purpose |
|---|---|
| `commerce.wallet` | Wallets, BNPL, savings |
| `commerce.payment` | Razorpay integration |
| `commerce.catalog` | Product catalog + search |
| `commerce.booking` | Bookings + availability |
| `commerce.cashback` | Cashback accrual + redemption |
| `commerce.giftCard` | Gift cards |
| `commerce.invoice` | Invoices + GST + reminders |
| `commerce.billPayments` | BBPS utility bill pay |
| `commerce.loyalty` | Loyalty tiers + points |

## Configuration

```ts
const commerce = new Commerce({
  apiKey: '...',         // required
  baseUrl: '...',        // required
  timeout: 10_000,       // default 10s
  maxRetries: 3,         // default 3 (only on 5xx)
  fetchImpl: customFetch,// optional, for testing
  logger: console.log    // optional
});
```

## Development

```bash
npm install
npm run build
npm test
```

14/14 tests pass.

## License

MIT © HOJAI AI