# Merchant Identity

**Service:** Merchant Management
**Port:** 4702 (via gateway)
**Prefix:** `/api/merchants`

---

## Overview

The Merchant Identity service provides complete merchant identity management for businesses on the RTMN platform. It handles KYC documents, branches, staff, and settlement accounts.

## Features

- **Merchant Profiles:** Legal name, display name, business type
- **KYC Documents:** 15+ document types (GST, PAN, etc.)
- **Multi-Branch Support:** Stores, warehouses, franchises
- **Staff Management:** Roles, permissions, assignments
- **Settlement Accounts:** Bank, UPI, PayPal
- **AML Screening:** Sanctions, PEP, adverse media
- **Verification Status:** Trust scoring
- **Business Hours:** Per-day operating hours
- **Integrations:** Connect with external platforms

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/merchants` | Create merchant |
| GET | `/api/merchants` | List all merchants (admin) |
| GET | `/api/merchants/:id` | Get merchant details |
| GET | `/api/merchants/slug/:slug` | Get by slug |
| PUT | `/api/merchants/:id` | Update merchant |
| POST | `/api/merchants/:id/kyc/documents` | Add KYC document |
| PUT | `/api/merchants/:id/kyc` | Update KYC status (admin) |
| POST | `/api/merchants/:merchantId/branches` | Create branch |
| GET | `/api/merchants/:merchantId/branches` | List branches |
| POST | `/api/merchants/:merchantId/staff` | Add staff |
| GET | `/api/merchants/:merchantId/staff` | List staff |
| POST | `/api/merchants/:merchantId/settlements` | Add settlement account |
| GET | `/api/merchants/:merchantId/settlements` | List settlements |

## Usage Example

```bash
# Create merchant
curl -X POST http://localhost:4702/api/merchants \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "legalName": "Acme Restaurant Pvt Ltd",
    "displayName": "Acme Restaurant",
    "category": "restaurant",
    "type": "pvt-ltd",
    "address": { "city": "Mumbai", "country": "IN" }
  }'

# Add KYC document
curl -X POST http://localhost:4702/api/merchants/MERCHANT_ID/kyc/documents \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "gst_certificate",
    "number": "22AAAAA0000A1Z5"
  }'

# Add branch
curl -X POST http://localhost:4702/api/merchants/MERCHANT_ID/branches \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Main Branch",
    "isMainBranch": true,
    "address": { "city": "Mumbai" }
  }'
```

## Merchant Types

| Type | Description |
|------|-------------|
| `individual` | Sole proprietor |
| `partnership` | Partnership firm |
| `corporation` | Public corporation |
| `llp` | Limited Liability Partnership |
| `pvt-ltd` | Private limited company |

## KYC Levels

| Level | Requirements |
|-------|--------------|
| 0 | Not started |
| 1 | Basic info |
| 2 | Identity + Address verified |
| 3 | Full KYC with biometric |

## Business Categories

- Restaurant, Hotel, Retail, Healthcare
- Beauty, Fitness, Fashion, Education
- Automotive, Real Estate, Travel
- Professional Services, Manufacturing
- And 15+ more

## File Structure

```
merchant/
├── src/
│   ├── models/
│   │   └── merchant.model.js
│   └── routes/
│       └── merchant.routes.js
└── CLAUDE.md
```
