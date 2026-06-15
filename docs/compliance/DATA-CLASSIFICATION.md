# Data Classification Policy

**Last Updated:** June 15, 2026

This document defines how RTMN classifies, handles, and protects data across the platform.

---

## Classification Levels

| Level | Label | Definition | Examples |
|-------|-------|------------|----------|
| 1 | **Public** | Information intended for public disclosure | Marketing materials, documentation, API specs |
| 2 | **Internal** | Internal information not meant for public release | Internal docs, meeting notes, non-sensitive reports |
| 3 | **Confidential** | Sensitive business information | Customer lists, pricing, contracts, source code |
| 4 | **Restricted** | Highly sensitive data requiring strict controls | Credentials, keys, PII, payment data, health data |

---

## Data Categories

### Customer Data

| Category | Classification | Examples | Controls |
|----------|---------------|----------|----------|
| **Account Information** | Restricted | Name, email, company, role | Encryption, access control, audit logging |
| **Customer Content** | Restricted | Reviews, messages, uploads | Encryption, access control, data minimization |
| **Billing Information** | Restricted | Payment methods, invoices | Processed by Stripe, not stored |
| **Usage Data** | Confidential | API calls, feature usage | Encryption, access control, retention limits |
| **Support Data** | Confidential | Tickets, chat logs | Encryption, access control |

### Personal Data (PII)

| Category | Classification | Examples | Controls |
|----------|---------------|----------|----------|
| **Direct Identifiers** | Restricted | Name, email, phone, SSN | Encryption, strict access, DPA |
| **Indirect Identifiers** | Confidential | IP address, device ID, cookie ID | Encryption, access control |
| **Sensitive Categories** | Restricted+ | Health data, financial data, biometric | Additional controls, consent required |

### Operational Data

| Category | Classification | Examples | Controls |
|----------|---------------|----------|----------|
| **Credentials** | Restricted | API keys, passwords, tokens | Encrypted, secrets manager, rotation |
| **Configuration** | Confidential | Settings, feature flags | Access control, versioning |
| **Logs** | Internal | Access logs, error logs | Retention limits, access control |
| **Metrics** | Internal | Usage metrics, performance data | Retention limits |

### Security Data

| Category | Classification | Examples | Controls |
|----------|---------------|----------|----------|
| **Audit Logs** | Confidential | Admin actions, access events | Immutable storage, access control |
| **Security Events** | Confidential | Failed logins, anomalies | Real-time monitoring, alerting |
| **Vulnerability Data** | Confidential | Scan results, pen test findings | Restricted access |

---

## Handling Requirements

### Restricted Data

| Requirement | Implementation |
|------------|----------------|
| Encryption at rest | AES-256 |
| Encryption in transit | TLS 1.3 |
| Access control | RBAC, MFA, just-in-time |
| Logging | All access logged |
| Retention | Per contract + 30 days |
| Deletion | Secure deletion on retention expiry |
| Backup | Encrypted backups, limited access |
| Incident response | 48-hour breach notification |

### Confidential Data

| Requirement | Implementation |
|------------|----------------|
| Encryption at rest | AES-256 |
| Encryption in transit | TLS 1.3 |
| Access control | RBAC, MFA |
| Logging | Critical actions logged |
| Retention | Per policy (90 days to 7 years) |
| Deletion | Standard deletion |

### Internal Data

| Requirement | Implementation |
|------------|----------------|
| Encryption at rest | Recommended |
| Encryption in transit | TLS 1.3 |
| Access control | Basic RBAC |
| Logging | Admin actions logged |
| Retention | Per policy |

---

## Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    DATA LIFECYCLE                          │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Collection ──► Processing ──► Storage ──► Access ──► Deletion
│       │              │              │             │            │
│       ▼              ▼              ▼             ▼            │
│  Consent      Validation      Encryption    RBAC/MFA         │
│  Minimization Integrity      Access Ctrl   Audit Log        │
│  Notice       Anonymization  Backup        Monitoring       │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## Classification Decision Tree

```
Is the data publicly available?
├── YES → Public
└── NO
    │
    ├── Does it identify individuals (name, email, IP)?
    │   ├── YES → Restricted (PII)
    │   └── NO
    │       │
    │       ├── Is it business-critical or sensitive?
    │       │   ├── YES → Confidential
    │       │   └── NO → Internal
    │       │
    │       └── Is it a credential or security key?
    │           ├── YES → Restricted (Credentials)
    │           └── NO → See above
    │
    └── Is it encrypted in transit?
        ├── NO → Upgrade to TLS immediately
        └── YES → See above
```

---

## Roles and Responsibilities

| Role | Responsibilities |
|------|-----------------|
| **Data Owner** | Classify data, approve access, oversee retention |
| **Data Custodian** | Implement technical controls, backups, encryption |
| **Security Team** | Monitor, audit, incident response |
| **Legal/Compliance** | Ensure regulatory compliance, DPA management |
| **All Employees** | Handle data per classification, report incidents |

---

## Retention Schedule

| Data Type | Retention Period | Basis |
|-----------|-----------------|-------|
| Account data | Active + 30 days | Contract |
| Customer content | Active + 30 days | Contract |
| Billing records | 7 years | Legal/tax |
| Audit logs | 1 year | Security |
| Server logs | 90 days | Operational |
| Security events | 1 year | Security |
| Support tickets | 3 years | Support |
| Marketing data | Until consent withdrawn | Consent |

---

## Deletion Procedures

### Standard Deletion

1. Data marked for deletion
2. Retention period expires OR user requests deletion
3. Data removed from production systems
4. Data removed from backups (next backup cycle)
5. Deletion confirmed in audit log

### Secure Deletion (Restricted Data)

1. Data marked for deletion
2. Overwrite with random data (3 passes)
3. Physical destruction for storage media
4. Certificate of destruction issued
5. Deletion confirmed in audit log

### Customer Data Deletion

```typescript
// Customer can request deletion via API
await rtmn.account.requestDeletion({
  reason: 'GDPR Right to Erasure',
  confirmationEmail: 'customer@example.com'
});

// Deletion confirmation received
const deletionStatus = await rtmn.account.getDeletionStatus();
console.log('Deletion scheduled for:', deletionStatus.scheduledDate);
```

---

## Compliance Mapping

| Regulation | Data Type | Requirement |
|-----------|-----------|-------------|
| GDPR | Personal data | Lawful basis, consent, rights |
| CCPA | Personal information | Disclosure, opt-out |
| HIPAA | PHI | BAA required, encryption |
| PCI DSS | Cardholder data | Processed by Stripe only |
| SOC 2 | All data | Classification, controls |

---

## Contact

- **Data questions:** privacy@rtmn.com
- **Classification decisions:** dpo@rtmn.com
- **Security incidents:** security@rtmn.com
