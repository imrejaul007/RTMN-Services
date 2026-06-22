# REZ Payment Links Service - SPEC.md

**Version:** 1.0.0
**Port:** (see config)
**Company:** RTNM-Group
**Category:** Finance

---

## Overview

Payment links API service enabling merchants to create shareable payment links with UPI integration. Generates QR codes and handles payment collection through dynamic payment links.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                   REZ Payment Links Service                                 │
├─────────────────────────────────────────────────────────────────────────────┤
│  Components:                                                                │
│  ├── Link Generator   → Payment link creation                              │
│  ├── QR Generator    → UPI QR code generation                            │
│  ├── Payment Tracker → Transaction status tracking                        │
│  └── Webhook Handler → Payment confirmation                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Data Models

### PaymentLink
```typescript
{
  linkId: string
  merchantId: string
  amount: number
  currency: string
  description: string
  qrCodeUrl: string
  upiUrl: string
  status: 'active' | 'paid' | 'expired' | 'cancelled'
  expiresAt: Date
  paidAt?: Date
  transactionId?: string
  createdAt: Date
}
```

---

## API Endpoints

### Payment Links
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/links` | Create payment link |
| GET | `/links` | List merchant links |
| GET | `/links/:id` | Get link details |
| GET | `/links/:id/qr` | Get QR code |
| POST | `/links/:id/cancel` | Cancel link |

### Webhooks
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/webhooks/payment` | Payment webhook |

### Health
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Health check |

---

## Dependencies

```json
{
  "express": "^4.18.2",
  "cors": "^2.8.5",
  "helmet": "^7.1.0",
  "express-rate-limit": "^7.1.5",
  "uuid": "^9.0.1",
  "qrcode": "^1.5.3",
  "dotenv": "^16.3.1",
  "winston": "^3.11.0",
  "mongoose": "^8.0.3"
}
```

---

## Status

- [x] Payment link creation
- [x] QR code generation
- [x] UPI integration
- [x] Webhook handling

