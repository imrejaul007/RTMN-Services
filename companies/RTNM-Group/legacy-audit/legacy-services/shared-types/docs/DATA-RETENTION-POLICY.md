# REZ Ecosystem — Data Retention Policy

**Document Version:** 1.0
**Date:** 2026-04-30
**Owner:** Legal + Platform Team

---

## Overview

This policy defines data retention periods for all data stored in the REZ ecosystem, compliant with:
- Indian DPDP Act 2023
- GDPR (for EU users)
- Industry best practices

## Data Categories

### 1. User Account Data

| Data Type | Retention Period | Deletion Method | Legal Basis |
|-----------|----------------|-----------------|-------------|
| Phone number | Until account deletion + 90 days | Permanent delete | Contract |
| Email address | Until account deletion + 90 days | Permanent delete | Contract |
| Name | Until account deletion + 90 days | Permanent delete | Contract |
| Profile photo | Until account deletion | Permanent delete | Consent |
| Date of birth | Until account deletion + 90 days | Permanent delete | Consent |
| Address | Until account deletion + 90 days | Permanent delete | Contract |
| KYC documents | 7 years after account closure | Secure delete | Legal obligation |
| KYC verification status | 7 years after account closure | Secure delete | Legal obligation |

### 2. Transaction Data

| Data Type | Retention Period | Deletion Method | Legal Basis |
|-----------|----------------|-----------------|-------------|
| Wallet transactions | 8 years | Secure archive | Tax compliance |
| Booking records | 8 years | Secure archive | Tax compliance |
| Payment records | 8 years | Secure archive | Tax compliance |
| Settlement records | 8 years | Secure archive | Legal compliance |
| Coin history | 5 years | Anonymize | Business need |
| Referral data | 2 years after referral expires | Delete PII, keep aggregates | Business need |

### 3. Communication Data

| Data Type | Retention Period | Deletion Method | Legal Basis |
|-----------|----------------|-----------------|-------------|
| Chat messages | 90 days | Permanent delete | Consent |
| Push notification logs | 30 days | Permanent delete | Business need |
| Email communications | 3 years | Secure archive | Legal obligation |
| Support tickets | 3 years after resolution | Secure archive | Legal obligation |

### 4. Device & Technical Data

| Data Type | Retention Period | Deletion Method | Legal Basis |
|-----------|----------------|-----------------|-------------|
| Device fingerprint | 1 year | Permanent delete | Consent |
| IP addresses | 90 days | Anonymize | Legal obligation |
| Login logs | 2 years | Secure archive | Security |
| API request logs | 30 days | Permanent delete | Security |
| Error logs | 90 days | Permanent delete | Security |

### 5. Marketing Data

| Data Type | Retention Period | Deletion Method | Legal Basis |
|-----------|----------------|-----------------|-------------|
| Email preferences | Until unsubscribe + 30 days | Permanent delete | Consent |
| Push notification consent | Until unsubscribe + 30 days | Permanent delete | Consent |
| Campaign analytics | 2 years | Anonymize | Legitimate interest |
| A/B test data | 1 year | Anonymize | Business need |

---

## Service-Specific Retention

### Auth Service (rez-auth-service)

| Data | Retention | Notes |
|------|-----------|-------|
| User accounts | Until deletion + 90 days | GDPR right to erasure |
| OTP logs | 30 days | Security audit |
| Session tokens | Session duration | Session management |
| MFA configs | Until user deletion | Security |
| Device tracking | 1 year | Security |
| Login history | 2 years | Security audit |

### Wallet Service (rez-wallet-service)

| Data | Retention | Notes |
|------|-----------|-------|
| Wallets | 8 years after closure | Tax compliance |
| Transactions | 8 years | Tax compliance |
| Balances | 8 years | Audit trail |
| KYC/AML records | 8 years | Regulatory requirement |

### Hotel OTA (Hotel OTA API)

| Data | Retention | Notes |
|------|-----------|-------|
| Bookings | 8 years | Tax + legal |
| Guest PII | 90 days after checkout | Privacy by design |
| Hotel data | Until hotel deactivation + 90 days | Contract |
| Review content | Until deletion request | User content rights |

### Intent Graph (rez-intent-graph)

| Data | Retention | Notes |
|------|-----------|-------|
| Intent signals | 2 years | Business intelligence |
| User preferences | Until user deletion | Personalization |
| ML training data | Anonymize after use | Privacy by design |

---

## Deletion Procedures

### User-Initiated Deletion

1. User requests deletion via settings
2. System queues deletion job
3. PII deleted within 30 days
4. Backup deletion within 90 days
5. Deletion confirmation sent to user

### Automated Deletion (Cron Jobs)

```typescript
// Daily deletion job
const DELETE_BEFORE_DATE = subDays(new Date(), 90);

async function runDataRetentionPolicy() {
  // Delete expired data
  await deleteOldSessions(DELETE_BEFORE_DATE);
  await deleteOldLogs(DELETE_BEFORE_DATE);
  await anonymizeOldIPAddresses(DELETE_BEFORE_DATE);
  await archiveOldTransactions(DELETE_BEFORE_DATE);
}
```

### Backup Retention

| Backup Type | Retention |
|-------------|-----------|
| Daily backups | 7 days |
| Weekly backups | 4 weeks |
| Monthly backups | 12 months |
| Yearly backups | 7 years |
| Transaction logs | 8 years |

---

## Compliance

### Indian DPDP Act 2023

- Right to erasure within 90 days
- Data minimization principle
- Consent withdrawal handling
- Data breach notification within 72 hours

### GDPR (EU Users)

- Right to erasure ("right to be forgotten")
- Data portability
- Consent withdrawal
- 30-day deletion window

---

## Implementation Checklist

- [ ] Implement user deletion flow in all services
- [ ] Configure automated deletion cron jobs
- [ ] Set up backup rotation policy
- [ ] Document data flows for all services
- [ ] Train team on deletion procedures
- [ ] Test deletion workflows
- [ ] Set up deletion audit logging

---

## Related Documentation

- [Privacy Policy](../PRIVACY.md)
- [Security Policy](./SECURITY.md)
- [DPDPA Compliance](./DPDPA.md)
