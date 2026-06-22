# REZ Platform Admin - Complete API Documentation

**Port:** 4000
**Status:** Full Ecosystem Control

---

## Overview

REZ Platform Admin provides **complete control** over the entire ecosystem including:

- Service Management
- Company Management
- User Management (All Companies)
- Infrastructure Monitoring
- Alert Management
- API Keys

---

## Endpoints

### Authentication

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/auth/login` | Admin login |

### Service Management

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/services` | List all services |
| POST | `/api/services/:id/restart` | Restart service |
| PATCH | `/api/services/:id/config` | Update service config |
| POST | `/api/services/:id/scale` | Scale service |

### Company Management

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/companies` | List all companies |
| POST | `/api/companies` | Create company |
| GET | `/api/companies/:id` | Get company details |
| PATCH | `/api/companies/:id` | Update company |

### User Management

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/users` | List all users |
| POST | `/api/users` | Create user |
| PATCH | `/api/users/:id` | Update user |

### API Keys

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/apikeys` | List API keys |
| POST | `/api/apikeys` | Create API key |
| DELETE | `/api/apikeys/:id` | Revoke API key |

### Monitoring

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/infrastructure` | Infrastructure status |
| GET | `/api/alerts` | List alerts |
| POST | `/api/alerts/:id/acknowledge` | Acknowledge alert |
| POST | `/api/alerts/:id/resolve` | Resolve alert |
| GET | `/api/ecosystem` | Full ecosystem status |

---

## Connected Services

### RABTUL Services

| Service | URL | Control |
|---------|-----|---------|
| Auth | `rez-auth-service` | Read/Write |
| Payment | `rez-payment-service` | Read |
| Wallet | `rez-wallet-service` | Read/Write |
| Order | `rez-order-service` | Read/Write |
| Catalog | `rez-catalog-service` | Read/Write |
| Notifications | `rez-notifications` | Read/Write |
| Profile | `rez-profile-service` | Read/Write |
| Circuit Breaker | `REZ-circuit-breaker` | Full Control |

### Intelligence Services

| Service | Control |
|----------|---------|
| CDP | Read |
| Fraud Agent | Read |
| Prediction Engine | Read |
| Signal Aggregator | Read |

### QR Services

| Service | Control |
|----------|---------|
| Verify QR | Full |
| Safe QR | Full |
| Creator QR | Full |
| Ads QR | Full |
| Room QR | Full |

### Support Services

| Service | Control |
|----------|---------|
| REZ-Care | Read/Write |
| REZ-Agent | Read/Write |

---

## Companies Under Control

| Company | Services |
|---------|----------|
| **RABTUL** | All infrastructure services |
| **REZ-Consumer** | verify-qr, safe-qr, creator-qr, rez-app |
| **REZ-Merchant** | NexTaBizz, KDS, POS |
| **REZ-Media** | ads, karma, dooh |
| **StayOwn-Hospitality** | room-qr, hotel-booking |
| **CorpPerks** | peopleos, talentai |
| **RTNM-Group** | platform-admin |

---

## Roles

| Role | Permissions |
|------|-------------|
| `super_admin` | Full access |
| `platform_admin` | Platform management |
| `company_admin` | Company management |
| `support` | Support operations |
| `viewer` | Read-only |

---

## Usage

```bash
# Login
curl -X POST http://localhost:4000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@rez.money","password":"admin123"}'

# Get all services
curl http://localhost:4000/api/services \
  -H "Authorization: Bearer <token>"

# Get ecosystem status
curl http://localhost:4000/api/ecosystem \
  -H "Authorization: Bearer <token>"
```

---

## Response Format

```json
{
  "success": true,
  "data": { ... }
}
```

Error:
```json
{
  "error": "Message"
}
```
