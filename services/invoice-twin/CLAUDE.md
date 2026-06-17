# Invoice Twin Service

**Version:** 1.0.0  
**Port:** 4904  
**Status:** Ready for Development

---

## Overview

The Invoice Twin service manages invoices, billing, payments, and tax tracking for the RTMN ecosystem. It provides a comprehensive billing solution with multi-tenant support, automated tax calculations, payment tracking, and overdue management.

## Features

- [x] Multi-tenant architecture (tenant isolation via `x-tenant-id` header)
- [x] Invoice CRUD operations with draft/sent/paid/partial/overdue/cancelled statuses
- [x] Line item management with tax rates per item
- [x] Automatic tax calculation
- [x] Payment recording and tracking
- [x] Partial payment support
- [x] Overdue invoice detection and tracking
- [x] Invoice numbering with auto-increment
- [x] Customer billing reports
- [x] Tax reports by rate
- [x] Aging reports
- [x] Revenue trends analysis
- [x] Payment method analytics
- [x] Export functionality (JSON/CSV)
- [x] Refund management

---

## Quick Start

```bash
# Install dependencies
cd services/invoice-twin
npm install

# Copy environment file
cp .env.example .env

# Edit .env with your settings
# Update MONGODB_URI if needed

# Start the service
npm run dev

# Or build and run
npm run build
npm start
```

---

## API Endpoints

### Health Check

```
GET /health
```

Returns service health status including database connection state.

### Invoices

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/invoices` | List all invoices (paginated) |
| GET | `/api/invoices/overdue` | Get overdue invoices |
| GET | `/api/invoices/stats` | Get invoice statistics |
| GET | `/api/invoices/:id` | Get single invoice |
| POST | `/api/invoices` | Create new invoice |
| PUT | `/api/invoices/:id` | Update draft invoice |
| PATCH | `/api/invoices/:id/status` | Update invoice status |
| POST | `/api/invoices/:id/send` | Mark invoice as sent |
| POST | `/api/invoices/:id/payments` | Add payment to invoice |
| DELETE | `/api/invoices/:id` | Delete draft invoice |

### Payments

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/payments` | List all payments |
| GET | `/api/payments/stats` | Get payment statistics |
| GET | `/api/payments/:id` | Get single payment |
| POST | `/api/payments` | Create standalone payment |
| POST | `/api/payments/:id/refund` | Refund a payment |
| PATCH | `/api/payments/:id` | Update pending payment |
| DELETE | `/api/payments/:id` | Delete pending payment |

### Reports

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/reports/summary` | Billing summary |
| GET | `/api/reports/trends` | Monthly billing trends |
| GET | `/api/reports/customers` | Customer billing report |
| GET | `/api/reports/aging` | Aging report |
| GET | `/api/reports/tax` | Tax report by rate |
| GET | `/api/reports/export` | Export invoices/payments |

---

## Invoice Status Flow

```
DRAFT -> SENT -> PAID
              -> PARTIAL -> PAID
              -> OVERDUE -> PAID
                         -> PARTIAL -> PAID

Any status (except PAID) -> CANCELLED
```

---

## Data Models

### Invoice

```typescript
{
  invoiceId: string;           // UUID
  tenantId: string;            // Multi-tenant identifier
  customerId: string;           // Customer reference
  orderId?: string;            // Optional order reference
  invoiceNumber: string;       // Auto-generated (e.g., INV-000001)
  issueDate: Date;
  dueDate: Date;
  items: [{
    description: string;
    quantity: number;
    price: number;
    taxRate: number;           // Percentage
    taxAmount: number;
    total: number;
  }];
  subtotal: number;
  taxAmount: number;
  discount: number;
  total: number;
  currency: string;            // Default: INR
  status: 'draft' | 'sent' | 'paid' | 'partial' | 'overdue' | 'cancelled';
  paidAmount: number;
  remainingAmount: number;
  overdueDays: number;
  payment?: {
    method: string;
    date: Date;
    reference?: string;
  };
}
```

### Payment Record

```typescript
{
  paymentId: string;
  invoiceId: string;
  tenantId: string;
  customerId: string;
  amount: number;
  method: 'cash' | 'bank_transfer' | 'credit_card' | 'debit_card' | 'upi' | 'check';
  date: Date;
  reference?: string;
  notes?: string;
  transactionId?: string;
  status: 'pending' | 'completed' | 'failed' | 'refunded';
}
```

---

## Multi-Tenancy

All requests must include the `x-tenant-id` header:

```bash
curl -H "x-tenant-id: tenant-123" http://localhost:4904/api/invoices
```

---

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| PORT | 4904 | Server port |
| NODE_ENV | development | Environment mode |
| MONGODB_URI | mongodb://localhost:27017/invoice-twin | MongoDB connection |
| JWT_SECRET | - | JWT secret for auth |
| ALLOWED_ORIGINS | * | CORS origins |
| LOG_LEVEL | info | Logging level |
| DEFAULT_TAX_RATE | 18 | Default tax percentage |
| INVOICE_PREFIX | INV | Invoice number prefix |
| CURRENCY | INR | Default currency |

---

## Integration

### Event Bus Integration

Publish events on invoice/payment actions:

```javascript
// Publish invoice created
eventBus.publish('invoice.created', {
  invoiceId: '...',
  customerId: '...',
  total: 1000,
  tenantId: '...'
});

// Subscribe to events
eventBus.subscribe('payment.recorded', (event) => {
  console.log('Payment received:', event);
});
```

### Connected Services

| Service | Port | Integration |
|---------|------|-------------|
| Service Registry | 4399 | Service discovery |
| Event Bus | 4510 | Event publishing |
| GraphQL Federation | 4000 | Unified API |

---

## Analytics API

The analytics service provides:

- Overall billing metrics
- Top customers by value
- Revenue by time period (day/week/month/quarter/year)
- Invoice status distribution
- Payment method distribution
- Daily payment trends
- Tax breakdown
- Revenue forecasting

---

## License

Internal RTMN Ecosystem Use
