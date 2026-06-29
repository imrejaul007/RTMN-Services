# Digital Legacy

**Version:** 1.0.0
**Port:** 4755
**Status:** ✅ COMPLETE (Week 21-23)

## Overview

A personal archive for future generations — memories, lessons, family history.

## API Endpoints

```
GET  /api/legacy/:userId             # Dashboard
POST /api/legacy/entry               # Add entry
GET  /api/legacy/:userId/entries     # Get entries
POST /api/legacy/chapter             # Generate chapter
POST /api/legacy/family              # Add family member
GET  /api/legacy/:userId/family      # Get family members
```

## Quick Start

```bash
# Add a memory
curl -X POST http://localhost:4755/api/legacy/entry \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "user_123",
    "type": "memory",
    "title": "First day at HOJAI",
    "content": "I remember the first day...",
    "visibility": "family"
  }'

# Generate life chapter
curl -X POST http://localhost:4755/api/legacy/chapter \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "user_123",
    "from": "2020-01-01",
    "to": "2025-12-31",
    "memories": ["Started HOJAI", "Moved to Bangalore", "Launched Genie"]
  }'
```

## Entry Types

| Type | Purpose |
|------|---------|
| **memory** | Specific memory |
| **lesson** | Life lesson learned |
| **story** | Narrative story |
| **family_history** | About a family member |
| **value** | A core value |
| **writing** | Creative writing |

## Privacy Levels

- **private** — Only you
- **family** — Family members only
- **public** — Open to all

## Files

```
genie-legacy/
├── src/
│   ├── index.ts                        # Express server, port 4755
│   ├── types/
│   │   └── legacy.ts                   # Legacy types
│   └── services/
│       ├── archiveBuilder.ts           # Build archive
│       ├── lifeStoryWriter.ts          # AI chapter generator
│       └── familyHistory.ts            # Family tracking
├── package.json
├── tsconfig.json
└── vitest.config.ts
```

## Status: ✅ COMPLETE — FINAL SERVICE (14/14)