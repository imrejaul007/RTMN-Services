# Genie Briefing Service - Feature Specification

**Version:** 1.0.0  
**Port:** 4706  
**Status:** ✅ BUILT | **June 18, 2026**

---

## 🎯 Core Feature Overview

Genie Briefing Service generates personalized daily briefings combining data from multiple services into actionable summaries.

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                        GENIE BRIEFING SERVICE                                   │
│                              (Port 4706)                                       │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                 │
│  ┌─────────────────────────────────────────────────────────────────────┐       │
│  │                      DATA SOURCES                                     │       │
│  │                                                                       │       │
│  │   MemoryOS (4703) ────→ Tasks & Insights                            │       │
│  │   Calendar (4709) ────→ Events & Schedule                           │       │
│  │   CorpID (4702)  ────→ User Profile                                 │       │
│  │   Weather API   ────→ Weather Data                                   │       │
│  │                                                                       │       │
│  └─────────────────────────────────────────────────────────────────────┘       │
│                                    ↓                                           │
│  ┌─────────────────────────────────────────────────────────────────────┐       │
│  │                      BRIEFING GENERATOR                               │       │
│  │                                                                       │       │
│  │   Time Detection → Data Aggregation → Insight Generation → Formatting │       │
│  │                                                                       │       │
│  └─────────────────────────────────────────────────────────────────────┘       │
│                                    ↓                                           │
│  ┌─────────────────────────────────────────────────────────────────────┐       │
│  │                         OUTPUT                                         │       │
│  │                                                                       │       │
│  │   Greeting + Message + Sections + Summary + Quick Actions           │       │
│  │                                                                       │       │
│  └─────────────────────────────────────────────────────────────────────┘       │
│                                                                                 │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

## 🔧 Core Features

### 1. Briefing Types

| Type | Time | Content |
|------|------|---------|
| **Morning** | 6-12 | Weather, tasks, calendar, insights, quick actions |
| **Afternoon** | 12-17 | Task updates, upcoming events |
| **Evening** | 17-24 | Day summary, tomorrow preview, reflection |
| **Weekly** | Weekly | Week in review, productivity trends |

### 2. Briefing Sections

| Section | Source | Content |
|---------|--------|---------|
| Weather | External API / Memory | Condition, temperature, forecast |
| Tasks | MemoryOS | Items, priorities, due dates |
| Calendar | Calendar Service | Events, times, durations |
| Insights | MemoryOS | AI-generated tips and trends |
| Quick Actions | Generated | Contextual action buttons |

### 3. Caching

| Feature | Value |
|---------|-------|
| Cache TTL | 5 minutes |
| Cache Key | `{userId}:{type}` |
| Refresh Parameter | `?refresh=true` |

---

## 🌐 API Endpoints

### Health
```
GET /health
  Response: { status, service, port, version, timestamp }

GET /ready
  Response: { ready, service, briefingTypes }
```

### Briefing

```
GET /api/briefing/:userId?type=morning&refresh=false
  Response: {
    success: true,
    requestId: string,
    briefing: {
      type: string,
      greeting: string,
      date: string,
      time: string,
      message: string,
      sections: {
        weather: object,
        tasks: object,
        calendar: object,
        insights: object,
        quickActions: array
      },
      summary: {
        taskCount: number,
        meetingCount: number,
        weatherCondition: string
      }
    },
    timestamp: string
  }

GET /api/briefing/:userId/morning
GET /api/briefing/:userId/evening
GET /api/briefing/:userId/weekly
```

### Preferences

```
GET /api/briefing/:userId/preferences
  Response: {
    success: true,
    preferences: {
      defaultType: string,
      includeWeather: boolean,
      includeTasks: boolean,
      includeCalendar: boolean,
      includeInsights: boolean,
      notifyBefore: number,
      channels: string[]
    }
  }

PUT /api/briefing/:userId/preferences
  Body: { preferences: object }
```

### History

```
GET /api/briefing/:userId/history?limit=7
  Response: {
    success: true,
    history: [
      { date: string, type: string, viewed: boolean }
    ]
  }
```

---

## 🔌 Connected Services

| Service | Port | Endpoints Used |
|---------|------|---------------|
| MemoryOS | 4703 | /api/memory, /api/tasks, /api/insights |
| Genie Calendar | 4709 | /api/events |
| CorpID | 4702 | /api/profile |
| TwinOS | 4705 | User context |

---

## 📊 Response Structure

### Morning Briefing Response
```json
{
  "success": true,
  "briefing": {
    "type": "morning",
    "greeting": "Good morning!",
    "date": "2026-06-18",
    "time": "08:30:00",
    "message": "Good morning! Ready to start your day?",
    "sections": {
      "weather": {
        "condition": "sunny",
        "temp": 28,
        "unit": "°C",
        "location": "Mumbai",
        "forecast": "Expect pleasant weather"
      },
      "tasks": {
        "items": [
          { "id": 1, "title": "Review report", "completed": false, "priority": "high", "due": "Today" }
        ],
        "count": 4
      },
      "calendar": {
        "events": [
          { "time": "10:00 AM", "title": "Standup", "duration": "30 min", "type": "meeting" }
        ],
        "count": 3
      },
      "insights": {
        "insights": ["Most productive in mornings"],
        "tips": ["Consider breaks between meetings"]
      },
      "quickActions": [
        { "action": "view_tasks", "label": "View Tasks", "icon": "📋" }
      ]
    },
    "summary": {
      "taskCount": 4,
      "meetingCount": 3,
      "weatherCondition": "sunny"
    }
  }
}
```

---

## 🛡️ Security Features

| Feature | Implementation |
|---------|----------------|
| Rate Limiting | 100 requests/minute |
| Request IDs | UUID tracking |
| Helmet.js | Security headers |
| CORS | Cross-origin support |
| Input Validation | All inputs validated |

---

## 🚀 Deployment

```bash
# Install dependencies
cd services/genie-briefing-service
npm install

# Start server
npm start

# Health check
curl http://localhost:4706/health
```

---

## 📝 Summary

| Aspect | Details |
|--------|---------|
| **Port** | 4706 |
| **Type** | Briefing Generator |
| **Briefing Types** | 4 (morning, afternoon, evening, weekly) |
| **Sections** | 5 (weather, tasks, calendar, insights, actions) |
| **Cache TTL** | 5 minutes |
| **Rate Limit** | 100 req/min |

---

*Last Updated: June 18, 2026*
