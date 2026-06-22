# Event Inventory - Microservices Events

**Version**: 2.0.0
**Last Updated**: 2026-05-01
**Total Events**: 50

---

## Table of Contents

1. [Overview](#overview)
2. [Event Schema](#event-schema)
3. [User Events](#user-events)
4. [Order Events](#order-events)
5. [Payment Events](#payment-events)
6. [Wallet Events](#wallet-events)
7. [Inventory Events](#inventory-events)
8. [Hotel Events](#hotel-events)
9. [AI & Insights Events](#ai--insights-events)
10. [Automation Events](#automation-events)
11. [Notification Events](#notification-events)
12. [System Events](#system-events)
13. [Event Subscriptions](#event-subscriptions)

---

## Overview

This document catalogs all events in the ReZ microservices ecosystem. Events are published by services and consumed by other services to enable loose coupling and event-driven architecture.

### Event Categories

| Category | Count | Description |
|----------|-------|-------------|
| User Events | 5 | User lifecycle events |
| Order Events | 8 | Order processing events |
| Payment Events | 6 | Payment lifecycle events |
| Wallet Events | 5 | Wallet operations |
| Inventory Events | 4 | Inventory management |
| Hotel Events | 6 | Hotel booking and operations |
| AI & Insights Events | 4 | AI processing events |
| Automation Events | 4 | Rule automation events |
| Notification Events | 3 | Notification delivery |
| System Events | 5 | System-level events |

---

## Event Schema

All events follow this standard schema:

```typescript
interface EventMessage {
  eventId: string;           // UUID v4 - unique event identifier
  eventType: string;          // Dot-separated: category.action (e.g., "order.created")
  source: string;             // Service name that published the event
  timestamp: string;          // ISO 8601 format
  version: string;            // Schema version (e.g., "1.0")
  correlationId?: string;      // For distributed tracing
  causationId?: string;        // Original event that triggered this
  payload: object;             // Event-specific data
  metadata?: {
    userId?: string;
    tenantId?: string;
    requestId?: string;
    [key: string]: any;
  };
}
```

---

## User Events

### 1. user.registered

Fired when a new user creates an account.

**Published by**: auth-service, user-service
**Subscribers**: notification-service, automation-service, insights-service

```json
{
  "eventId": "550e8400-e29b-41d4-a716-446655440001",
  "eventType": "user.registered",
  "source": "user-service",
  "timestamp": "2026-05-01T10:00:00Z",
  "version": "1.0",
  "payload": {
    "userId": "uuid",
    "email": "user@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "source": "web",
    "referralCode": "REF123"
  }
}
```

### 2. user.updated

Fired when user profile is modified.

**Published by**: user-service
**Subscribers**: order-service, analytics-service

```json
{
  "eventId": "550e8400-e29b-41d4-a716-446655440002",
  "eventType": "user.updated",
  "source": "user-service",
  "timestamp": "2026-05-01T10:05:00Z",
  "version": "1.0",
  "payload": {
    "userId": "uuid",
    "changes": ["email", "phone"],
    "previousValues": {
      "email": "old@example.com"
    }
  }
}
```

### 3. user.verified

Fired when user completes email/phone verification.

**Published by**: auth-service
**Subscribers**: notification-service

```json
{
  "eventId": "550e8400-e29b-41d4-a716-446655440003",
  "eventType": "user.verified",
  "source": "auth-service",
  "timestamp": "2026-05-01T10:10:00Z",
  "version": "1.0",
  "payload": {
    "userId": "uuid",
    "verificationType": "email",
    "verifiedAt": "2026-05-01T10:10:00Z"
  }
}
```

### 4. user.suspended

Fired when user account is suspended.

**Published by**: auth-service
**Subscribers**: order-service, payment-service, wallet-service

```json
{
  "eventId": "550e8400-e29b-41d4-a716-446655440004",
  "eventType": "user.suspended",
  "source": "auth-service",
  "timestamp": "2026-05-01T10:15:00Z",
  "version": "1.0",
  "payload": {
    "userId": "uuid",
    "reason": "fraudulent_activity",
    "suspendedBy": "admin-uuid"
  }
}
```

### 5. user.deleted

Fired when user account is deleted (GDPR compliance).

**Published by**: user-service
**Subscribers**: all-services

```json
{
  "eventId": "550e8400-e29b-41d4-a716-446655440005",
  "eventType": "user.deleted",
  "source": "user-service",
  "timestamp": "2026-05-01T10:20:00Z",
  "version": "1.0",
  "payload": {
    "userId": "uuid",
    "deletedAt": "2026-05-01T10:20:00Z",
    "reason": "user_request"
  }
}
```

---

## Order Events

### 6. order.created

Fired when a new order is placed.

**Published by**: order-service
**Subscribers**: payment-service, inventory-service, automation-service, analytics-service

```json
{
  "eventId": "550e8400-e29b-41d4-a716-446655440006",
  "eventType": "order.created",
  "source": "order-service",
  "timestamp": "2026-05-01T10:25:00Z",
  "version": "1.0",
  "payload": {
    "orderId": "uuid",
    "userId": "uuid",
    "items": [
      {
        "productId": "uuid",
        "name": "Product Name",
        "quantity": 2,
        "price": 29.99
      }
    ],
    "subtotal": 59.98,
    "tax": 5.40,
    "shipping": 5.00,
    "total": 70.38,
    "currency": "USD",
    "shippingAddress": {
      "street": "123 Main St",
      "city": "New York",
      "state": "NY",
      "zip": "10001"
    }
  }
}
```

### 7. order.confirmed

Fired when order is confirmed (payment successful).

**Published by**: order-service
**Subscribers**: notification-service, inventory-service, analytics-service

```json
{
  "eventId": "550e8400-e29b-41d4-a716-446655440007",
  "eventType": "order.confirmed",
  "source": "order-service",
  "timestamp": "2026-05-01T10:30:00Z",
  "version": "1.0",
  "payload": {
    "orderId": "uuid",
    "userId": "uuid",
    "confirmedAt": "2026-05-01T10:30:00Z"
  }
}
```

### 8. order.shipped

Fired when order is shipped.

**Published by**: order-service
**Subscribers**: notification-service, analytics-service

```json
{
  "eventId": "550e8400-e29b-41d4-a716-446655440008",
  "eventType": "order.shipped",
  "source": "order-service",
  "timestamp": "2026-05-01T10:35:00Z",
  "version": "1.0",
  "payload": {
    "orderId": "uuid",
    "userId": "uuid",
    "trackingNumber": "TRACK123456",
    "carrier": "FedEx",
    "estimatedDelivery": "2026-05-05T00:00:00Z"
  }
}
```

### 9. order.delivered

Fired when order is delivered.

**Published by**: order-service
**Subscribers**: notification-service, analytics-service, automation-service

```json
{
  "eventId": "550e8400-e29b-41d4-a716-446655440009",
  "eventType": "order.delivered",
  "source": "order-service",
  "timestamp": "2026-05-01T10:40:00Z",
  "version": "1.0",
  "payload": {
    "orderId": "uuid",
    "userId": "uuid",
    "deliveredAt": "2026-05-01T10:40:00Z",
    "signature": "base64-signature"
  }
}
```

### 10. order.cancelled

Fired when order is cancelled.

**Published by**: order-service
**Subscribers**: payment-service, inventory-service, automation-service

```json
{
  "eventId": "550e8400-e29b-41d4-a716-446655440010",
  "eventType": "order.cancelled",
  "source": "order-service",
  "timestamp": "2026-05-01T10:45:00Z",
  "version": "1.0",
  "payload": {
    "orderId": "uuid",
    "userId": "uuid",
    "reason": "customer_request",
    "refundStatus": "initiated",
    "cancelledAt": "2026-05-01T10:45:00Z"
  }
}
```

### 11. order.updated

Fired when order details are modified.

**Published by**: order-service
**Subscribers**: notification-service

```json
{
  "eventId": "550e8400-e29b-41d4-a716-446655440011",
  "eventType": "order.updated",
  "source": "order-service",
  "timestamp": "2026-05-01T10:50:00Z",
  "version": "1.0",
  "payload": {
    "orderId": "uuid",
    "userId": "uuid",
    "changes": {
      "shippingAddress": {
        "from": {...},
        "to": {...}
      }
    },
    "updatedAt": "2026-05-01T10:50:00Z"
  }
}
```

### 12. order.returned

Fired when order items are returned.

**Published by**: order-service
**Subscribers**: inventory-service, payment-service, analytics-service

```json
{
  "eventId": "550e8400-e29b-41d4-a716-446655440012",
  "eventType": "order.returned",
  "source": "order-service",
  "timestamp": "2026-05-01T10:55:00Z",
  "version": "1.0",
  "payload": {
    "orderId": "uuid",
    "userId": "uuid",
    "returnId": "uuid",
    "items": [...],
    "refundAmount": 70.38,
    "reason": "defective"
  }
}
```

### 13. order.completed

Fired when order lifecycle is complete (delivered and no refunds pending).

**Published by**: order-service
**Subscribers**: analytics-service, automation-service

```json
{
  "eventId": "550e8400-e29b-41d4-a716-446655440013",
  "eventType": "order.completed",
  "source": "order-service",
  "timestamp": "2026-05-01T11:00:00Z",
  "version": "1.0",
  "payload": {
    "orderId": "uuid",
    "userId": "uuid",
    "completedAt": "2026-05-01T11:00:00Z",
    "loyaltyPointsEarned": 703
  }
}
```

---

## Payment Events

### 14. payment.initiated

Fired when payment process begins.

**Published by**: payment-service
**Subscribers**: order-service, analytics-service

```json
{
  "eventId": "550e8400-e29b-41d4-a716-446655440014",
  "eventType": "payment.initiated",
  "source": "payment-service",
  "timestamp": "2026-05-01T11:05:00Z",
  "version": "1.0",
  "payload": {
    "paymentId": "uuid",
    "orderId": "uuid",
    "userId": "uuid",
    "amount": 70.38,
    "currency": "USD",
    "method": "credit_card",
    "gateway": "stripe"
  }
}
```

### 15. payment.pending

Fired when payment is awaiting confirmation (e.g., bank transfer).

**Published by**: payment-service
**Subscribers**: order-service

```json
{
  "eventId": "550e8400-e29b-41d4-a716-446655440015",
  "eventType": "payment.pending",
  "source": "payment-service",
  "timestamp": "2026-05-01T11:10:00Z",
  "version": "1.0",
  "payload": {
    "paymentId": "uuid",
    "orderId": "uuid",
    "pendingReason": "bank_verification",
    "expectedConfirmation": "2026-05-02T00:00:00Z"
  }
}
```

### 16. payment.completed

Fired when payment is successfully processed.

**Published by**: payment-service
**Subscribers**: order-service, wallet-service, analytics-service, automation-service

```json
{
  "eventId": "550e8400-e29b-41d4-a716-446655440016",
  "eventType": "payment.completed",
  "source": "payment-service",
  "timestamp": "2026-05-01T11:15:00Z",
  "version": "1.0",
  "payload": {
    "paymentId": "uuid",
    "orderId": "uuid",
    "userId": "uuid",
    "amount": 70.38,
    "currency": "USD",
    "gatewayTransactionId": "txn_stripe_123",
    "completedAt": "2026-05-01T11:15:00Z"
  }
}
```

### 17. payment.failed

Fired when payment processing fails.

**Published by**: payment-service
**Subscribers**: order-service, automation-service

```json
{
  "eventId": "550e8400-e29b-41d4-a716-446655440017",
  "eventType": "payment.failed",
  "source": "payment-service",
  "timestamp": "2026-05-01T11:20:00Z",
  "version": "1.0",
  "payload": {
    "paymentId": "uuid",
    "orderId": "uuid",
    "userId": "uuid",
    "reason": "insufficient_funds",
    "retryCount": 0,
    "gatewayError": "Your card has insufficient funds."
  }
}
```

### 18. payment.refunded

Fired when refund is processed.

**Published by**: payment-service
**Subscribers**: order-service, wallet-service, analytics-service

```json
{
  "eventId": "550e8400-e29b-41d4-a716-446655440018",
  "eventType": "payment.refunded",
  "source": "payment-service",
  "timestamp": "2026-05-01T11:25:00Z",
  "version": "1.0",
  "payload": {
    "paymentId": "uuid",
    "refundId": "uuid",
    "orderId": "uuid",
    "userId": "uuid",
    "refundAmount": 70.38,
    "currency": "USD",
    "reason": "customer_request",
    "refundedAt": "2026-05-01T11:25:00Z"
  }
}
```

### 19. payment.disputed

Fired when customer initiates chargeback/dispute.

**Published by**: payment-service
**Subscribers**: order-service, fraud-detection-service, analytics-service

```json
{
  "eventId": "550e8400-e29b-41d4-a716-446655440019",
  "eventType": "payment.disputed",
  "source": "payment-service",
  "timestamp": "2026-05-01T11:30:00Z",
  "version": "1.0",
  "payload": {
    "paymentId": "uuid",
    "orderId": "uuid",
    "userId": "uuid",
    "disputeReason": "product_not_received",
    "disputeAmount": 70.38
  }
}
```

---

## Wallet Events

### 20. wallet.created

Fired when user wallet is created.

**Published by**: wallet-service
**Subscribers**: user-service, notification-service

```json
{
  "eventId": "550e8400-e29b-41d4-a716-446655440020",
  "eventType": "wallet.created",
  "source": "wallet-service",
  "timestamp": "2026-05-01T11:35:00Z",
  "version": "1.0",
  "payload": {
    "walletId": "uuid",
    "userId": "uuid",
    "currency": "USD",
    "initialBalance": 0
  }
}
```

### 21. wallet.deposit

Fired when funds are deposited to wallet.

**Published by**: wallet-service
**Subscribers**: notification-service, analytics-service

```json
{
  "eventId": "550e8400-e29b-41d4-a716-446655440021",
  "eventType": "wallet.deposit",
  "source": "wallet-service",
  "timestamp": "2026-05-01T11:40:00Z",
  "version": "1.0",
  "payload": {
    "walletId": "uuid",
    "userId": "uuid",
    "transactionId": "uuid",
    "amount": 100.00,
    "currency": "USD",
    "source": "bank_transfer",
    "newBalance": 100.00
  }
}
```

### 22. wallet.withdrawal

Fired when funds are withdrawn from wallet.

**Published by**: wallet-service
**Subscribers**: notification-service, analytics-service

```json
{
  "eventId": "550e8400-e29b-41d4-a716-446655440022",
  "eventType": "wallet.withdrawal",
  "source": "wallet-service",
  "timestamp": "2026-05-01T11:45:00Z",
  "version": "1.0",
  "payload": {
    "walletId": "uuid",
    "userId": "uuid",
    "transactionId": "uuid",
    "amount": 50.00,
    "currency": "USD",
    "destination": "bank_account",
    "newBalance": 50.00
  }
}
```

### 23. wallet.transfer

Fired when funds are transferred between wallets.

**Published by**: wallet-service
**Subscribers**: notification-service, analytics-service, automation-service

```json
{
  "eventId": "550e8400-e29b-41d4-a716-446655440023",
  "eventType": "wallet.transfer",
  "source": "wallet-service",
  "timestamp": "2026-05-01T11:50:00Z",
  "version": "1.0",
  "payload": {
    "transactionId": "uuid",
    "fromWalletId": "uuid",
    "toWalletId": "uuid",
    "fromUserId": "uuid",
    "toUserId": "uuid",
    "amount": 25.00,
    "currency": "USD",
    "reference": "Payment for Order #123"
  }
}
```

### 24. wallet.balance_changed

Fired when wallet balance changes (deposit, withdrawal, credit, debit).

**Published by**: wallet-service
**Subscribers**: automation-service, analytics-service

```json
{
  "eventId": "550e8400-e29b-41d4-a716-446655440024",
  "eventType": "wallet.balance_changed",
  "source": "wallet-service",
  "timestamp": "2026-05-01T11:55:00Z",
  "version": "1.0",
  "payload": {
    "walletId": "uuid",
    "userId": "uuid",
    "previousBalance": 50.00,
    "newBalance": 75.00,
    "changeAmount": 25.00,
    "changeType": "credit",
    "reason": "deposit"
  }
}
```

---

## Inventory Events

### 25. inventory.updated

Fired when inventory levels change.

**Published by**: inventory-service
**Subscribers**: order-service, automation-service, analytics-service

```json
{
  "eventId": "550e8400-e29b-41d4-a716-446655440025",
  "eventType": "inventory.updated",
  "source": "inventory-service",
  "timestamp": "2026-05-01T12:00:00Z",
  "version": "1.0",
  "payload": {
    "productId": "uuid",
    "warehouseId": "uuid",
    "previousQuantity": 100,
    "newQuantity": 85,
    "changeType": "sale",
    "orderId": "uuid"
  }
}
```

### 26. inventory.low_stock

Fired when product stock falls below threshold.

**Published by**: inventory-service
**Subscribers**: automation-service, notification-service

```json
{
  "eventId": "550e8400-e29b-41d4-a716-446655440026",
  "eventType": "inventory.low_stock",
  "source": "inventory-service",
  "timestamp": "2026-05-01T12:05:00Z",
  "version": "1.0",
  "payload": {
    "productId": "uuid",
    "productName": "Product Name",
    "currentStock": 5,
    "threshold": 10,
    "warehouseId": "uuid"
  }
}
```

### 27. inventory.restocked

Fired when inventory is replenished.

**Published by**: inventory-service
**Subscribers**: notification-service, analytics-service

```json
{
  "eventId": "550e8400-e29b-41d4-a716-446655440027",
  "eventType": "inventory.restocked",
  "source": "inventory-service",
  "timestamp": "2026-05-01T12:10:00Z",
  "version": "1.0",
  "payload": {
    "productId": "uuid",
    "warehouseId": "uuid",
    "quantityAdded": 500,
    "newTotal": 505,
    "supplierId": "uuid",
    "purchaseOrderId": "uuid"
  }
}
```

### 28. inventory.reserved

Fired when inventory is reserved for an order.

**Published by**: inventory-service
**Subscribers**: order-service

```json
{
  "eventId": "550e8400-e29b-41d4-a716-446655440028",
  "eventType": "inventory.reserved",
  "source": "inventory-service",
  "timestamp": "2026-05-01T12:15:00Z",
  "version": "1.0",
  "payload": {
    "productId": "uuid",
    "orderId": "uuid",
    "quantityReserved": 2,
    "reservationExpires": "2026-05-02T12:15:00Z"
  }
}
```

---

## Hotel Events

### 29. hotel.booking.created

Fired when a new hotel booking is created.

**Published by**: hotel-service
**Subscribers**: booking-engine, automation-service, analytics-service, notification-service

```json
{
  "eventId": "550e8400-e29b-41d4-a716-446655440029",
  "eventType": "hotel.booking.created",
  "source": "hotel-service",
  "timestamp": "2026-05-01T12:20:00Z",
  "version": "1.0",
  "payload": {
    "bookingId": "uuid",
    "userId": "uuid",
    "hotelId": "uuid",
    "roomId": "uuid",
    "checkInDate": "2026-06-01",
    "checkOutDate": "2026-06-05",
    "guests": 2,
    "totalPrice": 450.00,
    "currency": "USD",
    "status": "confirmed"
  }
}
```

### 30. hotel.booking.updated

Fired when booking details are modified.

**Published by**: hotel-service
**Subscribers**: notification-service, analytics-service

```json
{
  "eventId": "550e8400-e29b-41d4-a716-446655440030",
  "eventType": "hotel.booking.updated",
  "source": "hotel-service",
  "timestamp": "2026-05-01T12:25:00Z",
  "version": "1.0",
  "payload": {
    "bookingId": "uuid",
    "userId": "uuid",
    "changes": {
      "checkOutDate": {
        "from": "2026-06-05",
        "to": "2026-06-07"
      }
    },
    "updatedAt": "2026-05-01T12:25:00Z"
  }
}
```

### 31. hotel.booking.cancelled

Fired when booking is cancelled.

**Published by**: hotel-service
**Subscribers**: booking-engine, payment-service, automation-service

```json
{
  "eventId": "550e8400-e29b-41d4-a716-446655440031",
  "eventType": "hotel.booking.cancelled",
  "source": "hotel-service",
  "timestamp": "2026-05-01T12:30:00Z",
  "version": "1.0",
  "payload": {
    "bookingId": "uuid",
    "userId": "uuid",
    "reason": "customer_request",
    "refundAmount": 450.00,
    "cancelledAt": "2026-05-01T12:30:00Z"
  }
}
```

### 32. hotel.room.checked_in

Fired when guest checks into the hotel.

**Published by**: hotel-service
**Subscribers**: booking-engine, automation-service, analytics-service, notification-service

```json
{
  "eventId": "550e8400-e29b-41d4-a716-446655440032",
  "eventType": "hotel.room.checked_in",
  "source": "hotel-service",
  "timestamp": "2026-05-01T14:00:00Z",
  "version": "1.0",
  "payload": {
    "bookingId": "uuid",
    "userId": "uuid",
    "hotelId": "uuid",
    "roomId": "uuid",
    "roomNumber": "301",
    "checkInTime": "2026-05-01T14:00:00Z",
    "expectedCheckOut": "2026-06-05T11:00:00Z",
    "keyCardsIssued": 2
  }
}
```

### 33. hotel.room.checked_out

Fired when guest checks out of the hotel.

**Published by**: hotel-service
**Subscribers**: booking-engine, payment-service, automation-service, analytics-service

```json
{
  "eventId": "550e8400-e29b-41d4-a716-446655440033",
  "eventType": "hotel.room.checked_out",
  "source": "hotel-service",
  "timestamp": "2026-06-05T11:00:00Z",
  "version": "1.0",
  "payload": {
    "bookingId": "uuid",
    "userId": "uuid",
    "hotelId": "uuid",
    "roomId": "uuid",
    "roomNumber": "301",
    "checkOutTime": "2026-06-05T11:00:00Z",
    "actualCheckIn": "2026-05-01T14:00:00Z",
    "actualCheckOut": "2026-06-05T11:00:00Z",
    "nightsStayed": 4,
    "extraCharges": 25.00,
    "roomCondition": "good"
  }
}
```

### 34. hotel.room.status_changed

Fired when room status changes (cleaning, maintenance, etc.).

**Published by**: hotel-service
**Subscribers**: booking-engine, analytics-service

```json
{
  "eventId": "550e8400-e29b-41d4-a716-446655440034",
  "eventType": "hotel.room.status_changed",
  "source": "hotel-service",
  "timestamp": "2026-05-01T12:35:00Z",
  "version": "1.0",
  "payload": {
    "hotelId": "uuid",
    "roomId": "uuid",
    "roomNumber": "301",
    "previousStatus": "occupied",
    "newStatus": "cleaning",
    "reason": "checkout"
  }
}
```

---

## AI & Insights Events

### 35. intent.captured

Fired when user intent is captured by ReZ Mind.

**Published by**: rez-mind
**Subscribers**: insights-service, analytics-service

```json
{
  "eventId": "550e8400-e29b-41d4-a716-446655440035",
  "eventType": "intent.captured",
  "source": "rez-mind",
  "timestamp": "2026-05-01T12:40:00Z",
  "version": "1.0",
  "payload": {
    "userId": "uuid",
    "sessionId": "uuid",
    "inputType": "text",
    "inputText": "I need to book a hotel for next weekend",
    "detectedIntent": "hotel_booking",
    "entities": {
      "dates": ["2026-05-08", "2026-05-10"],
      "location": "New York"
    },
    "confidence": 0.92
  }
}
```

### 36. intent.processed

Fired when intent processing is complete.

**Published by**: rez-mind
**Subscribers**: insights-service, automation-service

```json
{
  "eventId": "550e8400-e29b-41d4-a716-446655440036",
  "eventType": "intent.processed",
  "source": "rez-mind",
  "timestamp": "2026-05-01T12:40:05Z",
  "version": "1.0",
  "payload": {
    "sessionId": "uuid",
    "userId": "uuid",
    "processedIntent": "hotel_booking",
    "context": {
      "preferences": {...},
      "history": [...]
    },
    "suggestedActions": ["search_hotels", "show_recommendations"],
    "insightsGenerated": ["budget_friendly_option", "popular_destination"]
  }
}
```

### 37. insight.generated

Fired when a new AI insight is generated.

**Published by**: insights-service
**Subscribers**: copilot-ui, automation-service, notification-service

```json
{
  "eventId": "550e8400-e29b-41d4-a716-446655440037",
  "eventType": "insight.generated",
  "source": "insights-service",
  "timestamp": "2026-05-01T12:45:00Z",
  "version": "1.0",
  "payload": {
    "insightId": "uuid",
    "userId": "uuid",
    "insightType": "recommendation",
    "category": "travel",
    "title": "Great time to book your NYC trip",
    "description": "Prices are 15% lower than average for next weekend",
    "confidenceScore": 0.89,
    "source": "rez-mind",
    "actionable": true,
    "priority": 1
  }
}
```

### 38. analysis.complete

Fired when data analysis is completed.

**Published by**: analytics-service
**Subscribers**: insights-service, automation-service

```json
{
  "eventId": "550e8400-e29b-41d4-a716-446655440038",
  "eventType": "analysis.complete",
  "source": "analytics-service",
  "timestamp": "2026-05-01T12:50:00Z",
  "version": "1.0",
  "payload": {
    "analysisId": "uuid",
    "userId": "uuid",
    "analysisType": "spending_pattern",
    "results": {
      "averageOrderValue": 75.50,
      "orderFrequency": "weekly",
      "topCategories": ["electronics", "clothing"]
    },
    "insights": ["You spend 40% more on weekends"]
  }
}
```

---

## Automation Events

### 39. automation.executed

Fired when an automation rule is successfully executed.

**Published by**: automation-service
**Subscribers**: logging-service, analytics-service

```json
{
  "eventId": "550e8400-e29b-41d4-a716-446655440039",
  "eventType": "automation.executed",
  "source": "automation-service",
  "timestamp": "2026-05-01T12:55:00Z",
  "version": "1.0",
  "payload": {
    "executionId": "uuid",
    "ruleId": "uuid",
    "ruleName": "Customer Churn Prevention",
    "triggeredBy": "order.cancelled",
    "status": "success",
    "actionsExecuted": [
      {
        "type": "notification",
        "status": "sent"
      },
      {
        "type": "webhook",
        "status": "completed",
        "responseCode": 200
      }
    ],
    "executionTime": 245,
    "completedAt": "2026-05-01T12:55:00Z"
  }
}
```

### 40. automation.failed

Fired when automation rule execution fails.

**Published by**: automation-service
**Subscribers**: notification-service, logging-service

```json
{
  "eventId": "550e8400-e29b-41d4-a716-446655440040",
  "eventType": "automation.failed",
  "source": "automation-service",
  "timestamp": "2026-05-01T13:00:00Z",
  "version": "1.0",
  "payload": {
    "executionId": "uuid",
    "ruleId": "uuid",
    "ruleName": "Inventory Restock Alert",
    "triggeredBy": "inventory.low_stock",
    "error": {
      "code": "WEBHOOK_TIMEOUT",
      "message": "External API did not respond in time"
    },
    "retryable": true,
    "failedAt": "2026-05-01T13:00:00Z"
  }
}
```

### 41. automation.action_completed

Fired when individual action within a rule completes.

**Published by**: automation-service
**Subscribers**: logging-service

```json
{
  "eventId": "550e8400-e29b-41d4-a716-446655440041",
  "eventType": "automation.action_completed",
  "source": "automation-service",
  "timestamp": "2026-05-01T13:05:00Z",
  "version": "1.0",
  "payload": {
    "executionId": "uuid",
    "ruleId": "uuid",
    "actionIndex": 0,
    "actionType": "email",
    "status": "delivered",
    "recipient": "user@example.com"
  }
}
```

### 42. automation.rule_triggered

Fired when a rule condition is matched.

**Published by**: automation-service
**Subscribers**: logging-service, analytics-service

```json
{
  "eventId": "550e8400-e29b-41d4-a716-446655440042",
  "eventType": "automation.rule_triggered",
  "source": "automation-service",
  "timestamp": "2026-05-01T13:10:00Z",
  "version": "1.0",
  "payload": {
    "ruleId": "uuid",
    "ruleName": "Payment Failure Recovery",
    "matchedCondition": {
      "event": "payment.failed",
      "conditions": [
        {"field": "retryCount", "operator": "<", "value": 3}
      ]
    },
    "triggeringEvent": {
      "eventType": "payment.failed",
      "eventId": "550e8400-e29b-41d4-a716-446655440017"
    }
  }
}
```

---

## Notification Events

### 43. notification.sent

Fired when notification is successfully sent.

**Published by**: notification-service
**Subscribers**: analytics-service

```json
{
  "eventId": "550e8400-e29b-41d4-a716-446655440043",
  "eventType": "notification.sent",
  "source": "notification-service",
  "timestamp": "2026-05-01T13:15:00Z",
  "version": "1.0",
  "payload": {
    "notificationId": "uuid",
    "userId": "uuid",
    "channel": "email",
    "template": "order_confirmation",
    "recipient": "user@example.com",
    "sentAt": "2026-05-01T13:15:00Z"
  }
}
```

### 44. notification.delivered

Fired when notification is confirmed delivered.

**Published by**: notification-service
**Subscribers**: analytics-service

```json
{
  "eventId": "550e8400-e29b-41d4-a716-446655440044",
  "eventType": "notification.delivered",
  "source": "notification-service",
  "timestamp": "2026-05-01T13:20:00Z",
  "version": "1.0",
  "payload": {
    "notificationId": "uuid",
    "userId": "uuid",
    "channel": "push",
    "deliveredAt": "2026-05-01T13:20:00Z",
    "deviceType": "iOS"
  }
}
```

### 45. notification.failed

Fired when notification delivery fails.

**Published by**: notification-service
**Subscribers**: automation-service, logging-service

```json
{
  "eventId": "550e8400-e29b-41d4-a716-446655440045",
  "eventType": "notification.failed",
  "source": "notification-service",
  "timestamp": "2026-05-01T13:25:00Z",
  "version": "1.0",
  "payload": {
    "notificationId": "uuid",
    "userId": "uuid",
    "channel": "sms",
    "error": "invalid_phone_number",
    "retryable": false
  }
}
```

---

## System Events

### 46. system.health_check

Fired periodically with system health status.

**Published by**: monitoring-service
**Subscribers**: dashboard-service

```json
{
  "eventId": "550e8400-e29b-41d4-a716-446655440046",
  "eventType": "system.health_check",
  "source": "monitoring-service",
  "timestamp": "2026-05-01T13:30:00Z",
  "version": "1.0",
  "payload": {
    "overallStatus": "healthy",
    "services": {
      "gateway": "healthy",
      "auth": "healthy",
      "order": "healthy",
      "payment": "degraded"
    },
    "metrics": {
      "cpuUsage": 45,
      "memoryUsage": 62,
      "responseTime": 85
    }
  }
}
```

### 47. system.config_changed

Fired when configuration is updated.

**Published by**: config-service
**Subscribers**: all-services

```json
{
  "eventId": "550e8400-e29b-41d4-a716-446655440047",
  "eventType": "system.config_changed",
  "source": "config-service",
  "timestamp": "2026-05-01T13:35:00Z",
  "version": "1.0",
  "payload": {
    "configKey": "feature_flags.dynamic_pricing",
    "previousValue": false,
    "newValue": true,
    "changedBy": "admin-uuid",
    "reason": "Seasonal promotion"
  }
}
```

### 48. system.deployment

Fired when a service is deployed.

**Published by**: deployment-service
**Subscribers**: monitoring-service, notification-service

```json
{
  "eventId": "550e8400-e29b-41d4-a716-446655440048",
  "eventType": "system.deployment",
  "source": "deployment-service",
  "timestamp": "2026-05-01T13:40:00Z",
  "version": "1.0",
  "payload": {
    "serviceName": "order-service",
    "version": "2.3.1",
    "environment": "production",
    "deployedBy": "ci-pipeline",
    "deployedAt": "2026-05-01T13:40:00Z"
  }
}
```

### 49. system.error

Fired when system error is detected.

**Published by**: monitoring-service
**Subscribers**: alert-service, logging-service

```json
{
  "eventId": "550e8400-e29b-41d4-a716-446655440049",
  "eventType": "system.error",
  "source": "monitoring-service",
  "timestamp": "2026-05-01T13:45:00Z",
  "version": "1.0",
  "payload": {
    "serviceName": "payment-service",
    "errorType": "database_connection",
    "message": "Connection pool exhausted",
    "severity": "high",
    "occurredAt": "2026-05-01T13:45:00Z"
  }
}
```

### 50. system.maintenance

Fired when system maintenance window starts/ends.

**Published by**: monitoring-service
**Subscribers**: all-services

```json
{
  "eventId": "550e8400-e29b-41d4-a716-446655440050",
  "eventType": "system.maintenance",
  "source": "monitoring-service",
  "timestamp": "2026-05-01T13:50:00Z",
  "version": "1.0",
  "payload": {
    "type": "scheduled",
    "status": "started",
    "services": ["database-primary"],
    "expectedDuration": "30 minutes",
    "startedAt": "2026-05-01T13:50:00Z"
  }
}
```

---

## Event Subscriptions

### Complete Subscription Matrix

| Event | Subscribers |
|-------|-------------|
| user.registered | notification-service, automation-service, insights-service |
| user.updated | order-service, analytics-service |
| user.verified | notification-service |
| user.suspended | order-service, payment-service, wallet-service |
| user.deleted | all-services |
| order.created | payment-service, inventory-service, automation-service, analytics-service |
| order.confirmed | notification-service, inventory-service, analytics-service |
| order.shipped | notification-service, analytics-service |
| order.delivered | notification-service, analytics-service, automation-service |
| order.cancelled | payment-service, inventory-service, automation-service |
| order.updated | notification-service |
| order.returned | inventory-service, payment-service, analytics-service |
| order.completed | analytics-service, automation-service |
| payment.initiated | order-service, analytics-service |
| payment.pending | order-service |
| payment.completed | order-service, wallet-service, analytics-service, automation-service |
| payment.failed | order-service, automation-service |
| payment.refunded | order-service, wallet-service, analytics-service |
| payment.disputed | order-service, fraud-detection-service, analytics-service |
| wallet.created | user-service, notification-service |
| wallet.deposit | notification-service, analytics-service |
| wallet.withdrawal | notification-service, analytics-service |
| wallet.transfer | notification-service, analytics-service, automation-service |
| wallet.balance_changed | automation-service, analytics-service |
| inventory.updated | order-service, automation-service, analytics-service |
| inventory.low_stock | automation-service, notification-service |
| inventory.restocked | notification-service, analytics-service |
| inventory.reserved | order-service |
| hotel.booking.created | booking-engine, automation-service, analytics-service, notification-service |
| hotel.booking.updated | notification-service, analytics-service |
| hotel.booking.cancelled | booking-engine, payment-service, automation-service |
| hotel.room.checked_in | booking-engine, automation-service, analytics-service, notification-service |
| hotel.room.checked_out | booking-engine, payment-service, automation-service, analytics-service |
| hotel.room.status_changed | booking-engine, analytics-service |
| intent.captured | insights-service, analytics-service |
| intent.processed | insights-service, automation-service |
| insight.generated | copilot-ui, automation-service, notification-service |
| analysis.complete | insights-service, automation-service |
| automation.executed | logging-service, analytics-service |
| automation.failed | notification-service, logging-service |
| automation.action_completed | logging-service |
| automation.rule_triggered | logging-service, analytics-service |
| notification.sent | analytics-service |
| notification.delivered | analytics-service |
| notification.failed | automation-service, logging-service |
| system.health_check | dashboard-service |
| system.config_changed | all-services |
| system.deployment | monitoring-service, notification-service |
| system.error | alert-service, logging-service |
| system.maintenance | all-services |

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 2.0.0 | 2026-05-01 | Added hotel.booking.created, hotel.room.checked_in, hotel.room.checked_out, insight.generated, automation.executed |
| 1.0.0 | 2025-12-15 | Initial event inventory |

---

*Last updated: 2026-05-01*
