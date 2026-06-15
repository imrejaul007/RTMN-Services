# SOC 2 Readiness Guide

**Last Updated:** June 15, 2026

This document describes RTMN's SOC 2 compliance program and readiness status.

---

## SOC 2 Overview

SOC 2 (System and Organization Controls 2) is a security framework for service organizations. It reports on controls related to security, availability, processing integrity, confidentiality, and privacy.

---

## RTMN SOC 2 Status

| Report | Status | Target Date |
|--------|--------|-------------|
| **SOC 2 Type I** | In Progress | Q3 2026 |
| **SOC 2 Type II** | Planned | Q4 2026 |

---

## Trust Service Criteria

### Security (Common Criteria)

| Control | Status | Implementation |
|---------|--------|----------------|
| Access control | ✅ Implemented | MFA, RBAC, just-in-time access |
| Encryption | ✅ Implemented | TLS 1.3 in transit, AES-256 at rest |
| Network security | ✅ Implemented | WAF, DDoS protection, network segmentation |
| Vulnerability management | ✅ Implemented | Quarterly scans, monthly patching |
| Incident response | ✅ Implemented | Documented in INCIDENT-RESPONSE.md |
| Change management | ✅ Implemented | GitOps, code review, CI/CD pipeline |
| Logging and monitoring | ✅ Implemented | Datadog, Sentry, CloudTrail |
| Vendor management | ✅ Implemented | SUB-PROCESSORS.md, data agreements |

### Availability

| Control | Status | Implementation |
|---------|--------|----------------|
| Uptime monitoring | ✅ Implemented | Better Uptime, Datadog |
| Incident management | ✅ Implemented | INCIDENT-RESPONSE.md |
| Disaster recovery | ✅ Implemented | Multi-AZ, daily backups, DR plan |
| Capacity planning | ✅ Implemented | Auto-scaling, capacity dashboards |
| SLA commitments | ✅ Implemented | Defined in PRICING.md |

### Processing Integrity

| Control | Status | Implementation |
|---------|--------|----------------|
| Data validation | ✅ Implemented | Input validation, schema enforcement |
| Error handling | ✅ Implemented | Structured errors, Sentry |
| Reconciliation | ✅ Implemented | Daily job reconciliations |
| Quality assurance | ✅ Implemented | CI/CD testing, staging validation |

### Confidentiality

| Control | Status | Implementation |
|---------|--------|----------------|
| Data classification | ✅ Implemented | DATA-CLASSIFICATION.md |
| Encryption | ✅ Implemented | AES-256 at rest |
| Access restrictions | ✅ Implemented | RBAC, principle of least privilege |
| Data disposal | ✅ Implemented | Secure deletion, 30-day retention |

### Privacy

| Control | Status | Implementation |
|---------|--------|----------------|
| Privacy notice | ✅ Implemented | PRIVACY.md |
| Consent management | ✅ Implemented | Cookie consent, opt-out |
| Data subject rights | ✅ Implemented | API + support for DSRs |
| DPA | ✅ Implemented | DPA.md |
| Sub-processor management | ✅ Implemented | SUB-PROCESSORS.md |

---

## Customer Responsibilities

To use RTMN in a SOC 2-compliant manner:

### 1. API Key Security

- Store keys securely (env vars, secrets manager)
- Rotate keys regularly (90 days recommended)
- Use restricted keys where possible
- Revoke unused keys promptly

### 2. Access Control

- Enable MFA for all user accounts
- Use role-based access control
- Review user access quarterly
- Remove access when employees leave

### 3. Monitoring

- Set up alerts for unusual activity
- Review audit logs regularly
- Monitor API usage for anomalies

### 4. Data Handling

- Only upload necessary data
- Implement data retention policies
- Handle data subject requests promptly

---

## Evidence You Can Request

For your own SOC 2 audits, we can provide:

| Evidence | Format | Request |
|----------|--------|---------|
| SOC 2 Type I report | PDF | legal@rtmn.com |
| Penetration test summary | PDF | security@rtmn.com |
| Security questionnaire | DOCX | security@rtmn.com |
| Sub-processor list | JSON | privacy@rtmn.com |
| Audit logs | CSV | support@rtmn.com |
| Uptime history | CSV | support@rtmn.com |
| Incident history | PDF | support@rtmn.com |

---

## Complementary User Entity Controls (CUECs)

SOC 2 reports include controls at your organization ("complementary user entity controls"). These are your responsibility:

| Control | Your Responsibility |
|---------|---------------------|
| Logical access | Implement MFA, strong passwords |
| System access | Review and revoke access promptly |
| Data input | Validate data before upload |
| API key management | Secure storage, rotation |
| Monitoring | Review alerts, investigate anomalies |
| Incident reporting | Report issues to RTMN promptly |

---

## Security Questionnaires

For formal security reviews, we support:
- SIG (Standardized Information Gathering)
- CAIQ (Consensus Assessments Initiative Questionnaire)
- Custom questionnaires

Request via: security@rtmn.com

Response time: 5 business days

---

## Shared Responsibility Matrix

```
┌─────────────────────────────────────────────────────────┐
│                    RTMN RESPONSIBILITY                  │
├─────────────────────────────────────────────────────────┤
│  Infrastructure security                                 │
│  Platform availability                                   │
│  Data encryption at rest and in transit                  │
│  Access control to RTMN systems                         │
│  Vulnerability management                                │
│  Incident response                                       │
│  Compliance certifications (SOC 2, ISO 27001)            │
└─────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────┐
│                   CUSTOMER RESPONSIBILITY                 │
├─────────────────────────────────────────────────────────┤
│  Account security (your credentials)                     │
│  API key security (your keys)                           │
│  Data you upload (content, accuracy)                     │
│  User access management (your users)                    │
│  Integration security (your integrations)               │
│  Monitoring (your dashboards and alerts)                 │
│  Compliance of your own application                     │
└─────────────────────────────────────────────────────────┘
```

---

## Contact

- **Security questions:** security@rtmn.com
- **Compliance questions:** compliance@rtmn.com
- **Audit requests:** legal@rtmn.com
- **DPO:** dpo@rtmn.com

---

*RTMN is committed to maintaining strong security controls and achieving SOC 2 Type II certification by Q4 2026.*
