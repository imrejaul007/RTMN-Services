# nextaBizz - SPEC.md

**Version:** 1.0.0
**Port:** (see config)
**Company:** CorpPerks
**Category:** Procurement

---

## Overview

B2B procurement platform connecting restaurants and merchants. Manages vendor relationships, purchase orders, RFQs, and inventory procurement workflows.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          nextaBizz                                          │
├─────────────────────────────────────────────────────────────────────────────┤
│  Modules:                                                                  │
│  ├── Vendor Directory  → Supplier management                              │
│  ├── Procurement      → Purchase orders and RFQs                         │
│  ├── Inventory        → Stock management                                │
│  └── Analytics        → Procurement insights                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Data Models

### Vendor
```typescript
{
  vendorId: string
  name: string
  category: string
  contactEmail: string
  phone: string
  address: string
  gstin?: string
  rating: number
  status: 'active' | 'inactive'
}
```

### PurchaseOrder
```typescript
{
  orderId: string
  vendorId: string
  companyId: string
  items: { productId: string; quantity: number; price: number }[]
  totalAmount: number
  status: 'draft' | 'sent' | 'acknowledged' | 'fulfilled' | 'cancelled'
  expectedDelivery: Date
  createdAt: Date
}
```

### RFQ
```typescript
{
  rfqId: string
  title: string
  items: { description: string; quantity: number; unit: string }[]
  status: 'open' | 'closed' | 'awarded'
  responses: string[]
  deadline: Date
}
```

---

## Webhooks

| Source | Events |
|--------|--------|
| ReStopapa | inventory.*, order.* |
| REZ Merchant | merchant.* |
| Hotel PMS | booking.* |

---

## Dependencies

```json
{
  "next": "^15.1.0",
  "turbo": "^2.3.0"
}
```

---

## Status

- [x] Vendor management
- [x] Purchase orders
- [x] RFQ handling
- [x] Inventory sync
- [x] Webhook processing

