# Environment Variables Audit

**Date:** 2026-05-02
**Auditor:** Environment Variables Auditor
**Scope:** ReZ Ecosystem - All Repositories

---

## Table of Contents
1. [Port Assignments](#port-assignments)
2. [URL Assignments (Inter-service)](#url-assignments-inter-service)
3. [Naming Standardization](#naming-standardization)
4. [Missing Variables](#missing-variables)
5. [Conflicts Found](#conflicts-found)
6. [Recommendations](#recommendations)

---

## Port Assignments

### Summary Table

| Service | Port | Health Port | Repository |
|---------|------|-------------|------------|
| Auth Service | 4002 | 4102 | SOURCE-OF-TRUTH |
| Payment Service | 4001 | 4101 | SOURCE-OF-TRUTH |
| Order Service | 4003 | - | SOURCE-OF-TRUTH |
| Wallet Service | 3010 | - | SOURCE-OF-TRUTH |
| Catalog Service | 3005 | - | SOURCE-OF-TRUTH |
| Marketing Service | 4000 | - | SOURCE-OF-TRUTH |
| Search Service | 4006 | - | SOURCE-OF-TRUTH |
| Gamification Service | 3001 | - | SOURCE-OF-TRUTH |
| Karma Service | 4011 | - | SOURCE-OF-TRUTH |
| Intent Graph | 3001 | - | rez-intent-graph |
| Agent Port (Intent Graph) | 3005 | - | rez-intent-graph |
| Support Copilot | 4033 | - | REZ-support-copilot |
| CorpPerks Service | 4014 | - | CorpPerks |
| StayOwn Service | 4015 | - | CorpPerks/rez-stayown-service |
| Rendez Backend | 4000 | - | Rendez/rendez-backend |
| Hotel OTA | 3000 | - | Hotel OTA |
| Resturistan Backend | 8000 | - | resturistan/backend |

### Port Conflicts Identified

| Ports | Conflict | Resolution |
|-------|----------|------------|
| 3001 | Gamification Service (4001) vs Intent Graph | Different services, acceptable |
| 4000 | Marketing Service vs Rendez Backend | **CONFLICT** - Different services using same port |
| 3005 | Catalog Service vs Intent Graph Agent Port | **CONFLICT** - Intent Graph uses 3005 for agent |

### Port Recommendations

1. **CRITICAL:** Resolve port 4000 conflict between Marketing Service and Rendez Backend
2. **HIGH:** Resolve port 3005 usage for Intent Graph agent to avoid confusion with Catalog Service
3. **STANDARDIZATION:** All services should have HEALTH_PORT defined (currently inconsistent)

---

## URL Assignments (Inter-service)

### Service URL Matrix

| Service | AUTH | WALLET | ORDER | PAYMENT | SEARCH | CATALOG | MARKETING | INTENT |
|---------|------|--------|-------|---------|--------|---------|-----------|--------|
| **Auth** | - | - | - | - | - | - | - | - |
| **Wallet** | :white_check_mark: | - | - | :white_check_mark: | - | - | - | - |
| **Order** | :white_check_mark: | :white_check_mark: | - | :white_check_mark: | - | - | - | :white_check_mark: |
| **Payment** | :white_check_mark: | :white_check_mark: | :white_check_mark: | - | - | - | - | - |
| **Catalog** | - | - | :white_check_mark: | - | - | - | - | - |
| **Search** | - | - | :white_check_mark: | - | - | :white_check_mark: | - | :white_check_mark: |
| **Marketing** | - | - | - | - | - | - | - | :white_check_mark: |
| **Gamification** | - | :white_check_mark: | - | - | - | - | - | :white_check_mark: |
| **Karma** | :white_check_mark: | :white_check_mark: | - | - | - | - | - | :white_check_mark: |
| **Rendez** | :white_check_mark: | - | - | - | - | - | - | :white_check_mark: |
| **CorpPerks** | - | :white_check_mark: | :white_check_mark: | :white_check_mark: | - | - | - | - |
| **StayOwn** | - | :white_check_mark: | :white_check_mark: | :white_check_mark: | - | - | - | - |
| **Support** | - | - | :white_check_mark: | - | :white_check_mark: | - | - | - |
| **Hotel OTA** | :white_check_mark: | :white_check_mark: | - | - | - | - | - | - |
| **Resturistan** | - | - | - | - | - | - | - | :white_check_mark: |

### Standardized URL Variables (from SERVICE_URL_MAP.md)

| Service | Canonical Variable | Default Port |
|---------|-------------------|-------------|
| Auth Service | `AUTH_SERVICE_URL` | 4002 |
| Wallet Service | `WALLET_SERVICE_URL` | 3010 |
| Order Service | `ORDER_SERVICE_URL` | 4003 |
| Payment Service | `PAYMENT_SERVICE_URL` | 4001 |
| Catalog Service | `CATALOG_SERVICE_URL` | 3005 |
| Marketing Service | `MARKETING_SERVICE_URL` | 4000 |
| Search Service | `SEARCH_SERVICE_URL` | 4006 |
| Gamification Service | `GAMIFICATION_SERVICE_URL` | 3001 |
| Karma Service | `KARMA_SERVICE_URL` | 4011 |
| Intent Capture | `INTENT_CAPTURE_URL` | - |

### URL Naming Inconsistencies Found

| Standard Name | Actual Usage | Found In |
|--------------|--------------|----------|
| `AUTH_SERVICE_URL` | `REZ_AUTH_SERVICE_URL` | Hotel OTA |
| `AUTH_SERVICE_URL` | `REZ_AUTH_SERVICE_URL` | CorpPerks |
| `WALLET_SERVICE_URL` | `REZ_WALLET_SERVICE_URL` | Hotel OTA |
| `INTENT_CAPTURE_URL` | `REZ_MIND_URL` | Multiple services |
| `INTENT_CAPTURE_URL` | `INTENT_CAPTURE_URL` | Some services use correctly |
| - | `MONOLITH_URL` | Intent Graph |
| - | `REZ_PARTNER_API_URL` | Rendez |
| `INTERNAL_SERVICE_TOKEN` | `INTERNAL_SERVICE_TOKENS_JSON` | Auth Service |

---

## Naming Standardization

### Authentication Variables

| Variable | Usage Count | Consistency |
|----------|-------------|-------------|
| `JWT_SECRET` | 15 | :white_check_mark: Consistent |
| `JWT_REFRESH_SECRET` | 2 | :warning: Only Auth, Karma |
| `JWT_ADMIN_SECRET` | 1 | :warning: Only Hotel OTA |
| `JWT_EXPIRES_IN` | 2 | :warning: Rendez, Resturistan |
| `REFRESH_TOKEN_SECRET` | 1 | :warning: Hotel OTA only |
| `ADMIN_JWT_SECRET` | 1 | :warning: Hotel OTA only |
| `OTP_TOTP_ENCRYPTION_KEY` | 1 | :warning: Auth only |
| `INTERNAL_SERVICE_TOKEN` | 8 | :warning: Varies |
| `INTERNAL_SERVICE_TOKENS_JSON` | 10 | :warning: Different format |

### Database Variables

| Variable | Usage Count | Consistency |
|----------|-------------|-------------|
| `MONGODB_URI` | 15 | :white_check_mark: Consistent |
| `DATABASE_URL` | 4 | :warning: Hotel OTA, Rendez, Resturistan |
| `MONGO_*_DB` | 1 | :warning: SOURCE-OF-TRUTH only |
| `MONGO_*_USER` | 1 | :warning: SOURCE-OF-TRUTH only |

### Redis Variables

| Variable | Usage Count | Consistency |
|----------|-------------|-------------|
| `REDIS_URL` | 15 | :white_check_mark: Consistent |
| `REDIS_HOST` | 0 | N/A |
| `REDIS_PORT` | 0 | N/A |
| `REDIS_PASSWORD` | 1 | :warning: Auth only |
| `REDIS_TLS` | 6 | :warning: Some services |
| `REDIS_SENTINEL_*` | 3 | :warning: Auth, Karma only |

### Payment/Gateway Variables

| Variable | Usage Count | Consistency |
|----------|-------------|-------------|
| `RAZORPAY_KEY_ID` | 4 | :white_check_mark: Consistent |
| `RAZORPAY_KEY_SECRET` | 4 | :white_check_mark: Consistent |
| `RAZORPAY_WEBHOOK_SECRET` | 3 | :warning: Hotel OTA, Root .env.example |
| `STRIPE_WEBHOOK_SECRET` | 1 | :warning: Root .env.example |

### External API Variables

| Variable | Usage Count | Consistency |
|----------|-------------|-------------|
| `SUPABASE_URL` | 0 | N/A |
| `SUPABASE_ANON_KEY` | 0 | N/A |
| `FIREBASE_*` | 5 | :warning: Varies by service |
| `AWS_*` | 4 | :warning: Varies |
| `SENDGRID_API_KEY` | 1 | :warning: Hotel OTA only |
| `MSG91_*` | 1 | :warning: Hotel OTA only |

### Observability Variables

| Variable | Usage Count | Consistency |
|----------|-------------|-------------|
| `SENTRY_DSN` | 9 | :white_check_mark: Consistent |
| `LOG_LEVEL` | 12 | :white_check_mark: Consistent |
| `NODE_ENV` | 18 | :white_check_mark: Consistent |
| `SERVICE_NAME` | 12 | :warning: Mobile apps don't use |
| `LOKI_URL` | 1 | :warning: Root .env.example only |
| `SLACK_WEBHOOK_URL` | 1 | :warning: Root .env.example only |
| `PAGERDUTY_ROUTING_KEY` | 1 | :warning: Root .env.example only |

---

## Missing Variables

### Services Missing Standard Variables

| Service | Missing Variables |
|---------|-------------------|
| **Intent Graph** | `HEALTH_PORT`, `REDIS_TLS` |
| **Support Copilot** | `SERVICE_NAME`, `LOG_LEVEL` |
| **CorpPerks** | `SERVICE_NAME`, `LOG_LEVEL`, `SENTRY_DSN` |
| **StayOwn Service** | `SERVICE_NAME`, `LOG_LEVEL`, `SENTRY_DSN` |
| **Hotel OTA** | `SERVICE_NAME`, `LOG_LEVEL`, `REDIS_TLS` |
| **Resturistan** | `SERVICE_NAME`, `LOG_LEVEL`, `REDIS_TLS`, `INTERNAL_SERVICE_TOKENS_JSON` |

### Standard Variables Not Defined Anywhere

| Variable | Status | Recommendation |
|----------|--------|----------------|
| `SUPABASE_URL` | Not used | May be deprecated |
| `SUPABASE_ANON_KEY` | Not used | May be deprecated |
| `REDIS_HOST` | Not used | Redis URL format used instead |
| `REDIS_PORT` | Not used | Redis URL format used instead |
| `SERVICE_PORT` | Not used | `PORT` is standard |

### Variables Only in Root .env.example

These variables are only defined in the root ReZ Full App `.env.example` and should be propagated to services:

| Variable | Should Be In |
|----------|--------------|
| `LOKI_URL` | All microservices |
| `SLACK_WEBHOOK_URL` | Notification service |
| `PAGERDUTY_ROUTING_KEY` | Alerting system |
| `ALERT_EMAIL` | Alerting system |
| `STRIPE_WEBHOOK_SECRET` | Payment service |

---

## Conflicts Found

### Critical Conflicts

1. **Port 4000 Conflict**
   - Marketing Service: `PORT=4000`
   - Rendez Backend: `PORT=4000`
   - **Impact:** Cannot run both services locally simultaneously
   - **Resolution:** Change Rendez Backend to `PORT=4020` or Marketing Service to `PORT=4019`

2. **Intent Graph Agent Port Overlap**
   - Intent Graph: `AGENT_PORT=3005`
   - Catalog Service: `PORT=3005`
   - **Impact:** Monitoring/port scanning confusion
   - **Resolution:** Change Intent Graph agent port to `3006`

### High Priority Conflicts

3. **JWT Secret Naming Inconsistency**
   - Most services: `JWT_SECRET`
   - Hotel OTA: `ADMIN_JWT_SECRET`, `REFRESH_TOKEN_SECRET`
   - **Impact:** Code inconsistency, harder to audit
   - **Resolution:** Standardize on `JWT_SECRET`, `JWT_REFRESH_SECRET`, `JWT_ADMIN_SECRET`

4. **Internal Token Format Inconsistency**
   - Auth Service: `INTERNAL_SERVICE_TOKENS_JSON` (JSON object)
   - Most services: `INTERNAL_SERVICE_TOKEN` (string)
   - **Impact:** Different parsing logic required
   - **Resolution:** Standardize to JSON format across all services

5. **Database URL Naming**
   - Most services: `MONGODB_URI`
   - Hotel OTA, Rendez, Resturistan: `DATABASE_URL` (PostgreSQL)
   - **Impact:** Not a direct conflict (different databases)
   - **Resolution:** Document that MongoDB services use `MONGODB_URI`, PostgreSQL services use `DATABASE_URL`

### Medium Priority Conflicts

6. **ReZ Prefix Inconsistency**
   - Some services: `REZ_*` prefix (Hotel OTA, CorpPerks)
   - Most services: No prefix
   - **Impact:** Cognitive load, inconsistent config access
   - **Resolution:** Remove `REZ_` prefix from service URLs in Hotel OTA and CorpPerks

7. **CORS Origin Naming**
   - Most services: `CORS_ORIGIN`
   - Some services: `FRONTEND_URL` (for same purpose)
   - **Impact:** Different environment variable names for same purpose
   - **Resolution:** Standardize to `CORS_ORIGIN`

8. **Webhook Secret Naming**
   - `RAZORPAY_WEBHOOK_SECRET` (Hotel OTA, Root)
   - `REZ_WEBHOOK_SECRET` (Hotel OTA)
   - `INTENT_WEBHOOK_SECRET` (Intent Graph)
   - `INTERNAL_WEBHOOK_SECRET` (Payment Service)
   - `RENDEZ_WEBHOOK_SECRET` (Rendez)
   - **Impact:** 5 different names for webhook secrets
   - **Resolution:** Standardize to `{SERVICE}_WEBHOOK_SECRET` pattern

---

## Recommendations

### Immediate Actions (Before Next Deploy)

1. **Fix Port Conflicts**
   - Change Rendez Backend port from 4000 to 4020
   - Change Intent Graph agent port from 3005 to 3006

2. **Standardize Internal Token Format**
   - Convert `INTERNAL_SERVICE_TOKEN` to JSON format across all services
   - Create migration script for existing deployments

3. **Propagate Root .env.example Variables**
   - Add `LOKI_URL`, `SLACK_WEBHOOK_URL` to microservices
   - Add `STRIPE_WEBHOOK_SECRET` to Payment Service

### Short-term Actions (This Sprint)

4. **Create Centralized Config Validation**
   - Add runtime validation for required environment variables
   - Create shared library `rez-config-validation`

5. **Update All .env.example Files**
   - Ensure all services have complete .env.example
   - Add `HEALTH_PORT`, `SERVICE_NAME`, `LOG_LEVEL` where missing

6. **Remove REZ_ Prefix**
   - Hotel OTA: Change `REZ_AUTH_SERVICE_URL` to `AUTH_SERVICE_URL`
   - Hotel OTA: Change `REZ_WALLET_SERVICE_URL` to `WALLET_SERVICE_URL`
   - CorpPerks: Change `REZ_*` prefixes to standard names

### Long-term Actions (Architecture)

7. **Service URL Registry**
   - Create centralized service registry (consul/etcd)
   - Services auto-discover other services
   - Reduce hardcoded URLs in environment variables

8. **Secret Management**
   - Migrate to HashiCorp Vault or AWS Secrets Manager
   - Environment variables become references, not values
   - Automatic rotation support

9. **Standardized Health Check Ports**
   - All services should have `HEALTH_PORT = PORT + 100`
   - Auth Service: 4002 -> 4102
   - Payment Service: 4001 -> 4101
   - Order Service: 4003 -> 4103

---

## Appendix: Complete Variable Inventory

### ReZ Full App (Root)

| Variable | Category | Required |
|---------|----------|----------|
| LOKI_URL | Observability | Optional |
| SLACK_WEBHOOK_URL | Observability | Optional |
| PAGERDUTY_ROUTING_KEY | Observability | Optional |
| ALERT_EMAIL | Observability | Optional |
| RAZORPAY_WEBHOOK_SECRET | Payment | Production |
| STRIPE_WEBHOOK_SECRET | Payment | Production |

### Intent Graph Service

| Variable | Category | Required |
|---------|----------|----------|
| NODE_ENV | Core | Yes |
| PORT | Core | Yes |
| AGENT_PORT | Core | Yes |
| MONGODB_URI | Database | Yes |
| REDIS_URL | Cache | Optional |
| OPENAI_API_KEY | AI | Optional |
| INTERNAL_SERVICE_TOKEN | Auth | Yes |
| MERCHANT_API_KEY | Auth | Optional |
| INTENT_WEBHOOK_SECRET | Security | Production |
| INTENT_CRON_SECRET | Security | Yes |
| ALLOWED_ORIGINS | CORS | Yes |
| REZ_DANGEROUS_MODE | Security | Yes |
| ENABLE_DORMANT_CRON | Feature | Yes |
| ENABLE_AGENTS | Feature | Yes |
| LOG_LEVEL | Observability | Yes |
| LOG_TO_FILE | Observability | Optional |
| LOG_DIR | Observability | Optional |
| METRICS_ENABLED | Observability | Yes |
| SENTRY_DSN | Observability | Optional |
| HEALTH_CHECK_SECRET | Security | Production |
| WALLET_SERVICE_URL | Service | Yes |
| MONOLITH_URL | Service | Yes |
| ORDER_SERVICE_URL | Service | Yes |
| PAYMENT_SERVICE_URL | Service | Yes |
| MERCHANT_SERVICE_URL | Service | Yes |
| NOTIFICATION_SERVICE_URL | Service | Yes |
| AUTH_SERVICE_URL | Service | Yes |
| CATALOG_SERVICE_URL | Service | Yes |
| SEARCH_SERVICE_URL | Service | Yes |
| MARKETING_SERVICE_URL | Service | Yes |
| GAMIFICATION_SERVICE_URL | Service | Yes |
| ADS_SERVICE_URL | Service | Yes |
| PMS_SERVICE_URL | Service | Yes |
| ANALYTICS_SERVICE_URL | Service | Yes |
| SERVICE_NAME | Observability | Yes |

### Auth Service

| Variable | Category | Required |
|---------|----------|----------|
| NODE_ENV | Core | Yes |
| PORT | Core | Yes |
| HEALTH_PORT | Core | Yes |
| SERVICE_NAME | Core | Yes |
| LOG_LEVEL | Observability | Yes |
| MONGODB_URI | Database | Yes |
| REDIS_URL | Cache | Yes |
| REDIS_PASSWORD | Cache | Yes |
| JWT_SECRET | Auth | Yes |
| JWT_REFRESH_SECRET | Auth | Yes |
| JWT_ADMIN_SECRET | Auth | Yes |
| BCRYPT_ROUNDS | Auth | Yes |
| CORS_ORIGIN | CORS | Yes |
| OAUTH_GOOGLE_CLIENT_ID | OAuth | Optional |
| OAUTH_GOOGLE_CLIENT_SECRET | OAuth | Optional |
| OAUTH_APPLE_CLIENT_ID | OAuth | Optional |
| OAUTH_APPLE_TEAM_ID | OAuth | Optional |
| OAUTH_APPLE_KEY_ID | OAuth | Optional |
| OAUTH_APPLE_PRIVATE_KEY_PATH | OAuth | Optional |
| APP_URL | OAuth | Yes |
| OTP_TOTP_ENCRYPTION_KEY | MFA | Yes |
| APP_CHECK_SECRET_KEY | Security | Production |
| SENTRY_DSN | Observability | Optional |
| OTEL_EXPORTER_OTLP_ENDPOINT | Observability | Optional |
| INTERNAL_SERVICE_TOKENS_JSON | Auth | Yes |
| REDIS_SENTINEL_HOSTS | Cache | Optional |
| REDIS_SENTINEL_NAME | Cache | Optional |
| REDIS_SENTINEL_PASSWORD | Cache | Optional |

### Payment Service

| Variable | Category | Required |
|---------|----------|----------|
| NODE_ENV | Core | Yes |
| PORT | Core | Yes |
| HEALTH_PORT | Core | Yes |
| SERVICE_NAME | Core | Yes |
| LOG_LEVEL | Observability | Yes |
| MONGODB_URI | Database | Yes |
| REDIS_URL | Cache | Yes |
| REDIS_TLS | Cache | Yes |
| JWT_SECRET | Auth | Yes |
| CORS_ORIGIN | CORS | Yes |
| RAZORPAY_KEY_ID | Payment | Yes |
| RAZORPAY_KEY_SECRET | Payment | Yes |
| WALLET_SERVICE_URL | Service | Yes |
| MERCHANT_SERVICE_URL | Service | Yes |
| ORDER_SERVICE_URL | Service | Yes |
| AUTH_SERVICE_URL | Service | Yes |
| INTERNAL_SERVICE_TOKENS_JSON | Auth | Yes |
| INTERNAL_WEBHOOK_SECRET | Security | Yes |
| SENTRY_DSN | Observability | Optional |

### Order Service

| Variable | Category | Required |
|---------|----------|----------|
| NODE_ENV | Core | Yes |
| PORT | Core | Yes |
| SERVICE_NAME | Core | Yes |
| LOG_LEVEL | Observability | Yes |
| MONGODB_URI | Database | Yes |
| REDIS_URL | Cache | Yes |
| REDIS_TLS | Cache | Yes |
| JWT_SECRET | Auth | Yes |
| CORS_ORIGIN | CORS | Yes |
| AUTH_SERVICE_URL | Service | Yes |
| PAYMENT_SERVICE_URL | Service | Yes |
| WALLET_SERVICE_URL | Service | Yes |
| INTERNAL_SERVICE_TOKENS_JSON | Auth | Yes |
| INTENT_CAPTURE_URL | Analytics | Yes |
| REZ_MIND_URL | Analytics | Yes |
| SENTRY_DSN | Observability | Optional |
| EVENT_STREAM_NAME | Events | Yes |

### Wallet Service

| Variable | Category | Required |
|---------|----------|----------|
| NODE_ENV | Core | Yes |
| PORT | Core | Yes |
| SERVICE_NAME | Core | Yes |
| LOG_LEVEL | Observability | Yes |
| MONGODB_URI | Database | Yes |
| REDIS_URL | Cache | Yes |
| REDIS_TLS | Cache | Yes |
| JWT_SECRET | Auth | Yes |
| CORS_ORIGIN | CORS | Yes |
| PAYMENT_SERVICE_URL | Service | Yes |
| MERCHANT_SERVICE_URL | Service | Yes |
| AUTH_SERVICE_URL | Service | Yes |
| INTERNAL_SERVICE_TOKENS_JSON | Auth | Yes |
| SENTRY_DSN | Observability | Optional |

### Catalog Service

| Variable | Category | Required |
|---------|----------|----------|
| NODE_ENV | Core | Yes |
| PORT | Core | Yes |
| SERVICE_NAME | Core | Yes |
| LOG_LEVEL | Observability | Yes |
| MONGODB_URI | Database | Yes |
| REDIS_URL | Cache | Yes |
| REDIS_TLS | Cache | Yes |
| INTERNAL_HMAC_SECRET | Auth | Yes |
| JWT_SECRET | Auth | Yes |
| CORS_ORIGIN | CORS | Yes |
| INTERNAL_SERVICE_TOKENS_JSON | Auth | Yes |
| SENTRY_DSN | Observability | Optional |

### Search Service

| Variable | Category | Required |
|---------|----------|----------|
| NODE_ENV | Core | Yes |
| PORT | Core | Yes |
| SERVICE_NAME | Core | Yes |
| LOG_LEVEL | Observability | Yes |
| MONGODB_URI | Database | Yes |
| REDIS_URL | Cache | Yes |
| REDIS_TLS | Cache | Yes |
| JWT_SECRET | Auth | Yes |
| CORS_ORIGIN | CORS | Yes |
| CATALOG_SERVICE_URL | Service | Yes |
| ORDER_SERVICE_URL | Service | Yes |
| INTERNAL_SERVICE_TOKENS_JSON | Auth | Yes |
| INTENT_CAPTURE_URL | Analytics | Yes |
| REZ_MIND_URL | Analytics | Yes |
| SENTRY_DSN | Observability | Optional |

### Marketing Service

| Variable | Category | Required |
|---------|----------|----------|
| NODE_ENV | Core | Yes |
| PORT | Core | Yes |
| SERVICE_NAME | Core | Yes |
| LOG_LEVEL | Observability | Yes |
| MONGODB_URI | Database | Yes |
| REDIS_URL | Cache | Yes |
| JWT_SECRET | Auth | Yes |
| ADBAZAAR_INTERNAL_KEY | Auth | Yes |
| CORS_ORIGIN | CORS | Yes |
| FRONTEND_URL | CORS | Yes |
| AWS_ACCESS_KEY_ID | Email | Yes |
| AWS_SECRET_ACCESS_KEY | Email | Yes |
| AWS_SES_SMTP_USER | Email | Yes |
| AWS_SES_SMTP_PASS | Email | Yes |
| AWS_REGION | Email | Yes |
| INTERNAL_SERVICE_KEY | Auth | Yes |
| INTENT_CAPTURE_URL | Analytics | Yes |
| SENTRY_DSN | Observability | Optional |
| MARKETING_SERVICE_URL | Service | Yes |

### Gamification Service

| Variable | Category | Required |
|---------|----------|----------|
| NODE_ENV | Core | Yes |
| PORT | Core | Yes |
| SERVICE_NAME | Core | Yes |
| LOG_LEVEL | Observability | Yes |
| MONGODB_URI | Database | Yes |
| REDIS_URL | Cache | Yes |
| REDIS_TLS | Cache | Yes |
| INTERNAL_HMAC_KEY | Auth | Yes |
| JWT_SECRET | Auth | Yes |
| CORS_ORIGIN | CORS | Yes |
| WALLET_SERVICE_URL | Service | Yes |
| KARMA_SERVICE_URL | Service | Yes |
| INTERNAL_SERVICE_TOKEN | Auth | Yes |
| INTENT_CAPTURE_URL | Analytics | Yes |
| SENTRY_DSN | Observability | Optional |

### Karma Service

| Variable | Category | Required |
|---------|----------|----------|
| NODE_ENV | Core | Yes |
| PORT | Core | Yes |
| SERVICE_NAME | Core | Yes |
| LOG_LEVEL | Observability | Yes |
| MONGODB_URI | Database | Yes |
| REDIS_URL | Cache | Yes |
| REDIS_SENTINEL_HOSTS | Cache | Optional |
| REDIS_SENTINEL_NAME | Cache | Optional |
| REDIS_SENTINEL_PASSWORD | Cache | Optional |
| JWT_SECRET | Auth | Yes |
| JWT_REFRESH_SECRET | Auth | Yes |
| CORS_ORIGIN | CORS | Yes |
| AUTH_SERVICE_URL | Service | Yes |
| WALLET_SERVICE_URL | Service | Yes |
| FCM_SERVER_KEY | Push | Yes |
| INTENT_CAPTURE_URL | Analytics | Yes |
| SENTRY_DSN | Observability | Optional |
| BATCH_CRON_SCHEDULE | Scheduler | Yes |

### Rendez Backend

| Variable | Category | Required |
|---------|----------|----------|
| NODE_ENV | Core | Yes |
| PORT | Core | Yes |
| DATABASE_URL | Database | Yes |
| TEST_DATABASE_URL | Database | Yes |
| REDIS_URL | Cache | Yes |
| JWT_SECRET | Auth | Yes |
| JWT_EXPIRES_IN | Auth | Yes |
| INTENT_CAPTURE_URL | Analytics | Yes |
| REZ_MIND_URL | Analytics | Yes |
| REZ_PARTNER_API_URL | Service | Yes |
| REZ_PARTNER_API_KEY | Auth | Yes |
| REZ_WEBHOOK_SECRET | Security | Yes |
| REZ_AUTH_SERVICE_URL | Service | Yes |
| REZ_OAUTH_CLIENT_ID | OAuth | Yes |
| REZ_OAUTH_CLIENT_SECRET | OAuth | Yes |
| REZ_OAUTH_REDIRECT_URI | OAuth | Yes |
| REZ_BACKEND_URL | Service | Yes |
| RENDEZ_WEBHOOK_SECRET | Security | Yes |
| GOOGLE_APPLICATION_CREDENTIALS | Firebase | Optional |
| FIREBASE_SERVICE_ACCOUNT_JSON | Firebase | Optional |
| FIREBASE_PROJECT_ID | Firebase | Yes |
| CLOUDINARY_CLOUD_NAME | Storage | Yes |
| CLOUDINARY_API_KEY | Storage | Yes |
| CLOUDINARY_API_SECRET | Storage | Yes |
| ADMIN_API_KEY | Admin | Yes |
| MAX_GIFTS_PER_DAY | Feature | Yes |
| GIFT_EXPIRY_HOURS | Feature | Yes |
| MATCH_EXPIRY_HOURS | Feature | Yes |
| REWARD_COOLDOWN_DAYS | Feature | Yes |
| GIFT_CATALOG_CACHE_TTL_SECONDS | Cache | Yes |
| SENTRY_DSN | Observability | Optional |

### Hotel OTA

| Variable | Category | Required |
|---------|----------|----------|
| DATABASE_URL | Database | Yes |
| JWT_SECRET | Auth | Yes |
| JWT_EXPIRY | Auth | Yes |
| REFRESH_TOKEN_SECRET | Auth | Yes |
| REFRESH_TOKEN_EXPIRY | Auth | Yes |
| ADMIN_JWT_SECRET | Auth | Yes |
| MSG91_API_KEY | SMS | Optional |
| MSG91_SENDER_ID | SMS | Optional |
| RAZORPAY_KEY_ID | Payment | Yes |
| RAZORPAY_KEY_SECRET | Payment | Yes |
| RAZORPAY_WEBHOOK_SECRET | Payment | Yes |
| REDIS_URL | Cache | Yes |
| REZ_API_KEY | Integration | Yes |
| REZ_API_BASE_URL | Integration | Yes |
| REZ_WEBHOOK_SECRET | Security | Yes |
| REZ_AUTH_SERVICE_URL | Service | Yes |
| REZ_WALLET_SERVICE_URL | Service | Yes |
| INTERNAL_SERVICE_TOKEN | Auth | Yes |
| REZ_COIN_TO_RUPEE_RATE | Integration | Yes |
| PMS_API_URL | Integration | Yes |
| PMS_WEBHOOK_SECRET | Security | Yes |
| REZ_OTA_INTERNAL_TOKEN | Auth | Yes |
| AWS_ACCESS_KEY | Storage | Yes |
| AWS_SECRET_KEY | Storage | Yes |
| AWS_S3_BUCKET | Storage | Yes |
| AWS_REGION | Storage | Yes |
| SENDGRID_API_KEY | Email | Optional |
| FRONTEND_URL | CORS | Yes |
| HOTEL_PANEL_URL | CORS | Yes |
| ADMIN_PANEL_URL | CORS | Yes |
| FINANCE_SERVICE_URL | Service | Yes |
| NODE_ENV | Core | Yes |
| PORT | Core | Yes |

### CorpPerks

| Variable | Category | Required |
|---------|----------|----------|
| SERVICE_NAME | Core | Yes |
| PORT | Core | Yes |
| NODE_ENV | Core | Yes |
| MONGODB_URI | Database | Yes |
| CORS_ORIGIN | CORS | Yes |
| WALLET_SERVICE_URL | Service | Yes |
| FINANCE_SERVICE_URL | Service | Yes |
| KARMA_SERVICE_URL | Service | Yes |
| HOTEL_SERVICE_URL | Service | Yes |
| PROCUREMENT_SERVICE_URL | Service | Yes |
| MAKCORPS_API_URL | Provider | Yes |
| MAKCORPS_API_KEY | Provider | Yes |
| MAKCORPS_CLIENT_ID | Provider | Yes |
| MAKCORPS_CLIENT_SECRET | Provider | Yes |
| NEXTABIZZ_API_URL | Provider | Yes |
| NEXTABIZZ_API_KEY | Provider | Yes |
| NEXTABIZZ_CLIENT_ID | Provider | Yes |
| NEXTABIZZ_CLIENT_SECRET | Provider | Yes |
| HRIS_CLIENT_ID | Provider | Yes |
| INTERNAL_SERVICE_TOKEN | Auth | Yes |
| JWT_SECRET | Auth | Yes |

### Resturistan Backend

| Variable | Category | Required |
|---------|----------|----------|
| DATABASE_URL | Database | Yes |
| JWT_SECRET | Auth | Yes |
| JWT_EXPIRES_IN | Auth | Yes |
| PORT | Core | Yes |
| NODE_ENV | Core | Yes |
| FRONTEND_URL | CORS | Yes |
| AWS_REGION | Storage | Yes |
| AWS_ACCESS_KEY_ID | Storage | Yes |
| AWS_SECRET_ACCESS_KEY | Storage | Yes |
| AWS_S3_BUCKET_NAME | Storage | Yes |
| RAZORPAY_KEY_ID | Payment | Yes |
| RAZORPAY_KEY_SECRET | Payment | Yes |
| UIDAI_API_KEY | Verification | Optional |
| UIDAI_BASE_URL | Verification | Optional |
| SMTP_HOST | Email | Yes |
| SMTP_PORT | Email | Yes |
| SMTP_USER | Email | Yes |
| SMTP_PASS | Email | Yes |
| REDIS_URL | Cache | Optional |
| INTENT_CAPTURE_URL | Analytics | Yes |
| INTERNAL_SERVICE_TOKEN | Auth | Yes |

### Support Copilot

| Variable | Category | Required |
|---------|----------|----------|
| PORT | Core | Yes |
| MONGODB_URI | Database | Yes |
| REZ_MIND_URL | Service | Yes |
| REZ_EVENT_PLATFORM_URL | Service | Yes |
| REZ_ORDER_SERVICE_URL | Service | Yes |
| REZ_BOOKING_SERVICE_URL | Service | Yes |
| SEARCH_SERVICE_URL | Service | Yes |
| ORDER_SERVICE_URL | Service | Yes |
| KNOWLEDGE_BASE_URL | Service | Yes |
| USER_INTELLIGENCE_URL | Service | Yes |
| WEBHOOK_SECRET | Security | Yes |

### StayOwn Service

| Variable | Category | Required |
|---------|----------|----------|
| PORT | Core | Yes |
| NODE_ENV | Core | Yes |
| SERVICE_NAME | Core | Yes |
| MONGODB_URI | Database | Yes |
| CORS_ORIGIN | CORS | Yes |
| STAYOWN_API_URL | Integration | Yes |
| INTERNAL_SERVICE_TOKEN | Auth | Yes |
| ORDER_SERVICE_URL | Service | Yes |
| PAYMENT_SERVICE_URL | Service | Yes |
| WALLET_SERVICE_URL | Service | Yes |

---

## Summary Statistics

| Metric | Count |
|--------|-------|
| Total Services Audited | 17 |
| Total Unique Variables | 89 |
| Variables with Inconsistencies | 24 |
| Port Conflicts | 2 |
| URL Naming Inconsistencies | 6 |
| Critical Issues | 2 |
| High Priority Issues | 3 |
| Medium Priority Issues | 3 |
| Recommendations | 9 |

---

**Document Version:** 1.0
**Last Updated:** 2026-05-02
**Next Review:** Before next deployment
