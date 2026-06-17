# Payment Twin Service

**Version:** 1.0.0
**Port:** 4901
**Status:** Development Ready

Payment Twin is a comprehensive payment tracking service that manages payments, transactions, refunds, and wallets with full multi-tenant support.

---

## Features

- **Multi-tenant Architecture** - Complete tenant isolation via `x-tenant-id` header
- **Payment Processing** - Create, process, cancel, and track payments
- **Multiple Payment Methods** - Card, UPI, Netbanking, Wallet, Bank Transfer, COD, Crypto
- **Multiple Gateways** - Stripe, Razorpay, Paytm, PhonePe, Cashfree, Internal
- **Refund Management** - Full and partial refunds with reason tracking
- **Wallet System** - Customer wallets with topup, withdrawal, and transfer
- **Transaction History** - Complete audit trail of all financial operations
- **Analytics Dashboard** - Payment, refund, wallet, and customer analytics
- **Security** - Helmet, CORS, input validation with Zod

---

## Quick Start

```bash
# Install dependencies
cd services/payment-twin
npm install

# Copy environment file
cp .env.example .env

# Start the service
npm run dev
```

Service will be available at `http://localhost:4901`

---

## Configuration

### Environment Variables

```env
PORT=4901
MONGODB_URI=mongodb://localhost:27017/payment_twin
SERVICE_NAME=payment-twin
DEFAULT_TENANT=rtmn
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:4000
LOG_LEVEL=info
```

### Gateway Configuration

```env
STRIPE_API_KEY=sk_test_xxxxx
STRIPE_WEBHOOK_SECRET=whsec_xxxxx
RAZORPAY_KEY_ID=rzp_test_xxxxx
RAZORPAY_KEY_SECRET=xxxxx
```

---

## API Reference

### Health Check

```bash
GET /health
```

### Payments

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/payments` | Create new payment |
| GET | `/api/payments` | List payments (with filters) |
| GET | `/api/payments/:paymentId` | Get payment details |
| PATCH | `/api/payments/:paymentId` | Update payment |
| POST | `/api/payments/:paymentId/process` | Process payment |
| POST | `/api/payments/:paymentId/cancel` | Cancel payment |
| GET | `/api/payments/stats/summary` | Payment statistics |

#### Create Payment

```bash
POST /api/payments
Content-Type: application/json
X-Tenant-ID: rtmn

{
  "customerId": "cust_123",
  "orderId": "order_456",
  "amount": 1000.00,
  "currency": "INR",
  "method": "upi",
  "gateway": "razorpay",
  "customerEmail": "customer@example.com",
  "description": "Order payment"
}
```

**Payment Statuses:** `pending`, `processing`, `success`, `failed`, `refunded`, `partial_refund`, `cancelled`, `expired`

---

### Refunds

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/refunds` | Create refund |
| GET | `/api/refunds` | List refunds |
| GET | `/api/refunds/:refundId` | Get refund details |
| PATCH | `/api/refunds/:refundId` | Update refund |
| POST | `/api/refunds/:refundId/process` | Process refund |
| POST | `/api/refunds/:refundId/cancel` | Cancel refund |
| GET | `/api/refunds/stats/summary` | Refund statistics |

#### Create Refund

```bash
POST /api/refunds
Content-Type: application/json
X-Tenant-ID: rtmn

{
  "paymentId": "PAY-RTMN-xxxxx",
  "amount": 500.00,
  "reason": "customer_request",
  "reasonDescription": "Customer requested cancellation",
  "initiatedBy": "admin@company.com",
  "refundToWallet": true
}
```

**Refund Reasons:** `customer_request`, `duplicate`, `fraudulent`, `order_cancelled`, `service_not_rendered`, `product_returned`, `other`

---

### Wallets

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/wallets` | Create wallet |
| GET | `/api/wallets` | List wallets |
| GET | `/api/wallets/:walletId` | Get wallet details |
| PATCH | `/api/wallets/:walletId` | Update wallet |
| POST | `/api/wallets/:walletId/topup` | Topup wallet |
| POST | `/api/wallets/:walletId/withdraw` | Withdraw from wallet |
| POST | `/api/wallets/:walletId/transfer` | Transfer between wallets |
| GET | `/api/wallets/:walletId/transactions` | Wallet transactions |
| GET | `/api/wallets/:walletId/stats` | Wallet statistics |
| POST | `/api/wallets/:walletId/close` | Close wallet |

#### Create Wallet

```bash
POST /api/wallets
Content-Type: application/json
X-Tenant-ID: rtmn

