# CLAUDE.md - RAZO Keyboard v2.1

**Version:** 2.1.0 | **Updated:** June 12, 2026

---

## Project Overview

**Name:** RAZO Keyboard - Your Communication OS
**Type:** Cross-platform AI Keyboard + Communication Layer
**Purpose:** AI-powered keyboard with transformer predictions, voice input, smart suggestions, and Genie integration

**Location:** `hojai-ai/RAZO-Keyboard/`

---

## Tech Stack

- **Runtime:** Node.js 20+
- **Framework:** Express.js
- **Language:** TypeScript
- **Mobile:** Kotlin (Android), Swift (iOS)
- **Cache:** Redis
- **Database:** MongoDB (optional)

---

## Architecture

```
RAZO Keyboard v2.1
├── Integration Gateway (4601) - Unified API
├── Core Services
│   ├── Predictive Engine (4640) - Transformer predictions
│   ├── Intent Router (4650) - Wake word, VAD
│   ├── Smart Suggestions (4651) - Real-time, ML-ranked
│   ├── Action Cards (4652) - OAuth plugins
│   └── Command Bar (4653) - Fuzzy commands
├── Supporting Services
│   ├── Cloud Sync (4631)
│   ├── Vault (4632) - Passwords, passkeys
│   ├── Search (4633) - App launcher
│   ├── AI (4634) - Genie, CoPilot
│   ├── Cleanup (4635) - Grammar
│   └── Snippets (4636) - Phrase expansion
└── External Integrations
    ├── Genie (4706)
    ├── Intelligence (4750)
    ├── HOJAI SkillNet (5130)
    └── Whisper (8081)
```

---

## Project Structure

```
RAZO-Keyboard/
├── CloudServices/
│   └── src/
│       └── integrationGateway.ts  # Main gateway (port 4601)
├── PREDICTIVE-ENGINE/
│   └── index.ts                  # Transformer predictions
├── INTENT-ROUTER/
│   └── index.ts                  # Wake word, VAD
├── SMART-SUGGESTIONS/
│   └── index.ts                  # Real-time suggestions
├── ACTION-CARDS/
│   └── index.ts                  # OAuth plugins
├── COMMAND-BAR/
│   └── index.ts                  # Fuzzy commands
├── Android/
│   └── src/main/java/com/razo/keyboard/
│       ├── RazoInputMethodService.kt
│       ├── RazoKeyboardView.kt
│       ├── VoiceRecognitionService.kt
│       └── RazoAutofillService.kt
├── iOS/
│   ├── RazoKeyboardViewController.swift
│   ├── RazoKeyboardView.swift
│   └── RazoCredentialProviderViewController.swift
├── docs/
│   ├── API.md              # Full API reference
│   ├── SETUP.md            # Setup guide
│   ├── swagger.yaml        # OpenAPI spec
│   └── MOBILE-BUILD.md      # Mobile build guide
├── Dockerfile
├── docker-compose.yml
├── .env.example
├── build.gradle
├── settings.gradle
└── package.json
```

---

## Services & Ports

| Service | Port | Purpose |
|---------|------|---------|
| **Integration Gateway** | 4601 | Unified API, all endpoints |
| Predictive Engine | 4640 | Transformer-based predictions |
| Intent Router | 4650 | Wake word detection, VAD |
| Smart Suggestions | 4651 | Real-time, ML-ranked |
| Action Cards | 4652 | OAuth plugins, undo/redo |
| Command Bar | 4653 | Fuzzy NL parsing |
| Cloud Sync | 4631 | User data sync |
| Vault | 4632 | Passwords, passkeys |
| Search | 4633 | App launcher |
| AI | 4634 | Genie, CoPilot |
| Cleanup | 4635 | Grammar correction |
| Snippets | 4636 | Phrase expansion |
| Whisper | 8081 | Speech-to-text |
| Genie Briefing | 4706 | Personal AI |
| Intelligence | 4750 | Industry AI |

---

## API Endpoints (v2.1)

