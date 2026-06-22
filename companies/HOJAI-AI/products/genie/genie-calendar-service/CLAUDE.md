# Genie Calendar Service

**Version:** 1.0.0  
**Port:** 4709  
**Status:** ✅ Production Ready

---

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
cd companies/HOJAI-AI/services/genie-calendar-service
npm install
npm start  # Port 4709
```

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| PORT | 4709 | Service port |
| INTERNAL_TOKEN | dev-internal-token | API auth |
