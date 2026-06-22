# ReZ Payment Links Service

A comprehensive payment links service with UPI integration for creating, managing, and tracking payment requests in the ReZ ecosystem.

## Features

- **Payment Link Creation**: Generate unique payment links with customizable expiry
- **QR Code Generation**: Automatic QR code generation for UPI payments
- **Short URLs**: Branded short URLs for easy sharing
- **Multi-channel Sharing**: SMS, WhatsApp, and email delivery
- **Webhook Notifications**: Real-time payment status updates
- **Refund Management**: Partial and full refunds
- **Usage Limits**: Single or multi-use payment links
- **Merchant Management**: Per-merchant payment link tracking
- **Security**: HMAC signature verification for webhooks

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                 ReZ Payment Links Service                        │
├─────────────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐  │
│  │  Express API │  │   QR Code    │  │    Webhook            │  │
│  │   (REST)     │  │   Generator  │  │    Handler            │  │
│  └──────┬───────┘  └──────┬───────┘  └──────────┬───────────┘  │
│         │                   │                     │               │
│  ┌──────▼───────────────────▼─────────────────────▼───────────┐  │
│  │                    Payment Service                           │  │
│  │  ┌──────────────┐ ┌──────────────┐ ┌──────────────────┐   │  │
│  │  │   Payment    │ │   Refund     │ │   Notification   │   │  │
│  │  │   Service    │ │   Service    │ │   Service        │   │  │
│  │  └──────────────┘ └──────────────┘ └──────────────────┘   │  │
│  └─────────────────────────────────────────────────────────────┘  │
│                             │                                    │
│  ┌──────────────────────────▼────────────────────────────────┐  │
│  │                    External Services                        │  │
│  │  ┌──────────────┐ ┌──────────────┐ ┌──────────────────┐   │  │
│  │  │   UPI API    │ │   SMS API    │ │   WhatsApp API   │   │  │
│  │  └──────────────┘ └──────────────┘ └──────────────────┘   │  │
│  └────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

## Installation

```bash
npm install
```

## Configuration

Create a `.env` file:

```env
PORT=3008
NODE_ENV=development

# Base URL Configuration
BASE_URL=https://pay.rezpay.in
SHORT_URL_BASE=https://pay.rezpay.in/l

# Security
WEBHOOK_SECRET=your_webhook_secret
API_KEY=your_api_key

# UPI Configuration
UPI_MERCHANT_ID=your_merchant_id
UPI_API_KEY=your_upi_api_key
UPI_API_URL=https://api.upi.com

# Notification Services
SMS_API_KEY=your_sms_api_key
SMS_API_URL=https://api.sms.com
WHATSAPP_API_KEY=your_whatsapp_api_key
WHATSAPP_API_URL=https://api.whatsapp.com
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=notifications@rezpay.in
SMTP_PASS=your_smtp_password

# Rate Limiting
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX_REQUESTS=100
```

## Running the Service

### Development Mode

```bash
npm run dev
```

### Production Mode

```bash
npm run build
npm start
```

## API Endpoints

### Health & Info

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Service health check |
| GET | `/` | Service information |

### Payment Links

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/payment-links` | Create a new payment link |
| GET | `/api/payment-links` | List payment links |
| GET | `/api/payment-links/:id` | Get payment link by ID |
| GET | `/api/payment-links/short/:shortId` | Get by short URL ID |
| GET | `/api/payment-links/:id/status` | Get payment status |
| DELETE | `/api/payment-links/:id` | Cancel payment link |
| POST | `/api/payment-links/:id/share` | Share payment link |

### QR Codes

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/payment-links/:id/qr` | Get QR code image |
| POST | `/api/qr/generate` | Generate QR code for amount |

### Refunds

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/refunds` | Initiate a refund |
| GET | `/api/refunds/:id` | Get refund status |
| GET | `/api/payment-links/:id/refunds` | Get refunds for payment |

### Webhooks

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/webhooks/payment` | UPI payment webhook |
| POST | `/api/webhooks/refund` | Refund status webhook |

## Data Models

### PaymentLink

