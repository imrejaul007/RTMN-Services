# Twin Behavior Model - CLAUDE.md

## Service Overview

**Name:** Twin Behavior Model
**Port:** 4718
**Type:** Intelligence Layer
**Category:** TwinOS Behavior

## Purpose

Behavior learning and pattern detection for digital twins.

## Key Features

1. **Pattern Detection** - Identify behavioral patterns from events
2. **Preference Learning** - Learn and track preferences
3. **Anomaly Detection** - Detect unusual behavior
4. **Personality Modeling** - Build personality profiles
5. **Routine Identification** - Identify daily/weekly routines
6. **Communication Style** - Analyze communication preferences

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /health | Health check |
| POST | /api/behavior/observe | Record behavior event |
| GET | /api/behavior/profile/:twinId | Get behavior profile |
| POST | /api/behavior/patterns | Detect patterns |
| POST | /api/behavior/anomalies | Detect anomalies |
| POST | /api/behavior/preferences | Add preference |
| GET | /api/behavior/preferences/:twinId | Get preferences |
| POST | /api/behavior/learn | Learn from outcomes |

## Data Model

```typescript
interface TwinBehavior {
  twinId: string;
  patterns: Pattern[];
  preferences: Record<string, any>;
  personality?: PersonalityProfile;
  riskTolerance: number;
  strengths: string[];
  weaknesses: string[];
  routines: Routine[];
  anomalies: Anomaly[];
}
```

## Testing

```bash
npm test  # 40 tests
```

## Status

✅ Production Ready