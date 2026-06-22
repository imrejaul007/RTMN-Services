---
name: API-001 ORDER_REFUND_MODAL_WRONG_FIELDS
description: Order refund confirmation modal uses wrong/missing field names — shows blank data
type: bug
severity: CRITICAL
domain: API / Data
status: FIXED
fix_summary: Field names corrected: orderId, amount, reason, idempotencyKey
fixed_date: 2026-04-19
owner: unassigned
created: 2026-04-18
---

## Bug: API-001 — Order Refund Modal Wrong Fields

### Status: OPEN | Severity: CRITICAL | Domain: API / Data

---

### Summary

The order refund confirmation modal in `orders.tsx` renders incorrect or non-existent field names. Admins cannot verify what they're refunding before confirming.

### Files Affected

- `app/(dashboard)/orders.tsx:967-981`

### Current (Broken) Code

```tsx
Order #{selectedOrder.id}           {/* WRONG: should be orderNumber */}
Customer: {selectedOrder.customerName}  {/* WRONG: field doesn't exist on Order type */}
Total: {formatCurrency(selectedOrder.totalAmount)}  {/* WRONG: should be totals?.total */}
```

### Fix

```tsx
Order #{selectedOrder.orderNumber}
Customer: {`${selectedOrder.user?.profile?.firstName || ''} ${selectedOrder.user?.profile?.lastName || ''}`.trim() || selectedOrder.user?.phoneNumber || 'N/A'}
Total: {formatCurrency(selectedOrder.totals?.total)}
```

### Test Plan

1. Open any order → click Refund
2. Modal should show: order number, customer name, total amount
3. Verify all three fields display actual values (not undefined/NaN)
4. Confirm refund → should succeed

---

## Verification

**Confirmed fixed**: Field names in orders.tsx refund modal match backend: orderId, amount, reason, idempotencyKey
