# RTMN Authentication System

## Overview

Every Industry OS service has built-in authentication. Each industry is independent - you register/login per industry.

## Quick Auth Flow

```
1. Register → Get Token
2. Use Token → Access Industry APIs
```

## Auth Endpoints (All Industry OS)

Every service exposes these auth endpoints:

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/auth/register` | Register business + owner |
| POST | `/auth/login` | Login with email/password |
| GET | `/auth/verify` | Verify token |
| POST | `/auth/logout` | Logout (invalidate token) |
| POST | `/auth/staff` | Add staff (owner only) |

---

## Registration

```bash
curl -X POST http://localhost:5010/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "businessName": "My Restaurant",
    "ownerName": "John Doe",
    "email": "john@example.com",
    "password": "secure123",
    "phone": "+1234567890"
  }'
```

**Response:**
```json
{
  "success": true,
  "message": "Restaurant registered",
  "business": {
    "id": "BIZ_RESTAURANT_1718432400000",
    "name": "My Restaurant",
    "industry": "restaurant"
  },
  "user": {
    "id": "OWN_RESTAURANT_1718432400000",
    "name": "John Doe",
    "email": "john@example.com",
    "role": "owner"
  },
  "token": "abc123..."
}
```

---

## Login

```bash
curl -X POST http://localhost:5010/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john@example.com",
    "password": "secure123"
  }'
```

**Response:**
```json
{
  "success": true,
  "message": "Login successful",
  "user": {
    "id": "OWN_RESTAURANT_1718432400000",
    "name": "John Doe",
    "email": "john@example.com",
    "role": "owner",
    "businessId": "BIZ_RESTAURANT_1718432400000"
  },
  "business": { ... },
  "token": "abc123..."
}
```

---

## Using the Token

Include the token in all API requests:

```bash
curl http://localhost:5010/api/menus \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

---

## Roles & Permissions

| Role | Description | Permissions |
|------|-------------|-------------|
| `owner` | Business owner | Full access |
| `manager` | Manager | Operations management |
| `staff` | Staff member | Basic operations |
| `customer` | Customer | Public read access |

### Role Hierarchy
```
owner > manager > staff > customer
```

---

## Industry-Specific Auth

Each industry has its own auth system:

| Industry | Service | Port | Register |
|----------|----------|------|----------|
| Restaurant | restaurant-os | 5010 | `/auth/register` |
| Hotel | hotel-os | 5025 | `/auth/register` |
| Healthcare | healthcare-os | 5020 | `/auth/register` |
| Retail | retail-os | 5030 | `/auth/register` |
| Legal | legal-os | 5035 | `/auth/register` |
| Hospitality | hospitality-os | 5050 | `/auth/register` |
| Education | education-os | 5060 | `/auth/register` |
| Automotive | automotive-os | 5080 | `/auth/register` |
| Beauty | beauty-os | 5090 | `/auth/register` |
| Fitness | fitness-os | 5110 | `/auth/register` |
| Manufacturing | manufacturing-os | 5150 | `/auth/register` |
| Real Estate | realestate-os | 5230 | `/auth/register` |

---

## Adding Staff (Owner Only)

```bash
curl -X POST http://localhost:5010/auth/staff \
  -H "Authorization: Bearer OWNER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Jane Smith",
    "email": "jane@example.com",
    "role": "manager"
  }'
```

---

## Token Expiry

- Tokens expire after **30 days**
- Store token securely (localStorage, cookies, etc.)
- Re-login when token expires

---

## Universal Login (CorpID)

For cross-industry access, use CorpID:

```bash
# Register with CorpID (universal identity)
curl -X POST http://localhost:4702/api/identity/register \
  -H "Content-Type: application/json" \
  -d '{
    "type": "INDIVIDUAL",
    "name": "John Doe",
    "email": "john@example.com"
  }'
```

CorpID provides a universal identity that can be used across all industries.

---

## Protected vs Public Routes

| Route Type | Auth Required |
|-----------|---------------|
| `/health` | No |
| `/auth/*` | No |
| `/api/menu` (GET) | No (public menu) |
| `/api/orders` (POST) | Yes |
| `/api/orders` (GET) | Yes |
| `/api/staff` | Yes (owner only) |

---

## Error Responses

```json
// 401 - Not authenticated
{ "success": false, "error": "Authentication required" }

// 403 - Not authorized
{ "success": false, "error": "Insufficient permissions" }

// 409 - Email exists
{ "success": false, "error": "Email already registered" }
```

---

*Last Updated: June 15, 2026*
