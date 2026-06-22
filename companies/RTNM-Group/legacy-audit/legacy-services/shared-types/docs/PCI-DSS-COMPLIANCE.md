# REZ Ecosystem — PCI-DSS Compliance Documentation

**Document Version:** 1.0
**Date:** 2026-04-30
**Status:** Initial Documentation

---

## Executive Summary

REZ uses **Razorpay** as the payment processor with a **hosted checkout model**. Under this architecture, cardholder data (card numbers, CVVs, expiry dates) never touches REZ servers — they are collected and processed entirely on Razorpay's PCI-DSS compliant infrastructure.

**PCI-DSS Scope:** REZ is likely **out of scope** for cardholder data handling, but must still meet certain documentation and operational requirements.

---

## Payment Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              REZ ECOSYSTEM                                  │
│                                                                             │
│  User Checkout                                                               │
│       │                                                                      │
│       ▼                                                                      │
│  ┌──────────────────┐    ┌──────────────────┐    ┌──────────────────┐       │
│  │  REZ Frontend   │───▶│  Payment Service │───▶│  Wallet Service   │       │
│  │  (REZ Now,     │    │  (Order creation,│    │  (Balance        │       │
│  │   Hotel OTA)    │    │   capture)       │    │   management)    │       │
│  └──────────────────┘    └────────┬─────────┘    └──────────────────┘       │
│                                  │                                        │
│                                  │ razorpayOrderId, amount                 │
│                                  ▼                                        │
│                    ┌─────────────────────────────┐                          │
│                    │       RAZORPAY               │                          │
│                    │  ┌───────────────────────┐  │                          │
│                    │  │  Hosted Checkout.js   │  │                          │
│                    │  │  (Card entry on      │  │                          │
│                    │  │   razorpay.com)       │  │                          │
│                    │  └───────────────────────┘  │                          │
│                    │                              │                          │
│                    │  razorpayPaymentId         │                          │
│                    │  razorpaySignature         │                          │
│                    └─────────────────────────────┘                          │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Data Flow

| Step | Data Exchanged | PCI Relevance |
|------|----------------|--------------|
| 1. Initiate payment | `{ amount, currency }` → Razorpay | No card data |
| 2. Card entry | User enters card on Razorpay domain | **Out of scope** |
| 3. Payment success | `{ razorpayPaymentId, razorpaySignature }` → REZ | No card data |
| 4. Verify signature | HMAC-SHA256 verification | No card data |
| 5. Credit wallet | Internal wallet credit | No card data |

---

## PCI-DSS Requirements Assessment

### What REZ Must Do (Even with Hosted Checkout)

| Requirement | Status | Notes |
|------------|--------|-------|
| **1.1** Document card data flow | REQUIRED | This document |
| **2.1** Default credentials changed | N/A | No REZ-managed card storage |
| **3.4** Render PAN unreadable | N/A | Card data never stored |
| **6.5** Code review for injection | PARTIAL | SQL/NoSQL injection protection in place |
| **8.3** MFA for admin access | IMPLEMENTED | Admin MFA via TOTP (SEC-005) |
| **12.10** Incident response plan | PARTIAL | Error tracking with Sentry |
| **A.1** Shared hosting requirements | N/A | Using Render cloud |

### Recommended Actions

1. **Obtain SAQ-A** (Self-Assessment Questionnaire A)
   - Simplest form for hosted checkout merchants
   - Complete annually
   - Submit to payment brands

2. **Maintain Evidence Package**
   - This architecture documentation
   - Current SAQ-A attestation
   - Penetration test results (if applicable)

3. **Vendor Assessment**
   - Obtain Razorpay's current PCI-DSS compliance certificate
   - Store as evidence

---

## Compliance Evidence

### Card Data Never Reaches REZ

Evidence from code:

```typescript
// Payment initiation — no card data sent
POST /api/payment/initiate
Body: { amount: 1000, currency: 'INR', userId: '...' }
// Returns: { razorpayOrderId: 'order_xxx', keyId: 'rzp_xxx' }

// After user completes payment on Razorpay
POST /api/payment/capture
Body: { razorpayOrderId: 'order_xxx', razorpayPaymentId: 'pay_xxx', razorpaySignature: '...' }
// Signature verified server-side, card data never received
```

### Signature Verification

```typescript
// razorpayService.ts — verifies payment authenticity
import Razorpay from 'razorpay';

const instance = new Razorpay({ key_id, key_secret });

// Webhook signature verification
instance.utility.verifyWebhookSignature(
  body,
  signature,
  webhookSecret
);
```

---

## Data Retention

### Payment Records

| Data Type | Retention | Encryption |
|-----------|----------|------------|
| Payment ID (razorpayPaymentId) | Indefinite | At rest |
| Amount, currency | Indefinite | At rest |
| User associations | Indefinite | At rest |
| Card numbers | **NEVER STORED** | N/A |
| Card CVV | **NEVER STORED** | N/A |
| Card expiry | **NEVER STORED** | N/A |

### Wallet Transactions

| Data Type | Retention | Encryption |
|-----------|----------|------------|
| Transaction ID | Indefinite | At rest |
| Amount | Indefinite | At rest |
| Balance before/after | Indefinite | At rest |
| User ID | Indefinite | At rest |

**Note:** A formal data retention policy should be documented (see BIZ-002).

---

## Incident Response

### If a Breach is Suspected

1. **Contain** — Isolate affected systems
2. **Assess** — Determine if cardholder data was exposed
3. **Report** — If cardholder data exposed:
   - Notify card brands within 24 hours
   - File incident report with acquiring bank
4. **Document** — Maintain incident log for compliance review

### For Non-Cardholder Data Incidents

1. **Log incident** in Sentry
2. **Notify security team**
3. **Follow standard incident response**

---

## Merchant of Record

**Status:** To be determined with legal team

- If **REZ is MoR**: REZ bears tax/legal liability
- If **Razorpay is MoR**: Razorpay handles tax compliance

---

## Compliance Maintenance

| Task | Frequency | Owner |
|------|-----------|-------|
| Review SAQ-A | Annually | Platform Team |
| Update architecture docs | Quarterly | Platform Team |
| Verify Razorpay certificate | Annually | Legal Team |
| Penetration testing | Annually | Security Team |

---

## Related Documentation

- [Payment Service Architecture](../rez-payment-service/docs/architecture.md)
- [Security Remediation Plan](./SECURITY-REMEDIATION-PLAN.md)
- [SEC-002: WAF/DDoS Protection](./ISSUES_REPORT.md#SEC-002)

---

## Compliance Contact

For compliance questions:
- **Security Team:** security@rez.money
- **Legal Team:** legal@rez.money

---

*This document was prepared as part of REZ's security audit and compliance initiative. It should be reviewed by legal counsel before being used for formal attestation.*
