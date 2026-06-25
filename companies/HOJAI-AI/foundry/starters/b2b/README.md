# b2b-starter

> HOJAI Foundry template: **B2B commerce**.
> Built with @hojai/commerce + @hojai/sutar (supplier + buyer agents) + @hojai/payment.

## What you get

A production-ready B2B commerce platform scaffolded in 30 seconds.

## Quick start

```bash
npm install
npm run dev       # http://localhost:3000
npx hojai deploy  # deploy to *.hojai.app
```

## What's inside

- Supplier agent: receives RFQs, generates quotes, negotiates terms
- Buyer agent: sends RFQs, evaluates quotes, places orders
- Commerce routes: RFQ, quotes, orders, invoices
- Full test suite (22 tests, 100% passing)

## Run tests

```bash
npm test
```

## Deploy

```bash
npx hojai deploy --mode=remote
```
