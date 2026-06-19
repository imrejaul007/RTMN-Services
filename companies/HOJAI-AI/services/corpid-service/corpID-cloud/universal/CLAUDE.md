# Universal Profile

**Service:** Cross-Platform Profile
**Port:** 4702 (via gateway)
**Prefix:** `/api/universal`

---

## Overview

The Universal Profile service aggregates identity data from all RTMN platforms into a single, comprehensive user profile. It provides a unified view across REZ, Genie, CorpPerks, and all other connected services.

## Features

- **Profile Aggregation:** Pulls from all connected platforms
- **8 Achievement Badges:** Verified, Premium, Trusted, Top Rated, etc.
- **Privacy Controls:** Profile visibility, field-level privacy
- **Lifetime Value:** Calculated from all sources
- **Cross-Platform Stats:** Aggregated metrics
- **Auto-Refresh:** Keep profile updated
- **Public Profiles:** Viewable by other users
- **Connection Tracking:** Followers, following, mutual connections

## Badges

| Badge | Icon | Color | Description |
|-------|------|-------|-------------|
| `verified` | ✓ | Green | Identity verified |
| `premium` | ★ | Amber | Premium member |
| `trusted` | 🛡️ | Blue | Trusted user |
| `top_rated` | ⭐ | Yellow | High ratings |
| `early_adopter` | 🌟 | Purple | Early user |
| `founder` | 👑 | Red | Founding member |
| `contributor` | 💎 | Cyan | Active contributor |
| `vip` | 💫 | Pink | VIP status |

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/universal/badges` | Get all badges |
| GET | `/api/universal/me` | Get my profile |
| POST | `/api/universal/me/refresh` | Refresh from sources |
| GET | `/api/universal/user/:userId` | Get user profile |
| PUT | `/api/universal/me/privacy` | Update privacy |
| POST | `/api/universal/user/:userId/badges` | Add badge (admin) |
| PUT | `/api/universal/me/connections` | Update connections |
| GET | `/api/universal/me/stats` | Get stats |

## Usage Example

```bash
# Get my universal profile
curl http://localhost:4702/api/universal/me \
  -H "Authorization: Bearer $TOKEN"
```

Response:
```json
{
  "success": true,
  "profile": {
    "id": "uprof-abc",
    "identity": {
      "displayName": "John Doe",
      "avatar": "https://...",
      "bio": "Software developer"
    },
    "contact": {
      "primaryEmail": "john@example.com",
      "emailVerified": true
    },
    "location": {
      "current": {
        "country": "IN",
        "city": "Mumbai",
        "timezone": "Asia/Kolkata"
      }
    },
    "platformProfiles": {
      "rez": {
        "tier": "gold",
        "points": 5000,
        "lifetimeValue": 50000
      },
      "genie": {
        "voiceEnabled": true,
        "wakeWord": "Hey Genie"
      }
    },
    "aggregatedStats": {
      "totalOrders": 50,
      "totalSpent": 75000,
      "loyaltyPoints": 5000,
      "lifetimeValue": 100000
    },
    "badges": [
      { "type": "verified", "name": "Verified" }
    ],
    "privacy": {
      "profileVisibility": "public",
      "showEmail": false,
      "showStats": true
    }
  }
}
```

```bash
# Update privacy
curl -X PUT http://localhost:4702/api/universal/me/privacy \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "profileVisibility": "connections",
    "showEmail": false,
    "showStats": true
  }'
```

## Privacy Levels

| Level | Description |
|-------|-------------|
| `public` | Visible to everyone |
| `connections` | Only mutual connections |
| `private` | Only self |

## File Structure

```
universal/
├── src/
│   ├── models/
│   │   └── universal.model.js
│   └── routes/
│       └── universal.routes.js
└── CLAUDE.md
```
