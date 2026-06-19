# Genie Briefing Service

**Version:** 1.0.0  
**Port:** 4712  
**Status:** ✅ BUILT - Daily Briefings

---

## Overview

Genie Briefing Service provides **morning, evening, and weekly briefings** that combine data from all Twins and services into actionable summaries.

```
┌─────────────────────────────────────────────────────────────┐
│                   BRIEFING SERVICE                           │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Morning (6 AM)      Evening (6 PM)      Weekly (Sunday)   │
│  ┌─────────────┐     ┌─────────────┐     ┌─────────────┐ │
│  │ Greeting    │     │ Day Summary │     │ Week Review │ │
│  │ Weather     │     │ Completed   │     │ Highlights  │ │
│  │ Calendar    │     │ Pending     │     │ Metrics    │ │
│  │ Tasks      │     │ Tomorrow    │     │ Next Week  │ │
│  │ Health     │     │ Health      │     │ Goals      │ │
│  │ Reminders  │     │ Sleep       │     │ Delays     │ │
│  │ Priorities │     │             │     │            │ │
│  └─────────────┘     └─────────────┘     └─────────────┘ │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## API Endpoints

### Briefings

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/briefing/morning` | Morning briefing |
| GET | `/api/briefing/evening` | Evening briefing |
| GET | `/api/briefing/weekly` | Weekly summary |
| GET | `/api/briefing/today` | Auto-select morning/evening |
| GET | `/api/briefing/:id` | Get saved briefing |
| GET | `/api/briefing/history` | Briefing history |

### Subscriptions

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/subscribe` | Subscribe to briefings |
| GET | `/api/subscriptions` | Get user's subscriptions |
| DELETE | `/api/subscribe/:id` | Unsubscribe |

---

## Example Usage

### Get Morning Briefing
```bash
curl "http://localhost:4712/api/briefing/morning?userId=karim"
```

**Response:**
```json
{
  "success": true,
  "briefing": {
    "id": "uuid-123",
    "type": "morning",
    "date": "2026-06-18",
    "greeting": "Good Morning! Here's your briefing for Wednesday, June 18.",
    "sections": [
      {
        "type": "weather",
        "title": "Weather",
        "icon": "☀️",
        "content": "Sunny, 28°C in Mumbai"
      },
      {
        "type": "calendar",
        "title": "Today's Schedule",
        "items": [
          { "time": "10:00 AM", "title": "Team Standup", "location": "Zoom" }
        ]
      },
      {
        "type": "tasks",
        "title": "Pending Tasks",
        "items": [
          { "task": "Review Q2 report", "priority": "high", "due": "Today" }
        ]
      }
    ]
  }
}
```

### Subscribe to Daily Briefings
```bash
curl -X POST http://localhost:4712/api/subscribe \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "karim",
    "type": "both",
    "time": "08:00",
    "channels": ["whatsapp", "telegram"]
  }'
```

---

## Morning Briefing Sections

| Section | Content |
|---------|---------|
| Weather | Current weather, temperature, conditions |
| Calendar | Today's meetings and events |
| Tasks | Pending tasks with priorities |
| Health | Steps, sleep, water intake |
| Reminders | Important reminders for the day |
| Priorities | AI-suggested priorities |

## Evening Briefing Sections

| Section | Content |
|---------|---------|
| Summary | Day stats (meetings, tasks, focus hours) |
| Completed | Tasks completed today |
| Pending | Tasks still pending |
| Tomorrow | Preview of tomorrow's schedule |
| Health | Today's health metrics |
| Sleep | Sleep target and bedtime reminder |

## Weekly Briefing Sections

| Section | Content |
|---------|---------|
| Overview | Week stats and highlights |
| Highlights | Notable achievements |
| Metrics | KPIs and trends |
| Delayed | Overdue items |
| Next Week | Upcoming priorities |

---

## Service Integrations

| Service | Port | Data Used |
|---------|------|-----------|
| Calendar | 4709 | Today's meetings |
| Memory Inbox | 4710 | Recent memories |
| Health Twin | 4717 | Health metrics |
| Financial Twin | 4715 | Financial summary |
| Personal Twin | 4708 | User preferences |

---

## Memorae Feature Mapped

| Memorae Feature | Genie Briefing |
|----------------|----------------|
| Daily Brief | ✅ `/api/briefing/today` |
| Morning Briefing | ✅ `/api/briefing/morning` |
| Evening Recap | ✅ `/api/briefing/evening` |
| Weekly Digest | ✅ `/api/briefing/weekly` |
| Auto Scheduling | ✅ `/api/subscribe` |

---

## Quick Start

```bash
cd companies/HOJAI-AI/services/genie-briefing-service
npm install
npm start

# Test
curl http://localhost:4712/health
curl "http://localhost:4712/api/briefing/morning?userId=test"
```

---

*Last Updated: June 18, 2026*
