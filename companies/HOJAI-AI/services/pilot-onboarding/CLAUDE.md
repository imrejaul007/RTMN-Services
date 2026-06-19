# RTMN Pilot Onboarding Service

**Port:** 4399
**Type:** Client-facing API Gateway & Onboarding
**Status:** ✅ Production Ready (Pilot)

## Purpose

Single entry point for pilot client signup, verification, and provisioning into the RTMN ecosystem. Handles:
- Client self-registration with email verification
- Login (JWT)
- Service selection (24 industries)
- Stripe / RABTUL payment wiring
- Provisioning callback to CorpID and target Industry OS
- Webhook ingestion for payment events

## API

| Endpoint | Method | Auth | Purpose |
|----------|--------|------|---------|
| `/health` | GET | - | Liveness check |
| `/v1/auth/signup` | POST | - | Register new client |
| `/v1/auth/verify/:token` | GET | - | Confirm email |
| `/v1/auth/login` | POST | - | Login → JWT |
| `/v1/auth/me` | GET | JWT | Current client |
| `/v1/services` | GET | - | List 24 industry services + pricing |
| `/v1/clients/me/services` | POST | JWT | Select & provision service |
| `/v1/billing/checkout` | POST | JWT | Create Stripe checkout session |
| `/v1/billing/webhook` | POST | Stripe sig | Receive payment events |
| `/v1/proxy/:industry/*` | * | JWT | Proxy to industry OS |

## Local Dev

```bash
cp .env.example .env
npm install
npm run dev
# → http://localhost:4399/health
```

## Architecture

```
Client → /signup → Email Verify → /login → JWT
   ↓
/services → Select Industry (e.g. hotel-os)
/billing/checkout → Stripe → webhook → Provision
   ↓
CorpID.createUser + IndustryOS.onboard
```

See `src/` for routes, services, validators, emails.
