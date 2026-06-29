# Dream Journal

**Version:** 1.0.0
**Port:** 4754
**Status:** ✅ COMPLETE (Week 20)

## Overview

Capture dreams, interpret symbols, detect recurring patterns.

## API Endpoints

```
POST /api/dreams/capture              # Capture dream
GET  /api/dreams/:userId              # History
GET  /api/dreams/patterns/:userId     # Pattern insights
```

## Quick Start

```bash
# Capture dream (voice → text)
curl -X POST http://localhost:4754/api/dreams/capture \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "user_123",
    "description": "I was flying over a city I didn't recognize, then I fell into water that felt warm...",
    "vividness": 8,
    "lucidity": false
  }'

# Get dream history
curl http://localhost:4754/api/dreams/user_123

# Get patterns
curl http://localhost:4754/api/dreams/patterns/user_123
```

## Features

| Feature | What |
|---------|------|
| **Capture** | Voice/text, vividness, lucidity |
| **Interpretation** | AI-generated symbolism analysis |
| **Patterns** | Recurring symbols, people, emotions |
| **History** | All dreams searchable |

## Files

```
genie-dreams/
├── src/
│   ├── index.ts                        # Express server, port 4754
│   ├── types/
│   │   └── dream.ts                    # Dream types
│   └── services/
│       ├── dreamCapture.ts             # Capture + interpret
│       └── patternDetector.ts          # Pattern analysis
├── package.json
├── tsconfig.json
└── vitest.config.ts
```

## Status: ✅ COMPLETE