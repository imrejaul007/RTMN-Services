# rez-payment-service

REZ Payment Processing Service — handles payment gateway integration (Razorpay, Stripe), payment intents, refunds, webhooks, and payment status sync.

## Port
- **Main:** `4003`
- **Health:** `4103`

## Tech Stack
- Node.js 18+
- Express 4
- MongoDB (Mongoose 8) — payment records
- Redis (ioredis 5) — idempotency, Bull queues
- Bull — webhook & async payment job processing
- Razorpay SDK — primary payment gateway (INR)
- Stripe SDK — secondary payment gateway
- JWT (jsonwebtoken 9)
- Pino — structured logging
- Sentry — error tracking

## API Endpoints
```
POST   /payment/create             # Create payment intent
POST   /payment/verify             # Verify payment after gateway
POST   /payment/refund             # Issue a refund
GET    /payment/:id                # Get payment status
GET    /payment/list               # List user payments
POST   /webhooks/razorpay          # Razorpay webhook receiver
POST   /webhooks/stripe            # Stripe webhook receiver
GET    /health                     # Service health
GET    /ready                      # Readiness (DB + cache check)
```

## Environment Setup

1. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```
2. Fill in real values (MongoDB URI, Redis URL, JWT secrets, Razorpay keys, etc.)
3. Generate strong secrets:
   ```bash
   openssl rand -hex 32
   ```

## Local Development

```bash
npm install
npm run dev     # ts-node with hot reload (requires src/)
npm start       # Run compiled dist/index.js
```

## Docker

```bash
docker build -t rez-payment-service .
docker run -p 4003:4003 -p 4103:4103 --env-file .env rez-payment-service
```

## Deploy to Render

1. Create a new **Web Service** in Render
2. Connect this repo, select the `rez-payment-service` directory
3. Build command: `npm ci --omit=dev`
4. Start command: `npm start`
5. Add all environment variables from `.env.example`
6. Add a health check path: `/health` on port `4103`

## Required Environment Variables

See `.env.example` — the most critical ones are:
- `MONGODB_URI`
- `REDIS_URL`
- `JWT_SECRET`, `JWT_MERCHANT_SECRET` (all ≥32 chars)
- `INTERNAL_SERVICE_TOKENS_JSON` (or `INTERNAL_SERVICE_TOKEN`)
- `RAZORPAY_KEY_ID` + `RAZORPAY_KEY_SECRET` (Razorpay dashboard)
- `RAZORPAY_WEBHOOK_SECRET` (for webhook signature verification)
- `WALLET_SERVICE_URL` — for wallet credit after payment
- `MONOLITH_URL` — required for refund event emission and payment status sync

## Webhook Setup (Razorpay)

1. In Razorpay Dashboard → Settings → Webhooks, add:
   - URL: `https://rez-payment-service.onrender.com/webhooks/razorpay`
   - Active events: `payment.captured`, `payment.failed`, `refund.processed`
2. Copy the webhook secret into `RAZORPAY_WEBHOOK_SECRET`

## Related Services
- `rez-auth-service` (4002) — issues JWT tokens
- `rez-wallet-service` (4004) — credits/debits wallet after payment
- `rez-monolith` — receives refund & payment status events
