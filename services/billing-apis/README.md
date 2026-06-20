# Billing APIs (4111)

Customer-facing billing: usage tracking, invoices, subscriptions, payment processing with mock Stripe integration.

## Endpoints

- `GET /health` — service health
- `GET /api/plans` — list plans (Free / Starter / Pro / Enterprise)
- `POST /api/plans` — create plan
- `GET /api/customers` — list customers
- `POST /api/customers` — create customer (auto-creates Stripe ID)
- `GET /api/customers/:id` — customer detail
- `GET /api/customers/:id/usage` — aggregated usage by metric
- `POST /api/usage/record` — record usage event
- `GET /api/customers/:id/invoices` — list invoices
- `POST /api/customers/:id/invoices/generate` — generate next invoice
- `POST /api/invoices/:id/pay` — pay invoice (creates payment record + Stripe charge)
- `GET /api/customers/:id/subscriptions` — list subscriptions
- `POST /api/customers/:id/subscriptions` — create subscription
- `GET /api/customers/:id/billing-portal` — get Stripe billing portal URL
- `GET /api/payments` — list all payments
- `POST /api/webhooks/stripe` — Stripe webhook receiver

## Run

```bash
npm install
PORT=4111 npm start
```

## Test

```bash
./tests/smoke.sh
./tests/e2e.sh
```

## Notes

- All Stripe IDs are mocked (`cus_mock_xxx`, `ch_mock_xxx`)
- Production deployment requires real Stripe API keys in env vars
- Replaces the BLOCKED status in Division 10 (Developer Platform)