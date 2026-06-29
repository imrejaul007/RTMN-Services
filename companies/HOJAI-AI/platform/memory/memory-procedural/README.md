# Memory Procedural

**Port:** 4725

Skills, workflows, habits, and routines storage.

## Features

- Skill tracking with mastery levels
- Workflow definitions
- Habit tracking with streaks
- Routine management
- Part of 7-type memory model

## API

```bash
# Add skill
curl -X POST localhost:4725/api/procedural/emp-123/skills \
  -d '{"name": "TypeScript", "level": 80}'

# Get skills
curl localhost:4725/api/procedural/emp-123/skills

# Create workflow
curl -X POST localhost:4725/api/procedural/emp-123/workflows \
  -d '{"name": "Code Review", "steps": ["review", "approve"]}'

# Track habit
curl -X POST localhost:4725/api/procedural/emp-123/habits \
  -d '{"name": "Morning Exercise", "frequency": "daily"}'

# Get summary
curl localhost:4725/api/procedural/emp-123/summary
```

## Tests

```bash
npm test  # 8 tests
```

## Status

✅ Production Ready - 8 tests passing