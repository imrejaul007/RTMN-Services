# Consent Platform

**Service:** Consent Management
**Port:** 4702 (via gateway)
**Prefix:** `/api/consent`

---

## Overview

The Consent Platform provides comprehensive consent management for GDPR, DPDP, and CCPA compliance. It supports granular consent tracking, data subject rights, and cookie consent.

## Features

- **7 Consent Categories:** Data processing, marketing, cookies, AI, location, biometric, third-party
- **6 Legal Bases:** Consent, contract, legal obligation, legitimate interest, vital interest, public task
- **Data Subject Rights:** Access (Art 15), Rectification (Art 16), Erasure (Art 17), Portability (Art 20)
- **Cookie Consent:** Granular cookie categories
- **Consent History:** Complete audit trail
- **Privacy Policy Management:** Version tracking
- **Public Cookie Banner:** No auth required for cookie consent

## Consent Categories

| Category | Sub-permissions |
|----------|-----------------|
| `dataProcessing` | analytics, profiling, automatedDecisions |
| `marketing` | email, sms, push, whatsapp, inApp, thirdParty |
| `cookies` | necessary, functional, analytics, advertising, socialMedia |
| `aiUsage` | personalization, behaviorLearning, voiceRecording, imageRecognition |
| `location` | precise, approximate, background |
| `biometric` | faceId, fingerprint, voiceId, iris |
| `thirdPartySharing` | partners, advertisers, analytics |

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/consent/config` | Get consent types and legal basis |
| GET | `/api/consent/me` | Get my consent settings |
| PUT | `/api/consent/me` | Update consent (category + permissions) |
| PUT | `/api/consent/me/:category` | Update specific category |
| POST | `/api/consent/me/grant` | Grant explicit consent |
| POST | `/api/consent/me/withdraw` | Withdraw consent |
| GET | `/api/consent/me/history` | Get consent history |
| POST | `/api/consent/me/policy/accept` | Accept privacy policy |
| POST | `/api/consent/me/data/export` | Request data export (GDPR Art 15) |
| POST | `/api/consent/me/data/delete` | Request data deletion (GDPR Art 17) |
| POST | `/api/consent/me/data/portability` | Request data portability (GDPR Art 20) |
| POST | `/api/consent/me/data/rectify` | Request rectification (GDPR Art 16) |
| GET | `/api/consent/me/data/requests` | List my data requests |
| POST | `/api/consent/cookies` | Set cookie consent (public) |
| GET | `/api/consent/cookies/:visitorId` | Get cookie consent (public) |
| GET | `/api/consent/stats` | Statistics (admin) |
| GET | `/api/consent/requests/pending` | Pending requests (admin) |

## Usage Example

```bash
# Update marketing consent
curl -X PUT http://localhost:4702/api/consent/me \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "category": "marketing",
    "permissions": {
      "email": true,
      "sms": false,
      "push": true
    }
  }'

# Request data export
curl -X POST http://localhost:4702/api/consent/me/data/export \
  -H "Authorization: Bearer $TOKEN"

# Set cookie consent (public)
curl -X POST http://localhost:4702/api/consent/cookies \
  -H "Content-Type: application/json" \
  -d '{
    "visitorId": "visitor-123",
    "functional": true,
    "analytics": false
  }'
```

## GDPR Compliance

This service helps meet the following GDPR requirements:

| Article | Requirement | Endpoint |
|---------|-------------|----------|
| Art 7 | Conditions for consent | `/grant`, `/withdraw` |
| Art 13 | Information to be provided | `/config` |
| Art 15 | Right of access | `/data/export` |
| Art 16 | Right to rectification | `/data/rectify` |
| Art 17 | Right to erasure | `/data/delete` |
| Art 20 | Right to portability | `/data/portability` |
| Art 21 | Right to object | `/withdraw` |
| Art 25 | Data protection by design | Built-in |

## File Structure

```
consent/
├── src/
│   ├── models/
│   │   └── consent.model.js
│   └── routes/
│       └── consent.routes.js
└── CLAUDE.md
```
