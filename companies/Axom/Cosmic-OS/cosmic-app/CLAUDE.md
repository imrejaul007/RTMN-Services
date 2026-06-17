# Cosmic OS App - Complete Documentation

**Version:** 1.0.0 | **Framework:** Expo (React Native) | **Platforms:** iOS, Android

---

## Overview

Cosmic OS is a wellness app that provides AI-powered spiritual guidance through an Council of Agents. Users can check in their mood, receive personalized insights, and explore guidance across 7 life domains.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           COSMIC OS APP                                    │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │                      TABS                                          │  │
│  │  Home │ Insights │ Council │ Profile                            │  │
│  └──────────────────────────────────────────────────────────────────┘  │
│                                    │                                     │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │                      SCREENS                                       │  │
│  │  Mood Check-In │ Domain Guidance │ Agent Consult                  │  │
│  └──────────────────────────────────────────────────────────────────┘  │
│                                                                          │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │                      COSMIC OS API (Port 4160)                     │  │
│  └──────────────────────────────────────────────────────────────────┘  │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## App Structure

```
cosmic-app/
├── app/
│   ├── _layout.tsx              # Root layout
│   ├── (tabs)/
│   │   ├── _layout.tsx         # Tab navigation
│   │   ├── index.tsx           # Home (daily reading)
│   │   ├── insights.tsx        # AI Council insights
│   │   ├── council.tsx        # Meet the council
│   │   └── profile.tsx         # User profile
│   ├── mood-checkin.tsx       # Mood check-in modal
│   └── domain/
│       └── [id].tsx            # Domain guidance
├── src/
│   ├── types/index.ts         # TypeScript types
│   ├── constants/index.ts     # Design system
│   └── services/api.ts        # Cosmic OS API client
├── app.json
├── package.json
└── tsconfig.json
```

---

## Screens

| Screen | Purpose |
|--------|---------|
| **Home** | Daily affirmation, cosmic state, suggested actions |
| **Insights** | AI Council insights and analysis |
| **Council** | Meet the 7 council agents |
| **Profile** | User stats, achievements, settings |
| **Mood Check-In** | Multi-step mood, energy, context input |
| **Domain Guidance** | Guidance for each life domain |

---

## Features

| Feature | Description |
|---------|-------------|
| **Mood Check-In** | 3-step flow: mood → energy → context |
| **Daily Reading** | Affirmation, theme, lucky elements |
| **Cosmic State** | Energy levels and emotional tones |
| **AI Council** | 7 specialized agents provide insights |
| **Domain Guidance** | 7 life domains with actions & affirmations |
| **Insights** | Detailed interpretations and practical advice |

---

## AI Council Agents

| Agent | Emoji | Specialty |
|-------|-------|-----------|
| The Mystic | 🔮 | Spiritual |
| The Healer | 💚 | Emotional |
| The Strategist | 🎯 | Career |
| The Oracle | 👁️ | Pattern Recognition |
| The Connector | 💫 | Relationships |
| The Wealth Guide | 💎 | Financial |
| The Explorer | 🧭 | Personal Growth |

---

## Life Domains

| Domain | Emoji | Guidance Focus |
|--------|-------|----------------|
| Emotional | 💚 | Inner harmony |
| Relationship | 💫 | Connection |
| Career | 🎯 | Strategy |
| Financial | 💎 | Abundance |
| Health | 🌿 | Body wisdom |
| Spiritual | 🔮 | Purpose |
| Social | 🤝 | Community |

---

## Design System

### Colors
| Name | Hex |
|------|-----|
| Cosmic | #8B5CF6 |
| Background | #0F0A1E |
| Card | #1E1535 |
| Mystic | #06B6D4 |
| Healer | #10B981 |

### Moods (12 total)
✨ Radiant | 😊 Happy | ⚡ Energetic | 🕊️ Peaceful | 😌 Calm | 😐 Neutral | 😴 Tired | 😰 Anxious | 😤 Stressed | 😔 Down | 😢 Low

---

## Setup

```bash
cd cosmic-app

npm install

npm start
```

### Environment

```env
EXPO_PUBLIC_COSMIC_API_URL=http://localhost:4160
```

---

## API Connection

Connects to Cosmic OS API running on port 4160:

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/mood/checkin` | POST | Submit mood check-in |
| `/api/daily/:userId` | GET | Get daily reading |
| `/api/council` | POST | Get council response |
| `/api/guidance/:domain` | GET | Get domain guidance |

---

## License

Proprietary - Axom / REZ Ecosystem

---

*Last Updated: June 17, 2026*
