# POS (Point of Sale) Documentation

## Overview

The ReZ POS system is a QR-based point-of-sale solution that enables merchants to accept orders, process payments, and manage transactions through digital channels. The system supports multiple payment methods including wallet balance, BNPL (Buy Now Pay Later), and traditional payment flows.

## Service Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              POS SYSTEM                                     │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   ┌─────────────────────────────────────────────────────────────────────┐   │
│   │                        QR SDK (@rez/qr-sdk)                         │   │
│   │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐          │   │
│   │  │ Menu QR  │  │Store QR  │  │Campaign  │  │ Room QR  │          │   │
│   │  │ Module   │  │ Module   │  │  Module  │  │ Module   │          │   │
│   │  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘          │   │
│   │       │             │             │             │                  │   │
│   │       └─────────────┴──────┬──────┴─────────────┘                  │   │
│   │                            │                                        │   │
│   │                     ┌──────┴──────┐                               │   │
│   │                     │ QR Client   │                               │   │
│   │                     │  (Base)     │                               │   │
│   │                     └──────┬──────┘                               │   │
│   └────────────────────────────┼────────────────────────────────────────┘   │
│                                │                                            │
│   ┌────────────────────────────┼────────────────────────────────────────┐   │
│   │                    Services │                                        │   │
│   │  ┌──────────────┐  ┌──────┴──────┐  ┌──────────────┐              │   │
│   │  │ BNPL Service │  │  Delivery   │  │White Label   │              │   │
│   │  │              │  │  Service    │  │  Service     │              │   │
│   │  │  Port: 3080  │  │  Port: 3084 │  │  Port: 3083  │              │   │
│   │  └──────────────┘  └─────────────┘  └──────────────┘              │   │
│   └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

## QR SDK - Menu Module

**Location:** `/packages/rez-qr-sdk/src/modules/menu.ts`

### Capabilities

| Feature | Description |
|---------|-------------|
| Menu Retrieval | Get full menu, categories, items |
| Dietary Filtering | Vegetarian, vegan, halal, kosher, gluten-free |
| Search | Search menu items by query |
| Cart Management | Add, update, remove items |
| Order Placement | Place orders with notes, priority |
| Split Bill | Equal split or by-person split |
| Payment | Checkout via wallet |
| Reservations | Book tables with party size |

### API Reference

#### Get Menu
```typescript
const menu = await sdk.menu.getMenu(storeId);
```

**Response:**
```typescript
interface Menu {
  storeId: string;
  categories: MenuCategory[];
  items: MenuItem[];
  lastUpdated: string;
}
```

#### Add to Cart
```typescript
const cart = await sdk.menu.addToCart(storeId, itemId, quantity, modifiers);
```

**Request:**
```typescript
{
  itemId: string;
  quantity: number;
  modifiers?: {
    id: string;
    options: string[];
  }[];
}
```

#### Place Order
```typescript
const order = await sdk.menu.placeOrder(storeId, cartId, {
  tableNumber: '5',
  notes: 'No onions',
  priority: { level: 'rush' }
});
```

**Response:**
```typescript
{
  orderId: string;
  status: 'pending' | 'confirmed' | 'preparing' | 'ready' | 'served' | 'completed';
  estimatedReadyTime?: string;
}
```

#### Split Bill
```typescript
const splitOptions = await sdk.menu.getSplitOptions(orderId);

// Split equally
const splits = [
  { userId: 'user1', share: 'equal' },
  { userId: 'user2', share: 'equal' }
];

await sdk.menu.splitBill(orderId, splits);
```

## QR SDK - Store Module

**Location:** `/packages/rez-qr-sdk/src/modules/store.ts`

### Capabilities

| Feature | Description |
|---------|-------------|
| Store Profiles | Get store by slug or ID |
| QR Generation | Generate QR codes with customization |
| Analytics | Track scans, clicks, conversions |
| Reviews | Get/submit reviews |
| Favorites | Favorite/unfavorite stores |
| Search | Search stores by name, category, location |

### API Reference

#### Get Store Profile
```typescript
const profile = await sdk.store.getProfile('my-restaurant');
// or
const profile = await sdk.store.getProfileById(storeId);
```

**Response:**
```typescript
interface StoreProfile {
  id: string;
  slug: string;
  name: string;
  description: string;
  logo: string;
  coverImage: string;
  address: Address;
  contact: ContactInfo;
  hours: OperatingHours;
  links: StoreLink[];
  categories: string[];
  rating: number;
  reviewCount: number;
}
```

