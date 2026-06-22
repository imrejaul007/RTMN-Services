# Group Ordering API

## Overview

The Group Ordering system allows multiple customers to order together from the same restaurant, share items, and split the bill. It's designed for social dining scenarios where friends or family want to order collectively.

## Architecture

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  Customer 1 │     │  Customer 2 │     │  Customer 3 │
│  (Host)     │     │  (Member)   │     │  (Member)   │
└──────┬──────┘     └──────┬──────┘     └──────┬──────┘
       │                   │                   │
       └───────────────────┼───────────────────┘
                           │
                    ┌──────▼──────┐
                    │   REZ NOW   │
                    │   Web App   │
                    │             │
                    │ GroupOrder  │
                    │  Component  │
                    └──────┬──────┘
                           │
              ┌────────────┼────────────┐
              │            │            │
       ┌──────▼──────┐     │     ┌──────▼──────┐
       │  API Route  │     │     │  Merchant   │
       │  /api/group │     │     │  Dashboard  │
       └──────┬──────┘     │     └──────┬──────┘
              │            │            │
       ┌──────▼────────────▼────────────▼──────┐
       │           Socket.IO Events            │
       │    /group namespace (real-time)      │
       └──────────────────────────────────────┘
```

## Endpoints

### Create Group Session

**POST** `/api/group`

Creates a new group ordering session.

**Request Body:**
```json
{
  "storeId": "string",
  "storeSlug": "string",
  "hostName": "string",
  "tableNumber": "string (optional)"
}
```

**Response (201):**
```json
{
  "id": "session-123",
  "code": "ABC123",
  "storeId": "store-456",
  "storeSlug": "my-restaurant",
  "storeName": "My Restaurant",
  "hostId": "host-789",
  "members": [
    {
      "id": "host-789",
      "name": "John",
      "phone": "",
      "isHost": true,
      "joinedAt": "2024-01-01T12:00:00Z",
      "items": [],
      "totalAmount": 0
    }
  ],
  "items": [],
  "status": "active",
  "createdAt": "2024-01-01T12:00:00Z",
  "totalAmount": 0,
  "tableNumber": "5"
}
```

### Get Session by Code

**GET** `/api/group/:code`

Retrieves an active group session by its 6-character code.

**Response (200):**
```json
{
  "id": "session-123",
  "code": "ABC123",
  ...
}
```

**Error Responses:**
- `404`: Session not found or expired
- `410`: Session is no longer active

### Join Session

**POST** `/api/group/:code/join`

Join an existing group session.

**Request Body:**
```json
{
  "storeSlug": "my-restaurant",
  "memberName": "string"
}
```

**Response (200):**
```json
{
  "id": "session-123",
  "code": "ABC123",
  "members": [
    ...existing members...,
    {
      "id": "new-member-456",
      "name": "Jane",
      "phone": "",
      "isHost": false,
      "joinedAt": "2024-01-01T12:05:00Z",
      "items": [],
      "totalAmount": 0
    }
  ],
  ...
}
```

### Leave Session

**POST** `/api/group/:code/leave`

Leave an active group session.

**Request Body:**
```json
{
  "memberId": "string"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Left session"
}
```

### Add Shared Item

**POST** `/api/group/:code/items`

Add an item to the shared pool.

**Request Body:**
```json
{
  "itemId": "menu-item-123",
  "name": "Margherita Pizza",
  "price": 59900,
  "quantity": 1,
  "memberId": "member-456",
  "memberName": "John"
}
```

**Response (200):**
```json
{
  "item": {
    "id": "shared-item-789",
    "itemId": "menu-item-123",
    "name": "Margherita Pizza",
    "price": 59900,
    "addedBy": "member-456",
    "addedByName": "John",
    "addedAt": "2024-01-01T12:10:00Z",
    "quantity": 1
  },
  "session": { ... }
}
```

### Update Item Quantity

**PUT** `/api/group/:code/items/:itemId`

Update the quantity of a shared item.

**Request Body:**
```json
{
  "quantity": 2,
  "memberId": "member-456"
}
```

**Response (200):**
```json
{
  "success": true,
  "item": { ... },
  "session": { ... }
}
```

### Remove Shared Item

**DELETE** `/api/group/:code/items/:itemId`

Remove a shared item from the pool.

**Request Body:**
```json
{
  "memberId": "member-456"
}
```

**Response (200):**
```json
{
  "success": true,
  "session": { ... }
}
```

### Get Split Summary

**GET** `/api/group/:code/summary`

Get the complete bill split summary.

**Response (200):**
```json
{
  "sessionId": "session-123",
  "code": "ABC123",
  "storeName": "My Restaurant",
  "totalAmount": 359400,
  "perPerson": [
    {
      "memberId": "host-789",
      "name": "John",
      "items": [...],
      "subtotal": 179700,
      "tax": 32346,
      "total": 212046
    },
    {
      "memberId": "member-456",
      "name": "Jane",
      "items": [...],
      "subtotal": 179700,
      "tax": 32346,
      "total": 212046
    }
  ],
  "sharedItems": [...],
  "tax": 64692,
  "grandTotal": 424092
}
```

## WebSocket Events

### Namespace: `/group`

Connect to the group namespace:
```javascript
const socket = io(`${SOCKET_URL}/group`, {
  auth: { token: 'user-token' }
});
```

### Client-to-Server Events

| Event | Payload | Description |
|-------|---------|-------------|
| `group:join` | `{ sessionId, code }` | Join a session room |
| `group:leave` | `{ sessionId }` | Leave session room |

### Server-to-Client Events

| Event | Payload | Description |
|-------|---------|-------------|
| `group:member:joined` | `{ member, session }` | A new member joined |
| `group:member:left` | `{ memberId, name, session }` | A member left |
| `group:item:added` | `{ item, session }` | New shared item added |
| `group:item:removed` | `{ itemId, session }` | Shared item removed |
| `group:session:updated` | `{ session }` | Session state changed |
| `group:error` | `{ message }` | Error occurred |

## User Flow

### Creating a Group

1. Customer opens restaurant menu
2. Clicks "Create Group" button
3. Enters their name
4. System creates session with unique 6-character code
5. Customer shares code with friends via copy button
6. Customer adds items to their personal cart
7. Items can be shared to the group pool

### Joining a Group

1. Friend opens restaurant menu
2. Clicks "Join with Code"
3. Enters the 6-character code
4. Enters their name
5. Joins the existing session
6. Sees all shared items and members
7. Can add their own items

### Splitting the Bill

1. When ready to pay, anyone can view "Split Summary"
2. System calculates each person's share:
   - Personal items (items they added)
   - Share of shared items (divided equally)
   - GST calculation (18%)
3. Each person pays their calculated amount
4. Session is marked as completed

## Types Reference

See `rez-now/lib/types/index.ts`:

```typescript
interface GroupSession {
  id: string;
  code: string;
  storeId: string;
  storeSlug: string;
  storeName: string;
  hostId: string;
  members: GroupMember[];
  items: SharedItem[];
  status: 'active' | 'completed' | 'cancelled';
  createdAt: string;
  totalAmount: number;
  tableNumber?: string;
}

