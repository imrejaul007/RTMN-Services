# Kitchen Display System (KDS) API

## Overview

The Kitchen Display System provides real-time order management for restaurant kitchens. It enables kitchen staff to track orders, update item statuses, and coordinate with the front-of-house through a visual interface.

## Architecture

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Customer  │     │  REZ NOW   │     │  Merchant   │
│   App       │────►│  Web App   │     │  Dashboard  │
└─────────────┘     └──────┬──────┘     └──────┬──────┘
                           │                   │
                           │                   │
                    ┌──────▼──────┐     ┌──────▼──────┐
                    │  Order API  │     │  Order API  │
                    └──────┬──────┘     └──────┬──────┘
                           │                   │
                           └─────────┬─────────┘
                                     │
                            ┌────────▼────────┐
                            │   Socket.IO     │
                            │   /kds          │
                            └────────┬────────┘
                                     │
                    ┌────────────────┼────────────────┐
                    │                │                │
             ┌──────▼──────┐  ┌──────▼──────┐  ┌──────▼──────┐
             │    KDS      │  │    KDS      │  │   POS/KDS   │
             │  Component  │  │  Component  │  │   Screen    │
             │  (Customer) │  │  (Merchant) │  │  (Native)   │
             └─────────────┘  └─────────────┘  └─────────────┘
```

## Endpoints

### Get Active Orders

**GET** `/api/kds/:storeId/orders`

Retrieves all active orders for a store (pending, preparing, ready).

**Query Parameters:**
- `status` (optional): Filter by specific status (`pending`, `preparing`, `ready`)

**Response (200):**
```json
{
  "orders": [
    {
      "id": "kds-order-123",
      "orderNumber": "ORD-001",
      "orderId": "order-456",
      "storeId": "store-789",
      "storeSlug": "my-restaurant",
      "tableNumber": "5",
      "customerName": "John Doe",
      "customerPhone": "+919876543210",
      "items": [
        {
          "id": "item-001",
          "orderId": "order-456",
          "menuItemId": "menu-item-123",
          "name": "Margherita Pizza",
          "quantity": 2,
          "customizations": {
            "Size": ["Large"],
            "Toppings": ["Extra Cheese", "Mushrooms"]
          },
          "status": "preparing",
          "updatedAt": "2024-01-01T12:15:00Z",
          "notes": "No onions",
          "preparedBy": "Chef Raman"
        }
      ],
      "status": "preparing",
      "createdAt": "2024-01-01T12:00:00Z",
      "elapsedSeconds": 900,
      "priority": "normal",
      "notes": "Birthday celebration"
    }
  ]
}
```

### Update Order Status

**PUT** `/api/kds/:orderId/status`

Update the status of an entire order.

**Request Body:**
```json
{
  "status": "ready",
  "updatedBy": "chef-123"
}
```

**Valid Statuses:** `pending`, `preparing`, `ready`, `served`, `cancelled`

**Response (200):**
```json
{
  "success": true,
  "order": {
    "id": "kds-order-123",
    "status": "ready",
    ...
  }
}
```

### Update Item Status

**PUT** `/api/kds/:orderId/items/:itemId/status`

Update the status of a specific item within an order.

**Request Body:**
```json
{
  "status": "preparing",
  "preparedBy": "chef-123",
  "notes": "Extra crispy"
}
```

**Valid Item Statuses:** `received`, `preparing`, `ready`, `served`

**Response (200):**
```json
{
  "success": true,
  "item": {
    "id": "item-001",
    "status": "preparing",
    "preparedBy": "chef-123",
    "notes": "Extra crispy",
    "updatedAt": "2024-01-01T12:10:00Z"
  },
  "order": {
    ...
  }
}
```

### Get Item Status

**GET** `/api/kds/:orderId/items/:itemId/status`

**Response (200):**
```json
{
  "orderId": "order-456",
  "itemId": "item-001",
  "status": "preparing",
  "updatedAt": "2024-01-01T12:10:00Z",
  "preparedBy": "chef-123",
  "notes": "Extra crispy"
}
```

## WebSocket Events

### Namespace: `/kds`

Connect to the KDS namespace:
```javascript
const socket = io(`${SOCKET_URL}/kds`, {
  auth: { token: 'user-token' },
  transports: ['websocket']
});
```

### Client-to-Server Events

| Event | Payload | Description |
|-------|---------|-------------|
| `kds:join` | `{ storeId, storeSlug }` | Join store's KDS room |
| `kds:leave` | `{ storeId }` | Leave KDS room |
| `kds:get-orders` | `{ storeId }` | Request current orders |
| `kds:update-order` | `{ orderId, status, updatedBy }` | Update order status |
| `kds:update-item` | `{ orderId, itemId, status, preparedBy, notes }` | Update item status |

### Server-to-Client Events

| Event | Payload | Description |
|-------|---------|-------------|
| `order.created` | `KDSEvent` | New order received |
| `order.updated` | `KDSEvent` | Order status changed |
| `item.updated` | `KDSEvent` | Item status changed |
| `order.ready` | `KDSEvent` | All items ready |
| `order.cancelled` | `KDSEvent` | Order cancelled |
| `kds:orders` | `{ orders: KDSOrder[] }` | Orders snapshot |
| `kds:error` | `{ message: string }` | Error occurred |

### KDSEvent Structure

```typescript
interface KDSEvent {
  type: 'order.created' | 'order.updated' | 'item.updated' | 'order.ready' | 'order.cancelled';
  payload: KDSOrder | KDSOrderUpdate | KDSItemUpdate;
  timestamp: string;
}
```

## Integration with Merchant Dashboard

### Native App (React Native)

The merchant app includes a built-in KDS screen at `/kds/index.tsx`:

```typescript
// Access via router
router.push('/kds');
```

Features:
- Real-time order updates via Socket.IO
- Order column view (New, Preparing, Ready)
- Timer tracking per order
- Sound notifications
- Polling fallback for reliability

### Web Dashboard

The merchant dashboard provides a web-based KDS at `/kds/index`:

```typescript
// Features
- Responsive layout
- Real-time updates
- Bulk actions
- Order filtering
```

## Types Reference

See `rez-now/lib/types/index.ts`:

```typescript
type KDSItemStatus = 'received' | 'preparing' | 'ready' | 'served';
type KDSOrderStatus = 'pending' | 'preparing' | 'ready' | 'served' | 'cancelled';

