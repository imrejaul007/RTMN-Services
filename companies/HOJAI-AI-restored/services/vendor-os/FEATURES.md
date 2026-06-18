# VendorOS Features

**Version:** 1.0.0 | **Port:** 5265 | **Updated:** June 17, 2026

---

## Core Features

### 1. Vendor Profiles

| Feature | Description | Status |
|---------|-------------|--------|
| Basic Info | Name, email, phone, address | ✅ |
| Business Details | GSTIN, PAN, category | ✅ |
| Bank Details | Account, IFSC, bank name | ✅ |
| Payment Terms | NET30, NET60, etc | ✅ |
| Credit Limit | Max credit allowed | ✅ |

### 2. Vendor Scoring

| Feature | Description | Status |
|---------|-------------|--------|
| Trust Score | 0-100 based on performance | ✅ |
| Risk Score | Assessment of vendor risk | ✅ |
| Quality Rating | Product/service quality | ✅ |
| Delivery Score | On-time delivery rate | ✅ |
| Dispute Rate | Disputes per 100 orders | ✅ |

### 3. Vendor Categories

| Category | Description |
|----------|-------------|
| Supplier | Raw materials, goods |
| Service | Professional services |
| Contractor | Construction, maintenance |
| Freelancer | Individual contractors |
| Utility | Electricity, water, internet |
| Other | Miscellaneous |

### 4. Compliance

| Feature | Description | Status |
|---------|-------------|--------|
| GSTIN Verification | Validate GST number | ✅ |
| PAN Verification | Validate PAN card | ✅ |
| KYC Status | Know Your Customer | ✅ |

### 5. Integrations

| Integration | Description | Status |
|-------------|-------------|--------|
| Procurement OS | Purchase orders | ✅ |
| Expense OS | Vendor payments | ✅ |
| Finance Twin | Financial sync | ✅ |
| Contract OS | Contract tracking | ✅ |

---

## API Reference

### POST /api/vendors

Create a new vendor.

```json
{
  "companyId": "COMP-123",
  "name": "ABC Supplies",
  "email": "vendor@example.com",
  "phone": "+91-9876543210",
  "category": "Supplier",
  "gstin": "27AABCU9603R1ZM",
  "paymentTerms": "NET30"
}
```

### GET /api/vendors

List vendors with filters.

Query params: `companyId`, `category`, `isVerified`

### PATCH /api/vendors/:id/score

Update vendor scores.

```json
{
  "trustScore": 85,
  "riskScore": 15,
  "qualityRating": 4.5
}
```

---

## Deployment

```bash
# Start service
npm start

# Health check
curl http://localhost:5265/health
```

---

**Last Updated:** June 17, 2026