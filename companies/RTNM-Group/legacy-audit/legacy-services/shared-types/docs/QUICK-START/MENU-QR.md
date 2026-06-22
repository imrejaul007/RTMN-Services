# Quick Start - Menu QR Setup

> **Enable QR-based digital menus and ordering in your restaurant**

---

## Overview

Menu QR allows customers to:
- Scan table QR to view digital menu
- Browse categories and items
- Add items to cart
- Place order (sent to kitchen)
- Pay via wallet

---

## Prerequisites

- [Basic Setup Complete](./SETUP.md)
- Hotel OTA app running
- Merchant configured in ReZ Merchant Service

---

## Step 1: Configure Merchant Restaurant

### Via Merchant Dashboard

1. Go to `rez-app-merchant/admin-project/merchant-app`
2. Login with merchant credentials
3. Navigate to Restaurant Settings
4. Enable "Table QR Menu"
5. Upload menu items

### Via API

```bash
# Create restaurant profile
curl -X POST http://localhost:3004/api/merchant/restaurant \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer {merchant_token}" \
  -d '{
    "name": "The Great Kitchen",
    "type": "restaurant",
    "cuisine": "Multi-cuisine",
    "tables": 20,
    "serviceHours": {
      "open": "08:00",
      "close": "22:00"
    }
  }'
```

---

## Step 2: Add Menu Items

```bash
# Add a category
curl -X POST http://localhost:3004/api/menu/categories \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer {merchant_token}" \
  -d '{
    "name": "Appetizers",
    "description": "Start your meal right",
    "sortOrder": 1
  }'

# Add menu items
curl -X POST http://localhost:3004/api/menu/items \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer {merchant_token}" \
  -d '{
    "categoryId": "CAT-uuid",
    "name": "Spring Rolls",
    "description": "Crispy vegetable spring rolls",
    "price": 299,
    "image": "https://example.com/spring-rolls.jpg",
    "isAvailable": true,
    "preparationTime": 10
  }'
```

---

## Step 3: Generate Table QR Codes

### Via Dashboard

1. Go to Restaurant → Table Management
2. Click "Generate All QRs"
3. Select format (PNG/PDF)
4. Download and print

### Via API

```bash
# Generate QR for specific table
curl -X POST http://localhost:3000/api/restaurant/generate-qr \
  -H "Content-Type: application/json" \
  -d '{
    "merchantId": "MERCHANT-001",
    "tableId": "TABLE-5"
  }'

# Response
{
  "tableId": "TABLE-5",
  "qrUrl": "rez://menu/MERCHANT-001?table=TABLE-5",
  "qrImage": "data:image/png;base64,..."
}

# Bulk generate all tables
curl -X POST http://localhost:3000/api/restaurant/generate-qr/bulk \
  -H "Content-Type: application/json" \
  -d '{
    "merchantId": "MERCHANT-001",
    "tableCount": 20
  }'
```

---

## Step 4: Print Table QR Codes

1. Download QR codes (PDF format recommended)
2. Print on table tents or stickers
3. Place on each table

### Recommended Design

```
┌──────────────────────┐
│                      │
│    [QR CODE]         │
│                      │
│  Scan to view        │
│  our menu!           │
│                      │
└──────────────────────┘
```

---

## Step 5: Test the Flow

### Customer Flow Test

1. Scan table QR with customer app
2. Verify menu loads correctly
3. Add item to cart
4. Place order
5. Verify order appears in merchant dashboard

### Kitchen Display Test

1. Place order via Menu QR
2. Check Kitchen Display System
3. Verify order notification
4. Mark order as completed

---

## API Reference

### Get Menu
```
GET /api/restaurant/{merchantId}/menu

Response:
{
  "merchantId": "MERCHANT-001",
  "merchantName": "The Great Kitchen",
  "categories": [
    {
      "id": "CAT-1",
      "name": "Appetizers",
      "items": [
        {
          "id": "ITEM-1",
          "name": "Spring Rolls",
          "price": 299,
          "isAvailable": true
        }
      ]
    }
  ]
}
```

### Add to Cart
```
POST /api/restaurant/cart/add

Request:
{
  "merchantId": "MERCHANT-001",
  "tableId": "TABLE-5",
  "itemId": "ITEM-1",
  "quantity": 2,
  "notes": "Extra sauce"
}
```

### Place Order
```
POST /api/restaurant/order

Request:
{
  "merchantId": "MERCHANT-001",
  "tableId": "TABLE-5",
  "items": [
    { "itemId": "ITEM-1", "quantity": 2 },
    { "itemId": "ITEM-2", "quantity": 1 }
  ],
  "paymentMethod": "wallet"
}

Response:
{
  "orderId": "ORD-uuid",
  "status": "confirmed",
  "estimatedTime": "15 mins",
  "total": 847
}
```

---

## Database Schema

```sql
-- Categories
CREATE TABLE menu_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id UUID NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Menu Items
CREATE TABLE menu_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID REFERENCES menu_categories(id),
  merchant_id UUID NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  price DECIMAL(10,2) NOT NULL,
  image_url TEXT,
  is_available BOOLEAN DEFAULT true,
  preparation_time INTEGER DEFAULT 15,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Restaurant Orders
CREATE TABLE restaurant_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id UUID NOT NULL,
  table_id VARCHAR(50),
  items JSONB NOT NULL,
  subtotal DECIMAL(10,2),
  tax DECIMAL(10,2),
  total DECIMAL(10,2),
  status VARCHAR(50) DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT NOW()
);
```

---

## Integration with POS

To sync with external POS systems:

```env
POS_API_URL=https://api.pos-provider.com
POS_API_KEY=your-pos-key
```

Enable in `Hotel OTA/src/config/restaurant.ts`:

```typescript
export const RESTAURANT_CONFIG = {
  enablePOSSync: true,
  posProvider: 'square', // square, clover, lightspeed
};
```

---

## Troubleshooting

### Menu not loading
- Verify merchant exists
- Check Supabase connection
- Review menu items in database

### Order not reaching kitchen
- Check WebSocket connection
- Verify kitchen display is online
- Review order API logs

### Payment failing
- Verify wallet has balance
- Check payment service status
- Review transaction logs

---

## Next Steps

| Task | Guide |
|------|-------|
| Set up Rez Now | [Rez Now Guide](./REZ-NOW.md) |
| Set up Ads QR | [Ads QR Guide](./ADS-QR.md) |
| Full testing | [Testing Guide](./TESTING.md) |

---

## Flow Diagram

```
Customer enters restaurant
         │
         ▼
┌─────────────────┐
│ Scan Table QR   │
│ (On table tent) │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ View Digital    │
│ Menu            │
│ (Categories +  │
│  Items)         │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Add Items       │
│ to Cart         │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Place Order     │
│ (To Kitchen)    │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Kitchen receives│
│ (Display/SMS)   │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Food delivered  │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Pay (Wallet/    │
│ UPI/Card)       │
└─────────────────┘
```
