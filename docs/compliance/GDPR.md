# GDPR Compliance Guide

**Last Updated:** June 15, 2026

This guide helps RTMN customers understand our GDPR compliance posture and their obligations as data controllers.

---

## Overview

The General Data Protection Regulation (GDPR) applies to any organization processing personal data of EU/EEA residents. RTMN provides tools and controls to help you comply.

---

## RTMN's GDPR Commitments

### 1. Lawful Basis for Processing

RTMN processes personal data only:
- Under your instructions (as data processor)
- To provide the contracted services
- For our own legitimate interests (security, fraud prevention)

We do not sell personal data or use it for advertising.

### 2. Data Processing Agreement

Our [DPA.md](DPA.md) is incorporated into the Terms of Service and governs our processing of your personal data. Enterprise customers can request a countersigned DPA.

### 3. International Transfers

We use Standard Contractual Clauses (SCCs) for transfers from EEA to third countries. See [DPA.md](DPA.md) Annex III for details.

### 4. Security Measures

See [DPA.md](DPA.md) Annex II for our technical and organizational security measures.

### 5. Sub-Processors

Our current sub-processors are listed in [SUB-PROCESSORS.md](SUB-PROCESSORS.md). We notify customers 30 days before adding new sub-processors.

### 6. Breach Notification

We notify you within 48 hours of becoming aware of a personal data breach.

### 7. Data Subject Rights

We assist you in responding to data subject requests (DSRs):
- **Access requests:** Export data via API
- **Erasure requests:** Delete data via API or support
- **Rectification:** Update via API
- **Portability:** Export in JSON format

---

## Your Obligations as Controller

### Data Mapping

You are responsible for:
- Identifying what personal data you upload to RTMN
- Ensuring you have a lawful basis for processing
- Documenting your processing activities (Article 30 Record of Processing)

### Consent Management

If you collect EU personal data through RTMN products:
- Ensure you have valid consent where required
- Provide clear privacy notices to data subjects
- Honor withdrawal of consent

### Data Subject Requests

You must respond to DSRs within 30 days. RTMN provides:
- API endpoints to export/delete data
- Support assistance for complex requests
- Audit logs of data access

### Third-Party Transfers

If you share RTMN data with third parties:
- Ensure they have appropriate safeguards
- Document the transfer in your Article 30 records
- Update your privacy notices

---

## Data Retention

| Data Type | RTMN Retention | Your Retention |
|-----------|---------------|----------------|
| Account data | While active + 30 days | Per your policy |
| Customer uploads | While active + 30 days | Per your policy |
| Usage logs | 90 days | Per your policy |
| Billing records | 7 years | Per your policy |

---

## Recommended Configuration

### Enable Data Minimization

```typescript
// Only upload necessary fields
await rtmn.brands.update('brand_abc123', {
  // Only include what you need
  name: 'My Hotel',
  // Don't upload personal data unless necessary
});

// Review what data is synced
const dataFlow = await rtmn.settings.getDataFlow();
console.log('Data flow:', dataFlow);
```

### Set Retention Policies

```typescript
// Configure automatic deletion after retention period
await rtmn.settings.setRetentionPolicy({
  reviewData: '12m', // 12 months
  analyticsData: '24m', // 24 months
  logs: '90d' // 90 days
});
```

### Enable Audit Logging

```typescript
// Enable comprehensive audit logging
await rtmn.settings.updateAuditLog({
  enabled: true,
  retentionDays: 365,
  events: ['data_access', 'data_modification', 'data_deletion']
});
```

---

## DSR Workflow Example

### 1. Receive DSR

A customer emails privacy@yourcompany.com requesting all data you hold about them.

### 2. Verify Identity

Request confirmation of identity (email verification, account verification).

### 3. Locate Data

```typescript
// Export all data for this individual
const allData = await rtmn.export.getIndividualData({
  email: 'customer@example.com',
  brandId: 'brand_abc123'
});

console.log('Data found:', {
  accounts: allData.accounts.length,
  reviews: allData.reviews.length,
  interactions: allData.interactions.length
});
```

### 4. Prepare Response

Compile data into a portable format (JSON, PDF).

### 5. Respond

Send data to the individual and confirm what was deleted.

### 6. Document

Log the request and response for your Article 30 records.

---

## DPA Request

To request a countersigned DPA:
1. Email legal@rtmn.com with subject "DPA Request"
2. Include your company name, address, and EU VAT number (if applicable)
3. We will return a signed DPA within 5 business days

---

## Supervisory Authority

If you have a complaint about how RTMN handles your data:
1. Contact us first: privacy@rtmn.com
2. If unresolved, contact your local supervisory authority:
   - UK: [ICO](https://ico.org.uk)
   - Germany: [BfDI](https.bfdi.bund.de)
   - France: [CNIL](https://www.cnil.fr)
   - Full list: [edpb.europa.eu](https://edpb.europa.eu)

---

## Key Contacts

| Purpose | Contact |
|---------|---------|
| GDPR questions | privacy@rtmn.com |
| DPA requests | legal@rtmn.com |
| Data Protection Officer | dpo@rtmn.com |
| Security incidents | security@rtmn.com |

---

*This guide is for informational purposes. Consult legal counsel for specific compliance advice.*
