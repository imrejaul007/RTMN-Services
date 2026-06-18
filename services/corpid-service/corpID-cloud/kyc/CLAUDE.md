# KYC Platform

**Service:** KYC (Know Your Customer)
**Port:** 4702 (via gateway)
**Prefix:** `/api/kyc`

---

## Overview

The KYC Platform provides comprehensive identity verification for the RTMN ecosystem. It supports document verification, biometric checks, AML screening, and manual review workflows.

## Features

- **3 Verification Levels:** Basic, Standard, Enhanced
- **15+ Document Types:** Aadhaar, Passport, PAN, Driving License, GST, etc.
- **Biometric Verification:** Face match, liveness detection
- **Background Checks:** PAN, GST, CIBIL, sanctions screening
- **AML Compliance:** PEP detection, sanctions matching, adverse media
- **Manual Review:** Admin review workflow with notes
- **Vendor Integration:** Internal + external (Sumsub, Jumio, Onfido)
- **Auto-Approval:** Automatic level advancement based on verifications

## KYC Levels

| Level | Name | Requirements |
|-------|------|--------------|
| 1 | Basic | Email + Phone verified |
| 2 | Standard | Government ID verified |
| 3 | Enhanced | Full KYC + Biometric + Liveness |

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/kyc/config` | Get levels and document types |
| GET | `/api/kyc/me` | Get my KYC record |
| PUT | `/api/kyc/me/personal` | Update personal info |
| POST | `/api/kyc/me/documents` | Add document |
| GET | `/api/kyc/me/documents` | List my documents |
| PUT | `/api/kyc/me/biometric` | Update biometric data |
| POST | `/api/kyc/me/background-checks` | Run background check |
| POST | `/api/kyc/me/submit` | Submit for review |
| GET | `/api/kyc/user/:userId` | Get user KYC (admin) |
| POST | `/api/kyc/documents/:id/verify` | Verify document (admin) |
| POST | `/api/kyc/user/:userId/approve` | Approve KYC (admin) |
| POST | `/api/kyc/user/:userId/reject` | Reject KYC (admin) |
| GET | `/api/kyc/pending` | List pending reviews (admin) |
| GET | `/api/kyc/stats` | KYC statistics (admin) |

## Document Types

### Identity Documents
- `aadhaar` - Aadhaar Card (India)
- `passport` - International Passport
- `pan` - PAN Card (India)
- `driving_license` - Driving License
- `voter_id` - Voter ID (India)
- `ssn` - Social Security Number (US)

### Address Proofs
- `utility_bill` - Utility Bill
- `bank_statement` - Bank Statement
- `rent_agreement` - Rent Agreement

### Business Documents
- `gst_certificate` - GST Certificate (India)
- `business_registration` - Business Registration
- `shop_act` - Shop Act License
- `cin` - Corporate Identity Number
- `llp` - LLP Registration

## Usage Example

```bash
# Get KYC config
curl http://localhost:4702/api/kyc/config \
  -H "Authorization: Bearer $TOKEN"

# Add passport document
curl -X POST http://localhost:4702/api/kyc/me/documents \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "passport",
    "number": "A1234567",
    "documentUrls": ["https://example.com/front.jpg"]
  }'

# Update biometric
curl -X PUT http://localhost:4702/api/kyc/me/biometric \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "faceVerified": true,
    "livenessCheck": true,
    "livenessScore": 95,
    "faceMatchScore": 98
  }'
```

## File Structure

```
kyc/
├── src/
│   ├── models/
│   │   └── kyc.model.js
│   └── routes/
│       └── kyc.routes.js
└── CLAUDE.md
```
