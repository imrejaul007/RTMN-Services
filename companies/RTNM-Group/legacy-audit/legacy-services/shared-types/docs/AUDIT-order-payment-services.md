# Financial Audit Report: Order & Payment Services

**Audit Date:** 2026-04-26
**Auditor:** Senior Financial Auditor
**Services Audited:** rez-order-service, rez-payment-service

---

## Executive Summary

| Category | Status |
|----------|--------|
| Order Lifecycle Integrity | PARTIALLY SECURE |
| Payment Processing | SECURE |
| Refund Handling | SECURE |
| Idempotency Mechanisms | MOSTLY SECURE |
| Race Condition Handling | MOSTLY SECURE |
| Concurrency Controls | SECURE |
| Financial Calculations | SECURE |

**Critical Bugs Found:** 2
**High-Severity Issues:** 3
**Medium-Severity Issues:** 4

---

## Order Lifecycle Analysis

### State Diagram

```
States: pending → placed → confirmed → preparing → ready → dispatched → out_for_delivery → delivered
      ↓           ↓          ↓           ↓         ↓
   cancelling → cancelled  cancelled  cancelled  cancelled
                                                             ↓
                                                          failed_delivery
                                                             ↓
                                                       (terminal)
                                                                 ↓
delivered → return_requested → returned → refunded
     ↓              ↓            ↓
  refunded      return_rejected  refunded

cancelled → refunded (when payment refund processed)
```

### State Machine Implementation (httpServer.ts:64-78)

```typescript
const VALID_TRANSITIONS: Record<OrderStatus, readonly OrderStatus[]> = {
  placed:             ['confirmed', 'cancelled', 'cancelling'],
  confirmed:          ['preparing', 'cancelled', 'cancelling'],
  preparing:           ['ready', 'cancelled', 'cancelling'],
  ready:              ['dispatched', 'cancelled', 'cancelling'],
  dispatched:         ['out_for_delivery', 'delivered', 'cancelled'],
  out_for_delivery:   ['delivered', 'failed_delivery', 'cancelled'],
  failed_delivery:    [],  // Terminal state
  delivered:          ['returned', 'refunded', 'return_requested'],
  cancelling:          ['cancelled', 'placed', 'confirmed', 'preparing', 'ready'],
  cancelled:          ['refunded'],
  return_requested:   ['return_rejected', 'returned'],
  return_rejected:    [],  // Terminal state
  returned:           ['refunded'],
  refunded:           [],  // Terminal state
};
```

### Transitions Valid: YES
- Forward progression enforced via state machine
- Backward jumps blocked (max 1 step back allowed)
- Terminal states protected from invalid transitions

### Missing States: NONE
- All expected states present
- Return/refund flow properly modeled

### Race Conditions in Order Service

| Race Condition | Location | Risk Level | Mitigation |
|---------------|----------|------------|------------|
| Concurrent order creation with same idempotency key | httpServer.ts:588-707 | MEDIUM | Partial unique index + duplicate key handling |
| Status update concurrent modification | httpServer.ts:1108-1124 | LOW | CAS (Compare-and-Swap) with status filter |
| Cancel concurrent with status change | httpServer.ts:1191-1199 | LOW | CAS with status filter |
| SSE change stream MongoDB replica requirement | httpServer.ts:796-815 | MEDIUM | Polling fallback provided |

---

## Payment Flow Analysis

### Payment Gateway Integration: Razorpay

| Aspect | Status | Details |
|--------|--------|---------|
| Success Handling | SECURE | Signature verification via timingSafeEqual |
| Failure Handling | SECURE | Idempotent webhook processing, state machine |
| Refund Handling | SECURE | Three-phase atomic refund with reversal |

### Payment State Machine (Payment.ts:66-78)

```typescript
const VALID_TRANSITIONS: Record<string, string[]> = {
  pending: ['processing', 'cancelled', 'expired'],
  processing: ['completed', 'failed'],
  completed: ['refund_initiated'],
  failed: ['pending'],  // Retry allowed
  cancelled: [],        // Terminal
  expired: [],          // Terminal
  refund_initiated: ['refund_processing'],
  refund_processing: ['refunded', 'refund_failed'],
  refunded: [],         // Terminal
  refund_failed: ['refund_initiated'],  // Retry allowed
  partially_refunded: ['refund_initiated'],
};
```

