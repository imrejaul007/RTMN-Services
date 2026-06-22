# lead-twin

**Port:** 4894
**Service name:** `lead-twin`
**Status:** ✅ Production-ready | **Phase 4 wired** (June 21, 2026)

---

## Overview

Lead Twin is the canonical digital-twin service for **sales leads** in the
RTMN ecosystem. It captures leads from any source (web forms, ad clicks,
imported CSVs, manual entry), tracks lifecycle state (new → contacted →
qualified → converted → lost), and maintains a complete activity timeline
(emails sent, calls placed, meetings held, notes added).

The service uses `@rtmn/shared/lib/persistent-store` for file-backed JSON
storage that survives restarts. All write paths are wired to the shared
`platform-client` so lead lifecycle events propagate to MemoryOS
(episodic memories), twin-memory-bridge (partition bindings),
policy-os (audit log), and event-bus (real-time subscribers).

## Storage

| Store | Path | Purpose |
|-------|------|---------|
| `leads` | `data/leads.json` | Lead records (one per row) |
| `activities` | `data/activities.json` | Activity timeline events |

Each lead record has:

```js
{
  id: 'lead-abc123',
  name, email, company, phone, industry, type,
  score: 0-100,            // AI-computed lead score
  status: 'new'|'contacted'|'qualified'|'converted'|'lost',
  source, campaign, owner, value,
  createdAt, updatedAt, createdBy
}
```

## API

| Method | Path | Description |
|--------|------|-------------|
| GET | `/health` | Liveness check |
| GET | `/ready` | Readiness check |
| GET | `/leads` | List leads (paginated, filterable) |
| GET | `/leads/:id` | Get one lead |
| POST | `/leads` | Create lead (publishes `lead.lead.created`) |
| PATCH | `/leads/:id` | Update lead (publishes `lead.lead.updated`) |
| DELETE | `/leads/:id` | Soft-delete (publishes `lead.lead.deleted`) |
| GET | `/leads/stats/summary` | Counts by status |
| GET | `/leads/search` | Keyword search |
| GET | `/activities` | List activities (paginated) |
| GET | `/activities/lead/:leadId` | Activities for one lead |
| POST | `/activities` | Log activity (publishes `lead.activity.created`) |
| GET | `/activities/stats/summary` | Activity counts |

## Authentication

Uses `requireAuth` from `@rtmn/shared/auth`. Tokens must be issued by
CorpID (port 4702) with `JWT_ISSUER=rtmn-corpid`. Falls back to
`requireAuth({ allowInternalToken: true })` for service-to-service calls.

## Platform Integration (Phase 4)

Every write path emits the following non-blocking calls:

| Endpoint | Bridge binding | MemoryOS record | Policy audit | Event published |
|----------|:--------------:|:---------------:|:------------:|:----------------:|
| POST `/leads` | ✓ | ✓ | ✓ | `lead.lead.created` |
| PATCH `/leads/:id` | — | — | — | `lead.lead.updated` |
| DELETE `/leads/:id` | — | — | — | `lead.lead.deleted` |
| POST `/activities` | — | — | — | `lead.activity.created` |

See [`docs/PHASE-4-COMPLETE.md`](../../../../docs/PHASE-4-COMPLETE.md) for
the full integration architecture.

## Quick Start

```bash
# Via the unified start script
cd /Users/rejaulkarim/Documents/RTMN/companies/HOJAI-AI
./start-twins.sh    # starts lead-twin along with the other 14 twins

# Standalone
cd platform/twins/lead-twin
PORT=4894 \
  JWT_SECRET="dev_jwt_secret_change_in_production_minimum_64_characters_required_for_security" \
  JWT_ISSUER="rtmn-corpid" \
  SERVICE_NAME="lead-twin" \
  npm start
```

## Files

- `src/index.js` — Express app, security middleware, health endpoints
- `src/routes/leads.js` — Lead CRUD endpoints
- `src/routes/activities.js` — Activity timeline endpoints
- `src/services/store.js` — PersistentStore initializers

## Sample Request

```bash
TOKEN=$(python3 -c "
import json, base64, time
p = {'sub':'u1','email':'a@b.com','role':'superadmin','exp':int((time.time()+3600)*1000)}
print(base64.b64encode(json.dumps(p).encode()).decode())
")

curl -X POST http://localhost:4894/leads \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name":"Jane Doe",
    "email":"jane@example.com",
    "company":"Globex",
    "industry":"Technology",
    "type":"inbound",
    "source":"web_form",
    "value":50000
  }'
```

Response:

```json
{
  "success": true,
  "lead": {
    "id": "lead-abc123",
    "name": "Jane Doe",
    "status": "new",
    "score": 50,
    "createdAt": "2026-06-21T21:00:00.000Z"
  }
}
```

---

*Last Updated: June 21, 2026 (Phase 4 cross-service wiring)*