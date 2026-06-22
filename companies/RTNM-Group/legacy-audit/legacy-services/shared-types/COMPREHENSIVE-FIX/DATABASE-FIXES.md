# Database Schema Fixes - 2026-05-02

## Summary

This document outlines all database schema issues identified and fixed in the ReZ backend system.

## Issues Found and Fixed

### 1. Order Schema - Invalid State Transitions (CRITICAL)

**File:** `/rezbackend/rez-backend-master/src/models/Order.ts`

**Issue:** The `ORDER_VALID_TRANSITIONS` map contained states (`failed_delivery`, `return_requested`, `return_rejected`) that did not exist in the schema's status enum.

**Schema Status Enum Values:**
```
placed, confirmed, preparing, ready, dispatched, out_for_delivery, delivered,
cancelling, cancelled, returned, refunded
```

**Before (INCORRECT):**
```typescript
const ORDER_VALID_TRANSITIONS: Record<string, string[]> = {
  placed: ['confirmed', 'cancelled'],
  confirmed: ['preparing', 'cancelled'],
  preparing: ['ready', 'cancelled'],
  ready: ['dispatched', 'cancelled'],
  dispatched: ['delivered', 'cancelled', 'failed_delivery'],
  failed_delivery: ['dispatched', 'cancelled'],
  delivered: ['return_requested'],
  return_requested: ['returned', 'return_rejected'],
  return_rejected: [],
  returned: ['refunded'],
  cancelled: ['refunded'],
  refunded: [],
};
```

**After (CORRECT):**
```typescript
const ORDER_VALID_TRANSITIONS: Record<string, string[]> = {
  placed: ['confirmed', 'cancelling'],
  confirmed: ['preparing', 'cancelling'],
  preparing: ['ready', 'cancelling'],
  ready: ['dispatched', 'cancelling'],
  dispatched: ['out_for_delivery', 'cancelling'],
  out_for_delivery: ['delivered', 'cancelling'],
  delivered: ['cancelling'],
  cancelling: ['cancelled'],
  cancelled: [],
  returned: ['refunded'],
  refunded: [],
};
```

**Also Fixed:** Status messages to match the corrected transitions.

---

### 2. User Schema - Missing Indexes

**File:** `/rezbackend/rez-backend-master/src/models/User.ts`

**Added Indexes:**
```typescript
// FIX: Missing compound indexes for common queries
UserSchema.index({ email: 1, role: 1 }); // for user lookup by email and role
UserSchema.index({ role: 1, createdAt: -1 }); // for admin user queries by role
UserSchema.index({ referralTier: 1, createdAt: -1 }); // for tier-based analytics
UserSchema.index({ 'preferences.theme': 1 }); // for theme analytics
UserSchema.index({ isSuspended: 1, createdAt: -1 }); // for suspension tracking
```

---

### 3. Payment Schema - Missing Indexes

**File:** `/rezbackend/rez-backend-master/src/models/Payment.ts`

**Added Indexes:**
```typescript
// FIX: Missing indexes for common queries
PaymentSchema.index({ purpose: 1, status: 1 }); // for purpose-based filtering
PaymentSchema.index({ createdAt: 1, status: 1 }); // for status timeline queries
PaymentSchema.index({ user: 1, purpose: 1, createdAt: -1 }); // for user purpose analytics
PaymentSchema.index({ paymentMethod: 1, status: 1 }); // for payment method analytics
PaymentSchema.index({ completedAt: 1 }); // for completed payment date queries
```

---

### 4. Store Schema - Missing Indexes

**File:** `/rezbackend/rez-backend-master/src/models/Store.ts`

**Added Indexes:**
```typescript
// FIX: Missing compound indexes for common queries
StoreSchema.index({ isActive: 1, merchantId: 1, createdAt: -1 }); // Merchant store listing
StoreSchema.index({ isActive: 1, 'location.city': 1, 'ratings.average': -1 }); // City ranking
StoreSchema.index({ isActive: 1, bookingType: 1, createdAt: -1 }); // Booking type timeline
StoreSchema.index({ isSuspended: 1, createdAt: -1 }); // Suspension tracking
StoreSchema.index({ slug: 1 }); // Slug-based lookups
StoreSchema.index({ isProgramMerchant: 1, isActive: 1 }); // Program merchant filtering
```

---

### 5. Notification Schema - Missing Indexes

**File:** `/rezbackend/rez-backend-master/src/models/Notification.ts`

**Added Indexes:**
```typescript
// FIX: Missing indexes for common queries
NotificationSchema.index({ user: 1, isRead: 1 }); // for unread count queries
NotificationSchema.index({ source: 1, priority: 1 }); // for priority filtering by source
NotificationSchema.index({ expiresAt: 1, isRead: 1 }); // for cleanup queries
```

