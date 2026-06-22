# Genie Device Integration Service

**Version:** 1.1.0  
**Port:** 4769  
**Status:** ✅ Production Ready — wired into the wake-word service and runtime/genie voice pipeline

---

## Overview

Connects Genie AI to various listening devices for the "Genie Everywhere" experience. Each device can register itself and (Phase 7+) start a wake-word listening session that automatically forwards wake events through the wake-word service to runtime/genie's unified voice pipeline.

## Supported Devices

| Device | Brands | Features |
|--------|--------|----------|
| **Smartphone** | iOS, Android | Wake word, tap-to-talk, background |
| **Smartwatch** | Apple Watch, Galaxy Watch, Wear OS | Tap-to-listen, health context |
| **Earbuds** | AirPods, Galaxy Buds, Sony WF | Always listen, tap control |
| **Smart Glasses** | Ray-Ban Meta, Snap Spectacles | Camera + audio context |
| **Car** | Android Auto, CarPlay, Tesla | Hands-free, navigation |
| **Laptop/Desktop** | Windows, macOS, Chrome OS | Wake word, meeting transcription |

## API Endpoints

### Core

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Health check |
| GET | `/ready` | Readiness probe |
| GET | `/api/device-types` | List supported device types + brands |
| GET | `/api/devices` | List paired devices |
| GET | `/api/devices/:id` | Get one device |
| POST | `/api/devices` | Pair/register a device |
| DELETE | `/api/devices/:id` | Unpair |
| GET | `/api/devices/by-user/:userId` | List devices for a user |
| GET | `/api/capabilities/:type` | List capabilities of a device type |
| POST | `/api/pair/code` | Generate a pairing code |
| POST | `/api/pair/redeem` | Redeem a pairing code |
| POST | `/api/devices/:id/handoff` | Handoff active session to this device |
| GET | `/api/statistics` | Device stats |

### Wake-word integration (Phase 7+)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/devices/:id/listen/start` | Start a wake-word listening session for this device. Body: `{language?, userId?, genieForward?}`. Forwards to wake-word service and stores the wake-session id. |
| POST | `/api/devices/:id/listen/stop` | Stop the listening session |
| POST | `/api/devices/:id/audio` | Send audio transcript (already STT'd on-device or via Voice OS). Body: `{text, source?}`. The wake-word service detects the wake phrase and (if enabled) forwards to runtime/genie. |
| GET | `/api/integration/wake-word` | Returns `{enabled, url, activeSessions, sessions, healthy}` |

## How the wake-word integration works

```
┌────────────┐       ┌────────────────────┐       ┌──────────────────┐       ┌──────────────┐
│  Device    │       │ device-integration │       │   wake-word      │       │ runtime/     │
│ (phone,    │       │     (4769)         │       │   (4767)         │       │ genie        │
│  earbuds,  │       │                    │       │                  │       │ (7100)       │
│  car, ...) │       │                    │       │                  │       │              │
└────────────┘       └────────────────────┘       └──────────────────┘       └──────────────┘
       │                       │                          │                         │
       │ POST /api/devices/:id/listen/start              │                         │
       │──────────────────────►│                          │                         │
       │                       │ POST /api/listen/start   │                         │
       │                       │─────────────────────────►│                         │
       │                       │ {clientId: device.id,    │                         │
       │                       │  language, userId,       │                         │
       │                       │  genieForward}           │                         │
       │                       │                          │                         │
       │                       │◄─────────────────────────│                         │
       │                       │ {id: wakeSessionId}      │                         │
       │◄──────────────────────│                          │                         │
       │ {wakeSessionId, ...}  │                          │                         │
       │                       │                          │                         │
       │                       │                          │                         │
       │ POST /api/devices/:id/audio {text: "hey genie..."}│                         │
       │──────────────────────►│                          │                         │
       │                       │ POST /api/listen/:sid/detect                       │
       │                       │─────────────────────────►│                         │
       │                       │ {text, source}           │                         │
       │                       │                          │ detect wake             │
       │                       │                          │ if forwarding:          │
       │                       │                          │ POST /api/voice/wake ───►│
       │                       │                          │                         │
       │                       │◄─────────────────────────│ {sessionId, ...}        │
       │                       │ {detected, runtime_genie}│                         │
       │◄──────────────────────│                          │                         │
       │ {detected, wakeWord,  │                          │                         │
       │  runtime_genie}       │                          │                         │
```

When the wake-word service detects "Hey Genie" and `genieForward=true` on the session, runtime/genie wakes and runs the unified voice pipeline (transcribe post-wake audio → `/api/ask` → synthesize spoken answer).

## Quick Start

```bash
cd companies/HOJAI-AI/products/genie/genie-device-integration
npm install
npm start  # Port 4769
```

To enable wake-word forwarding in dev:

```bash
export WAKE_WORD_URL=http://localhost:4767
export INTERNAL_SERVICE_TOKEN=hojai-internal-service-token-change-me
export USE_WAKE_WORD_FORWARD=true
npm start
```

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| PORT | 4769 | Service port |
| INTERNAL_SERVICE_TOKEN | (required for wake-word forward) | Shared internal token for service-to-service auth |
| WAKE_WORD_URL | `http://localhost:4767` | Where to forward audio + listen commands |
| USE_WAKE_WORD_FORWARD | `true` | Set to `false` to disable the wake-word integration entirely |
| WAKE_WORD_TIMEOUT_MS | 3000 | Timeout (ms) for wake-word service calls |

## Tests

```bash
npm test          # 37 assertions across full integration lifecycle
npm run smoke     # curl-based smoke tests against a running instance
```

The unit test spawns both services as child processes and verifies: integration health, listen/start creates session, audio with wake phrase returns detected=true, audio without session returns 409, listen/stop tears down, bad wake-word returns 502, `USE_WAKE_WORD_FORWARD=false` disables the integration, and auth required.