### Webhook State Machine (paymentRoutes.ts:554-566)

```typescript
const LEGAL_TRANSITIONS: Record<string, string[]> = {
  pending: ['processing', 'completed', 'cancelled', 'expired'],
  processing: ['completed', 'failed', 'cancelled'],
  completed: ['refund_initiated'],
  // ... rest aligned with Payment.ts
};
```

---

## Critical Bugs Found

### BUG-001: Duplicate Key Error Returns 409 Instead of Original Order

**File:** `/Users/rejaulkarim/Documents/ReZ Full App/rez-order-service/src/httpServer.ts:699-709`

**Code:**
```typescript
} catch (err) {
  const mongoErr = err as { code?: number; message?: string };
  if (mongoErr && mongoErr.code === 11000) {
    logger.warn('[OrderAudit] order_create_duplicate_key', {
      message: mongoErr.message,
    });
    return res.status(409).json({ success: false, message: 'Duplicate order creation detected' });
  }
  return next(err);
}
```

**Impact:** When two concurrent requests with the same idempotency key race, the second request receives a 409 error instead of the original order. The first request returns HTTP 200 with the order data (httpServer.ts:599), but the second returns HTTP 409 with an error message.

**Client Impact:**
- Mobile app may interpret 409 as failure and retry, potentially creating new orders
- Payment flow may break if client expects 200 with order data
- Inconsistent behavior between first and second requests

**Fix Required:**
```typescript
if (mongoErr && mongoErr.code === 11000) {
  // Fetch and return the existing order
  const existing = await collection.findOne({
    user: userObjectId,
    clientIdempotencyKey: idempotencyKey,
  });
  if (existing) {
    return res.status(200).json({ success: true, data: stripInternalFields(existing) });
  }
  // Fallback if fetch fails (edge case)
  return res.status(409).json({ success: false, message: 'Duplicate order creation detected' });
}
```

**Severity:** HIGH
**Monetary Impact:** Potential double-order creation on client retry

---

### BUG-002: State Machine Inconsistency Between Payment Model and Webhook Routes

**File:** `/Users/rejaulkarim/Documents/ReZ Full App/rez-payment-service/src/models/Payment.ts:66-78` vs `/Users/rejaulkarim/Documents/ReZ Full App/rez-payment-service/src/routes/paymentRoutes.ts:554-566`

**Discrepancy:**

| State | Payment.ts | paymentRoutes.ts |
|-------|------------|------------------|
| refund_failed | ['refund_initiated'] | [] |
| refund_processing | ['refunded', 'refund_failed'] | ['refunded', 'refund_failed'] |
| partially_refunded | ['refund_initiated'] | [] |

**Impact:** The webhook handler (paymentRoutes.ts) uses `LEGAL_TRANSITIONS` for state validation, while `refundService.ts` and other services use the Payment model which validates via `VALID_TRANSITIONS`. This means:
- A refund that is valid according to the Payment model might be rejected by the webhook handler
- Or vice versa: a webhook might allow transitions that would fail in the DB

**Scenario:**
1. Merchant initiates refund via `processRefund()` (uses Payment model validation)
2. Refund succeeds, status becomes `refund_initiated`
3. Merchant retries refund (valid per Payment.ts: `refund_failed: ['refund_initiated']`)
4. Webhook handler receives `refund.processed` from Razorpay
5. Webhook uses `LEGAL_TRANSITIONS` which has `refund_failed: []` - no allowed transitions
6. Webhook rejects the transition, but Payment model allowed it

**Severity:** CRITICAL (potential financial discrepancy)
**Monetary Impact:** Refund state corruption, potential duplicate refunds

**Fix Required:** Ensure both state machine definitions are identical. Create a shared constant:

