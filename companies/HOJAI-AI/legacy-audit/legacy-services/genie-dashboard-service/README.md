# GENIE Dashboard Service

**Tagline:** "Your Personal Intelligence, Simplified"

## Overview

The Genie Dashboard is a unified interface that aggregates all Genie services into a simple, Vellum-like experience. One view, all your intelligence.

**Like Vellum:** "An AI that knows you and works for you."

## Quick Start

```bash
npm install
npm run dev
```

## Docker

```bash
docker build -t genie-dashboard .
docker run -p 4701:4701 genie-dashboard
```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/dashboard` | Get complete dashboard |
| GET | `/api/search?q=query` | Unified search |
| GET | `/api/quick-actions` | Get quick actions |
| POST | `/api/quick-actions/execute` | Execute action |
| GET | `/api/sections/memory` | Memory section |
| GET | `/api/sections/calendar` | Calendar section |
| GET | `/api/sections/email` | Email section |
| GET | `/api/sections/tasks` | Tasks section |
| GET | `/api/sections/briefing` | Briefing section |
| GET | `/api/sections/relationships` | Relationships |
| GET | `/api/summary` | Summary numbers |

## Example

```bash
curl http://localhost:4701/api/dashboard \
  -H "X-Tenant-Id: user-123" \
  -H "X-User-Id: user-123"
```

## Features

- **Unified View** - All your intelligence in one place
- **Quick Actions** - One-tap access to common actions
- **AI Insights** - Personalized suggestions
- **Unified Search** - Search across all services

---

**Status:** ✅ Built | **Version:** 1.0.0 | **Port:** 4701
