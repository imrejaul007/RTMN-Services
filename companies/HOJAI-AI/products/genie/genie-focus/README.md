# FocusOS

**Version:** 1.0.0
**Port:** 4753
**Status:** ✅ COMPLETE (Week 19)

## Overview

Deep work intelligence — when are you most productive?

## API Endpoints

```
GET  /api/focus/:userId              # Dashboard
POST /api/focus/start                # Start session
POST /api/focus/:sessionId/end       # End session
GET  /api/focus/:userId/optimal      # Optimal times
GET  /api/focus/:userId/insights     # Insights
```

## Quick Start

```bash
# Start focus session
curl -X POST http://localhost:4753/api/focus/start \
  -H "Content-Type: application/json" \
  -d '{"userId": "user_123", "category": "writing"}'

# End session
curl -X POST http://localhost:4753/api/focus/focus_abc123/end \
  -H "Content-Type: application/json" \
  -d '{"quality": "excellent", "interruptions": 0}'

# Get optimal times
curl http://localhost:4753/api/focus/user_123/optimal

# Get insights
curl http://localhost:4753/api/focus/user_123/insights
```

## Features

| Feature | What |
|---------|------|
| **Session Tracking** | Start/end, duration, quality |
| **Optimal Times** | When you're most productive |
| **Insights** | Best day, patterns, distractions |
| **Quality Scoring** | excellent → poor |

## Files

```
genie-focus/
├── src/
│   ├── index.ts                        # Express server, port 4753
│   ├── types/
│   │   └── focus.ts                    # Focus types
│   └── services/
│       ├── deepWorkTracker.ts          # Session tracking
│       └── scheduleOptimizer.ts        # Optimal time finder
├── package.json
├── tsconfig.json
└── vitest.config.ts
```

## Status: ✅ COMPLETE