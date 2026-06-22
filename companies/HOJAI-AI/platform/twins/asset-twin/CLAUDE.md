# asset-twin

**Port:** 4890
**Service name:** `asset-twin`
**Status:** ✅ Production-ready | **Phase 4 wired** (June 21, 2026)

---

## Overview

Asset Twin is the canonical digital-twin service for **business assets**
in the RTMN ecosystem. It tracks physical and intangible assets owned by
a business — equipment, vehicles, real estate, IP, software licenses —
including their value, depreciation, categories, and maintenance
history.

This service is consumed by Finance OS (for depreciation schedules) and
Operations OS (for maintenance scheduling and asset utilization).

## Storage

| Store | Path | Purpose |
|-------|------|---------|
| `assets` | `data/assets.json` | Asset records |
| `categories` | `data/categories.json` | Asset categories (vehicles, equipment, etc.) |
| `maintenance` | `data/maintenance.json` | Maintenance history |

Each asset record includes:

```js
{
  id: 'asset-abc123',
  name, category, type, value, currency,
  purchaseDate, depreciationRate,
  status: 'active'|'maintenance'|'retired',
  owner: '<businessId>',
  nextMaintenance, location, metadata
}
```

## API

| Method | Path | Description |
|--------|------|-------------|
| GET | `/health` | Liveness check |
| GET | `/api/assets` | List assets (paginated, filterable) |
| GET | `/api/assets/:id` | Get one asset |
| POST | `/api/assets` | Create asset (publishes `asset.asset.created`) |
| PUT | `/api/assets/:id` | Update asset (publishes `asset.asset.updated`) |
| DELETE | `/api/assets/:id` | Delete asset (publishes `asset.asset.deleted`) |
| GET | `/api/assets/:id/value` | Current depreciated value |
| GET | `/api/categories` | List categories |
| POST | `/api/categories` | Create category (publishes `asset.category.created`) |
| POST | `/api/assets/:id/maintenance` | Schedule maintenance (publishes `asset.maintenance.scheduled`) |
| GET | `/api/assets/:id/maintenance` | Maintenance history |

## Platform Integration (Phase 4)

| Endpoint | Bridge | MemoryOS | Policy | Event |
|----------|:------:|:--------:|:------:|:------|
| POST `/api/assets` | ✓ | ✓ | ✓ | `asset.asset.created` |
| PUT `/api/assets/:id` | — | ✓ | ✓ | `asset.asset.updated` |
| DELETE `/api/assets/:id` | — | ✓ | ✓ | `asset.asset.deleted` |
| POST `/api/categories` | — | — | — | `asset.category.created` |
| POST `/api/assets/:id/maintenance` | — | — | — | `asset.maintenance.scheduled` |

## Quick Start

```bash
cd /Users/rejaulkarim/Documents/RTMN/companies/HOJAI-AI
./start-twins.sh

# Standalone
cd platform/twins/asset-twin
PORT=4890 \
  JWT_SECRET="dev_jwt_secret_change_in_production_minimum_64_characters_required_for_security" \
  JWT_ISSUER="rtmn-corpid" \
  SERVICE_NAME="asset-twin" \
  npm start
```

## Sample Request

```bash
TOKEN=$(python3 -c "
import json, base64, time
p = {'sub':'u1','email':'a@b.com','role':'superadmin','businessId':'BIZ-1','exp':int((time.time()+3600)*1000)}
print(base64.b64encode(json.dumps(p).encode()).decode())
")

curl -X POST http://localhost:4890/api/assets \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name":"Forklift #3",
    "category":"equipment",
    "type":"vehicle",
    "value":25000,
    "currency":"USD",
    "purchaseDate":"2024-01-15"
  }'
```

Response:

```json
{
  "success": true,
  "twin": {
    "id": "asset-abc123",
    "name": "Forklift #3",
    "value": 25000,
    "status": "active",
    "createdAt": "2026-06-21T21:00:00.000Z"
  }
}
```

---

*Last Updated: June 21, 2026 (Phase 4 cross-service wiring)*