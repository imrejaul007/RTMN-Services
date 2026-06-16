# REZ Cookie Consent Service

GDPR/IAB TCF 2.2 Compliant Cookie Consent Management Platform

**Port:** 5039  
**Company:** LawGens - REZ Legal Tech

---

## Overview

The REZ Cookie Consent Service provides comprehensive cookie consent management for the RTMN ecosystem. It implements GDPR Article 7 compliance, IAB Transparency and Consent Framework (TCF) 2.2 specifications, and supports multi-language interfaces (English and Arabic).

## Features

- **GDPR Compliance:** Article 7 consent proof generation
- **IAB TCF 2.2:** TC String generation and parsing
- **5 Consent Categories:** Necessary, Functional, Analytics, Marketing, Social
- **Multi-language:** English and Arabic support
- **Right to Withdraw:** Users can withdraw consent at any time
- **Audit Trail:** Complete consent history logging
- **Cookie Banner:** Customizable banner configuration

---

## Quick Start

```bash
# Install dependencies
npm install

# Start the service
npm start

# Development mode (with auto-reload)
npm run dev
```

---

## API Documentation

### Health Check

```http
GET /health
```

**Response:**
```json
{
  "status": "healthy",
  "service": "REZ-cookie-consent-service",
  "version": "1.0.0",
  "timestamp": "2026-06-15T10:30:00.000Z"
}
```

---

### Get Consent Configuration

```http
GET /api/v1/consent/config?lang=en
```

**Parameters:**
- `lang` (optional): Language code (`en` or `ar`)

**Response:**
```json
{
  "categories": { ... },
  "languages": ["en", "ar"],
  "currentLanguage": "en",
  "bannerConfig": { ... },
  "tcfVersion": "2.2",
  "lastUpdated": "2026-06-15T10:30:00.000Z"
}
```

---

### Get Cookie Banner

```http
GET /api/v1/consent/banner?lang=en&userId=user123
```

**Parameters:**
- `lang` (optional): Language code
- `userId` (optional): User identifier

**Response:**
```json
{
  "banner": {
    "layout": "full_screen",
    "position": "bottom",
    "theme": { ... },
    "title": { "en": "We value your privacy", "ar": "نقدر خصوصيتك" },
    "description": { ... }
  },
  "categories": [
    {
      "id": "necessary",
      "name": "Strictly Necessary",
      "description": "Essential for the website...",
      "required": true
    }
  ],
  "privacyPolicyUrl": "/privacy-policy",
  "cookiePolicyUrl": "/cookie-policy"
}
```

---

### Create Consent

```http
POST /api/v1/consent
Content-Type: application/json
```

**Request Body:**
```json
{
  "userId": "user123",
  "categories": {
    "necessary": true,
    "functional": true,
    "analytics": false,
    "marketing": false,
    "social": false
  },
  "consentGiven": true,
  "language": "en",
  "source": "banner",
  "purpose": "initial_consent"
}
```

**Response:**
```json
{
  "success": true,
  "consentId": "uuid-v4-string",
  "tcString": "CO量和...",
  "expiresAt": 1734288000000,
  "proof": {
    "proof": {
      "consentId": "...",
      "userId": "user123",
      "timestamp": "2026-06-15T10:30:00.000Z",
      "legalBasis": "GDPR Article 6(1)(a) - Consent",
      "article7Requirements": {
        "unbundled": true,
        "activeConsent": true,
        "noPrecheckedBoxes": true,
        "withdrawConsentPossible": true,
        "balancedPower": true
      }
    }
  }
}
```

---

### Get Consent Status

```http
GET /api/v1/consent/:userId
```

**Response:**
```json
{
  "success": true,
  "consent": {
    "consentId": "uuid-v4-string",
    "categories": {
      "necessary": true,
      "functional": true
    },
    "consentGiven": true,
    "timestamp": 1718452200000,
    "expiresAt": 1734288000000,
    "language": "en"
  }
}
```

---

### Withdraw Consent

```http
POST /api/v1/consent/:userId/withdraw
Content-Type: application/json
```

**Request Body:**
```json
{
  "reason": "User requested withdrawal"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Consent successfully withdrawn",
  "withdrawnAt": "2026-06-15T10:30:00.000Z",
  "proof": {
    "withdrawalId": "uuid-v4-string",
    "userId": "user123",
    "timestamp": "2026-06-15T10:30:00.000Z",
    "legalBasis": "GDPR Article 7(3) - Right to withdraw consent"
  }
}
```

---

### Parse TC String

```http
GET /api/v1/tcstring/:tcString
```