{
  "customerId": "cust_123",
  "type": "customer",
  "currency": "INR",
  "customerEmail": "customer@example.com",
  "customerName": "John Doe"
}
```

**Wallet Types:** `customer`, `merchant`, `business`, `escrow`
**Wallet Statuses:** `active`, `inactive`, `suspended`, `closed`

---

### Analytics

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/analytics/payments` | Payment analytics |
| GET | `/api/analytics/refunds` | Refund analytics |
| GET | `/api/analytics/wallets` | Wallet analytics |
| GET | `/api/analytics/transactions` | Transaction analytics |
| GET | `/api/analytics/customers` | Customer analytics |
| GET | `/api/analytics/dashboard` | Dashboard summary |

#### Date Range Filter

```bash
GET /api/analytics/payments?from=2026-01-01&to=2026-06-30
```

---

## Data Models

### Payment

```typescript
{
  paymentId: string;           // PAY-RTMN-xxxxx
  tenantId: string;
  customerId: string;
  orderId?: string;
  invoiceId?: string;
  amount: number;
  refundedAmount: number;
  currency: string;
  method: 'card' | 'upi' | 'netbanking' | 'wallet' | 'bank_transfer' | 'cod' | 'crypto';
  gateway: 'stripe' | 'razorpay' | 'paytm' | 'phonepe' | 'cashfree' | 'internal';
  status: PaymentStatus;
  gatewayTransactionId?: string;
  gatewayResponse?: object;
  cardLast4?: string;
  cardBrand?: string;
  customerEmail?: string;
  customerPhone?: string;
  refundIds: string[];
  createdAt: Date;
  updatedAt: Date;
  processedAt?: Date;
}
```

### Transaction

```typescript
{
  transactionId: string;       // TXN-RTMN-xxxxx
  tenantId: string;
  paymentId: string;
  customerId: string;
  type: 'payment' | 'refund' | 'withdrawal' | 'deposit' | 'transfer' | 'fee' | 'chargeback';
  status: TransactionStatus;
  amount: number;
  currency: string;
  fee?: number;
  netAmount: number;
  balanceBefore?: number;
  balanceAfter?: number;
  walletId?: string;
  createdAt: Date;
}
```

### Refund

```typescript
{
  refundId: string;            // REF-RTMN-xxxxx
  tenantId: string;
  paymentId: string;
  customerId: string;
  amount: number;
  currency: string;
  status: RefundStatus;
  reason: RefundReason;
  reasonDescription?: string;
  initiatedBy: string;
  initiatedAt: Date;
  processedAt?: Date;
  refundToWallet: boolean;
  createdAt: Date;
}
```

### Wallet

```typescript
{
  walletId: string;           // WAL-RTMN-xxxxx
  tenantId: string;
  customerId: string;
  type: WalletType;
  balance: number;
  availableBalance: number;
  pendingBalance: number;
  lockedBalance: number;
  currency: string;
  status: WalletStatus;
  dailyLimit: number;
  monthlyLimit: number;
  perTransactionLimit: number;
  transactionHistory: WalletTransaction[];
  createdAt: Date;
  updatedAt: Date;
}
```

---

## Multi-Tenant Support

All API requests require the `X-Tenant-ID` header:

```bash
curl -H "X-Tenant-ID: rtmn" http://localhost:4901/api/payments
```

Default tenant: `rtmn` (fallback if header not provided)

---

## Error Handling

All error responses follow this format:

```json
{
  "success": false,
  "error": "Error message",
  "details": []  // Zod validation errors
}
```

---

## File Structure

```
services/payment-twin/
├── package.json
├── tsconfig.json
├── .env.example
├── CLAUDE.md
└── src/
    ├── index.ts           # Main server
    ├── models/
    │   ├── Payment.ts     # Payment schema
    │   ├── Transaction.ts # Transaction schema
    │   ├── Refund.ts      # Refund schema
    │   ├── Wallet.ts      # Wallet schema
    │   └── index.ts
    ├── routes/
    │   ├── payments.ts    # Payment routes
    │   ├── refunds.ts     # Refund routes
    │   ├── wallet.ts      # Wallet routes
    │   └── index.ts
    ├── services/
    │   └── analytics.ts   # Analytics service
    ├── middleware/
    │   └── tenant.ts      # Tenant middleware
    └── utils/
        └── logger.ts      # Winston logger
```

---

## Related Services

- **REZ-ecosystem-connector** (4399) - Service Registry
- **REZ-event-bus** (4510) - Pub/Sub Events
- **RABTUL Wallet Service** (4004) - Payment Processing
- **CorpID Service** (4702) - Identity

---

*Last Updated: June 2026*
