# REZ COMMERCE OS - COMPLETE DOCUMENTATION
**Date:** May 12, 2026
**Version:** 8.0

---

# TABLE OF CONTENTS

1. [Platform Overview](#1-platform-overview)
2. [9 Companies](#2-nine-companies)
3. [Service Architecture](#3-service-architecture)
4. [Data Flows](#4-data-flows)
5. [API References](#5-api-references)
6. [Integration Matrix](#6-integration-matrix)
7. [Deployment](#7-deployment)
8. [Security](#8-security)

---

# 1. PLATFORM OVERVIEW

## Vision
REZ Commerce OS is a unified commerce platform connecting consumers, merchants, creators, and enterprises through AI-powered intelligence.

## Core Pillars

| Pillar | Description |
|--------|-------------|
| **Identity** | Unified user/merchant identity across apps |
| **Intelligence** | AI-powered insights and predictions |
| **Commerce** | Orders, payments, loyalty |
| **Trust** | Fraud prevention, BNPL, capital |
| **Engagement** | Ads, referrals, gamification |

---

# 2. NINE COMPANIES

## Company Overview

| # | Company | Purpose | Services | Apps |
|---|---------|---------|----------|------|
| 1 | RTNM-Group | Controls + Financial | 11 | 1 |
| 2 | RABTUL-Technologies | Infrastructure | 30+ | - |
| 3 | REZ-Intelligence | AI/ML Platform | 67+ | - |
| 4 | REZ-Media | Engagement | 25+ | 2 |
| 5 | REZ-Merchant | Industry OS | 10+ | 2 |
| 6 | REZ-Consumer | Consumer Apps | 15+ | 6 |
| 7 | StayOwn-Hospitality | Hotels | 7+ | 1 |
| 8 | CorpPerks | Enterprise | 6+ | 1 |
| 9 | RTNM-Digital | Trust + Operations | 2 | - |

**TOTAL: 170+ Services | 14 Apps**

---

# 3. SERVICE ARCHITECTURE

## 3.1 RTNM-Group (Controls + Financial)

### Services

| Service | Port | Purpose |
|---------|------|---------|
| REZ-access-control-service | 3001 | RBAC/ABAC |
| REZ-compliance-platform | 3002 | GDPR, DPDP |
| REZ-financial-ledger-platform | 3003 | Revenue, Settlements |
| REZ-identity-service | 3004 | Identity |
| REZ-central-permissions | 3005 | Central RBAC |
| REZ-bnpl-service | 3006 | Buy Now Pay Later |
| REZ-capital-service | 3007 | Capital financing |
| REZ-trust-service | 3008 | Trust/Reputation |
| REZ-trust-admin | - | Trust Dashboard |

### APIs
```
POST /api/trust/:userId
POST /api/bnpl/initialize
POST /api/capital/apply
POST /api/access/check
```

---

## 3.2 RABTUL-Technologies (Infrastructure)

### Services

| Service | Port | Purpose |
|---------|------|---------|
| api-gateway | 4000 | API routing |
| rez-auth-service | 4001 | JWT, OAuth, MFA |
| rez-payment-service | 4002 | Razorpay, Stripe |
| rez-wallet-service | 4003 | Digital wallet |
| rez-order-service | 4004 | Order management |
| rez-catalog-service | 4005 | Product catalog |
| rez-search-service | 4006 | Search |
| rez-profile-service | 4007 | User profiles |
| rez-booking-service | 4008 | Bookings |
| rez-delivery-service | 4009 | Delivery |
| rez-analytics-service | 4010 | Analytics |
| rez-audit-service | 4011 | Audit logging |
| rez-notifications-service | 4012 | Push, SMS, Email |
| rez-scheduler-service | 4013 | Job scheduling |
| rez-contracts | 4014 | Smart contracts |
| REZ-privacy-layer | 4015 | Transaction masking |
| REZ-circuit-breaker | 4016 | Resilience |
| REZ-retry-service | 4017 | BullMQ retry |
| REZ-dlq-service | 4018 | Dead letter queue |
| REZ-idempotency-service | 4019 | Idempotency |

### APIs
```
POST /api/auth/login
POST /api/wallet/earn
POST /api/payments/create
POST /api/notifications/send
POST /api/privacy/mask-transaction
```

---

## 3.3 REZ-Intelligence (AI/ML Platform)

### Core AI

| Service | Port | Purpose |
|---------|------|---------|
| REZ-MIND | 4040 | Core AI brain |
| REZ-action-engine | 4041 | Action execution |
| REZ-agent-orchestrator | 4042 | Multi-agent |
| REZ-autonomous-agents | 4043 | Autonomous agents |

### Intelligence

| Service | Port | Purpose |
|---------|------|---------|
| REZ-identity-graph | 4050 | Identity resolution |
| REZ-consumer-graph | 4051 | Consumer identity |
| REZ-merchant-360 | 4052 | Merchant identity |
| REZ-intent-graph | 4053 | Intent tracking |
| REZ-personalization-engine | 4054 | Personalization |
| REZ-recommendation-engine | 4055 | Recommendations |

### Data

| Service | Port | Purpose |
|---------|------|---------|
| REZ-data-platform | 4060 | Data lake |
| REZ-stream-processing | 4061 | Kafka streaming |
| REZ-cdp-service | 4062 | CDP |
| REZ-feature-store | 4063 | ML features |
| REZ-event-bus | 4064 | Event bus |

### Analytics

| Service | Port | Purpose |
|---------|------|---------|
| REZ-analytics-orchestrator | 4070 | Analytics |
| REZ-attribution-system | 4071 | Attribution |
| REZ-ab-testing-service | 4072 | A/B testing |

---

## 3.4 REZ-Media (Engagement)

### Services

| Service | Purpose |
|---------|---------|
| REZ-attribution-platform | Offline attribution |
| REZ-referral-graph | AI referral network |
| AdBazaar | Ad marketplace |
| adsqr | QR ads |
| creators | Creator platform |
| REZ-gamification-service | Points, badges |
| REZ-engagement-platform | Loyalty, offers |

### APIs
```
POST /api/attribution/track
POST /api/referral/invite
POST /api/campaigns
```

---

## 3.5 REZ-Merchant (Industry OS)

### Services

| Service | Purpose |
|---------|---------|
| REZ-dashboard | Merchant dashboard |
| rez-merchant-service | Merchant API |
| rez-merchant-copilot | Merchant AI |
| industry-os | Restaurant, Hotel, Salon, Fitness |

### APIs
```
POST /api/products
GET /api/products/serial/:serial
POST /api/warranty/activated
```

---

## 3.6 REZ-Consumer (Consumer Apps)

### Services

| Service | Purpose |
|---------|---------|
| verify-qr-service | Product warranty |
| REZ-scan | QR Scanner |
| REZ-expense | Receipt Scanner |
| REZ-bills | Smart Receipts |
| REZ-assistant | AI Chat |
| REZ-save | Wishlist |
| REZ-nearby | Classifieds |
| REZ-inbox | Email Import |
| rez-now | Instant commerce |
| rez-web-menu | Restaurant menu |

### Mobile Apps

| App | Purpose |
|-----|---------|
| REZ-scan-ui | QR scanning |
| REZ-expense-ui | Expense |
| REZ-assistant-ui | AI chat |
| REZ-save-ui | Wishlists |
| REZ-bills-ui | Smart receipts |

### APIs
```
POST /api/verify
POST /api/scan
POST /api/expense/add
POST /api/bills/scan
POST /api/assistant/chat
```

---

## 3.7 StayOwn-Hospitality (Hotels)

### Services

| Service | Purpose |
|---------|---------|
| Hotel OTA | Hotel booking |
| verify-service | Room access |
| rez-stayown-service | Room service |
| rez-channel-manager | Channel manager |

### APIs
```
POST /api/bookings
POST /api/checkin
POST /api/verify
```

---

## 3.8 CorpPerks (Enterprise)

### Services

| Service | Purpose |
|---------|---------|
| rez-corpperks-service | Corporate perks |
| corpperks-landing | Landing page |

---

## 3.9 RTNM-Digital (Trust + Operations)

### Services

| Service | Purpose |
|---------|---------|
| REZ-trust-platform | Fraud, Risk, AML |
| REZ-ops-center | Escalations, Refunds |

---

# 4. DATA FLOWS

## 4.1 User Registration Flow

```
User Signup (REZ-Consumer)
    ↓
Auth (RABTUL)
    ↓
Create Wallet (RABTUL)
    ↓
Create Profile (REZ-Intelligence)
    ↓
Issue JWT (RABTUL)
    ↓
Return token to user
```

## 4.2 QR Scan → Purchase Flow

```
Scan QR (REZ-Consumer)
    ↓
Track Intent (REZ-Intelligence)
    ↓
Verify Product (verify-qr)
    ↓
Create Order (RABTUL)
    ↓
Process Payment (RABTUL)
    ↓
Attribution Report (REZ-Media)
    ↓
Update Trust Score (RTNM-Group)
    ↓
Send Notification (RABTUL)
```

## 4.3 Warranty Activation Flow

```
Scan Product QR
    ↓
Verify Authenticity
    ↓
Activate Warranty
    ↓
Link to Customer
    ↓
Notify Merchant
    ↓
Add Cashback to Wallet
    ↓
Send WhatsApp Confirmation
    ↓
Track to Intelligence
```

## 4.4 Referral Flow

```
Create Referral Code
    ↓
Share Link
    ↓
Friend Signs Up
    ↓
Activate Referral
    ↓
Calculate Quality Score
    ↓
Reward Referrer (Wallet)
    ↓
Track to Intelligence
    ↓
Update Network Graph
```

## 4.5 Bill Scan → Cashback Flow

```
Scan Receipt
    ↓
Extract Data (OCR)
    ↓
Detect Warranty
    ↓
Calculate Cashback
    ↓
Claim Cashback
    ↓
Add to Wallet
    ↓
Generate Tax Record
    ↓
Track to Intelligence
```

---

# 5. API REFERENCES

## 5.1 Authentication

```javascript
// Register
POST /api/auth/register
{ phone, name, email }

// Login
POST /api/auth/login
{ phone, otp }

// Verify Token
POST /api/auth/verify
Headers: { Authorization: Bearer <token> }
```

## 5.2 Wallet

```javascript
// Create Wallet
POST /api/wallet/create

// Earn (Cashback)
POST /api/wallet/earn
{ user_id, amount, source, reason }

// Transfer
POST /api/wallet/transfer
{ from_user_id, to_user_id, amount }
```

## 5.3 Verify QR

```javascript
// Verify Product
POST /api/verify
{ serial_number, user_id, location }

// Activate Warranty
POST /api/activate-warranty
{ serial_number, user_id, customer_name, customer_phone }

// File Claim
POST /api/claim
{ warranty_id, issue_type, description }
```

## 5.4 Attribution

```javascript
// Track Touchpoint
POST /api/track/touchpoint
{ user_id, campaign_id, type, timestamp }

// Track Conversion
POST /api/track/conversion
{ user_id, campaign_id, order_id, value }

// Get Report
GET /api/reports/attribution/:campaignId
```

## 5.5 Referral

```javascript
// Create Code
POST /api/referral/create-code
{ user_id, referral_type }

// Invite
POST /api/referral/invite
{ referrer_id, referee_id, code }

// Activate
POST /api/referral/activate
{ referral_id }

// Stats
GET /api/referral/stats/:userId
```

## 5.6 Privacy

```javascript
// Get Settings
GET /api/privacy/settings/:userId

// Update Settings
PUT /api/privacy/settings/:userId
{ privacy_level, hide_amounts, hide_merchant_names }

// Mask Transaction
POST /api/privacy/mask-transaction
{ user_id, transaction }
```

---

# 6. INTEGRATION MATRIX

## Service Connections

```
┌─────────────────────────────────────────────────────────────────────┐
│ REZ-Consumer │
├─────────────────────────────────────────────────────────────────────┤
│ verify-qr ───→ REZ-Merchant (products, serial) │
│ verify-qr ───→ REZ-Wallet (cashback) │
│ verify-qr ───→ REZ-Agent (notifications) │
│ verify-qr ───→ REZ-Intelligence (intent) │
│ │
│ REZ-scan ───→ REZ-Intelligence (intent) │
│ REZ-scan ───→ verify-qr (product) │
│ │
│ REZ-bills ───→ REZ-Wallet (cashback) │
│ REZ-bills ───→ REZ-Intelligence (spend) │
│ │
│ REZ-expense ───→ REZ-Analytics (track) │
│ │
│ REZ-assistant ───→ REZ-Mind (chat) │
│ REZ-assistant ───→ REZ-Intelligence (intent) │
│ │
│ REZ-save ───→ REZ-Intelligence (intent) │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│ REZ-Media │
├─────────────────────────────────────────────────────────────────────┤
│ REZ-attribution ───→ REZ-Intelligence (attribution) │
│ REZ-attribution ───→ REZ-Analytics (events) │
│ │
│ REZ-referral ───→ REZ-Wallet (rewards) │
│ REZ-referral ───→ REZ-Intelligence (intent) │
│ │
│ adsqr ───→ REZ-attribution (tracking) │
│ adsqr ───→ REZ-Intelligence (intent) │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│ RTNM-Group │
├─────────────────────────────────────────────────────────────────────┤
│ REZ-trust ───→ REZ-bnpl (credit scores) │
│ REZ-trust ───→ REZ-capital (loan eligibility) │
│ REZ-trust ───→ verify-qr (ownership) │
│ │
│ REZ-bnpl ───→ REZ-Wallet (transactions) │
│ REZ-bnpl ───→ REZ-trust (trust scores) │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│ RABTUL-Technologies │
├─────────────────────────────────────────────────────────────────────┤
│ REZ-auth ───→ All services (authentication) │
│ REZ-wallet ───→ All services (payments) │
│ REZ-privacy ───→ All services (masking) │
│ REZ-notifications ───→ All services (alerts) │
└─────────────────────────────────────────────────────────────────────┘
```

---

# 7. DEPLOYMENT

## 7.1 Render (Backend Services)

Each service has `render.yaml`:

```yaml
services:
  - type: web
    name: rez-auth-service
    env: node
    region: singapore
    plan: starter
    buildCommand: npm install
    startCommand: npm start
```

## 7.2 Vercel (Frontend Apps)

```json
{
  "buildCommand": "npm run build",
  "installCommand": "npm install",
  "framework": "nextjs"
}
```

## 7.3 Environment Variables

```env
# RABTUL
AUTH_API=https://rez-auth.onrender.com
WALLET_API=https://rez-wallet.onrender.com

# REZ-Intelligence
MIND_API=https://REZ-mind.onrender.com
INTENT_API=https://rez-intent-graph.onrender.com

# REZ-Consumer
VERIFY_API=https://rez-verify-qr.onrender.com
AGENT_API=https://REZ-agent.onrender.com

# RTNM-Group
TRUST_API=https://rez-trust.onrender.com
BNPL_API=https://rez-bnpl.onrender.com
```

---

# 8. SECURITY

## 8.1 Authentication

- JWT tokens with RS256
- OTP for sensitive operations
- MFA for high-value transactions

## 8.2 Authorization

- RBAC for services
- ABAC for data access
- Central permissions via REZ-central-permissions

## 8.3 Privacy

- REZ-privacy-layer for transaction masking
- GDPR/DPDP compliance via REZ-compliance-platform
- Data encryption at rest and in transit

## 8.4 Fraud Prevention

- REZ-trust-service for trust scores
- REZ-identity-graph for identity resolution
- Real-time fraud detection

---

# APPENDIX: QUICK REFERENCE

## Service URLs (Render)

| Service | URL |
|---------|-----|
| Auth | https://rez-auth.onrender.com |
| Wallet | https://rez-wallet.onrender.com |
| Payments | https://rez-payment.onrender.com |
| Verify QR | https://rez-verify-qr.onrender.com |
| REZ-Mind | https://REZ-mind.onrender.com |
| Intent Graph | https://rez-intent-graph.onrender.com |
| Trust | https://rez-trust.onrender.com |
| BNPL | https://rez-bnpl.onrender.com |

## GitHub Repos

| Company | Repo |
|---------|------|
| RTNM-Group | github.com/imrejaul007/RTNM-Group |
| RABTUL-Technologies | github.com/imrejaul007/RABTUL-Technologies |
| REZ-Intelligence | github.com/imrejaul007/REZ-Intelligence |
| REZ-Media | github.com/imrejaul007/REZ-Media |
| REZ-Merchant | github.com/imrejaul007/REZ-Merchant |
| REZ-Consumer | github.com/imrejaul007/REZ-Consumer |
| StayOwn | github.com/imrejaul007/StayOwn-Hospitality |
| CorpPerks | github.com/imrejaul007/CorpPerks |
| RTNM-Digital | github.com/imrejaul007/RTNM-Digital |

---

**Document Version:** 8.0
**Last Updated:** May 12, 2026