---

### 6. CoinTransaction Schema - Missing Indexes

**File:** `/rezbackend/rez-backend-master/src/models/CoinTransaction.ts`

**Added Indexes:**
```typescript
// FIX: Missing indexes for common queries
CoinTransactionSchema.index({ user: 1, coinType: 1, createdAt: -1 }); // for coin type analytics
CoinTransactionSchema.index({ createdAt: -1, type: 1 }); // for global transaction timeline
CoinTransactionSchema.index({ source: 1, createdAt: -1 }); // for source-based analytics
CoinTransactionSchema.index({ 'metadata.orderId': 1 }); // for order lookup (sparse)
```

---

### 7. Order Schema - Missing Indexes

**File:** `/rezbackend/rez-backend-master/src/models/Order.ts`

**Added Indexes:**
```typescript
// FIX: Missing indexes for common queries
OrderSchema.index({ couponCode: 1, createdAt: -1 }); // Coupon code analytics
OrderSchema.index({ 'analytics.source': 1, createdAt: -1 }); // Analytics source queries
OrderSchema.index({ user: 1, 'payment.status': 1, createdAt: -1 }); // User payment status queries
OrderSchema.index({ 'payment.paidAt': 1 }); // Payment completion date queries
```

---

### 8. Product Schema - Missing Indexes

**File:** `/rezbackend/rez-backend-master/src/models/Product.ts`

**Added Indexes:**
```typescript
// FIX: Missing indexes for common queries
ProductSchema.index({ category: 1, occasion: 1, isActive: 1 }); // Occasion-based queries
ProductSchema.index({ isActive: 1, 'inventory.isAvailable': 1, createdAt: -1 }); // New arrivals with availability
ProductSchema.index({ store: 1, isFeatured: 1, isActive: 1 }); // Featured products by store
ProductSchema.index({ category: 1, 'ratings.average': -1, isActive: 1 }); // Top-rated by category
```

---

## Existing Migration Scripts

The following migration scripts exist for historical data cleanup:

| Script | Purpose |
|--------|---------|
| `migrate-cointransaction-types.ts` | Normalizes coin transaction types (`credit` to `earned`, `debit` to `spent`) |
| `migrateOrderStatuses.ts` | Normalizes order statuses (`pending` to `placed`, etc.) |
| `migrate-nuqta-to-rez.ts` | Renames `nuqta` to `rez` across all coin-related collections |
| `migrate-campaign-slug.ts` | Campaign slug migrations |
| `migrate-nuqta-prive-slug.ts` | Privé slug migrations |

---

## Best Practices Applied

1. **Partial Filter Expressions:** All TTL indexes use `partialFilterExpression` to avoid unintended document deletion
2. **Sparse Indexes:** Used for optional unique fields to allow multiple null values
3. **Compound Indexes:** Added for common multi-field query patterns
4. **2dsphere Indexes:** Proper geospatial indexes for coordinate-based queries
5. **Text Indexes:** For full-text search capabilities on Product and Store schemas

---

## Verification Commands

To verify indexes are created in MongoDB:

```javascript
// Check indexes on a collection
db.orders.getIndexes()
db.users.getIndexes()
db.payments.getIndexes()
db.stores.getIndexes()
db.notifications.getIndexes()
db.cointransactions.getIndexes()
db.products.getIndexes()
```

To analyze query performance:

```javascript
// Explain query plan
db.orders.find({ user: ObjectId("..."), status: "placed" }).explain("executionStats")
```

---

## Rollback Instructions

If any fix causes issues, the following steps will revert:

1. **Order State Transitions:** Restore the original `ORDER_VALID_TRANSITIONS` and `statusMessages` objects
2. **Indexes:** Run the following to drop added indexes:
   ```javascript
   db.orders.dropIndex("couponCode_1_createdAt_-1")
   db.users.dropIndex("email_1_role_1")
   // etc.
   ```
3. **Restart application:** Indexes are created on model registration

---

## Files Modified

- `/rezbackend/rez-backend-master/src/models/Order.ts`
- `/rezbackend/rez-backend-master/src/models/User.ts`
- `/rezbackend/rez-backend-master/src/models/Payment.ts`
- `/rezbackend/rez-backend-master/src/models/Store.ts`
- `/rezbackend/rez-backend-master/src/models/Notification.ts`
- `/rezbackend/rez-backend-master/src/models/CoinTransaction.ts`
- `/rezbackend/rez-backend-master/src/models/Product.ts`

---

*Generated: 2026-05-02*
*Author: Database Schema Fixer*
