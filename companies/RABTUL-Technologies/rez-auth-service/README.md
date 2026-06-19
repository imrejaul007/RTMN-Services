# rez-auth-service

REZ Authentication & Authorization Service — handles user registration, login, JWT issuance, MFA/TOTP, OTP verification, and internal service-to-service authentication.

## Port
- **Main:** `4002`
- **Health:** `4102`

## Tech Stack
- Node.js 18+
- Express 4
- MongoDB (Mongoose 8)
- Redis (ioredis 5) — session storage, rate limiting
- JWT (jsonwebtoken 9)
- bcryptjs — password hashing
- Pino — structured logging
- Sentry — error tracking
- OpenTelemetry — distributed tracing

## API Endpoints
```
POST   /auth/register          # Register a new user
POST   /auth/login             # Login with email/password
POST   /auth/refresh           # Refresh JWT token
POST   /auth/logout            # Invalidate session
POST   /auth/forgot-password   # Request password reset
POST   /auth/reset-password    # Reset password with token
POST   /auth/verify-otp        # Verify OTP code
POST   /auth/mfa/setup         # Setup TOTP MFA
POST   /auth/mfa/verify        # Verify TOTP code
GET    /auth/me                # Get current user
GET    /health                 # Service health
GET    /ready                  # Readiness (DB + cache check)
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
docker build -t rez-auth-service .
docker run -p 4002:4002 -p 4102:4102 --env-file .env rez-auth-service
```

## Deploy to Render

1. Create a new **Web Service** in Render
2. Connect this repo, select the `rez-auth-service` directory
3. Build command: `npm ci --omit=dev`
4. Start command: `npm start`
5. Add all environment variables from `.env.example`
6. Add a health check path: `/health` on port `4102`

## Required Environment Variables

See `.env.example` — the most critical ones are:
- `MONGODB_URI`
- `REDIS_URL`
- `JWT_SECRET`, `JWT_ADMIN_SECRET`, `JWT_MERCHANT_SECRET`, `JWT_REFRESH_SECRET` (all ≥32 chars)
- `OTP_HMAC_SECRET`
- `OTP_TOTP_ENCRYPTION_KEY`
- `INTERNAL_SERVICE_TOKENS_JSON` (or `INTERNAL_SERVICE_TOKEN`)

## Security Notes

- All secrets must be ≥32 characters in production
- The service rejects weak/dev-like secrets (`test`, `dev`, `secret`, `password`, `changeme`)
- Service-to-service calls require a valid `INTERNAL_SERVICE_TOKEN` (or per-service token from `INTERNAL_SERVICE_TOKENS_JSON`)
- TOTP secrets are encrypted at rest with AES-256-GCM
