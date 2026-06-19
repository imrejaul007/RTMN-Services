# Identity Verification

**Service:** Verification
**Port:** 4702 (via gateway)
**Prefix:** `/api/verification`

---

## Overview

The Identity Verification service provides automated verification for email, phone, domain, business, and employee identities. It supports multiple verification methods and provides a unified API for all verification needs.

## Features

- **Email Verification:** Token-based email verification
- **Phone Verification:** OTP-based SMS verification
- **Format Checking:** Email and phone format validation
- **Domain Verification:** DNS, meta tag, or file-based
- **Business Verification:** Multi-check business validation
- **Employee Verification:** Work email, department, manager checks
- **Disposable Email Detection:** Block temporary email services
- **Role-based Email Detection:** Flag role-based addresses (info@, support@)
- **Country Detection:** Auto-detect country from phone number

## Verification Types

### Email Verification
- Token sent to email
- 24-hour expiry
- Max 5 attempts
- Format validation
- Disposable email check
- Role-based email detection

### Phone Verification
- 6-digit OTP via SMS
- 10-minute expiry
- Max 3 attempts
- Country detection
- Line type detection

### Domain Verification
Three methods supported:
1. **DNS TXT Record:** `_corpid-verify.domain.com`
2. **HTML Meta Tag:** `<meta name="corpid-verification" content="TOKEN">`
3. **File Upload:** `/.well-known/corpid-verify.txt`

### Business Verification
5 checks performed:
1. Name match
2. Registration check
3. Address verification
4. Tax ID validation
5. Director verification

### Employee Verification
4 checks performed:
1. Email domain match
2. Department validation
3. Title validation
4. Manager verification

## API Endpoints

### Email
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/verification/email/send` | Send verification email |
| GET | `/api/verification/email/:token` | Verify email token |
| POST | `/api/verification/email/check` | Check email format |

### Phone
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/verification/phone/send` | Send OTP |
| POST | `/api/verification/phone/verify` | Verify OTP |
| POST | `/api/verification/phone/check` | Check phone format |

### Domain
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/verification/domain` | Initiate domain verification |
| POST | `/api/verification/domain/check` | Check domain verification |

### Business
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/verification/business` | Create business verification |
| GET | `/api/verification/business/:id` | Get business verification |

### Employee
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/verification/employee` | Create employee verification |
| GET | `/api/verification/employee/:id` | Get employee verification |

### Stats
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/verification/stats` | Verification statistics (admin) |

## Usage Examples

### Email Verification
```bash
# Send verification
curl -X POST http://localhost:4702/api/verification/email/send \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"email": "user@example.com"}'

# Verify token (from email link)
curl http://localhost:4702/api/verification/email/abc123token

# Check format
curl -X POST http://localhost:4702/api/verification/email/check \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com"}'
```

Response:
```json
{
  "success": true,
  "check": {
    "valid": true,
    "email": "test@example.com",
    "domain": "example.com",
    "isDisposable": false,
    "isRoleBased": false,
    "suggestions": []
  }
}
```

### Phone Verification
```bash
# Send OTP
curl -X POST http://localhost:4702/api/verification/phone/send \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"phone": "+919876543210"}'

# Verify OTP
curl -X POST http://localhost:4702/api/verification/phone/verify \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"phone": "+919876543210", "otp": "123456"}'

# Check format
curl -X POST http://localhost:4702/api/verification/phone/check \
  -H "Content-Type: application/json" \
  -d '{"phone": "+919876543210"}'
```

Response:
```json
{
  "success": true,
  "check": {
    "valid": true,
    "phone": "+919876543210",
    "formatted": "+919876543210",
    "country": "IN",
    "lineType": "mobile"
  }
}
```

### Domain Verification (DNS Method)
```bash
# Step 1: Initiate
curl -X POST http://localhost:4702/api/verification/domain \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"domain": "example.com", "method": "dns"}'
```

Response includes instructions:
```json
{
  "success": true,
  "verification": {
    "id": "dv-abc",
    "domain": "example.com",
    "method": "dns",
    "instructions": {
      "type": "DNS TXT Record",
      "host": "_corpid-verify.example.com",
      "value": "verification-token-here"
    }
  }
}
```

```bash
# Step 2: Add DNS record, then check
curl -X POST http://localhost:4702/api/verification/domain/check \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "domain": "example.com",
    "method": "dns",
    "token": "verification-token-here"
  }'
```

### Business Verification
```bash
curl -X POST http://localhost:4702/api/verification/business \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "businessId": "BIZ-001",
    "legalName": "Acme Corporation",
    "registrationNumber": "REG123456",
    "taxId": "TAX789012"
  }'
```

### Employee Verification
```bash
curl -X POST http://localhost:4702/api/verification/employee \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "employeeId": "EMP-001",
    "organizationId": "ORG-001",
    "email": "personal@gmail.com",
    "workEmail": "john@company.com",
    "department": "Engineering",
    "title": "Senior Engineer",
    "managerId": "user-manager"
  }'
```

## File Structure

```
verification/
├── src/
│   ├── models/
│   │   └── verification.model.js
│   └── routes/
│       └── verification.routes.js
└── CLAUDE.md
```
