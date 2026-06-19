# rez-wallet-service

REZ Wallet & Loyalty Service — manages user wallets (rez-coin, karma), transactions, loyalty points, rewards, and the merchant cashback flow.

## Port
- **Main:** `4004`

## Tech Stack
- Node.js 18+
- Express 4
- MongoDB (Mongoose 8)
- Redis (ioredis 5) — transaction queues, balance cache
- JWT (jsonwebtoken 9)
- Bull — background job processing
- Pino — structured logging
- Sentry — error tracking

## API Endpoints
```
GET    /wallet/balance              # Get user's wallet balance
GET    /wallet/transactions        # List transactions
POST   /wallet/credit              # Credit wallet (internal)
POST   /wallet/debit               # Debit wallet (internal)
POST   /wallet/transfer            # P2P transfer
GET    /wallet/rewards             # Get user's rewards
POST   /wallet/rewards/redeem      # Redeem reward
GET    /wallet/karma               # Get karma score
GET    /wallet/coin-history        # rez-coin transaction history
GET    /health                     # Service health
GET    /ready                      # Readiness (DB + cache check)
```

## Environment Setup

1. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```
2. Fill in real values (MongoDB URI, Redis URL, JWT secrets, etc.)
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
docker build -t rez-wallet-service .
docker run -p 4004:4004 --env-file .env rez-wallet-service
```

## Deploy to Render

1. Create a new **Web Service** in Render
2. Connect this repo, select the `rez-wallet-service` directory
3. Build command: `npm ci --omit=dev`
4. Start command: `npm start`
5. Add all environment variables from `.env.example`
6. Add a health check path: `/health` on port `4004`

## Required Environment Variables

See `.env.example` — the most critical ones are:
- `MONGODB_URI`
- `REDIS_URL`
- `JWT_SECRET`, `JWT_MERCHANT_SECRET` (all ≥32 chars)
- `INTERNAL_SERVICE_TOKENS_JSON` (or `INTERNAL_SERVICE_TOKEN`)
- `MONOLITH_URL` — required for settlement event notifications

## Related Services
- `rez-auth-service` (4002) — issues the JWT tokens this service validates
- `rez-payment-service` (4003) — payment gateway
- `rez-merchant-service` — merchant data
- `rez-economic-engine` — karma/rewards calculation
- `rez-analytics-v2` — event ingestion
