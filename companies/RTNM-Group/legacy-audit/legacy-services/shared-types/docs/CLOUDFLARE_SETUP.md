# REZ Ecosystem — Cloudflare WAF Setup Guide

**Date:** 2026-04-29
**Status:** Ready for Implementation
**Effort:** 1-2 days

---

## Overview

Cloudflare WAF protects all REZ services from:
- **OWASP Top 10 attacks** (SQL injection, XSS, path traversal, command injection)
- **DDoS attacks** (volumetric + application-layer)
- **Bot traffic** (credential stuffing, scraping, automated attacks)
- **Geographic restrictions** (country-level blocking)
- **Rate limiting** (per-IP, per-endpoint)
- **Cascading failures** (circuit breaker pattern)

---

## Architecture

```
                    ┌─────────────────────────────────────────┐
                    │           CLOUDFLARE NETWORK            │
                    │                                         │
                    │  ┌─────────────────────────────────┐  │
                    │  │  DDoS Protection (L3/L4/L7)     │  │
                    │  └─────────────────────────────────┘  │
                    │                    ↓                     │
                    │  ┌─────────────────────────────────┐  │
                    │  │  WAF Worker (this setup)         │  │
                    │  │  • OWASP Top 10 protection      │  │
                    │  │  • Bot detection               │  │
                    │  │  • Rate limiting (per-IP)       │  │
                    │  │  • Geo-blocking                 │  │
                    │  │  • Circuit breaker             │  │
                    │  │  • CORS enforcement            │  │
                    │  │  • Security headers           │  │
                    │  │  • Request logging            │  │
                    │  └─────────────────────────────────┘  │
                    │                    ↓                     │
                    └─────────────────────────────────────────┘
                                        │
        ┌────────────────────────────────┼────────────────────────────────┐
        │                                │                                │
        ↓                                ↓                                ↓
┌───────────────┐            ┌──────────────────┐            ┌──────────────┐
│ REZ Auth Svc │            │ REZ Merchant Svc  │            │ REZ Wallet  │
│ (Render)     │            │ (Render)          │            │ (Render)    │
│              │            │                   │            │              │
│ auth.rez.money             │ merchant.rez.money              │ wallet.rez.money
└───────────────┘            └──────────────────┘            └──────────────┘
```

---

## Prerequisites

1. **Cloudflare account** (Pro plan minimum for WAF + Bot Management)
2. **Domain** `rez.money` added to Cloudflare DNS
3. **Cloudflare API Token** with `Zone.Zone`, `Account.Workers Scripts` permissions
4. **Workers Paid plan** (required for more than 10 Workers)

---

## Step 1: Create Cloudflare API Token

1. Go to **Cloudflare Dashboard → My Profile → API Tokens**
2. Click **Create Token** → **Create Custom Token**
3. Add permissions:
   ```
   Account:
     Workers Scripts: Edit
   Zone:
     Zone: Read
     DNS: Edit
   ```
4. Save the token securely (shown only once)
5. Add to GitHub Secrets: `CLOUDFLARE_API_TOKEN`

---

## Step 2: Get Cloudflare Account ID

1. Go to **Cloudflare Dashboard → Workers & Pages**
2. Copy your **Account ID** from the right panel
3. Add to GitHub Repository Variables: `CLOUDFLARE_ACCOUNT_ID`

---

## Step 3: Deploy the WAF Worker

```bash
cd cloudflare/waf-workers/api-gateway

# Install dependencies
npm install

# Login to Cloudflare
npx wrangler login

# Deploy to production
npm run deploy
```

Or use the GitHub Actions workflow (see `.github/workflows/deploy-cloudflare.yml`).

---

## Step 4: Configure DNS Routes

Route your subdomains through the WAF Worker:

| Subdomain | Worker Route | Upstream |
|-----------|--------------|----------|
| `auth.rez.money` | Worker handles `/auth/*` | `rez-auth-service.onrender.com` |
| `merchant.rez.money` | Worker handles `/merchant/*` | `rez-merchant-service.onrender.com` |
| `wallet.rez.money` | Worker handles `/wallet/*` | `rez-wallet-service.onrender.com` |
| `api.rez.money` | Worker handles `/api/*` | Default upstream |

In `wrangler.toml`:
```toml
[env.production]
routes = [
  { pattern = "auth.rez.money/*", zone_name = "rez.money" },
  { pattern = "merchant.rez.money/*", zone_name = "rez.money" },
  { pattern = "wallet.rez.money/*", zone_name = "rez.money" },
  { pattern = "api.rez.money/*", zone_name = "rez.money" },
]
```

---

## Step 5: Set Environment Variables

Set via `wrangler secret put`:

```bash
# Upstream hosts
wrangler secret put AUTH_UPSTREAM_HOST --env production
# → rez-auth-service.onrender.com

wrangler secret put MERCHANT_UPSTREAM_HOST --env production
# → rez-merchant-service.onrender.com

wrangler secret put WALLET_UPSTREAM_HOST --env production
# → rez-wallet-service.onrender.com

# Optional: Geo-blocking (comma-separated ISO country codes)
wrangler secret put BLOCKED_COUNTRIES --env production
# → RU,CN,KP,IR

# Rate limits (requests per minute per IP)
wrangler secret put RATE_LIMIT_AUTH --env production
# → 10

wrangler secret put RATE_LIMIT_API --env production
# → 100

# Circuit breaker threshold (% errors to trip)
wrangler secret put CIRCUIT_BREAKER_THRESHOLD --env production
# → 50
```

