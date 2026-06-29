# Household OS

**Version:** 1.0.0
**Port:** 4749
**Status:** ✅ COMPLETE (Week 13-14)

## Overview

Family intelligence — milk running low, bills due, medicines expiring.

## API Endpoints

```
POST /api/household/members                  # Add member
GET  /api/household/:id/members              # List members
POST /api/household/grocery                  # Add grocery
GET  /api/household/:id/grocery              # List groceries
POST /api/household/grocery/:itemId/purchased
POST /api/household/bills                    # Add bill
GET  /api/household/:id/bills                # List bills
GET  /api/household/:id/bills/upcoming       # Upcoming bills
POST /api/household/medicines                # Add medicine
GET  /api/household/:id/medicines            # List medicines
GET  /api/household/:id/medicines/expiring   # Expiring medicines
GET  /api/household/:id/medicines/low-stock  # Low stock medicines
GET  /api/household/:id/dashboard            # Full dashboard
```

## Quick Start

```bash
# Add a member
curl -X POST http://localhost:4749/api/household/members \
  -H "Content-Type: application/json" \
  -d '{
    "householdId": "home_123",
    "userId": "user_123",
    "name": "Mom",
    "relationship": "parent"
  }'

# Add to grocery list
curl -X POST http://localhost:4749/api/household/grocery \
  -H "Content-Type: application/json" \
  -d '{
    "householdId": "home_123",
    "item": "Milk",
    "addedBy": "user_123"
  }'

# Get full dashboard
curl http://localhost:4749/api/household/home_123/dashboard
```

## Features

| Feature | What |
|---------|------|
| **Members** | Family members, allergies, medications |
| **Groceries** | Shared list, categories, mark purchased |
| **Bills** | Track, upcoming alerts, autopay |
| **Medicines** | Expiry alerts, low-stock alerts |
| **Tasks** | Household chores, recurring |
| **Dashboard** | All alerts in one view |

## Files

```
genie-household/
├── src/
│   ├── index.ts                        # Express server, port 4749
│   ├── types/
│   │   └── household.ts                # Household types
│   └── services/
│       └── householdManager.ts         # Redis storage
├── package.json
├── tsconfig.json
└── vitest.config.ts
```

## Status: ✅ COMPLETE