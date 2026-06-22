# REZ MARKETING PLATFORM - Complete Audit

**Date:** May 11, 2026  
**Version:** 1.0

---

## OVERVIEW

The REZ Marketing Platform is a comprehensive suite of services for campaign management, customer engagement, and lead generation.

```
┌─────────────────────────────────────────────────────────────────┐
│                    MARKETING PLATFORM                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────┐ │
│  │ Marketing       │  │ Ads Service     │  │ Decision   │ │
│  │ Service        │  │ (Campaigns)    │  │ Service    │ │
│  │ Port: 4026    │  │ Port: 4007     │  │ Port: 4027│ │
│  └────────┬────────┘  └────────┬────────┘  └──────┬──────┘ │
│           │                    │                    │         │
│  ┌────────┴────────┐  ┌──────┴──────┐  ┌───────┴──────┐ │
│  │ Abandonment    │  │ Lead         │  │ Unified     │ │
│  │ Tracker       │  │ Intelligence │  │ Messaging   │ │
│  │ Port: 4108  │  │ Port: 4106  │  │ Port: 4025 │ │
│  └───────────────┘  └──────────────┘  └─────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

---

## SERVICES (6 Microservices)

---

## 1. Marketing Service

| Item | Value |
|------|-------|
| **Port** | 4026 |
| **Purpose** | Campaign management, automation |
| **Git** | `rez-marketing-service/` |

### Features

| Feature | Description |
|---------|-------------|
| Campaign creation | Multi-channel campaigns |
| Scheduling | BullMQ job scheduling |
| Customer segments | Targeted messaging |
| Analytics | Campaign performance |
| A/B testing | Variant testing |

### API Endpoints

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/api/v1/campaigns` | List campaigns |
| POST | `/api/v1/campaigns` | Create campaign |
| GET | `/api/v1/campaigns/:id` | Get campaign |
| PATCH | `/api/v1/campaigns/:id` | Update campaign |
| DELETE | `/api/v1/campaigns/:id` | Delete campaign |
| GET | `/api/v1/segments` | List segments |
| POST | `/api/v1/segments` | Create segment |

---

## 2. Ads Service

| Item | Value |
|------|-------|
| **Port** | 4007 |
| **Purpose** | Ad management, campaigns |
| **Git** | `rez-marketing-backend/services/ads-service/` |

### Features

| Feature | Description |
|---------|-------------|
| Ad creation | Banner, video, text ads |
| Campaign types | CPC, CPM, CPA |
| Targeting | Demographics, location |
| Budget control | Daily, lifetime limits |
| Real-time bidding | Auction system |

### API Endpoints

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/api/ads` | List ads |
| POST | `/api/ads` | Create ad |
| GET | `/api/campaigns` | Ad campaigns |
| POST | `/api/campaigns` | Create campaign |
| GET | `/api/stats` | Ad statistics |

---

## 3. Decision Service

| Item | Value |
|------|-------|
| **Port** | 4027 |
| **Purpose** | ML-powered targeting |
| **Git** | `rez-marketing-backend/services/decision-service/` |

### Features

| Feature | Description |
|---------|-------------|
| ML targeting | Predict user response |
| Personalization | User-specific ads |
| Bid optimization | Maximize ROI |
| Fraud detection | Invalid clicks filtering |
| Attribution | Track conversions |

### API Endpoints

| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/api/decide` | Get ad decision |
| GET | `/api/targeting` | Targeting rules |
| POST | `/api/targeting` | Create targeting |
| GET | `/api/attribution` | Attribution data |

---

## 4. Abandonment Tracker

| Item | Value |
|------|-------|
| **Port** | 4108 |
| **Purpose** | Cart/order recovery |
| **Git** | `rez-marketing-backend/services/abandonment-tracker/` |

### Features

| Feature | Description |
|---------|-------------|
| Cart abandonment | Track abandoned carts |
| Recovery campaigns | Automated recovery |
| Email triggers | Timed follow-ups |
| SMS reminders | Mobile notifications |
| Analytics | Recovery rates |

