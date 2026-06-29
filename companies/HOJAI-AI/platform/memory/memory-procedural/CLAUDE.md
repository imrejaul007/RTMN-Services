# Memory Procedural - CLAUDE.md

## Service Overview

**Name:** Memory Procedural
**Port:** 4725
**Type:** Memory Layer
**Category:** TwinOS Procedural Memory

## Purpose

Skills, workflows, habits, and routines storage.

## Key Features

1. **Skill Tracking** - Skills with mastery levels (0-100)
2. **Workflow Definitions** - Multi-step workflows
3. **Habit Tracking** - Daily/weekly habits with streaks
4. **Routine Management** - Scheduled routines
5. **7-Type Memory** - Part of comprehensive memory model

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /health | Health check |
| POST | /api/procedural/:twinId/skills | Add skill |
| GET | /api/procedural/:twinId/skills | List skills |
| POST | /api/procedural/:twinId/workflows | Create workflow |
| GET | /api/procedural/:twinId/workflows | List workflows |
| POST | /api/procedural/:twinId/habits | Create habit |
| POST | /api/procedural/:twinId/habits/:id/perform | Track habit |
| GET | /api/procedural/:twinId/habits | List habits |
| POST | /api/procedural/:twinId/routines | Create routine |
| GET | /api/procedural/:twinId/summary | Get summary |

## Testing

```bash
npm test  # 8 tests
```

## Status

✅ Production Ready