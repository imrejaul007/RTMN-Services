# Cosmic OS - Complete Documentation

**Version:** 1.0.0 | **Port:** 4160 | **Type:** Wellness AI API

---

## Overview

> **"AI Council of Agents, cosmic interpretation, spiritual abstraction"**

Cosmic OS provides personalized wellness guidance through an AI Council of 7 specialized agents. It transforms mood and energy data into spiritual insights, relationship guidance, and life strategies.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           COSMIC OS                                      │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │                      AI COUNCIL OF AGENTS                          │  │
│  │  Mystic │ Healer │ Strategist │ Oracle │ Connector │ Wealth │ Explorer │
│  └──────────────────────────────────────────────────────────────────┘  │
│                                    │                                     │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │                      INPUTS                                         │  │
│  │  Mood Check-in │ Energy Level │ Life Context │ Relationships      │  │
│  └──────────────────────────────────────────────────────────────────┘  │
│                                    │                                     │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │                      CONNECTED SERVICES                             │  │
│  │  Emotional │ Life Pattern │ Human Context │ Signal Aggregator      │  │
│  └──────────────────────────────────────────────────────────────────┘  │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## AI Council Agents

| Agent | Specialty | Purpose |
|-------|-----------|---------|
| **The Mystic** 🔮 | Spiritual | Cosmic alignment & intuition |
| **The Healer** 💚 | Emotional | Inner harmony & wellness |
| **The Strategist** 🎯 | Career | Life planning & focus |
| **The Oracle** 👁️ | Pattern | Timing & recognition |
| **The Connector** 💫 | Relationship | Social harmony |
| **The Wealth Guide** 💎 | Financial | Abundance mindset |
| **The Explorer** 🧭 | Growth | Adventure & exploration |

---

## API Endpoints

### Mood Check-In
```
POST /api/mood/checkin
{
  "userId": "user123",
  "mood": "positive",
  "energy": 75,
  "context": {
    "socialInteractions": 5,
    "financialStress": 30,
    "workStress": 40
  }
}
```

### Daily Reading
```
GET /api/daily/:userId?mood=positive&energy=75
```

### Council Response
```
POST /api/council
{
  "userId": "user123",
  "mood": "positive",
  "energy": 75,
  "agents": ["mystic", "healer", "strategist"]
}
```

### Domain Guidance
```
GET /api/guidance/emotional?mood=calm&energy=60
```

### Context
```
GET /api/context/:userId
```

### Available Data
```
GET /api/moods     → All 12 moods
GET /api/agents    → All 7 council agents
GET /api/domains   → All 7 life domains
```

---

## Mood Types

| Mood | Cosmic Tone | Social Energy | Focus Score |
|------|-------------|---------------|-------------|
| very_positive | Radiant and expansive | 90 | 85 |
| positive | Warm and hopeful | 80 | 75 |
| neutral | Steady and centered | 60 | 70 |
| negative | Contemplative and reflective | 40 | 60 |
| very_negative | Quiet and introspective | 30 | 50 |
| anxious | Restless and searching | 50 | 30 |
| calm | Serene and content | 60 | 85 |
| energetic | Dynamic and vibrant | 80 | 70 |
| tired | Quiet and restorative | 30 | 50 |
| stressed | Intense and pressured | 40 | 40 |
| peaceful | Tranquil and harmonious | 50 | 90 |

---

## Life Domains

| Domain | Guidance Focus |
|--------|----------------|
| Emotional | Inner harmony, healing, self-compassion |
| Relationship | Connection, communication, love |
| Career | Strategy, focus, achievement |
| Financial | Abundance, decisions, planning |
| Health | Body wisdom, movement, rest |
| Spiritual | Growth, meaning, purpose |
| Social | Community, boundaries, belonging |

---

## Setup

```bash
cd cosmic-api

npm install

cp .env.example .env

npm run build
npm start
```

### Environment Variables

```env
PORT=4160
NODE_ENV=development
INTERNAL_SERVICE_TOKEN=your-token

# Connected Services
EMOTIONAL_SERVICE_URL=http://localhost:4160
LIFE_PATTERN_SERVICE_URL=http://localhost:4161
HUMAN_CONTEXT_URL=http://localhost:4162
SIGNAL_AGGREGATOR_URL=http://localhost:4142
```

---

## Files

```
cosmic-api/
├── src/
│   ├── index.ts              # Main entry
│   ├── config/
│   │   └── index.ts         # Configuration
│   ├── middleware/
│   │   └── index.ts         # Request logging, error handling
│   ├── routes/
│   │   └── cosmicRoutes.ts  # API routes
│   ├── services/
│   │   └── cosmicService.ts # AI Council logic
│   └── types/
│       └── index.ts         # TypeScript types
├── package.json
├── tsconfig.json
└── .env.example
```

---

## Example Response

```json
{
  "success": true,
  "data": {
    "cosmicState": {
      "energyLevel": "high",
      "emotionalTone": "Radiant and expansive",
      "socialEnergy": 90,
      "focusScore": 85,
      "relationshipEnergy": 90,
      "financialEnergy": 85,
      "growthEnergy": 80
    },
    "insights": [
      {
        "agent": "mystic",
        "category": "spiritual",
        "title": "Cosmic Alignment",
        "interpretation": "Your inner wisdom seeks expression today",
        "symbolic": "The stars whisper secrets meant only for you",
        "practical": "Take a moment for meditation or reflection today",
        "confidence": 0.8
      }
    ],
    "consensus": {
      "theme": "Cosmic Alignment",
      "summary": "The council sees alignment in your path",
      "suggestedAction": "Take a moment for meditation or reflection today"
    },
    "dailyAffirmation": "My enthusiasm lights the way for others",
    "caution": "Channel your abundant energy wisely",
    "timestamp": "2026-06-17T12:00:00.000Z"
  }
}
```

---

## Integration

Cosmic OS connects to:

| Service | Port | Purpose |
|---------|------|---------|
| Emotional Service | 4160 | Emotional state analysis |
| Life Pattern Service | 4161 | Life pattern recognition |
| Human Context | 4162 | Relationship & goals context |
| Signal Aggregator | 4142 | Unified signal processing |

---

## License

Proprietary - Axom / REZ Ecosystem

---

*Last Updated: June 17, 2026*