#### Generate QR Code
```typescript
const qr = await sdk.store.generateQR(storeId, 'menu', {
  size: 300,
  foregroundColor: '#000000',
  backgroundColor: '#FFFFFF',
  logo: 'https://...',
  expiresAt: '2025-12-31'
});
```

**Response:**
```typescript
{
  id: string;
  url: string;
  imageUrl: string;
  type: 'menu' | 'store' | 'campaign' | 'room';
  createdAt: string;
  expiresAt?: string;
}
```

#### Track Analytics
```typescript
await sdk.store.trackEvent(storeId, {
  type: 'qr_scan',
  timestamp: new Date().toISOString(),
  metadata: {
    device: 'mobile',
    location: 'indoor'
  }
});
```

## BNPL Service

**Location:** `/rez-bnpl-service`

**Port:** 3080
**Base URL:** `/api/bnpl`

### Features

| Feature | Description |
|---------|-------------|
| EMI Calculation | Calculate monthly payments based on tenure |
| Credit Scoring | Risk-based interest rates |
| Auto-Approval | Instant approval for scores >= 700 |
| EMI Schedule | Full repayment schedule |
| Overdue Tracking | Automatic detection of missed payments |

### API Endpoints

#### Apply for BNPL
```
POST /api/bnpl/apply
```

**Request:**
```json
{
  "userId": "user_123",
  "orderId": "order_456",
  "amount": 50000,
  "tenure": "6",
  "downPayment": 5000
}
```

**Response:**
```json
{
  "applicationId": "bnpl_789",
  "status": "approved",
  "creditScore": 720,
  "riskRating": "low",
  "interestRate": 13,
  "emiAmount": 7865,
  "totalAmount": 47190,
  "totalInterest": 2190,
  "processingFee": 450,
  "tenure": 6
}
```

#### Make Repayment
```
POST /api/bnpl/repay
```

**Request:**
```json
{
  "applicationId": "bnpl_789",
  "emiNumber": 1
}
```

### Interest Rates

| Tenure | Base Rate | Low Risk | High Risk |
|--------|-----------|----------|-----------|
| 3 months | 12% | -2% | +4% |
| 6 months | 15% | -2% | +4% |
| 9 months | 18% | -2% | +4% |
| 12 months | 21% | -2% | +4% |

### Credit Score Requirements

| Score Range | Risk Rating | Auto-Approve |
|-------------|-------------|--------------|
| >= 750 | Low | Yes |
| 650-749 | Medium | No (review) |
| < 650 | High | No (review) |

## Payment Flow

```
┌─────────┐    ┌─────────┐    ┌─────────┐    ┌─────────┐
│  Menu   │───>│  Cart   │───>│  Order  │───>│Payment  │
│ Scan    │    │ Creation│    │ Created │    │Checkout │
└─────────┘    └─────────┘    └────┬────┘    └────┬────┘
                                   │               │
                    ┌──────────────┴───────────────┤
                    │                              │
              ┌─────┴─────┐                ┌──────┴──────┐
              │   Wallet  │                │     BNPL    │
              │  Balance  │                │    EMI      │
              └───────────┘                └─────────────┘
```

## Use Cases

### Restaurant POS
1. Customer scans Menu QR code
2. Browses menu with dietary filters
3. Adds items to cart with modifiers
4. Places order with table number
5. Selects payment method (Wallet/BNPL)
6. Receives order confirmation
7. Gets notified when order is ready

### Split Bill Scenario
1. Group scans Menu QR together
2. Places orders individually
3. One person requests bill
4. System calculates equal split
5. Each person pays via own wallet or BNPL
6. Order marked complete

### White Label Integration
1. Partner creates white label store
2. Custom branding applied
3. Menu QR generated with partner domain
4. Orders route to partner dashboard
5. Settlement handled via BNPL

## Error Handling

| Error Code | Description | Resolution |
|------------|-------------|------------|
| `CART_ITEM_NOT_FOUND` | Item removed from menu | Refresh menu, select again |
| `CART_EXPIRED` | Cart older than 30 minutes | Create new cart |
| `ORDER_NOT_FOUND` | Invalid order ID | Verify order ID |
| `BNPL_LIMIT_REACHED` | Max 3 active BNPLs | Repay existing before new |
| `CREDIT_SCORE_LOW` | Score below threshold | Manual review or improve score |

## Dependencies

- **MongoDB** (port 27017): `rez_bnpl` database
- **Redis** (port 6379): Session caching
- **@rez/qr-sdk**: QR operations
- **@rez/shared**: Common utilities

## Health Check

```
GET /health
```

**Response:**
```json
{
  "status": "ok",
  "service": "rez-bnpl-service"
}
```

---

*Last Updated: 2026-05-10*