interface KDSItem {
  id: string;
  orderId: string;
  menuItemId: string;
  name: string;
  quantity: number;
  customizations?: Record<string, string[]>;
  status: KDSItemStatus;
  updatedAt: string;
  notes?: string;
  preparedBy?: string;
}

interface KDSOrder {
  id: string;
  orderNumber: string;
  orderId: string;
  storeId: string;
  storeSlug: string;
  tableNumber?: string;
  customerName?: string;
  customerPhone?: string;
  items: KDSItem[];
  status: KDSOrderStatus;
  createdAt: string;
  elapsedSeconds: number;
  priority: 'normal' | 'rush' | 'vip';
  notes?: string;
}
```

## Order Status Flow

```
┌──────────┐
│  placed  │ ← New order created
└────┬─────┘
     │
     ▼
┌──────────┐
│confirmed │ ← Order confirmed by kitchen
└────┬─────┘
     │
     ▼
┌──────────┐
│preparing │ ← Order being prepared
└────┬─────┘
     │
     ▼
┌──────────┐
│  ready   │ ← All items ready
└────┬─────┘
     │
     ▼
┌──────────┐
│ delivered│ ← Order delivered/served
└──────────┘
```

## Item Status Flow

```
┌──────────┐
│ received │ ← Item received by kitchen
└────┬─────┘
     │
     ▼
┌──────────┐
│preparing │ ← Item being prepared
└────┬─────┘
     │
     ▼
┌──────────┐
│  ready   │ ← Item ready for service
└────┬─────┘
     │
     ▼
┌──────────┐
│  served  │ ← Item served to customer
└──────────┘
```

## Urgency Levels

Orders are color-coded based on elapsed time:

| Level | Time | Color | Description |
|-------|------|-------|-------------|
| Normal | < 5 min | Green | On track |
| Warning | 5-10 min | Yellow | Needs attention |
| Urgent | > 10 min | Red | Requires immediate action |

## Sound Notifications

The KDS plays sounds for:
- New order received
- Order marked ready
- Order delayed (> 20 minutes)

Sound files:
- `assets/sounds/order-alert.mp3` - New order
- `assets/sounds/order-ready.mp3` - Order ready

## Error Handling

All error responses follow this format:
```json
{
  "error": "Human-readable error message"
}
```

Common error codes:
- `400`: Bad Request (invalid status, missing fields)
- `404`: Not Found (order or item not found)
- `500`: Internal Server Error

## Reliability Features

1. **Socket Reconnection**: Exponential backoff (1s, 2s, 4s, 8s, 16s, 30s)
2. **Polling Fallback**: Every 30 seconds if WebSocket unavailable
3. **Optimistic Updates**: UI updates immediately, reverts on failure
4. **Status Deduplication**: Prevents duplicate status changes

## Best Practices

1. **Debounce Updates**: Don't spam API calls for rapid status changes
2. **Handle Disconnection**: Show offline indicator and retry
3. **Persist Preferences**: Save sound/volume settings to AsyncStorage
4. **Mobile Optimization**: Use larger touch targets for kitchen environment
5. **Accessibility**: Include proper ARIA labels for screen readers

## Future Enhancements

1. **Multi-station support**: Track prep at different stations
2. **Staff assignment**: Assign items to specific chefs
3. **Recipe integration**: Show cooking instructions
4. **Inventory sync**: Mark items unavailable when stock depletes
5. **Analytics**: Track prep times and bottlenecks
