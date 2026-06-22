# Genie Wake Word Service

**Version:** 1.1.0  
**Port:** 4767  
**Status:** ✅ Production Ready — wired into the runtime/genie unified voice pipeline

---

## Overview

Detects wake words ("Hey Genie", "हे जिनी", "oye genie", "يا جيني", "dis genie") for hands-free voice activation of Genie AI. When a wake word fires, the service can optionally POST a wake event to **runtime/genie** so the unified voice pipeline can transcribe the post-wake audio, run `/api/ask`, and synthesize the spoken answer.

## Features

- Multi-language wake-word detection (English, Hindi, Spanish, Arabic, French)
- WebSocket-based real-time detection (clients + WebSocket audio)
- Configurable per-language sensitivity (0.0–1.0)
- Persistent session store (PersistentMap)
- Detection logging + statistics + false-positive feedback
- **runtime/genie forward** — when a wake is detected on a session that has `userId` + `genieForward: true`, POST to `${RUNTIME_GENIE_URL}/api/voice/wake` (3-second timeout). Failures do NOT break detection.
- All forwarding is **opt-in** via env flags — disabled by default in the sense that the service only forwards when both the env flag and the per-session flag are on.

## Supported Wake Words

| Language | Phrases |
|----------|---------|
| **English** | "Hey Genie", "Hi Genie", "Ok Genie" |
| **Hindi** | "हे जिनी", "अरे जिनी", "भाई जिनी" |
| **Spanish** | "Oye Genie", "Hola Genie", "Genie" |
| **Arabic** | "يا جيني", "جينى" |
| **French** | "Dis Genie", "Salut Genie" |

## API Endpoints

### Core

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Health check + counts |
| GET | `/ready` | Readiness probe |
| GET | `/api/wake-words` | List configured wake-word phrases per language |
| GET | `/api/models` | List wake-word models |
| POST | `/api/models/train` | Train a new model (requires auth) |
| GET | `/api/models/:id` | Get one model |
| GET | `/api/sensitivity` | Current sensitivity per language |
| POST | `/api/sensitivity` | Update sensitivity (requires auth) |

### Detection

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/detect` | One-shot detect from text. Body: `{text, language, source?, userId?, sessionId?, forwardToGenie?}`. Forwards to runtime/genie when `userId` is provided and `forwardToGenie` is not false. |
| POST | `/api/detect/batch` | Batch detect |
| GET | `/api/detections` | List recent detections |
| GET | `/api/detections/:id` | Get one detection |
| GET | `/api/clients` | List active WS clients |
| GET | `/api/statistics` | Detection stats |
| POST | `/api/feedback` | Submit false-positive feedback |
| GET | `/api/feedback` | List feedback |

### Sessions + runtime/genie forward (Phase 7+)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/listen/start` | Start a listening session. Body: `{clientId?, language?, userId?, genieForward?}`. When `userId` is set and `USE_RUNTIME_GENIE_FORWARD=true`, the session is created with `genieForward=true` so any wake triggers the forward. |
| POST | `/api/listen/stop` | Stop a listening session |
| POST | `/api/listen/:sessionId/detect` | Trigger detection against a running session (used by WS clients + device-integration). Forwards to runtime/genie if enabled. |
| PUT | `/api/listen/:sessionId/forward` | Toggle forwarding on an active session. Body: `{genieForward?, userId?}`. |
| GET | `/api/integration/runtime-genie` | Returns `{enabled, url, healthy}` for the runtime/genie forward integration. |

## runtime/genie forward — how it works

When a wake word is detected on a session where `genieForward === true`, the service POSTs to:

```
POST {RUNTIME_GENIE_URL}/api/voice/wake
Headers:
  x-internal-token: ${INTERNAL_SERVICE_TOKEN}
  content-type: application/json
Body:
  {
    "userId":   "<session.userId>",
    "deviceId": "<session.clientId || session.id>",
    "wakeWord": "<detection.phrase>",
    "language": "<detection.language>",
    "sessionId":"<detection.id>"
  }
```

- Built-in `fetch()` with 3-second AbortController timeout.
- Failures (network error, 4xx/5xx) are logged but **do not break** the wake detection — `runtime_genie` in the response is `null` and the local detection record is still saved.
- Disabled by env flag: `USE_RUNTIME_GENIE_FORWARD=false`.
- Disabled per-session when no `userId` is set on the session.

## Quick Start

```bash
cd companies/HOJAI-AI/products/genie/genie-wake-word-service
npm install
npm start  # Port 4767
```

To enable runtime/genie forwarding in dev:

```bash
export RUNTIME_GENIE_URL=http://localhost:7100
export INTERNAL_SERVICE_TOKEN=hojai-internal-service-token-change-me
export USE_RUNTIME_GENIE_FORWARD=true
npm start
```

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| PORT | 4767 | Service port |
| INTERNAL_SERVICE_TOKEN | (required for runtime/genie forward) | Shared internal token for service-to-service auth |
| RUNTIME_GENIE_URL | `http://localhost:7100` | Where to forward wake events. Set to your runtime/genie host. |
| USE_RUNTIME_GENIE_FORWARD | `true` | Set to `false` to disable the forward entirely (opt-out). |

## Tests

```bash
npm test          # 80 assertions: 46 unit + 34 E2E pipeline
npm run smoke     # curl-based smoke tests against a running instance
```

- **Unit tests** (`tests/wake-word.test.mjs`): spawns the service as a child process against a real port and uses an in-process mock for runtime/genie. Covers: forward on detect, forward disabled per-session, forward disabled by env flag, missing userId, runtime/genie 500, runtime/genie unreachable, and auth required.
- **E2E pipeline tests** (`tests/e2e-voice-pipeline.test.mjs`): simulates the full Phase 7 voice flow across 3 passes — (1) device → wake-word → mock runtime/genie, (2) Hindi wake phrase, (3) runtime/genie wake handler pipeline with mocked Voice OS (transcribe → answer → synthesize). 34 assertions, all green.
