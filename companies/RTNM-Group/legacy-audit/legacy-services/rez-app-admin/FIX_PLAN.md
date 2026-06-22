# Admin App Bug Fix Implementation Plan

Generated: 2026-04-15

## Executive Summary

- **Total Bugs:** 153
- **CRITICAL:** 13 bugs
- **HIGH:** 28 bugs
- **MEDIUM:** 74 bugs
- **LOW:** 38 bugs

### Status Distribution:

| Category | Count | Status |
|----------|-------|--------|
| Frontend-Fixable | ~70 | Can be fixed in UI/validation |
| Backend-Deferred | ~68 | Requires backend API/endpoints |
| Already Fixed | ~15 | Documented as fixed in commits |

## CRITICAL Bugs (13)

### Finance (4)
- AA-FIN-001: Missing Idempotency on Payout Processing → Backend: Implement idempotencyKey hash
- AA-FIN-002: Payroll Amount Not Validated → Frontend: Add validation (PARTIAL); Backend: Recompute
- AA-FIN-003: Missing Audit Trail on Payroll → Backend: Log auditMetadata
- AA-FIN-004: No Two-Person Approval for Large Payouts → Backend: Implement approval workflow
- AA-FIN-005: Settlement Reconciliation Missing Ledger Verification → Backend: Expose reconciliation API

### Users (1)
- AA-USR-024: No Support Impersonation Audit Log → Backend: Implement impersonation tracking

### Authentication (3)
- AA-AUT-001: No Session Timeout → Frontend: ✅ DONE (lastActivityAt, SESSION_TIMEOUT_MS)
- AA-AUT-002: JWT Token Signature Verification → Frontend: ✅ DONE (JWT validation, role check)
- AA-AUT-003: No Audit Logging for Auth Events → Backend: Required

### Campaigns (3)
- AA-CMP-012: Voucher/Coupon Code Not Generated → Backend: Code generation service
- AA-CMP-013: Flash Sale Scheduling Not Implemented → Backend: Time-based scheduling
- AA-CMP-016: Loyalty Program Configuration Missing → Backend: Loyalty service

### Orders (4)
- AA-ORD-001: Missing Idempotency Key on Refund → Frontend: ✅ Add idempotencyKey field; Backend: Implement check
- AA-ORD-002: No Refund Amount Validation → Frontend: ✅ Add amount field; Backend: Validate
- AA-ORD-003: Missing Double-Approval for Refunds → Backend: Approval workflow required
- AA-ORD-020: Order Coin/Cashback Not Refunded → Frontend: ✅ Add includeCoins flag; Backend: Handle

### Merchants (1)
- AA-MER-001: No Confirmation Before Merchant Approval → Frontend: Already has confirmation; real issue is backend document verification

---

## HIGH Severity Bugs (28)

### Frontend-Fixable HIGH Bugs (~12):
1. AA-ANL-001: Missing Error Handling for Platform Summary API → ✅ Add explicit check
2. AA-ANL-006: Analytics Service URL Not Validated → ✅ Add isAnalyticsUrlValid
3. AA-ANL-012: CSV Export Missing Data Escaping → ✅ Add escapeCSVField()
4. AA-CMP-001: Missing Date Validation for Campaign Dates → ✅ Add validateDateRange()
5. AA-CMP-003: Type Coercion Without Range Validation → ✅ Add validateCoinValues()
6. AA-CMP-004: Race Condition in Campaign Save → ✅ Add inFlightRequestRef
7. AA-CMP-008: Completion Rate Calculation Division by Zero → ✅ Add guard clause
8. AA-CMP-010: Campaign Status Computed Incorrectly → ✅ Add computeCampaignStatus()
9. AA-MER-005: Merchant Search Not Debounced → ✅ Add debouncedSearchAndFilter
10. AA-ORD-008: Fulfillment Type Not Considered in Refund → Backend: Add eligibility check

### Backend-Deferred HIGH Bugs (~16):
- AA-FIN-006, 007, 008, 009, 010, 011: Payout tracking, limits, reconciliation
- AA-USR-002, 004, 011, 012, 020: Admin audit, permissions, deactivation workflows
- AA-AUT-004, 005, 006, 007, 008, 009, 010: Rate limiting, TOTP, password reset, session validation, login logging
- AA-CMP-002, 015, 017, 018, 023, 025: Duplicate prevention, bulk actions, campaign stats

