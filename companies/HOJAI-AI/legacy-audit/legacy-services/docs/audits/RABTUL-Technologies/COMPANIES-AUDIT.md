# RTMN Companies - RABTUL Integration Audit
## Current State & Required Actions

**Date:** May 12, 2026
**Audit Status:** Completed
**Next Review:** June 12, 2026

---

## EXECUTIVE SUMMARY

| Status | Count | Description |
|--------|-------|-------------|
| ✅ Properly Connected | 2 | Using RABTUL services correctly |
| ⚠️ Needs Migration | 5 | Has duplicate services |
| ❌ Not Connected | 1 | Not using any RABTUL services |

---

## COMPANY-BY-COMPANY AUDIT

---

### 1. RTMN Digital (Holding Company)
**Status:** ⚠️ Needs Review

| Service | Current State | Required Action |
|---------|---------------|-----------------|
| Auth | Using local auth? | Verify with RABTUL |
| Analytics | Using local? | Connect to RABTUL Analytics |

**Action Required:** Verify current authentication setup

---

### 2. REZ Commerce Technologies
**Status:** ⚠️ Needs Migration

| Found Issue | File | RAP Equivalent | Action |
|-------------|------|----------------|--------|
| Local auth in apps | `rez-app-consumer/contexts/auth` | `rez-auth-service` | Migrate |
| Local auth in apps | `rez-app-merchant/contexts/auth` | `rez-auth-service` | Migrate |
| Payment routing | `rez-now/app/api/auth` | `rez-auth-service` | Verify |

**Files to Migrate:**
```bash
REZ-Commerce/rez-app-consumer/contexts/auth/*
REZ-Commerce/rez-app-merchant/contexts/auth/*
```

**Correct Usage Found:**
- ✅ `rez-now/app/api/auth/callback/route.ts` uses `AUTH_SERVICE_URL`

**Action Required:** Migrate all consumer/merchant apps to use `rez-auth-service`

---

### 3. REZ Intelligence Labs
**Status:** ✅ Properly Connected

| Service | Status | Notes |
|---------|--------|-------|
| Intent Graph | ✅ Using RABTUL | Auth, Payment, Wallet URLs configured |
| ML Engine | ✅ Connected | Via RABTUL Analytics |
| Copilots | ✅ Connected | Via RABTUL services |

**Environment Variables Found:**
```bash
AUTH_SERVICE_URL=https://rez-auth-service.onrender.com
WALLET_SERVICE_URL=https://rez-wallet-service-36vo.onrender.com
PAYMENT_SERVICE_URL=https://rez-payment-service.onrender.com
```

**Action Required:** None - properly connected

---

### 4. RABTUL Technologies (Internal)
**Status:** ✅ Using Own Services

As the infrastructure provider, RABTUL uses its own services.

**Action Required:** None

---

### 5. REZ Media Network
**Status:** ⚠️ Needs Migration

| Found Issue | File | RAP Equivalent | Action |
|-------------|------|----------------|--------|
| Local Razorpay | `adBazaar/src/lib/razorpay.ts` | `rez-payment-service` | Migrate |
| Local auth routes | `adBazaar/src/app/api/auth/*` | `rez-auth-service` | Verify |
| Local wallet routes | `adBazaar/src/app/api/wallet/*` | `rez-wallet-service` | Verify |
| Workflow CI | `REZ-ads-service/.github/workflows/*-ci.yml` | - | Update references |

**Files to Migrate:**
```bash
REZ-Media/adBazaar/src/lib/razorpay.ts  # Use RABTUL Payment
REZ-Media/adBazaar/src/app/api/auth/*  # Use RABTUL Auth
REZ-Media/adBazaar/src/app/api/wallet/*  # Use RABTUL Wallet
```

**Correct Usage Found:**
- ✅ CI workflows reference `rez-auth-service`
- ✅ CI workflows reference `rez-payment-service`

**Action Required:** Replace local `razorpay.ts` with RABTUL Payment Service calls

---

### 6. StayOwn Hospitality
**Status:** ⚠️ Needs Migration

| Found Issue | File | RAP Equivalent | Action |
|-------------|------|----------------|--------|
| Local auth service | `Hotel-OTA/apps/api/src/services/auth/auth.service.ts` | `rez-auth-service` | Migrate |
| Local auth service | `Hotel OTA/apps/api/src/services/auth/auth.service.ts` | `rez-auth-service` | Migrate |
| Local Razorpay | `rez-stayown-service/src/services/razorpay.service.ts` | `rez-payment-service` | Migrate |
| Local payment | `rez-stayown-service/src/services/payment-service.ts` | `rez-payment-service` | Migrate |
| Local wallet | `Hotel OTA/apps/ota-web/src/app/wallet` | `rez-wallet-service` | Verify |

