# REZ Loyalty Admin - SPEC.md

**Version:** 1.0.0
**Port:** (see config)
**Company:** RTNM-Group
**Category:** Admin

---

## Overview

Admin dashboard for managing loyalty programs across the REZ ecosystem. Provides tools for configuring reward tiers, managing campaigns, and analyzing loyalty performance.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                      REZ Loyalty Admin                                     │
├─────────────────────────────────────────────────────────────────────────────┤
│  Components:                                                                │
│  ├── Program Config   → Loyalty rules and tiers                          │
│  ├── Campaign Manager → Campaign creation and tracking                    │
│  ├── Member Analytics → Member engagement metrics                        │
│  └── Reward Catalog   → Available rewards management                     │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Data Models

### LoyaltyProgram
```typescript
{
  programId: string
  name: string
  description: string
  tiers: Tier[]
  rules: Rule[]
  isActive: boolean
  createdAt: Date
}
```

### Campaign
```typescript
{
  campaignId: string
  programId: string
  name: string
  type: 'bonus_points' | 'tier_bonus' | 'special_offer'
  startDate: Date
  endDate: Date
  status: 'draft' | 'active' | 'completed'
  metrics: {
    impressions: number
    redemptions: number
  }
}
```

---

## API Endpoints

### Programs
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/programs` | List programs |
| POST | `/api/programs` | Create program |
| GET | `/api/programs/:id` | Program details |
| PUT | `/api/programs/:id` | Update program |

### Campaigns
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/campaigns` | List campaigns |
| POST | `/api/campaigns` | Create campaign |
| GET | `/api/campaigns/:id` | Campaign details |
| PUT | `/api/campaigns/:id` | Update campaign |

### Analytics
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/analytics/overview` | Loyalty overview |
| GET | `/api/analytics/engagement` | Engagement metrics |

### Health
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Health check |

---

## Dependencies

```json
{
  "react": "^18.2.0",
  "react-dom": "^18.2.0",
  "next": "^14.1.0",
  "recharts": "^2.12.0",
  "lucide-react": "^0.344.0",
  "clsx": "^2.1.0"
}
```

---

## Status

- [x] Program configuration
- [x] Campaign management
- [x] Member analytics
- [x] Reward catalog