```typescript
// src/constants/paymentTransitions.ts
export const PAYMENT_STATE_TRANSITIONS: Record<string, string[]> = {
  pending: ['processing', 'cancelled', 'expired'],
  processing: ['completed', 'failed'],
  completed: ['refund_initiated'],
  failed: ['pending'],
  cancelled: [],
  expired: [],
  refund_initiated: ['refund_processing'],
  refund_processing: ['refunded', 'refund_failed'],
  refunded: [],
  refund_failed: ['refund_initiated'],  // MUST include this
  partially_refunded: ['refund_initiated'],  // MUST include this
};
```

---

## High-Severity Issues

### ISSUE-003: Wallet Credit Recovery Race Condition

**File:** `/Users/rejaulkarim/Documents/ReZ Full App/rez-payment-service/src/jobs/lostCoinsRecoveryWorker.ts:159-230`

**Issue:** The `creditWalletAfterPayment()` function in `lostCoinsRecoveryWorker.ts:204-215` re-enqueues a BullMQ job using `pay-credit-<paymentId>` as the idempotency key. However:

1. Recovery worker finds `walletCreditRecoveryAttempted: false` payments
2. Recovery worker calls `creditWalletAfterPayment()`
3. Recovery worker marks `walletCreditRecoveryAttempted: true` at line 229
4. BUT: if `creditWalletAfterPayment()` fails, the job is NOT retried
5. Recovery worker marks `walletCreditRecoveryAttempted: true` anyway
6. On next cycle, `retryFailedRecoveries()` checks but finds `walletCreditRecoveryAttempted: true`
7. The payment is skipped even though coins were never credited

**Current Code (line 226-229):**
```typescript
// Don't mark as attempted — will retry on next cycle
return;
}
// Step 4: Mark that a recovery attempt was made.
await markRecoveryAttempted(paymentId, true);  // <-- Sets flag even on failure
```

**Impact:** Lost coins for users when:
1. BullMQ enqueue succeeds but Redis confirmation fails
2. Recovery worker attempts re-enqueue but fails
3. Recovery worker incorrectly marks attempt as made

**Fix Required:**
```typescript
// Only mark as attempted if the credit was actually successful
const creditSucceeded = await verifyWalletCredit(payment);
if (!creditSucceeded) {
  // Don't mark as attempted — will retry on next cycle
  return;
}
await markRecoveryAttempted(paymentId, true);
```

**Severity:** HIGH
**Monetary Impact:** User coin loss

---

### ISSUE-004: Refund Over-Refund Window (TOCTOU Race)

**File:** `/Users/rejaulkarim/Documents/ReZ Full App/rez-payment-service/src/services/refundService.ts:73-91`

**Issue:** The refund reservation uses `$expr: { $lte: [{ $add: ['$refundedAmount', amount] }, '$amount'] }` to check if the refund is valid. However, between the time this check passes and the update completes, another refund request could pass the same check.

**Scenario:**
1. Payment has `refundedAmount: 0`, `amount: 100`
2. Request A calls `processRefund(paymentId, 80)` - check passes: `0 + 80 <= 100`
3. Request B calls `processRefund(paymentId, 80)` - check passes: `0 + 80 <= 100` (reads same data)
4. Request A completes: `refundedAmount: 80`
5. Request B completes: `refundedAmount: 160` (WRONG - exceeds amount!)

**Current Fix:** The `$inc` is atomic, so the actual DB update IS atomic. But the initial check is NOT atomic with the update. Mongoose's `findOneAndUpdate` is atomic, but the check+update in `session.withTransaction` is two separate operations.

**Severity:** HIGH
**Monetary Impact:** Potential over-refund

**Fix Required:** Use atomic conditional update:
```typescript
updated = await Payment.findOneAndUpdate(
  {
    paymentId,
    status: 'completed',
    // Atomic check: new refunded amount must not exceed original
    $expr: { $lte: [{ $add: ['$refundedAmount', amount] }, '$amount'] },
  },
  {
    $inc: { refundedAmount: amount },
    $set: { status: 'refund_initiated' },  // Move status change into same atomic op
  },
  { new: true, session },
);
```

---

### ISSUE-005: Webhook Handler Captures Stale `walletCredited` State

**File:** `/Users/rejaulkarim/Documents/ReZ Full App/rez-payment-service/src/services/webhookService.ts:163-180`