---

## Step 6: Configure Cloudflare Dashboard

### Enable Bot Management
1. Go to **Security → Bot Management**
2. Enable "Bot Fight Mode" (free) or "Bot Management" (Pro+)
3. The Worker automatically reads `CF-Bot-Score` header

### Create WAF Custom Rules
1. Go to **Security → WAF → Custom Rules**
2. Add rules:

```sql
# Block Tor exit nodes
(ip.geoip.country eq "XX")
AND (cf.bot_management.verified_bot eq false)

# Challenge high-risk countries
(ip.geoip.country in {"RU" "CN" "KP"})
AND (not cf.bot_management.ja3_hash exists)
```

### Configure Cache Rules
1. Go to **Caching → Configuration → Cache Rules**
2. Add rule:
   ```
   When: URL path matches "/api/*"
   Then: Cache eligibility: Eligible, TTL: 60s
   Edge TTL: 60s, Browser TTL: 0s
   ```

### Enable Always Use HTTPS
1. Go to **SSL/TLS → Overview**
2. Set mode: **Full (strict)**
3. Enable "Always Use HTTPS"
4. Enable "Automatic HTTPS Rewrites"

---

## Step 7: Set Up Monitoring

### Cloudflare Analytics
1. Go to **Security → Overview**
2. Review WAF events, blocked threats, top attackers
3. Set up email alerts for spike in blocked requests

### Cloudflare Logpush
Push logs to a storage bucket for analysis:
```bash
# Via Cloudflare API
curl -X POST "https://api.cloudflare.com/client/v4/zones/{zone_id}/logpush/jobs" \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "waf-logs",
    "destination_conf": "s3://your-bucket/waf-logs/",
    "dataset": "firewall_events",
    "enabled": true
  }'
```

---

## Health Check

Test the WAF is active:

```bash
curl -I https://auth.rez.money/health
```

Expected response headers:
```
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
Strict-Transport-Security: max-age=31536000; includeSubDomains; preload
```

Test WAF is blocking attacks:
```bash
# Should return 403
curl -X POST "https://auth.rez.money/auth/otp" \
  -d "phone=1' OR 1=1--" \
  -H "Content-Type: application/json"
```

---

## GitHub Secrets Required

Add these to **GitHub → Settings → Secrets and variables → Actions**:

| Secret | Description |
|---------|-------------|
| `CLOUDFLARE_API_TOKEN` | Cloudflare API token |
| `CLOUDFLARE_ACCOUNT_ID` | Cloudflare account ID |

Add to **GitHub → Settings → Variables → Repository variables**:

| Variable | Description |
|----------|-------------|
| `CLOUDFLARE_PROJECT_NAME` | Cloudflare Pages project name |

---

## Rollback Plan

If the WAF Worker causes issues:

1. **Disable the Worker** temporarily:
   ```bash
   npx wrangler deployments list --env production
   npx wrangler rollback --env production
   ```

2. **Disable via Dashboard**:
   - Go to **Workers & Pages → rez-api-gateway**
   - Click **Settings → Triggers**
   - Delete the routes

3. **Traffic will bypass the WAF** and go directly to upstream services (no protection, but services stay up)

---

## Testing the WAF

```bash
# Test WAF blocking SQL injection
curl -X POST "https://auth.rez.money/auth/otp" \
  -H "Content-Type: application/json" \
  -d '{"phone":"1\' OR 1=1--"}'
# Expected: 403 Forbidden

# Test WAF blocking XSS
curl -X POST "https://auth.rez.money/auth/otp" \
  -H "Content-Type: application/json" \
  -d '{"phone":"<script>alert(1)</script>"}'
# Expected: 403 Forbidden

# Test rate limiting
for i in {1..15}; do curl -s -o /dev/null -w "%{http_code}\n" \
  "https://auth.rez.money/health"; done
# Expected: First 10 = 200, next 5 = 429

# Test security headers
curl -I "https://auth.rez.money/health"
# Expected: X-Frame-Options: DENY, X-Content-Type-Options: nosniff, etc.
```

---

## Files in This Setup

```
cloudflare/
└── waf-workers/
    └── api-gateway/
        ├── wrangler.toml       # Worker config + routes
        ├── package.json         # Dependencies
        ├── tsconfig.json        # TypeScript config
        └── src/
            ├── index.ts         # Worker entry point
            ├── middleware/
            │   ├── waf.ts       # OWASP Top 10 protection
            │   ├── rateLimit.ts  # Per-IP rate limiting
            │   ├── securityHeaders.ts
            │   ├── cors.ts
            │   ├── geoBlocking.ts
            │   ├── botProtection.ts
            │   ├── circuitBreaker.ts
            │   └── logging.ts
            └── routes/
                ├── auth.ts
                ├── merchant.ts
                ├── wallet.ts
                └── default.ts

.github/workflows/
└── deploy-cloudflare-pages.yml  # Reusable CI/CD workflow
```

---

## Cost Estimate (Monthly)

| Cloudflare Plan | Cost |
|-----------------|------|
| Free | $0 (100k requests/day, 1 Worker) |
| Pro | $20/month (500k requests/day, 30 Workers) |
| Business | $200/month (5M requests/day, unlimited Workers) |

For the REZ ecosystem in production: **Pro plan ($20/month)** is sufficient.