**Response:**
```json
{
  "success": true,
  "tcString": {
    "version": 2,
    "created": "2026-06-15T10:30:00.000Z",
    "updated": "2026-06-15T10:30:00.000Z",
    "cmpId": 22,
    "cmpVersion": 2039000,
    "consentLanguage": "EN",
    "vendorListVersion": 225,
    "purposeConsents": { "1": true, "2": true },
    "vendorConsents": { "1": true }
  }
}
```

---

### Check Category Consent

```http
POST /api/v1/consent/check
Content-Type: application/json
```

**Request Body:**
```json
{
  "userId": "user123",
  "category": "analytics"
}
```

**Response:**
```json
{
  "success": true,
  "check": {
    "userId": "user123",
    "category": "analytics",
    "allowed": false,
    "consentId": "uuid-v4-string",
    "checkedAt": "2026-06-15T10:30:00.000Z"
  }
}
```

---

### Get Audit Log

```http
GET /api/v1/consent/audit?limit=100&offset=0
```

**Response:**
```json
{
  "success": true,
  "audit": {
    "entries": [
      {
        "id": "uuid-v4-string",
        "timestamp": "2026-06-15T10:30:00.000Z",
        "action": "consent_given",
        "consentId": "...",
        "userId": "user123"
      }
    ],
    "total": 150,
    "limit": 100,
    "offset": 0
  }
}
```

---

### Get Consent Proof

```http
GET /api/v1/consent/:consentId/proof
```

**Response:**
```json
{
  "success": true,
  "proof": {
    "proof": {
      "consentId": "uuid-v4-string",
      "userId": "user123",
      "timestamp": "2026-06-15T10:30:00.000Z",
      "legalBasis": "GDPR Article 6(1)(a) - Consent",
      "purpose": "consent_verification",
      "categories": { ... },
      "proofType": "gdpr_article_7",
      "article7Requirements": { ... }
    }
  }
}
```

---

### Get Statistics

```http
GET /api/v1/consent/stats
```

**Response:**
```json
{
  "success": true,
  "stats": {
    "totalConsents": 1500,
    "byCategory": {
      "necessary": 1500,
      "functional": 1200,
      "analytics": 800,
      "marketing": 300,
      "social": 200
    },
    "byLanguage": {
      "en": 1300,
      "ar": 200
    },
    "withdrawn": 50
  },
  "generatedAt": "2026-06-15T10:30:00.000Z"
}
```

---

## Consent Categories

| Category | ID | TCF Purpose | Required | Description |
|----------|-----|-------------|----------|-------------|
| Strictly Necessary | `necessary` | Purpose 1 | Yes | Essential website functionality |
| Functional | `functional` | Purpose 3 | No | Enhanced personalization |
| Analytics | `analytics` | Purpose 2 | No | Visitor behavior analysis |
| Marketing | `marketing` | Purpose 10 | No | Personalized advertisements |
| Social Media | `social` | Purpose 3 | No | Social media integration |

---

## GDPR Compliance Features

### Article 7 Requirements

The service implements all GDPR Article 7 requirements:

1. **Unbundled:** Consent requests are clearly separated from other terms
2. **Active Consent:** Users must take affirmative action (no pre-checked boxes)
3. **No Prechecked Boxes:** All consent boxes are unchecked by default
4. **Withdraw Consent Possible:** Users can withdraw consent at any time
5. **Balanced Power:** Clear information about data processing purposes

### Data Retention

- Consent records stored for 365 days (configurable)
- Audit logs retained for compliance purposes
- Automatic expiration of consent records

---

## IAB TCF 2.2 Support

The service implements the IAB Transparency and Consent Framework 2.2:

- TC String generation and decoding
- Purpose consent tracking
- Vendor consent management
- CMP ID registration (LawGens: 22)

---

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Service port | `5039` |
| `NODE_ENV` | Environment | `development` |
| `LOG_LEVEL` | Logging level | `info` |

---

## Error Responses

All error responses follow this format:

```json
{
  "success": false,
  "message": "Error description",
  "error": "Detailed error (development only)"
}
```

---

## Integration

### Cookie Check from Other Services

```javascript
const response = await fetch('http://localhost:5039/api/v1/consent/check', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    userId: 'user123',
    category: 'marketing'
  })
});

const { allowed } = response.json().check;
```

### Set Consent Cookie

```javascript
// Frontend sets cookie after consent
document.cookie = `rez_consent=${consentId}; max-age=${365*24*60*60}; path=/`;
document.cookie = `rez_tc_string=${tcString}; max-age=${365*24*60*60}; path=/`;
```

---

## License

MIT License - LawGens / REZ Legal Tech
