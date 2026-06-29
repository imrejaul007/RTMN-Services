# Habit Engine

**Service Name:** Habit Engine
**Port:** 4731
**Package:** `@hojai/habit-engine`
**Location:** `companies/HOJAI-AI/platform/behavior/habit-engine/`

A behavioral analytics service that tracks habits, detects patterns in user behavior, and analyzes consistency over time. Part of the BehaviorOS suite within the HOJAI AI platform.

## Overview

The Habit Engine provides:

- **Habit Tracking** - Create, log, and manage habits for any entity (user, agent, organization)
- **Pattern Detection** - Automatically detect time-of-day and day-of-week patterns
- **Consistency Scoring** - Calculate streak and completion rates for habits
- **Impact Analysis** - Evaluate the correlation between habits and outcomes

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      Habit Engine (4731)                     │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐│
│  │  Habit CRUD │  │ Habit Logs  │  │  Pattern Detection  ││
│  │  /habits/*  │  │  /log/*     │  │  /habits/:id/       ││
│  │             │  │             │  │  patterns           ││
│  └─────────────┘  └─────────────┘  └─────────────────────┘│
│                                                              │
│  ┌─────────────────────────────────────────────────────────┐│
│  │              Consistency Engine                           ││
│  │  • Streak Calculation                                   ││
│  │  • Completion Rate                                      ││
│  │  • Trend Analysis                                       ││
│  └─────────────────────────────────────────────────────────┘│
│                                                              │
│  ┌─────────────────────────────────────────────────────────┐│
│  │              Impact Analyzer                             ││
│  │  • Correlation Detection                                 ││
│  │  • Outcome Analysis                                      ││
│  │  • Trend Evaluation                                      ││
│  └─────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────┘
```

## API Endpoints

### Health Check

```bash
GET /health
```

**Response:**
```json
{
  "status": "ok",
  "service": "habit-engine",
  "port": 4731,
  "habits": 15,
  "entities": 8
}
```

### Create Habit

```bash
POST /habits
Content-Type: application/json

{
  "entityId": "user-123",
  "name": "Morning Exercise",
  "frequency": "daily",
  "target": 1,
  "impact": "positive",
  "triggers": ["alarm", "morning"],
  "tags": ["health", "fitness"]
}
```

**Response:**
```json
{
  "success": true,
  "habit": {
    "id": "habit-1719561234567",
    "entityId": "user-123",
    "name": "Morning Exercise",
    "frequency": "daily",
    "target": 1,
    "impact": "positive",
    "triggers": ["alarm", "morning"],
    "tags": ["health", "fitness"],
    "createdAt": "2024-06-28T08:00:00.000Z",
    "status": "active"
  }
}
```

### List Habits

```bash
GET /habits?entityId=user-123&status=active&tags=health,fitness
```

**Response:**
```json
{
  "habits": [
    {
      "id": "habit-1719561234567",
      "entityId": "user-123",
      "name": "Morning Exercise",
      "frequency": "daily",
      "status": "active",
      "tags": ["health", "fitness"]
    }
  ],
  "count": 1
}
```

### Get Habit Details

```bash
GET /habits/:id
```

**Response:**
```json
{
  "habit": {
    "id": "habit-1719561234567",
    "entityId": "user-123",
    "name": "Morning Exercise",
    "frequency": "daily",
    "status": "active"
  },
  "consistency": {
    "score": 0.85,
    "streak": 12,
    "completed": 25,
    "expected": 30
  },
  "patterns": {
    "patterns": [
      {
        "type": "time_of_day",
        "value": "morning",
        "confidence": 0.92
      },
      {
        "type": "day_of_week",
        "value": "Mon",
        "confidence": 0.35
      }
    ],
    "routine": "detected"
  }
}
```

### Log Habit Action

```bash
POST /habits/:id/log
Content-Type: application/json

{
  "action": "completed",
  "metadata": {
    "duration": 30,
    "intensity": "moderate",
    "notes": "Great workout today"
  }
}
```

**Response:**
```json
{
  "success": true,
  "log": {
    "id": "log-1719561234567-abc123",
    "habitId": "habit-1719561234567",
    "action": "completed",
    "metadata": {
      "duration": 30,
      "intensity": "moderate",
      "notes": "Great workout today"
    },
    "timestamp": "2024-06-28T07:30:00.000Z"
  },
  "consistency": {
    "score": 0.87,
    "streak": 13,
    "completed": 26,
    "expected": 30
  }
}
```

### Evaluate Habit Performance

```bash
POST /habits/:id/evaluate
Content-Type: application/json

{
  "days": 30
}
```

**Response:**
```json
{
  "habit": {
    "id": "habit-1719561234567",
    "name": "Morning Exercise",
    "impact": "positive"
  },
  "consistency": {
    "score": 0.85,
    "streak": 12,
    "completed": 25,
    "expected": 30
  },
  "patterns": {
    "patterns": [
      {
        "type": "time_of_day",
        "value": "morning",
        "confidence": 0.92
      }
    ],
    "routine": "detected"
  },
  "impact": {
    "type": "positive",
    "correlation": 0.75,
    "trend": "stable",
    "description": "Habit correlates with positive outcomes"
  },
  "totalActions": 25,
  "evaluationPeriod": "30 days"
}
```

### Get Habit Patterns

```bash
GET /habits/:id/patterns
```

**Response:**
```json
{
  "habitId": "habit-1719561234567",
  "patterns": [
    {
      "type": "time_of_day",
      "value": "morning",
      "confidence": 0.92
    },
    {
      "type": "day_of_week",
      "value": "Mon",
      "confidence": 0.35
    }
  ],
  "routine": "detected"
}
```

### Get Consistency Score

```bash
GET /habits/:id/consistency?days=60
```

**Response:**
```json
{
  "habitId": "habit-1719561234567",
  "score": 0.78,
  "streak": 8,
  "completed": 47,
  "expected": 60
}
```

### Delete Habit

```bash
DELETE /habits/:id
```

**Response:**
```json
{
  "success": true
}
```

## Installation

```bash
# Install dependencies
npm install

# Start the service
npm start

# Development mode with hot reload
npm run dev

# Run tests
npm test
```

## Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | 4731 | Service port |

```bash
PORT=4731 npm start
```

## Data Model

### Habit

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Unique habit identifier |
| `entityId` | string | Owner of the habit (user, agent, org) |
| `name` | string | Habit name |
| `frequency` | string | Frequency (daily, weekly, etc.) |
| `target` | number | Target completions per period |
| `impact` | string | Impact type: positive, negative, neutral |
| `triggers` | array | Triggers that initiate the habit |
| `tags` | array | Categorization tags |
| `createdAt` | string | ISO timestamp |
| `status` | string | Status: active, paused, deleted |

### HabitLog

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Unique log identifier |
| `habitId` | string | Associated habit |
| `action` | string | Action performed |
| `metadata` | object | Additional context |
| `timestamp` | string | ISO timestamp |

### Consistency

| Field | Type | Description |
|-------|------|-------------|
| `score` | number | 0-1 completion rate |
| `streak` | number | Current consecutive days |
| `completed` | number | Total completions |
| `expected` | number | Expected completions |

### Pattern

| Field | Type | Description |
|-------|------|-------------|
| `type` | string | Pattern type (time_of_day, day_of_week) |
| `value` | string | Detected value |
| `confidence` | number | Detection confidence 0-1 |

## Integration Points

### MemoryOS (4703)
- Stores habit history and patterns for long-term analysis
- Provides cross-session persistence

### TwinOS (4705)
- Links habits to Customer/Employee twins
- Syncs habit data with digital twin profiles

### BehaviorOS Services
- **habit-engine** (4731) - This service
- **pattern-recognition** (4732) - Advanced pattern analysis
- **behavior-scoring** (4733) - Behavioral scoring algorithms

### Analytics Pipeline
- Feeds data to Revenue Intelligence OS (5400)
- Integrates with CXO OS (5100) for executive dashboards

## Testing

```bash
# Run all tests
npm test

# Run tests in watch mode
npm test -- --watch

# Run with coverage
npm test -- --coverage
```

## Example Use Cases

### Personal Health Tracking
```javascript
// Create a habit
await fetch('http://localhost:4731/habits', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    entityId: 'user-456',
    name: 'Take Vitamins',
    frequency: 'daily',
    impact: 'positive',
    tags: ['health', 'supplements']
  })
});

// Log completion
await fetch('http://localhost:4731/habits/habit-xxx/log', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    action: 'completed',
    metadata: { time: '8:00 AM' }
  })
});
```

### Agent Workflow Automation
```javascript
// Create a habit for an AI agent
await fetch('http://localhost:4731/habits', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    entityId: 'agent-sales-bot',
    name: 'Send Follow-up Emails',
    frequency: 'daily',
    impact: 'positive',
    tags: ['sales', 'automation']
  })
});
```

## License

Internal HOJAI AI service - All rights reserved
