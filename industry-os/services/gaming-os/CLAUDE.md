# Restaurant OS - Development Guide

**Port:** 5010  
**Type:** Industry OS (Food Service)

## Architecture

Restaurant OS manages the complete restaurant lifecycle from menu creation to order fulfillment, table management, and customer loyalty.

### Core Components

1. **Menu Engine** - CRUD operations for menu items with categories, pricing, and prep times
2. **Order Processor** - Order creation, status tracking, tax calculation
3. **Kitchen Queue** - FIFO queue management for kitchen operations
4. **Table Manager** - Table availability, capacity, and reservations
5. **Customer Loyalty** - Points system, tier management (bronze/silver/gold/platinum)
6. **Review System** - Customer feedback collection
7. **Analytics** - Real-time sales, popular items, table occupancy

### Data Models

#### Menu Item
```javascript
{
  id: string,
  name: string,
  category: string,
  price: number,
  prepTime: number,
  description: string,
  ingredients: string[],
  calories: number,
  available: boolean
}
```

#### Order
```javascript
{
  id: string,
  orderNumber: string,
  tableId: string,
  customerId: string,
  items: [{ itemId, quantity, menuItem, subtotal }],
  subtotal: number,
  tax: number,
  total: number,
  status: 'pending'|'confirmed'|'preparing'|'ready'|'served'|'completed'|'cancelled',
  priority: 'normal'|'rush',
  notes: string,
  orderType: 'dine-in'|'takeout'|'delivery'
}
```

#### Customer
```javascript
{
  id: string,
  name: string,
  email: string,
  phone: string,
  loyaltyPoints: number,
  tier: 'bronze'|'silver'|'gold'|'platinum',
  visitCount: number,
  totalSpent: number
}
```

### Digital Twins Sync

All twins are automatically updated on:
- Menu changes (create/update/delete)
- Order status changes
- Table status changes
- Customer point updates

### Integration Points

- **API Gateway** (port 3000) - Routes restaurant requests
- **TwinOS Hub** - Central twin synchronization
- **MemoryOS** - Persistent customer data
- **RABTUL Payment** - Order payment processing

### Testing

```bash
# Health check
curl http://localhost:5010/health

# Create order
curl -X POST http://localhost:5010/api/orders \
  -H "Content-Type: application/json" \
  -d '{"tableId":"t1","items":[{"itemId":"m1","quantity":2}]}'

# Get analytics
curl http://localhost:5010/api/analytics
```