---

## MEDIUM & LOW Severity Bugs (112)

### By Category:
- **Analytics:** 25 bugs (mostly display/UX)
- **Finance:** 15 bugs (calculations, configurations, tracking)
- **Campaigns:** 12 bugs (form validation, UI, pagination)
- **Merchants:** 29 bugs (validation, workflows, performance)
- **Orders:** 9 bugs (validation, state management)
- **Users:** 11 bugs (validation, UI, performance)
- **Auth:** 11 bugs (validation, UX)

---

## Implementation Priority

### Phase 1: CRITICAL Frontend Fixes (HIGH ROI)
- ✅ Auth context: Session timeout, JWT validation, role checks
- ✅ Refund operations: Add idempotencyKey, amount validation, coin handling
- ✅ Finance: Add audit metadata fields, idempotency keys

### Phase 2: HIGH Severity Frontend Fixes
- Date validation for campaigns
- CSV escaping for analytics export
- Platform summary error handling
- Merchant search debouncing
- Campaign status computation
- Race condition prevention in saves

### Phase 3: MEDIUM Severity UX Improvements
- Form validation enhancements
- Error message improvements
- Loading state indicators
- Modal confirmations
- Number formatting

### Phase 4: Backend Coordination
- Document API contracts needed
- Define approval workflows
- Implement audit logging services
- Add idempotency tracking
- Create batch operation endpoints

---

## Files Requiring Frontend Fixes

```
/app/(auth)/login.tsx
/app/(dashboard)/orders.tsx
/app/(dashboard)/campaign-management.tsx
/app/(dashboard)/merchants.tsx
/app/(dashboard)/analytics-dashboard.tsx
/app/(dashboard)/revenue-report.tsx
/app/(dashboard)/admin-users.tsx
/app/(dashboard)/reconciliation.tsx
/app/(dashboard)/economics.tsx
/app/contexts/AuthContext.tsx
/services/api/payroll.ts
/services/api/orders.ts
/services/api/campaigns.ts
/services/api/merchants.ts
/services/api/adminUsers.ts
```

---

## Backend Coordination Required

### New API Endpoints Needed:
```
POST /admin/merchants/check-duplicate
POST /admin/merchants/check-email
GET /admin/merchant-wallets/batch
POST /admin/users/{userId}/impersonate
POST /admin/refunds/approve
GET /admin/admin-users/audit-log
POST /admin/payroll/process (approval workflow)
```

### Schema Changes Required:
```
PayrollRun: Add auditMetadata, idempotencyKey
Order: Add refundStatus, refundAmount, refundAuditMetadata
AdminUser: Add lastLoginAt, lastActivityTimestamp
RefundRequest: Add approvedBy, approvalTimestamp, initiatedBy
```

### Service Updates Needed:
```
- Audit logging service (all money movements)
- Idempotency key validation service
- Two-person approval workflow service
- Session management service
```

---

## Fix Verification Checklist

- [ ] All CRITICAL auth bugs addressed (session timeout, JWT validation)
- [ ] Refund operations have idempotency keys
- [ ] Finance operations include audit metadata
- [ ] Campaign dates validated before submission
- [ ] CSV export properly escapes data
- [ ] Analytics URL validation implemented
- [ ] Merchant search properly debounced
- [ ] Form validations prevent invalid data submission
- [ ] Error handling prevents crashes on API failures
- [ ] All commits include Co-Authored-By header

---

## Notes for Future Work

1. **Backend Sprint Required:** ~30-40 estimated story points for:
   - Idempotency key validation service
   - Two-person approval workflow
   - Audit logging for all financial operations
   - Session/token revocation service

2. **Infrastructure:** Consider adding:
   - Request correlation IDs for distributed tracing
   - Audit event streaming (Kafka/Pub-Sub)
   - Token blacklist/revocation cache

3. **Testing:** Add integration tests for:
   - Idempotent refund retry scenarios
   - Concurrent refund/cancel race conditions
   - Approval workflow state transitions
   - Session timeout edge cases