interface GroupMember {
  id: string;
  name: string;
  phone: string;
  isHost: boolean;
  joinedAt: string;
  items: CartItem[];
  totalAmount: number;
}

interface SharedItem {
  id: string;
  itemId: string;
  name: string;
  price: number;
  addedBy: string;
  addedByName: string;
  addedAt: string;
  quantity: number;
}
```

## Security Considerations

1. **Authentication**: All API calls should include valid auth token
2. **Authorization**: Only host or item owner can remove shared items
3. **Rate Limiting**: Limit join attempts to prevent brute force
4. **Session Expiry**: Sessions expire after 4 hours of inactivity
5. **Store Validation**: Code can only be used at the store where it was created

## Error Handling

All error responses follow this format:
```json
{
  "error": "Human-readable error message"
}
```

Common error codes:
- `400`: Bad Request (missing required fields)
- `403`: Forbidden (wrong store, unauthorized action)
- `404`: Not Found (session or item not found)
- `410`: Gone (session expired)
- `500`: Internal Server Error

## Future Enhancements

1. **Real-time menu sync**: Reflect menu item availability changes
2. **Push notifications**: Notify members when someone joins/leaves
3. **Payment integration**: Split payment via UPI/Razorpay
4. **Order history**: Track past group orders
5. **QR code sharing**: Generate QR code for easier sharing
