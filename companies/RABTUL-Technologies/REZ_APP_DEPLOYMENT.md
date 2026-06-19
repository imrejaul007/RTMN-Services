# RABTUL-Technologies - REZ-App Backend Services

This directory contains the 8 critical backend services that power the REZ-App (Expo/React Native consumer super-app). These services are deployed to Render and exposed via the RTMN Hub.

## Why are these in the RTMN repo?
The RABTUL-Technologies directory is normally its own separate repo. However, for unified deployment of the REZ-App, these 8 services are tracked here to make Render deployment configuration and secrets management easier.

## 8 Critical Services

| Service | Port | Purpose | Status |
|---------|------|---------|--------|
| **rez-auth-service** | 4002 | Authentication, JWT, MFA/TOTP, OTP | ✅ Deployment ready |
| **rez-wallet-service** | 4004 | Wallet balance, transactions, karma, rez-coin | ✅ Deployment ready |
| **rez-payment-service** | 4003 | Razorpay/Stripe integration, refunds, webhooks | ✅ Deployment ready |
| **REZ-qr-unified** | 4090 | Cross-company QR scanning, rewards aggregation | ✅ Deployment ready |
| **rez-order-service** | 3006 | Order management, BullMQ worker, status | ✅ Deployment ready |
| **rez-catalog-service** | 3005 | Products, stores, categories | ✅ Deployment ready |
| **rez-profile-service** | 3000 | User profile, tier, karma, extended profile | ✅ Deployment ready |
| **rez-search-service** | 3008 | Search, recommendations, cache invalidation | ✅ Deployment ready |

## Per-Service Files

Each service directory contains:
- `package.json` — Node.js dependencies and scripts
- `dist/` — Pre-compiled JavaScript (no TypeScript build needed)
- `Dockerfile` — Production-ready container image
- `.env.example` — Template for required environment variables
- `.gitignore` — Excludes node_modules, dist, logs, .env
- `README.md` — Service documentation, API endpoints, deployment guide

## Quick Deploy to Render

For each service, on Render.com:

1. **New Web Service** → Connect this repo → Set **Root Directory** to the service name
2. **Environment:** `Node`
3. **Build Command:** `npm ci --omit=dev`
4. **Start Command:** `npm start`
5. **Health Check Path:** `/health` (or service-specific port)
6. **Plan:** Starter (free) or Standard
7. Copy environment variables from `.env.example` and set real values

## Required External Services

These services need:
- **MongoDB** — MongoDB Atlas free tier works
- **Redis** — Upstash or Render Key Value
- **Sentry** (optional) — error tracking
- **Razorpay** (for payment-service) — payment gateway

## Service URLs (After Deploy)

Once deployed, update the REZ-App `.env` to point to the new URLs:

```bash
REZ_AUTH_URL=https://rez-auth-service.onrender.com
REZ_WALLET_URL=https://rez-wallet-service.onrender.com
REZ_PAYMENT_URL=https://rez-payment-service.onrender.com
REZ_QR_UNIFIED_URL=https://rez-qr-unified.onrender.com
REZ_ORDER_URL=https://rez-order-service.onrender.com
REZ_CATALOG_URL=https://rez-catalog-service.onrender.com
REZ_PROFILE_URL=https://rez-profile-service.onrender.com
REZ_SEARCH_URL=https://rez-search-service.onrender.com
```

## Inter-Service Communication

All 8 services share a common authentication mechanism:
- `INTERNAL_SERVICE_TOKENS_JSON` — JSON map of `service-name: shared-secret` pairs
- `JWT_SECRET` — must match across services that validate user tokens
- `INTERNAL_SERVICE_HMAC_SECRET` — for HMAC-signed internal tokens (order-service)

A typical token map:
```json
{
  "rez-auth-service": "token-for-auth",
  "rez-wallet-service": "token-for-wallet",
  "rez-payment-service": "token-for-payment",
  "rez-order-service": "token-for-order",
  "rez-catalog-service": "token-for-catalog",
  "rez-profile-service": "token-for-profile",
  "rez-search-service": "token-for-search",
  "REZ-qr-unified": "token-for-qr"
}
```

## Health Check Strategy

- Most services expose `/health` and `/ready` on the main port
- Some services have a separate `HEALTH_PORT` (e.g., rez-auth: 4102)
- Render health checks should target the main port `/health` for simplicity

## Local Development

To run any service locally:

```bash
cd rez-auth-service
cp .env.example .env
# Edit .env with real values
npm install
npm start
```

## Notes

- The `dist/` folder is committed because each service is pre-compiled — no TypeScript build needed at deploy time
- The services use ESM (`"type": "module"` is implied by the imports) and CommonJS — the compiled output is CommonJS for compatibility
- Pino logging is JSON-structured for production observability
