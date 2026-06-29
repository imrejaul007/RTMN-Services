# Habit Engine - Developer Guide

**Service:** Habit Engine
**Port:** 4731
**Package:** `@hojai/habit-engine`
**Status:** Production Ready

## Service Overview

The Habit Engine tracks behavioral habits, detects patterns, and analyzes consistency over time. It provides the behavioral analytics foundation for the BehaviorOS suite.

## Key Files

| File | Purpose |
|------|---------|
| `src/index.js` | Main service entry point - Express app with all routes and business logic |
| `package.json` | Dependencies and npm scripts |
| `vitest.config.js` | Test configuration |
| `__tests__/unit/habit-engine.test.js` | Unit tests |

## Architecture

### Data Flow

```
Client Request
     │
     ▼
┌─────────────────┐
│ Express Router  │
│ POST /habits    │
│ GET  /habits    │
│ POST /habits/:id/log
└────────┬────────┘
         │
         ▼
┌─────────────────────────────────────────┐
│         Business Logic Layer            │
│                                         │
│  trackHabit()     → Add to habitLogs    │
│  calculateConsistency() → Streak/score  │
│  detectPatterns() → Time/day analysis   │
│  analyzeImpact() → Correlation calc    │
└─────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────┐
│           In-Memory Storage             │
│                                         │
│  Map<habitId, Habit>                    │
│  Map<entityId, HabitLog[]>              │
│  Map<habitId, PatternData>              │
└─────────────────────────────────────────┘
```

### Core Functions

| Function | Lines | Purpose |
|----------|-------|---------|
| `trackHabit(entityId, habitId, action, metadata)` | 15 | Creates a log entry for a habit action |
| `calculateConsistency(entityId, habitId, days)` | 35 | Computes streak and completion rate |
| `detectPatterns(entityId, habitId)` | 57 | Analyzes time-of-day and day-of-week patterns |
| `analyzeImpact(entityId, habitId, habitImpact)` | 15 | Calculates habit-outcome correlation |

## API Routes

### Habit CRUD

| Method | Endpoint | Handler | Description |
|--------|----------|---------|-------------|
| `POST` | `/habits` | Lines 134-157 | Create a new habit |
| `GET` | `/habits` | Lines 160-177 | List habits with filters |
| `GET` | `/habits/:id` | Lines 180-196 | Get habit details + consistency + patterns |
| `DELETE` | `/habits/:id` | Lines 296-308 | Soft delete habit (sets status to 'deleted') |

### Habit Logging & Analysis

| Method | Endpoint | Handler | Description |
|--------|----------|---------|-------------|
| `POST` | `/habits/:id/log` | Lines 199-212 | Log a habit action |
| `POST` | `/habits/:id/evaluate` | Lines 215-240 | Full evaluation report |
| `GET` | `/habits/:id/patterns` | Lines 260-275 | Get detected patterns |
| `GET` | `/habits/:id/consistency` | Lines 278-293 | Get consistency metrics |

### System

| Method | Endpoint | Handler | Description |
|--------|----------|---------|-------------|
| `GET` | `/health` | Lines 311-319 | Health check with stats |

## Common Tasks

### Adding a New Habit Endpoint

1. Add the route handler in `src/index.js`
2. Implement business logic using existing functions (`trackHabit`, `calculateConsistency`, etc.)
3. Add tests in `__tests__/unit/habit-engine.test.js`

### Extending Pattern Detection

The `detectPatterns()` function (lines 74-131) currently detects:
- **time_of_day**: morning, afternoon, evening, night
- **day_of_week**: Sun-Sat

To add new patterns:
1. Add pattern type to the detection logic
2. Update the return object structure
3. Update TypeScript interfaces if used

### Adding Persistence

Current implementation uses in-memory Maps. To add MongoDB persistence:

```javascript
// Replace in-memory Maps
const habits = new Map();

// With MongoDB
import mongoose from 'mongoose';

const habitSchema = new mongoose.Schema({
  entityId: String,
  name: String,
  frequency: String,
  // ... other fields
});

const Habit = mongoose.model('Habit', habitSchema);
```

## Integration Points

### Internal Services

| Service | Port | Integration |
|---------|------|-------------|
| MemoryOS | 4703 | Long-term habit storage |
| TwinOS | 4705 | Habit-twin linking |

### External Consumers

- **Genie AI** - Personal habit coaching
- **AgentOS** - Workflow habit tracking
- **CXO OS** - Team behavior dashboards

## Development

```bash
# Install dependencies
npm install

# Start development
npm run dev

# Run tests
npm test

# Run tests with coverage
npm test -- --coverage
```

## Test Structure

Tests follow this pattern:

```javascript
describe('Habit Engine', () => {
  describe('POST /habits', () => {
    it('creates a new habit');
    it('returns 400 for missing required fields');
  });

  describe('POST /habits/:id/log', () => {
    it('logs a habit action');
    it('returns 404 for non-existent habit');
  });

  describe('calculateConsistency()', () => {
    it('returns zero for habits with no logs');
    it('calculates streak correctly');
  });
});
```

## Data Structures

### Habit Object
```javascript
{
  id: string,
  entityId: string,
  name: string,
  frequency: string,      // daily, weekly, monthly
  target: number,         // target completions per period
  impact: string,         // positive, negative, neutral
  triggers: string[],
  tags: string[],
  createdAt: ISO8601,
  status: string          // active, paused, deleted
}
```

### Consistency Object
```javascript
{
  score: number,          // 0-1 completion rate
  streak: number,         // consecutive days
  completed: number,      // total actions logged
  expected: number        // expected actions
}
```

### Pattern Object
```javascript
{
  type: string,           // time_of_day, day_of_week
  value: string,          // detected value
  confidence: number      // 0-1 confidence
}
```

## Configuration

| Env Var | Default | Description |
|---------|---------|-------------|
| `PORT` | 4731 | Service port |

## Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| express | ^4.18.2 | Web framework |
| cors | ^2.8.5 | CORS middleware |
| helmet | ^7.1.0 | Security headers |

## Dev Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| vitest | ^1.2.0 | Testing framework |

## Port Registry

This service occupies port **4731**. If you need to add routes through RTMN Hub, see `services/unified-os-hub/src/routes/index.js`.