**Issue:** The code does:
```typescript
const credited = await (Payment.findOneAndUpdate(
  { _id: payment._id, walletCredited: { $ne: true } },
  { $set: { walletCredited: true, walletCreditedAt: new Date() } },
  { session, new: true },
) as unknown as Promise<IPayment | null>);
capturedPayment = credited;
```

The `findOneAndUpdate` with `$ne: true` is atomic. However, if two webhooks fire for the same payment (unlikely but possible with Razorpay retries), the second one would set `capturedPayment = null` (because `walletCredited` is already `true`).

Later at line 201-212:
```typescript
const cp = capturedPayment as IPayment | null;
if (cp) {
  if (cp.walletCredited) {
    await creditWalletAfterPayment(cp);  // Credits wallet
  }
}
```

If `capturedPayment` is `null` (second webhook), the wallet credit is SKIPPED even though the transaction went through!

**Severity:** MEDIUM
**Monetary Impact:** Missing wallet credits on webhook duplicate delivery

---

## Medium-Severity Issues

### ISSUE-006: Settlement Job ID Collision Risk

**File:** `/Users/rejaulkarim/Documents/ReZ Full App/rez-order-service/src/worker.ts:126-152`

**Issue:** The settlement job ID uses `settlement:${event.payload.orderId}`. If multiple order events for the same order arrive with different event types:

1. `order.delivered` event arrives, creates job `settlement:order123`
2. `order.returned` event arrives, tries to create job `settlement:order123`
3. BullMQ deduplicates based on jobId, second event ignored

**Impact:** A legitimate return+settlement could be blocked if it arrives after delivery settlement was queued but before processed.

**Severity:** MEDIUM

---

### ISSUE-007: BNPL Payment Has No Gateway Verification

**File:** `/Users/rejaulkarim/Documents/ReZ Full App/rez-payment-service/src/services/paymentService.ts:381-547`

**Issue:** BNPL payments skip Razorpay entirely (`if (input.paymentMethod === 'bnpl')`). The `capturePayment()` function at line 549-627 calls `razorpay.verifySignature()`, which would fail for BNPL payments because they don't use Razorpay signatures.

However, BNPL is handled in `initiatePayment()` which doesn't create a Razorpay order. The capture endpoint for BNPL would need different handling.

**Current Status:** BNPL appears to be handled separately but the integration flow is unclear from the code.

**Severity:** MEDIUM (needs verification)

---

### ISSUE-008: Order Status Update Uses Non-Atomic Read-Then-Write

**File:** `/Users/rejaulkarim/Documents/ReZ Full App/rez-order-service/src/httpServer.ts:1053-1124`

**Issue:** The status update does:
```typescript
// Step 1: Read current status (non-atomic)
const current = await collection.findOne(
  { _id: new mongoose.Types.ObjectId(id) },
  { projection: { status: 1, merchant: 1, user: 1 } },
);

// Step 2: Validate transition based on read status
const currentStatus = current.status as OrderStatus;
const allowed = VALID_TRANSITIONS[currentStatus] ?? [];

// Step 3: Atomic update with status filter
const result = await collection.findOneAndUpdate(
  { _id: new mongoose.Types.ObjectId(id), status: currentStatus },
  { $set: update },
  { returnDocument: 'after' },
);
```

**Impact:** Between steps 1 and 3, another request could change the status. The CAS (Compare-and-Swap) at step 3 catches this and returns 409. This is acceptable but could cause unnecessary conflicts under high concurrency.

**Severity:** LOW (handled correctly, just not optimal)

---

### ISSUE-009: Refund Amount Comparison Precision

**File:** `/Users/rejaulkarim/Documents/ReZ Full App/rez-payment-service/src/services/refundService.ts:124`

**Code:**
```typescript
const isFullRefund = Math.round((reservedPayment.refundedAmount ?? 0) * 100) >= Math.round(reservedPayment.amount * 100);
```

**Analysis:** This uses `Math.round(value * 100)` for comparison. While this handles floating-point precision, the comparison is on the local `reservedPayment` object. If `refundedAmount` was updated by another concurrent request between the reservation and this comparison, the status could be set incorrectly.

**Severity:** LOW (but should be atomic)

---

