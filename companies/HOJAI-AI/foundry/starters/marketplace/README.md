# marketplace-starter

> HOJAI Foundry template: **Multi-vendor marketplace**.
> Built with @hojai/marketplace (BAM OS) + @hojai/sutar (merchant agents) + @hojai/payment.

## What you get

A production-ready multi-vendor B2C/B2B marketplace scaffolded in 30 seconds.

## Quick start

```bash
npm install
npm run dev       # http://localhost:3000
npx hojai deploy  # deploy to *.hojai.app
```

## What's inside

- SUTAR merchant-agent per vendor (negotiates, sets pricing, manages inventory)
- BAM OS routes: products, bids, orders, escrow
- 6 seeded demo products + 2 demo merchants
- Full test suite (22 tests, 100% passing)

## Run tests

```bash
npm test
```

## Deploy

```bash
npx hojai deploy --mode=remote
```