### API Endpoints

| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/api/track` | Track abandonment |
| GET | `/api/abandonments` | List abandoned |
| POST | `/api/recover` | Trigger recovery |
| GET | `/api/stats` | Recovery stats |

---

## 5. Lead Intelligence

| Item | Value |
|------|-------|
| **Port** | 4106 |
| **Purpose** | Lead scoring, qualification |
| **Git** | `rez-marketing-backend/services/lead-intelligence/` |

### Features

| Feature | Description |
|---------|-------------|
| Lead scoring | ML-based scoring |
| Qualification | BANT, MEDDIC |
| Routing | Assign to sales |
| Nurturing | Automated sequences |
| Analytics | Funnel tracking |

### API Endpoints

| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/api/leads` | Create lead |
| GET | `/api/leads` | List leads |
| PATCH | `/api/leads/:id/score` | Update score |
| POST | `/api/leads/:id/route` | Route lead |
| GET | `/api/funnel` | Funnel analytics |

---

## 6. Unified Messaging

| Item | Value |
|------|-------|
| **Port** | 4025 |
| **Purpose** | Multi-channel notifications |
| **Git** | `rez-marketing-backend/services/unified-messaging/` |

### Channels

| Channel | Provider |
|---------|----------|
| WhatsApp | Meta Graph API |
| SMS | Twilio / MSG91 |
| Email | SMTP / AWS SES |
| Push | Firebase FCM |

### API Endpoints

| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/api/send/whatsapp` | Send WhatsApp |
| POST | `/api/send/sms` | Send SMS |
| POST | `/api/send/email` | Send Email |
| POST | `/api/send/push` | Send Push |
| POST | `/api/send/broadcast` | Multi-channel |
| GET | `/api/templates` | Message templates |

---

## CAMPAIGN TYPES

| Campaign | Channels | Triggers |
|----------|----------|----------|
| Welcome | Email, SMS, Push | New signup |
| Cart Recovery | WhatsApp, SMS, Email | Cart abandoned |
| Order Confirmation | WhatsApp, SMS | Order placed |
| Delivery Update | Push, SMS | Status change |
| Review Request | Email, SMS | After delivery |
| Re-engagement | All channels | Dormant user |
| Promotional | All channels | Campaign trigger |

---

## INTEGRATION POINTS

| Service | Connection |
|---------|------------|
| `rez-auth-service` | User authentication |
| `rez-wallet-service` | User segments |
| `rez-order-service` | Order triggers |
| `REZ Mind` | Intent capture |
| `rez-user-intelligence` | User profiles |
| `rez-profile-service` | User data |

---

## DEPLOYMENTS

| Service | Platform | URL |
|---------|----------|-----|
| Marketing Service | Render | `REZ-marketing.onrender.com` |
| Ads Service | Render | Built |
| Decision Service | Render | Built |
| Abandonment Tracker | Render | Built |
| Lead Intelligence | Render | Built |
| Unified Messaging | Render | Built |

---

## SECURITY

| Feature | Status |
|---------|--------|
| API Key Auth | ✅ |
| JWT Verification | ✅ |
| Rate Limiting | ✅ |
| Input Validation | ✅ Zod |
| Helmet | ✅ |
| CORS | ✅ Configured |

---

## ENVIRONMENT VARIABLES

```env
# Database
MONGODB_URI=mongodb+srv://user:pass@cluster

# Redis
REDIS_URL=redis://localhost:6379

# Auth
JWT_SECRET=your-jwt-secret
INTERNAL_SERVICE_KEY=your-key

# WhatsApp
WHATSAPP_TOKEN=meta-token
WHATSAPP_PHONE_ID=phone-id

# SMS
TWILIO_ACCOUNT_SID=sid
TWILIO_AUTH_TOKEN=token

# Push
FCM_SERVER_KEY=firebase-key
```

---

**Last Updated:** May 11, 2026
