# REZ Profile Service

## Basic Info

| Field | Value |
|-------|-------|
| **Git Path** | `rez-profile-service` |
| **Port** | 3000 (primary) |
| **Status** | Active |
| **Live URL** | https://rezprofile.onrender.com |
| **Health Check** | `GET /health` |
| **Readiness Check** | `GET /ready` |

---

## Purpose

The Profile Service manages user profiles, preferences, addresses, and extended profile data (REE - Rich Extended Employee profiles). It provides profile CRUD operations, feature flags, and integrates with Auth Service for user validation and Wallet Service for balance caching.

---

## Technology Stack

- **Runtime**: Node.js 20.x
- **Framework**: Express.js
- **Database**: MongoDB
- **Cache**: Redis
- **Observability**: Winston (logging)

---

## API Endpoints

### Core Profile

| Method | Endpoint | Purpose | Auth |
|--------|----------|---------|------|
| GET | `/profile/:userId` | Get user profile | Bearer |
| POST | `/profile` | Create profile | Bearer |
| PUT | `/profile/:userId` | Update profile | Bearer |
| DELETE | `/profile/:userId` | Delete profile | Bearer |

### Extended Profile (REE)

| Method | Endpoint | Purpose | Auth |
|--------|----------|---------|------|
| GET | `/api/profile/:userId` | Get extended profile | Bearer |
| PUT | `/api/profile/:userId` | Update extended profile | Bearer |
| GET | `/api/profile/:userId/addresses` | Get addresses | Bearer |
| POST | `/api/profile/:userId/addresses` | Add address | Bearer |
| PUT | `/api/profile/:userId/addresses/:id` | Update address | Bearer |
| DELETE | `/api/profile/:userId/addresses/:id` | Delete address | Bearer |

### Preferences

| Method | Endpoint | Purpose | Auth |
|--------|----------|---------|------|
| GET | `/api/profile/:userId/preferences` | Get preferences | Bearer |
| PUT | `/api/profile/:userId/preferences` | Update preferences | Bearer |

### Features/Feature Flags

| Method | Endpoint | Purpose | Auth |
|--------|----------|---------|------|
| GET | `/api/features` | Get all features | Bearer |
| GET | `/api/features/:userId` | Get user's features | Bearer |
| PUT | `/api/features/:userId` | Update user features | Bearer |

### Internal/Hidden Routes

| Method | Endpoint | Purpose | Auth |
|--------|----------|---------|------|
| GET | `/hidden/profile/:userId` | Get profile (internal) | Internal |
| POST | `/hidden/batch` | Batch profile operations | Internal |

---

## Database Collections

| Collection | Purpose |
|------------|---------|
| `profiles` | User profile data |
| `addresses` | User addresses |
| `preferences` | User preferences and settings |
| `features` | Feature flags per user |
| `extended_profiles` | REE (Rich Extended Employee) data |

---

## Dependencies

| Service | Purpose | URL Config |
|---------|---------|------------|
| MongoDB | Profile data storage | `MONGODB_URI` |
| Redis | Preferences caching | `REDIS_URL` |
| Auth Service | User validation | `AUTH_SERVICE_URL` |
| Wallet Service | Balance caching | `WALLET_SERVICE_URL` |
| REE Service | Extended profile data | `REE_SERVICE_URL` |

---

## Dependents (Services that call this service)

| Service | Usage |
|---------|-------|
| All frontend apps | Profile display |
| Merchant App | Business profile |
| Order Service | Delivery address lookup |
| Notification Service | User preferences for notifications |

---

## Environment Variables

```env
# Core
NODE_ENV=production
PORT=3000

# Database
MONGODB_URI=mongodb://localhost:27017/rez-profile

# Cache
REDIS_URL=redis://localhost:6379

# Service URLs
AUTH_SERVICE_URL=https://rez-auth-service.onrender.com
WALLET_SERVICE_URL=https://rez-wallet-service-36vo.onrender.com
REE_SERVICE_URL=https://rez-ree-service.onrender.com

# CORS
CORS_ORIGINS=https://rez.money,https://admin.rez.money,https://merchant.rez.money

# Cache TTL
CACHE_TIER_TTL=300
CACHE_KARMA_TTL=60
```

---

## Profile Data Model

```typescript
interface Profile {
  userId: string;
  displayName: string;
  email: string;
  phone?: string;
  avatar?: string;
  dateOfBirth?: Date;
  gender?: 'male' | 'female' | 'other' | 'prefer_not_to_say';
  addresses: Address[];
  metadata: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

interface Address {
  id: string;
  type: 'home' | 'work' | 'other';
  line1: string;
  line2?: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  isDefault: boolean;
}

interface Preferences {
  userId: string;
  notifications: {
    email: boolean;
    sms: boolean;
    push: boolean;
    whatsapp: boolean;
  };
  language: string;
  currency: string;
  theme: 'light' | 'dark' | 'system';
  privacy: {
    showProfile: boolean;
    showActivity: boolean;
  };
}

interface FeatureFlags {
  userId: string;
  flags: Record<string, boolean>;
  experiments: string[];
  rolloutGroups: string[];
}
```

---

## Rate Limiting

| Endpoint | Limit |
|----------|-------|
| Profile read | 100 requests / minute |
| Profile write | 20 requests / minute |

---

## Cache Strategy

| Data | TTL | Invalidation |
|------|-----|--------------|
| Profile | 5 minutes | On update |
| Karma/Score | 1 minute | On transaction |
| Preferences | 5 minutes | On update |

---

## Health Check Response

```json
{
  "status": "ok",
  "service": "profile-service",
  "timestamp": "2026-05-10T12:00:00.000Z"
}
```

### Readiness Check

```json
{
  "status": "ready",
  "checks": {
    "mongodb": "ok",
    "redis": "ok"
  },
  "timestamp": "2026-05-10T12:00:00.000Z"
}
```

---

## Security Features

- [x] JWT authentication
- [x] Internal route protection
- [x] Rate limiting
- [x] CORS whitelist
- [x] Input sanitization
- [x] Privacy controls per user

---

## Feature Flags

Dynamic features enabled per user:
- Beta features
- A/B test groups
- Rollout groups
- Experimental features

---

## Business Logic

### Profile Creation
1. User registers via Auth Service
2. Profile Service creates initial profile
3. Default preferences set
4. Profile cached in Redis

### Profile Update
1. Validate user ownership
2. Update MongoDB
3. Invalidate Redis cache
4. Publish update event

### Extended Profile (REE)
- Rich employee profiles for enterprise
- Corporate directory integration
- Org chart data

---

## Deployment

| Environment | Platform | Auto-restart |
|-------------|----------|--------------|
| Production | Render | Yes |
| Staging | Render | Yes |
| Development | Local | Manual |

---

## Related Documentation

- [API Reference](../API_REFERENCE.md)
