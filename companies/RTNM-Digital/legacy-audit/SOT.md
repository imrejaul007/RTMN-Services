# RTNM-Digital - Statement of Truth (SOT)

**Version:** 1.0
**Date:** June 4, 2026
**Status:** Active - Development

---

## EXECUTIVE SUMMARY

**RTNM-Digital** is the digital arm of RTNM Group, providing integration and attribution services for the REZ ecosystem.

### Vision

Seamless integration between all REZ services with unified attribution.

---

## COMPANY POSITION

RTNM-Digital sits at the intersection of all REZ ecosystem services:

```
┌─────────────────────────────────────────────────────────────┐
│                    REZ Ecosystem                             │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐        │
│  │ Merchant│  │Consumer │  │ Media   │  │ Hotel   │        │
│  └────┬────┘  └────┬────┘  └────┬────┘  └────┬────┘        │
│       │            │            │            │              │
│       └────────────┴────────────┴────────────┘              │
│                         │                                   │
│                         ▼                                   │
│              ┌──────────────────┐                          │
│              │   RTNM-Digital   │                          │
│              │  Integration Hub │                          │
│              └──────────────────┘                          │
└─────────────────────────────────────────────────────────────┘
```

---

## SERVICES

| Port | Service | Purpose | Status |
|------|---------|---------|--------|
| 4900 | rez-integration-hub | Unified integration layer | ✅ |
| 4901 | rez-attribution-engine | Cross-service attribution | ✅ |
| 4902 | rez-webhook-manager | Event webhook management | ✅ |
| 4903 | rez-sync-service | Data synchronization | ✅ |

---

## INTEGRATION HUB

### Purpose

Provides unified API surface for cross-service operations:
- Single auth token for all services
- Unified error handling
- Request routing
- Rate limiting

### Supported Services

| Service | Methods |
|---------|---------|
| REZ Merchant | All |
| REZ Consumer | All |
| AdBazaar | Campaigns |
| RABTUL Services | Auth, Payment, Wallet |

---

## ATTRIBUTION ENGINE

### Purpose

Track user journeys across services for:
- Marketing attribution
- Commission calculation
- Revenue sharing
- Analytics

### Attribution Models

| Model | Description |
|-------|-------------|
| First-touch | Credit to first interaction |
| Last-touch | Credit to last interaction |
| Linear | Equal credit to all touchpoints |
| Time-decay | More credit to recent touchpoints |
| Position-based | 40% first, 40% last, 20% middle |

---

## WEBHOOK MANAGER

### Purpose

Manages webhooks for event propagation:
- Event registration
- Retry logic
- Payload transformation
- Delivery tracking

---

## SYNC SERVICE

### Purpose

Keeps data synchronized across services:
- User profile sync
- Order sync
- Payment sync
- Inventory sync

---

## API ENDPOINTS

### Integration Hub

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/integrate/:service/:action` | Execute cross-service action |
| GET | `/integrate/status/:id` | Check operation status |

### Attribution

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/attribution/track` | Track touchpoint |
| GET | `/attribution/journey/:userId` | Get user journey |
| GET | `/attribution/report` | Get attribution report |

### Webhooks

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/webhooks/register` | Register webhook |
| DELETE | `/webhooks/:id` | Remove webhook |
| GET | `/webhooks/:id/logs` | View delivery logs |

### Sync

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/sync/trigger` | Trigger sync |
| GET | `/sync/status` | Check sync status |

---

## ENVIRONMENT VARIABLES

```bash
# Service
PORT=4900
NODE_ENV=development

# Internal Services
AUTH_SERVICE_URL=http://localhost:4002
PAYMENT_SERVICE_URL=http://localhost:4001
MERCHANT_SERVICE_URL=http://localhost:4007
CONSUMER_SERVICE_URL=http://localhost:4008

# Redis (for job queue)
REDIS_URL=redis://localhost:6379

# MongoDB
MONGODB_URI=mongodb://localhost:27017/rtnm-digital
```

---

## QUICK START

```bash
# Install dependencies
npm install

# Run development
npm run dev

# Run tests
npm test
```

---

## DEPLOYMENT

### Docker

```bash
docker build -t rtnm-digital .
docker run -p 4900:4900 rtnm-digital
```

### Kubernetes

```bash
kubectl apply -f k8s/
```

---

## MONITORING

### Health Check

```bash
curl http://localhost:4900/health
```

### Metrics

- Integration success rate
- Attribution accuracy
- Webhook delivery rate
- Sync lag

---

## KNOWN ISSUES

None at this time.

---

## LAST UPDATED

**Date:** June 4, 2026
**Version:** 1.0
