# Consumer Identity

**Service:** Consumer Profile Management
**Port:** 4702 (via gateway)
**Prefix:** `/api/consumers`

---

## Overview

The Consumer Identity service manages profiles for end users of RTMN consumer platforms (REZ, Genie, BuzzLocal, etc.). It provides rich profile data, platform integrations, and GDPR-compliant data management.

## Features

- **Rich Profile:** Display name, avatar, bio, location, preferences
- **REZ Integration:** Customer tier, points, lifetime value, referral codes
- **Genie Integration:** Voice settings, wake word, listening mode, language
- **Connected Accounts:** Link Google, Apple, Facebook, etc.
- **Wallet Linking:** Connect REZ wallet
- **GDPR Compliance:** Data export and account deletion
- **Activity Timeline:** Track user activities
- **Preferences:** Granular control over notifications, privacy, communication
- **Multi-language:** Support for multiple languages and currencies

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/consumers` | Create consumer profile |
| GET | `/api/consumers/me` | Get my profile |
| PUT | `/api/consumers/me` | Update profile |
| PUT | `/api/consumers/me/preferences` | Update preferences |
| POST | `/api/consumers/me/accounts` | Connect external account |
| DELETE | `/api/consumers/me/accounts/:provider` | Disconnect account |
| POST | `/api/consumers/me/genie/enable` | Enable Genie |
| PUT | `/api/consumers/me/genie` | Update Genie settings |
| POST | `/api/consumers/me/rez/link` | Link REZ profile |
| POST | `/api/consumers/me/activity` | Record activity |
| GET | `/api/consumers/me/activity` | Get activity timeline |
| POST | `/api/consumers/me/export` | Request data export (GDPR) |
| POST | `/api/consumers/me/delete` | Request account deletion (GDPR) |
| GET | `/api/consumers` | List all consumers (admin) |

## Usage Example

```bash
# Create consumer profile
curl -X POST http://localhost:4702/api/consumers \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "displayName": "John Consumer",
    "country": "IN",
    "city": "Mumbai"
  }'

# Enable Genie
curl -X POST http://localhost:4702/api/consumers/me/genie/enable \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "language": "en",
    "wakeWord": "Hey Genie",
    "listeningMode": "smart"
  }'

# Link REZ profile
curl -X POST http://localhost:4702/api/consumers/me/rez/link \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"tier": "gold"}'
```

## Data Structure

```javascript
{
  id: "cons-abc",
  userId: "user-xyz",
  displayName: "John",
  email: "john@example.com",
  
  preferences: {
    language: "en",
    currency: "INR",
    notifications: { email: true, push: true },
    privacy: { dataSharing: false, marketingConsent: true }
  },
  
  rezProfile: {
    customerId: "rez-123",
    tier: "gold",          // bronze, silver, gold, platinum
    points: 5000,
    lifetimeValue: 50000,
    referralCode: "ABC123"
  },
  
  genieProfile: {
    voiceEnabled: true,
    wakeWord: "Hey Genie",
    listeningMode: "smart", // manual, continuous, passive, smart
    language: "en"
  },
  
  connectedAccounts: [
    { provider: "google", providerId: "g-123" }
  ]
}
```

## File Structure

```
consumer/
├── src/
│   ├── models/
│   │   └── consumer.model.js
│   └── routes/
│       └── consumer.routes.js
└── CLAUDE.md
```