### Core Endpoints
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Health check |
| GET | `/health/detailed` | Detailed health with all services |
| POST | `/session/init` | Initialize session |

### Predictions
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/predict` | Get word predictions |
| POST | `/predict/batch` | Batch predictions (up to 10 texts) |

### Suggestions & Actions
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/suggestions` | Smart contextual suggestions |
| POST | `/actions` | Get action cards |
| POST | `/actions/execute` | Execute action |

### Commands
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/commands` | Search commands |
| POST | `/commands/execute` | Execute command |

### AI Services
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/genie/briefing` | Get Genie AI briefing |
| POST | `/whisper/process` | Voice text processing |
| POST | `/voice/process` | Voice pipeline |
| POST | `/ai/query` | Unified AI query |

### User Services
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/stats/:userId` | User statistics |
| GET | `/ratelimit/:userId` | Rate limit status |
| GET | `/preferences/:userId` | Get preferences |
| POST | `/preferences/:userId` | Update preferences |
| POST | `/search` | Unified search |
| POST | `/sync` | Offline data sync |
| POST | `/analytics/track` | Track analytics |

---

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| PORT | 4601 | Gateway port |
| NODE_ENV | development | Environment |
| PREDICTIVE_URL | http://localhost:4640 | Predictive service |
| INTENT_URL | http://localhost:4650 | Intent router |
| SUGGESTIONS_URL | http://localhost:4651 | Suggestions |
| ACTIONS_URL | http://localhost:4652 | Actions |
| COMMANDS_URL | http://localhost:4653 | Commands |
| WHISPER_URL | http://localhost:8081 | Whisper service |
| GENIE_URL | http://localhost:4706 | Genie service |
| INTELLIGENCE_URL | http://localhost:4750 | Intelligence |
| REDIS_URL | redis://localhost:6379 | Redis cache |
| JWT_SECRET | - | JWT signing secret |
| API_KEY | - | API key |

---

## Commands

```bash
# Install dependencies
npm install

# Start development
cd CloudServices && npm install && npx tsx src/integrationGateway.ts

# Start all services
./start-all-services.sh

# Build Docker
docker-compose up -d

# Test API
curl http://localhost:4601/health
```

---

## Mobile Apps

### Android
- Location: `Android/`
- Build: `build.gradle` (Gradle 8.2)
- Main file: `RazoInputMethodService.kt`
- Features: Voice input, predictions, vault, autofill

### iOS
- Location: `iOS/`
- Build: `project.yml` (XcodeGen)
- Main file: `RazoKeyboardViewController.swift`
- Features: Voice input, predictions, autofill, passkeys

---

## Features

### v2.0 Features
- Transformer-based prediction (multi-language)
- Wake word detection + VAD
- Real-time suggestions with ML ranking
- OAuth plugin architecture
- E2E encryption (AES-256-GCM)
- Offline mode with sync queue

### v2.1 New Features
- Batch predictions
- User statistics
- Rate limit tracking
- User preferences
- Unified search
- Detailed health checks

---

## Integration Points

### HOJAI Services
| Service | Port | Purpose |
|---------|------|---------|
| Genie | 4706 | Personal AI briefing |
| Intelligence | 4750 | Industry insights |
| SkillNet | 5130 | Skill marketplace |
| HIB | 3053 | Human intelligence |
| Memory | 4520 | User memory |

### External Services
| Service | Port | Purpose |
|---------|------|---------|
| Whisper | 8081 | Speech-to-text |

---

## Security

- JWT authentication
- Rate limiting (per endpoint)
- Security headers (HSTS, CSP, X-Frame-Options)
- Input validation
- E2E encryption for sensitive data

---

## Status

| Component | Status |
|----------|--------|
| Gateway | ✅ Running (4601) |
| Core Services | ✅ 8/8 running |
| Mobile SDK | ✅ Ready |
| Docker | ✅ Ready |
| API Docs | ✅ Complete |

---

**Last Updated:** June 12, 2026
**Version:** 2.1.0