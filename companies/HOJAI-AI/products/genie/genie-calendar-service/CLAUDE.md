# Genie Calendar Service

**Version:** 1.0.0  
**Port:** 4709  
**Status:** ✅ Production Ready

---
---

## 🔐 Auth (Phase 7)

This service now requires a **Bearer JWT** (CorpID-issued) on every request except `/health`, `/`, and `/ready`. Auth is enforced via `app.use(requireAuth)` from `@rtmn/shared/auth`.

**Get a token:**

```bash
# Dev shortcut (base64 JSON token — matches what requireAuth verifies):
TOKEN=$(curl -s -X POST http://localhost:4702/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"you@example.com","password":"dev"}' | jq -r .token)
```

**Call this service:**

```bash
curl http://localhost:PORT/health                      # public, no token
curl http://localhost:PORT/your-endpoint \
  -H "Authorization: Bearer $TOKEN"                   # protected
```

**Disable in dev/test:** Set `SERVICE_REQUIRE_AUTH=false` env var.

See [shared/MIGRATION-GUIDE.md](../../shared/MIGRATION-GUIDE.md) for the full `@rtmn/shared/auth` pattern and the canonical thin-shim approach.

## Overview

Personal calendar for Genie AI - integrates with MemoryOS and TwinOS for smart scheduling.

## Features

- Event CRUD with conflict detection
- Availability finder with multi-user scheduling
- Natural language scheduling suggestions
- Day/Week views with statistics
- Recurring events support
- Genie AI context integration

## Event Types

| Type | Description |
|------|-------------|
| meeting | Scheduled meetings |
| reminder | Quick reminders |
| task | Task with due date |
| blocked | Time blocks |
| focus | Focus/work blocks |
| break | Break time |

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Health check |
| GET | `/api/events` | List events |
| GET | `/api/events/today` | Today's events |
| GET | `/api/events/upcoming` | Upcoming events |
| POST | `/api/events` | Create event |
| PUT | `/api/events/:id` | Update event |
| DELETE | `/api/events/:id` | Delete event |
| GET | `/api/availability` | Find available slots |
| POST | `/api/availability/find` | Find meeting time |
| POST | `/api/conflicts` | Check conflicts |
| GET | `/api/day/:date` | Day summary |
| GET | `/api/week` | Week summary |
| GET | `/api/context` | Genie AI context |

## Quick Start

```bash
cd products/genie/genie-calendar-service
npm install
npm start  # Port 4709
```

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| PORT | 4709 | Service port |
| INTERNAL_TOKEN | dev-internal-token | API auth |
