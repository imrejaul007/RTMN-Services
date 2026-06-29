# Human Growth Engine

**Port: 4895**

Tracks personal growth: skills, habits, goals, and values evolution.

## Features

- Growth metrics tracking (skills, habits, health, faith, career, relationships, finance, creativity, knowledge, leadership)
- Habit formation with streaks
- Goal management with milestones
- Skills development tracking
- Values and principles tracking
- Growth insights and summaries

## API Endpoints

```
POST /api/growth/track      - Track a growth data point
GET  /api/growth/:userId   - Get all growth metrics
POST /api/goals            - Create a goal
POST /api/habits           - Create a habit
POST /api/habits/:id/complete - Complete a habit
POST /api/summary          - Generate growth summary
GET  /api/stats/:userId    - Get growth statistics
```

## Example

```bash
# Track a habit
curl -X POST http://localhost:4895/api/growth/track \
  -H "Content-Type: application/json" \
  -d '{"userId": "user-1", "category": "habits", "name": "meditation", "value": 7}'

# Create a goal
curl -X POST http://localhost:4895/api/goals \
  -H "Content-Type: application/json" \
  -d '{"userId": "user-1", "title": "Learn React", "category": "skills", "priority": "high"}'
```

## VoiceOS Integration

Used by Layer 11 of the 12-layer VoiceOS architecture for tracking user growth and development over time.