```typescript
interface PaymentLink {
  id: string;
  merchantId: string;
  amount: number;
  currency: string;
  purpose: string;
  description?: string;
  customerName?: string;
  customerPhone?: string;
  customerEmail?: string;
  status: PaymentStatus;
  upiId: string;
  shortUrl?: string;
  qrCodeDataUrl?: string;
  expiresAt: Date;
  metadata?: Record<string, unknown>;
  webhookUrl?: string;
  redirectUrl?: string;
  maxUsageCount?: number;
  currentUsageCount: number;
  transactionId?: string;
  paidAt?: Date;
  paymentMethod?: string;
  createdAt: Date;
  updatedAt: Date;
}
```

### PaymentStatus Enum

```typescript
enum PaymentStatus {
  PENDING = 'pending',
  PAID = 'paid',
  EXPIRED = 'expired',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
  REFUNDED = 'refunded',
  PARTIALLY_REFUNDED = 'partially_refunded'
}
```

### RefundResponse

```typescript
interface RefundResponse {
  refundId: string;
  paymentLinkId: string;
  originalAmount: number;
  refundedAmount: number;
  reason?: string;
  status: 'INITIATED' | 'COMPLETED' | 'FAILED';
  createdAt: Date;
}
```

## API Examples

### Create Payment Link

```bash
curl -X POST http://localhost:3008/api/payment-links \
  -H "Content-Type: application/json" \
  -d '{
    "merchantId": "merchant_123",
    "amount": 500,
    "purpose": "Order #12345",
    "description": "Payment for order",
    "customerName": "John Doe",
    "customerPhone": "+919876543210",
    "customerEmail": "john@example.com",
    "expiresIn": 72,
    "webhookUrl": "https://your-app.com/webhooks/payment",
    "maxUsageCount": 1
  }'
```

**Response:**

```json
{
  "success": true,
  "data": {
    "id": "uuid-here",
    "url": "https://pay.rezpay.in/pay/uuid-here",
    "shortUrl": "https://pay.rezpay.in/l/uuid-short",
    "qrCodeDataUrl": "data:image/png;base64,...",
    "amount": 500,
    "currency": "INR",
    "purpose": "Order #12345",
    "status": "pending",
    "expiresAt": "2024-01-18T10:30:00Z",
    "customerName": "John Doe",
    "customerPhone": "+919876543210"
  }
}
```

### Share Payment Link

```bash
curl -X POST http://localhost:3008/api/payment-links/uuid/share \
  -H "Content-Type: application/json" \
  -d '{
    "channels": ["SMS", "WHATSAPP", "EMAIL"],
    "customMessage": "Please complete your payment of Rs.500",
    "recipientEmail": "john@example.com"
  }'
```

### Initiate Refund

```bash
curl -X POST http://localhost:3008/api/refunds \
  -H "Content-Type: application/json" \
  -d '{
    "paymentLinkId": "uuid-here",
    "amount": 500,
    "reason": "Customer requested cancellation"
  }'
```

## Webhook Integration

### Webhook Payload (payment.completed)

```json
{
  "event": "payment.completed",
  "timestamp": "2024-01-15T10:30:00Z",
  "data": {
    "id": "payment_link_id",
    "merchantId": "merchant_123",
    "amount": 500,
    "currency": "INR",
    "status": "paid",
    "transactionId": "txn_123456",
    "paidAt": "2024-01-15T10:30:00Z",
    "customerPhone": "+919876543210",
    "customerEmail": "john@example.com",
    "metadata": {}
  }
}
```

### Webhook Signature Verification

All webhook requests include an `X-Webhook-Signature` header. Verify using:

```javascript
const crypto = require('crypto');

function verifySignature(payload, signature, secret) {
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(JSON.stringify(payload))
    .digest('hex');
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  );
}
```

## Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `VALIDATION_ERROR` | 400 | Invalid request data |
| `PAYMENT_LINK_NOT_FOUND` | 404 | Payment link not found |
| `PAYMENT_LINK_EXPIRED` | 410 | Payment link has expired |
| `INVALID_STATUS` | 422 | Invalid status for operation |
| `REFUND_EXCEEDS_AMOUNT` | 422 | Refund amount too high |
| `WEBHOOK_ERROR` | 500 | Webhook delivery failed |

## Rate Limits

- Create payment link: 100 requests/minute per API key
- Share payment link: 50 requests/minute per API key
- Refunds: 20 requests/minute per API key

## Testing

```bash
# Run tests
npm test

# Run linter
npm run lint
```

## Deployment

### Docker

```bash
docker build -t rez-payment-links-service .
docker run -p 3008:3008 --env-file .env rez-payment-links-service
```

## License

MIT
