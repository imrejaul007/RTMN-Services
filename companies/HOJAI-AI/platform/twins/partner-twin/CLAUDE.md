# partner-twin

**Port:** 4892
**Service name:** `partner-twin`
**Status:** ✅ Production-ready | **Phase 4 wired** (June 21, 2026)

---

## Overview

Partner Twin is the canonical digital-twin service for **business
partners and partner relationships** in the RTMN ecosystem. It manages:

- **Partners** — Suppliers, resellers, agencies, integration partners
- **Relationships** — Directed edges between partners (refers, supplies,
  resells, integrates-with)
- **Analytics** — Per-partner performance and activity

This service is consumed by Procurement OS (suppliers), Sales OS
(channel partners), and Operations OS (partner integrations).

## Storage

| Store | Path | Purpose |
|-------|------|---------|
| `partners` | `data/partners.json` | Partner records |
| `relationships` | `data/relationships.json` | Edges between partners |

Each partner record:

```js
{
  id: 'partner-abc123',
  name, type: 'supplier'|'reseller'|'agency'|'integration',
  status: 'active'|'inactive',
  contact: { name, email, phone },
  tier: 'platinum'|'gold'|'silver'|'bronze',
  metrics: { deals, revenue, satisfaction },
  createdAt, updatedAt
}
```

## API

| Method | Path | Description |
|--------|------|-------------|
| GET | `/health` | Liveness check |
| GET | `/ready` | Readiness check |
| GET | `/api/partners` | List partners (paginated) |
| GET | `/api/partners/:id` | Get one partner |
| POST | `/api/partners` | Create partner (publishes `partner.partner.created`) |
| PUT | `/api/partners/:id` | Update partner (publishes `partner.partner.updated`) |
| DELETE | `/api/partners/:id` | Delete partner + cascade (publishes `partner.partner.deleted`) |
| GET | `/api/partners/:id/analytics` | Partner analytics |
| GET | `/api/partners/:id/relationships` | All relationships |
| POST | `/api/partners/:id/relationships` | Add relationship (publishes `partner.relationship.created`) |

## Platform Integration (Phase 4)

| Endpoint | Bridge | MemoryOS | Policy | Event |
|----------|:------:|:--------:|:------:|:------|
| POST `/api/partners` | ✓ | ✓ | ✓ | `partner.partner.created` |
| PUT `/api/partners/:id` | — | — | — | `partner.partner.updated` |
| DELETE `/api/partners/:id` | — | — | — | `partner.partner.deleted` |
| POST `/api/partners/:id/relationships` | — | — | — | `partner.relationship.created` |

## Quick Start

```bash
cd /Users/rejaulkarim/Documents/RTMN/companies/HOJAI-AI
./start-twins.sh

# Standalone
cd platform/twins/partner-twin
PORT=4892 \
  JWT_SECRET="dev_jwt_secret_change_in_production_minimum_64_characters_required_for_security" \
  JWT_ISSUER="rtmn-corpid" \
  SERVICE_NAME="partner-twin" \
  npm start
```

## Sample Request

```bash
TOKEN=$(python3 -c "
import json, base64, time
p = {'sub':'u1','email':'a@b.com','role':'superadmin','exp':int((time.time()+3600)*1000)}
print(base64.b64encode(json.dumps(p).encode()).decode())
")

curl -X POST http://localhost:4892/api/partners \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name":"Acme Logistics",
    "type":"supplier",
    "tier":"gold",
    "contact":{"name":"John Smith","email":"john@acme.com"}
  }'
```

Response:

```json
{
  "success": true,
  "twin": {
    "id": "partner-abc123",
    "name": "Acme Logistics",
    "type": "supplier",
    "status": "active"
  }
}
```

---

*Last Updated: June 21, 2026 (Phase 4 cross-service wiring)*