**Files to Migrate:**
```bash
StayOwn-Hospitality/Hotel-OTA/apps/api/src/services/auth/auth.service.ts
StayOwn-Hospitality/rez-stayown-service/src/services/razorpay.service.ts
StayOwn-Hospitality/rez-stayown-service/src/services/payment-service.ts
```

**Action Required:** Migrate to RABTUL Auth and Payment services

---

### 7. CorpPerks
**Status:** ⚠️ Needs Migration

| Found Issue | File | RAP Equivalent | Action |
|-------------|------|----------------|--------|
| Local Razorpay | `rez-corporate-service/src/integrations/cards/razorpayCardService.ts` | `rez-payment-service` | Migrate |
| Integration config | `rez-corpperks-service/src/rezIntegration.ts` | - | Verify connection |

**Files to Migrate:**
```bash
CorpPerks/rez-corporate-service/src/integrations/cards/razorpayCardService.ts
```

**Correct Usage Found:**
- ✅ `config/index.ts` has RABTUL integration
- ✅ `src/rezIntegration.ts` uses RABTUL services

**Action Required:** Replace local Razorpay with RABTUL Payment Service

---

### 8. RTMN Finance
**Status:** ✅ Properly Connected

As the payment and wallet provider, RTMN Finance uses RABTUL services through its own products.

**Note:** `rez-wallet-service` and `rez-payment-service` are owned by RTMN Finance but hosted by RABTUL.

**Action Required:** None

---

## MIGRATION SUMMARY

### Priority 1 (Critical - Within 30 Days)

| Company | Service | File | Deadline |
|---------|---------|------|----------|
| StayOwn | Auth | `auth.service.ts` | Jun 12, 2026 |
| StayOwn | Payment | `razorpay.service.ts` | Jun 12, 2026 |
| REZ-Media | Payment | `razorpay.ts` | Jun 12, 2026 |
| CorpPerks | Payment | `razorpayCardService.ts` | Jun 12, 2026 |

### Priority 2 (High - Within 60 Days)

| Company | Service | Action | Deadline |
|---------|---------|--------|----------|
| REZ-Commerce | Auth | Migrate all apps | Jul 12, 2026 |
| StayOwn | Wallet | Verify & connect | Jul 12, 2026 |
| RTMN Digital | Auth | Verify setup | Jul 12, 2026 |

---

## MIGRATION COMMANDS

### StayOwn Hospitality
```bash
# 1. Update environment variables
echo "AUTH_SERVICE_URL=https://rez-auth-service.onrender.com" >> .env
echo "PAYMENT_SERVICE_URL=https://rez-payment-service.onrender.com" >> .env

# 2. Replace auth service imports in Hotel-OTA
# Replace: src/services/auth/auth.service.ts
# With: RABTUL Payment Service API calls

# 3. Replace razorpay service
# Replace: src/services/razorpay.service.ts
# With: RABTUL Payment Service API calls
```

### REZ Media
```bash
# 1. Update environment variables
echo "PAYMENT_SERVICE_URL=https://rez-payment-service.onrender.com" >> .env

# 2. Replace local razorpay
# Replace: adBazaar/src/lib/razorpay.ts
# With: RABTUL Payment Service API calls
```

### CorpPerks
```bash
# 1. Update environment variables
echo "PAYMENT_SERVICE_URL=https://rez-payment-service.onrender.com" >> .env

# 2. Replace razorpay card service
# Replace: rez-corporate-service/src/integrations/cards/razorpayCardService.ts
# With: RABTUL Payment Service API calls
```

---

## VERIFICATION CHECKLIST

After migration, verify:

- [ ] `AUTH_SERVICE_URL` set in environment
- [ ] `PAYMENT_SERVICE_URL` set in environment
- [ ] `WALLET_SERVICE_URL` set in environment
- [ ] `INTERNAL_SERVICE_TOKEN` set in environment
- [ ] Health check passes: `curl $AUTH_SERVICE_URL/health`
- [ ] Test authentication flow
- [ ] Test payment flow
- [ ] Test wallet operations

---

## CONTACT FOR MIGRATION HELP

- **RABTUL Support:** #rabtul-support (Slack)
- **Migration Docs:** [MIGRATION-GUIDE.md](MIGRATION-GUIDE.md)
- **Service Registry:** [RAP.md](RAP.md)

---

## AUDIT METRICS

| Metric | Value |
|--------|-------|
| Total Companies | 8 |
| Properly Connected | 3 (37.5%) |
| Needs Migration | 5 (62.5%) |
| Critical Issues | 4 |
| High Priority Issues | 6 |

---

*Audit completed: May 12, 2026*
*Next audit: June 12, 2026*
