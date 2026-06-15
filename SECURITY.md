# Security Policy

**Last Updated:** June 15, 2026

RTMN Group takes the security of our platform seriously. This document describes how to report vulnerabilities and our security practices.

---

## 🚨 Reporting a Vulnerability

**Please do not report security vulnerabilities through public GitHub issues, social media, or regular support channels.**

### How to Report

Email: **security@rtmn.com**

Include:
1. **Description** of the vulnerability
2. **Steps to reproduce**
3. **Potential impact**
4. **Affected product/endpoint** (e.g., BrandPulse API, Hotel OS)
5. **Your contact info** (for follow-up questions)

PGP key: [TBD]

### What to Expect

- **Acknowledgment** within 24 hours
- **Initial assessment** within 72 hours
- **Status updates** every 7 days until resolved
- **Public disclosure** coordinated with reporter after fix is released

### Safe Harbor

We will not pursue legal action against researchers who:
- Make a good-faith effort to avoid privacy violations, data destruction, or service disruption
- Only interact with accounts they own or have explicit permission to access
- Stop testing immediately if they encounter user data and report it
- Do not exploit a vulnerability beyond what is necessary to demonstrate it
- Do not publicly disclose a vulnerability before it is fixed

### Recognition

We maintain a [Security Hall of Fame](SECURITY-HALL-OF-FAME.md) (TBD) for researchers who report valid issues. With your permission, we'll credit you publicly when the fix is released.

### Bug Bounty

**Status:** Coming Q4 2026. We plan to launch a paid bug bounty program with rewards up to $10,000 for critical findings.

---

## 🛡️ Our Security Practices

### Infrastructure
- Multi-region cloud deployment (AWS, GCP)
- TLS 1.3 for all traffic in transit
- AES-256 encryption at rest
- Web Application Firewall (WAF)
- DDoS protection (Cloudflare)
- Network segmentation

### Application
- OWASP Top 10 mitigations
- Regular third-party penetration tests
- Static Application Security Testing (SAST) in CI
- Dynamic Application Security Testing (DAST) in staging
- Software Composition Analysis (SCA) — Snyk
- Secrets management via HashiCorp Vault

### Access Control
- Role-Based Access Control (RBAC)
- Multi-Factor Authentication (MFA) required for all personnel
- Just-in-time access provisioning
- Audit logging of all administrative actions

### Data Protection
- Customer data encrypted at rest and in transit
- Backups encrypted with separate keys
- PII tokenization in non-production environments
- Data minimization principles

### Monitoring & Response
- 24/7 security operations center (SOC)
- SIEM with anomaly detection
- Automated alerting on suspicious activity
- Documented incident response plan
- Annual tabletop exercises

### Compliance
- **SOC 2 Type II:** In progress (target: Q4 2026)
- **GDPR:** Compliant
- **CCPA/CPRA:** Compliant
- **ISO 27001:** Planned (2027)
- **HIPAA:** Available for Enterprise plans with BAA

### Personnel
- Background checks for all employees with data access
- Mandatory security training (annual + onboarding)
- Phishing simulations (quarterly)
- Confidentiality agreements

---

## 🔑 Security Features for Customers

### Available Today
- SSO via SAML 2.0 (Enterprise)
- OAuth 2.0 / OpenID Connect
- API key rotation
- IP allowlisting
- Audit logs (Enterprise)
- Session management controls
- Webhook signing (HMAC-SHA256)
- Customer-managed encryption keys (CMK) — Enterprise add-on

### Coming Soon
- SCIM provisioning
- Hardware key enforcement
- Granular per-resource permissions
- Real-time security event streaming

---

## 📜 Security Advisories

Subscribe to security advisories:
- Email: security-advisories@rtmn.com
- RSS: [TBD]
- Web: [security.rtmn.io] (TBD)

---

## 📞 Contact

- **Security issues:** security@rtmn.com
- **General security questions:** security-info@rtmn.com
- **Compliance questions:** compliance@rtmn.com
- **Privacy/Data Protection:** privacy@rtmn.com

---

*Security is a shared responsibility. Thank you for helping us keep RTMN safe.*
