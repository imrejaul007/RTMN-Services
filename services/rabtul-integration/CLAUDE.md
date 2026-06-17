# RABTUL Integration Service

**Version:** 1.0.0
**Port:** 4963
**Status:** Ready for Development

---

## Overview

RABTUL Integration Service connects RABTUL (Auth, Wallet, Payment) services to Customer Operations, enabling unified customer management across the RTMN ecosystem.

```
┌─────────────────────────────────────────────────────────────────────┐
│                    RABTUL INTEGRATION                                 │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐             │
│  │ RABTUL Auth │    │RABTUL Wallet│    │RABTUL Payment│            │
│  │  (4002)     │    │  (4004)     │    │   (4003)     │             │
│  └──────┬──────┘    └──────┬──────┘    └──────┬──────┘             │
│         │                  │                  │                     │
│         └──────────────────┼──────────────────┘                     │
│                            │                                         │
│                   ┌─────────▼─────────┐                              │
│                   │  RABTUL INTEGRATION│                              │
│                   │    (Port 4963)     │                              │
│                   └─────────┬─────────┘                              │
│                             │                                         │
│    ┌────────────────────────┼────────────────────────┐              │
│    │                        │                        │              │
│    ▼                        ▼                        ▼              │
│ ┌──────────┐      ┌─────────────────┐      ┌──────────────┐         │
│ │ Identity  │      │ CustomerOps     │      │ Payment Twin│         │
│ │ Twin      │◄────►│ Bridge           │◄────►│             │         │
│ │ (4702)    │      │ (4705/TwinHub)   │      │ (3018)      │         │
│ └──────────┘      └─────────────────┘      └──────────────┘         │
│                           │                                        │
│                           ▼                                        │
│                   ┌─────────────────┐                               │
│                   │ Trust Intelligence│                              │
│                   │    (4703)        │                               │
│                   └─────────────────┘                               │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Connections

| Source | Target | Purpose |
|--------|--------|---------|
| RABTUL Auth | Identity Twin (4702) | User identity sync |
| RABTUL Wallet | Payment Twin (3018) | Wallet data sync |
| RABTUL Payment | Payment Twin (3018) | Transaction sync |
| Trust Scorer | Trust Intelligence (4703) | Risk/trust data |

---

## API Endpoints

### Health & Info
- `GET /health` - Service health check
- `GET /api/info` - Service information

### Auth Routes (`/api/auth`)
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - User login
- `GET /api/auth/profile/:id` - Get user profile
- `PUT /api/auth/profile/:id` - Update profile
- `POST /api/auth/kyc` - Submit KYC verification
- `GET /api/auth/verify/:token` - Verify token
- `POST /api/auth/logout` - Logout user

### Wallet Routes (`/api/wallet`)
- `POST /api/wallet/create` - Create wallet
- `GET /api/wallet/:id` - Get wallet details
- `GET /api/wallet/corpid/:corpid` - Get wallets by corpid
- `POST /api/wallet/:id/deposit` - Deposit funds
- `POST /api/wallet/:id/withdraw` - Withdraw funds
- `POST /api/wallet/:id/transfer` - Transfer between wallets
- `GET /api/wallet/:id/transactions` - Transaction history
- `PUT /api/wallet/:id/freeze` - Freeze wallet
- `PUT /api/wallet/:id/unfreeze` - Unfreeze wallet

### Payment Routes (`/api/payment`)
- `POST /api/payment/profile` - Create/update payment profile
- `GET /api/payment/profile/:corpid` - Get payment profile
- `POST /api/payment/method` - Add payment method
- `DELETE /api/payment/method/:profileId/:methodId` - Remove payment method
- `POST /api/payment/intent` - Create payment intent
- `GET /api/payment/intent/:id` - Get payment intent
- `POST /api/payment/intent/:id/confirm` - Confirm payment
- `POST /api/payment/intent/:id/cancel` - Cancel payment
- `GET /api/payment/verify` - Verify payment method
- `POST /api/payment/refund` - Process refund

### Ledger Routes (`/api/ledger`)
- `POST /api/ledger/entry` - Create ledger entry
- `GET /api/ledger/:corpid` - Get ledger entries
- `GET /api/ledger/:corpid/balance` - Get balance
- `GET /api/ledger/:corpid/entry/:entryId` - Get specific entry
- `POST /api/ledger/:corpid/reverse/:entryId` - Reverse entry
- `POST /api/ledger/reconcile` - Reconcile ledger
- `GET /api/ledger/export/:corpid` - Export ledger

---

## Services

### CustomerOpsBridge
Connects RABTUL services to Customer Operations (TwinOS Hub, Identity Twin).

**Methods:**
- `syncIdentity(data)` - Sync user identity
- `syncWallet(data)` - Sync wallet data
- `syncPaymentProfile(data)` - Sync payment profile
- `getCustomerTwin(corpid)` - Get customer twin data
- `bulkSync(customers)` - Bulk sync customers

### TrustSync
Synchronizes trust scores and risk data with Trust Intelligence.

**Methods:**
- `updateTrustScore(update)` - Update trust score
- `recordEvent(event)` - Record trust event
- `getTrustScore(corpid)` - Get trust score
- `assessTransactionRisk(data)` - Assess transaction risk
- `reportFraud(data)` - Report fraud

### PaymentSync
Synchronizes payment data with Payment Twin.

**Methods:**
- `syncTransaction(transaction)` - Sync single transaction
- `syncTransactionBatch(transactions)` - Batch sync
- `syncRefund(refund)` - Sync refund
- `syncReconciliation(reconciliation)` - Sync reconciliation
- `getPaymentSummary(corpid)` - Get payment summary
- `verifyTransaction(transactionId)` - Verify transaction

---

## Data Models

### RABTULAuthProfile
```typescript
{
  id: string;
  corpid?: string;
  email: string;
  phone?: string;
  firstName?: string;
  lastName?: string;
  status: 'active' | 'suspended' | 'inactive';
  kycStatus: 'pending' | 'verified' | 'rejected' | 'not_required';
  createdAt: Date;
  updatedAt: Date;
}
```

### RABTULWalletProfile
```typescript
{
  id: string;
  corpid: string;
  balance: number;
  currency: string;
  walletType: 'personal' | 'business' | 'escrow';
  status: 'active' | 'frozen' | 'closed';
  dailyLimit?: number;
  monthlyLimit?: number;
}
```

### RABTULPaymentProfile
```typescript
{
  id: string;
  corpid: string;
  paymentMethods: PaymentMethod[];
  transactionLimits: TransactionLimits;
  riskLevel: 'low' | 'medium' | 'high';
  fraudScore?: number;
}
```

---

## Environment Variables

```bash
# Service
PORT=4963

