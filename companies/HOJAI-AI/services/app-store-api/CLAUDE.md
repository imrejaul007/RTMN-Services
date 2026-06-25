# HOJAI App Store API

> **Port:** 4400
> **Version:** 1.0.0
> **Status:** ✅ Built (2026-06-25)

The HOJAI App Store backend — catalog for skills, agents, workflows, templates, and IndustryOS.

---

## Quick Start

```bash
cd services/app-store-api
npm install
npm start        # Port 4400
npm test         # Run tests
```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/v1/apps` | List all apps (filter: type, category, search) |
| `GET` | `/api/v1/apps/featured` | Get featured apps |
| `GET` | `/api/v1/apps/:id` | Get app details |
| `POST` | `/api/v1/apps` | Create new app |
| `PATCH` | `/api/v1/apps/:id` | Update app |
| `DELETE` | `/api/v1/apps/:id` | Delete app |
| `GET` | `/api/v1/apps/:id/reviews` | Get app reviews |
| `POST` | `/api/v1/apps/:id/reviews` | Create review |
| `POST` | `/api/v1/apps/:id/install` | Install app |
| `DELETE` | `/api/v1/apps/:id/install` | Uninstall app |
| `GET` | `/api/v1/categories` | List categories |
| `GET` | `/api/v1/categories/:id` | Get category with apps |
| `GET` | `/api/v1/stats` | Store statistics |
| `GET` | `/api/v1/search` | Search apps |

## App Types

- `skill` — AI capability
- `agent` — Autonomous AI worker
- `workflow` — Automated workflow
- `template` — Starter template
- `industry-os` — Vertical solution

## Usage Example

```bash
# List apps
curl http://localhost:4400/api/v1/apps

# Search
curl "http://localhost:4400/api/v1/search?q=sales"

# Install app
curl -X POST http://localhost:4400/api/v1/apps/skill-translation/install \
  -H 'Content-Type: application/json' \
  -d '{"userId": "user1", "projectId": "proj1"}'
```

## Related Services

- **AI Studio UI** (:3000) — Web UI using this API
- **HOJAI Cloud** (:4380) — Deployment target