## Financial Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Double order creation | LOW | HIGH | Partial unique index on idempotency key |
| Double payment capture | LOW | CRITICAL | Redis SET NX for razorpayPaymentId |
| Double wallet credit | LOW | HIGH | BullMQ idempotency + recovery worker |
| Double refund | LOW | HIGH | Refund amount validation + atomic updates |
| Refund exceeding payment | VERY LOW | CRITICAL | Atomic amount reservation with check |
| Missing wallet credit | LOW | MEDIUM | Lost coins recovery worker |
| State machine inconsistency | MEDIUM | CRITICAL | Inconsistent state machines |
| Race condition in order creation | MEDIUM | HIGH | Duplicate key handling inconsistent |

---

## Positive Findings

1. **Payment Signature Verification:** Uses `crypto.timingSafeEqual` to prevent timing attacks (razorpayService.ts:64-76)

2. **Webhook Signature Verification:** Raw body verification prevents replay attacks (razorpayService.ts:78-90)

3. **Replay Prevention:** Redis SET NX for razorpayPaymentId with 25-hour TTL (paymentRoutes.ts:112-128)

4. **Atomic Wallet Credits:** MongoDB transactions ensure `walletCredited` flag and status are updated atomically (paymentService.ts:573-610)

5. **Lost Coins Recovery:** Comprehensive recovery worker catches stuck payments (lostCoinsRecoveryWorker.ts)

6. **Refund Reversal:** Failed Razorpay refunds automatically reverse the DB reservation (refundService.ts:103-120)

7. **Idempotent Webhooks:** Event ID deduplication prevents webhook replay (paymentRoutes.ts:522-531)

8. **Concurrent Capture Prevention:** Redis check prevents same razorpayPaymentId from being captured twice (paymentRoutes.ts:112-128)

9. **Order State Machine:** Prevents invalid state transitions (httpServer.ts:64-78)

10. **Payment State Machine:** Prevents invalid payment transitions (Payment.ts:66-78)

11. **Amount Precision:** All monetary amounts rounded to 2 decimal places (Payment.ts:129)

12. **Financial Audit Trail:** PaymentAuditLog records all payment operations (TransactionAuditLog.ts)

13. **Redis Failure Handling:** Fails closed when Redis unavailable for critical operations (paymentRoutes.ts:122-128)

---

## Recommendations

### Priority 1 (Critical)

1. **Fix Duplicate Key Response (BUG-001):** Return original order on duplicate key error
2. **Align State Machines (BUG-002):** Create shared constant for payment transitions
3. **Fix Recovery Worker (ISSUE-003):** Only mark recovery attempted if credit verified

### Priority 2 (High)

4. **Atomic Refund Reservation (ISSUE-004):** Combine check and update in single atomic operation
5. **Fix Webhook Credit Skip (ISSUE-005):** Re-query payment after atomic update

### Priority 3 (Medium)

6. **Document BNPL Flow:** Clarify BNPL capture and verification process
7. **Consider Distributed Lock:** For order status updates under high concurrency

---

## Test Cases for Verification

### Order Service Tests

```
1. Concurrent order creation with same idempotency key
   - Expected: Both return 200 with same order data

2. Order status update while another update is pending
   - Expected: One succeeds, other returns 409

3. Cancel order while status is changing
   - Expected: One succeeds, other returns 409
```

### Payment Service Tests

```
1. Capture same razorpayPaymentId twice
   - Expected: First succeeds, second returns 409

2. Refund more than payment amount
   - Expected: Refund rejected

3. Concurrent refunds on same payment
   - Expected: First succeeds, second rejected

4. Webhook duplicate delivery
   - Expected: Idempotent, wallet credited once

5. Recovery worker retry
   - Expected: Credit applied correctly on retry
```

---

## Conclusion

The order and payment services demonstrate solid financial controls with:
- Proper idempotency mechanisms
- Atomic transactions for critical operations
- Comprehensive audit logging
- Race condition handling

**Critical fixes needed:**
1. Duplicate key response should return original order (not 409)
2. Payment state machines must be consistent across all code paths
3. Recovery worker must verify credits before marking attempts complete

These fixes are essential before production deployment handling real financial transactions.