# RABTUL Services
RABTUL_AUTH_URL=http://localhost:4002
RABTUL_WALLET_URL=http://localhost:4004
RABTUL_PAYMENT_URL=http://localhost:4003

# Twin Services
IDENTITY_TWIN_URL=http://localhost:4702
PAYMENT_TWIN_URL=http://localhost:3018
TRUST_INTELLIGENCE_URL=http://localhost:4703
CUSTOMER_OPS_URL=http://localhost:4705

# Integration
EVENT_BUS_URL=http://localhost:4510
GRAPHQL_FEDERATION_URL=http://localhost:4000
```

---

## Running the Service

```bash
# Install dependencies
cd services/rabtul-integration
npm install

# Development
npm run dev

# Production
npm run build
npm start

# Health check
curl http://localhost:4963/health
```

---

## Integration Flow

### 1. User Registration
1. User registers via `/api/auth/register`
2. Profile created in RABTUL Auth
3. Identity synced to Identity Twin via CustomerOpsBridge
4. Trust score initialized via TrustSync

### 2. Wallet Creation
1. Wallet created via `/api/wallet/create`
2. Wallet synced to Payment Twin via CustomerOpsBridge
3. Initial trust assessment via TrustSync

### 3. Payment Processing
1. Payment intent created via `/api/payment/intent`
2. Transaction synced to Payment Twin via PaymentSync
3. Trust score updated based on payment result
4. Ledger entry created via `/api/ledger/entry`

### 4. Trust Assessment
1. Transaction risk assessed via TrustSync
2. Risk score calculated from payment profile
3. Trust score updated in Trust Intelligence
4. Fraud flags set if needed

---

## Status Codes

| Code | Description |
|------|-------------|
| 200 | Success |
| 201 | Created |
| 400 | Bad Request |
| 401 | Unauthorized |
| 404 | Not Found |
| 500 | Server Error |

---

## Dependencies

- Express.js - Web framework
- TypeScript - Type safety
- Winston - Logging
- Axios - HTTP client
- UUID - ID generation
- Helmet - Security
- CORS - Cross-origin support

---

**Last Updated:** June 16, 2026
