# Genie Listening Modes Service

**Version:** 1.1.0  
**Port:** 4768  
**Status:** ✅ Production Ready — wired into device-integration wake-session lifecycle

---

## Overview

Manages different listening modes for Genie AI across all devices. When a device's mode changes (via `/api/switch` or `/api/auto`), this service fires a webhook to the device-integration service which starts or stops the wake-word session based on the new mode.

## Listening Modes → Wake-session lifecycle

| Mode | Wake-word session | Battery Impact | Privacy |
|------|-------------------|----------------|---------|
| **manual** | stopped (push-to-talk only) | None | High |
| **continuous** | started (always listen) | High | Medium |
| **passive** | stopped (ambient only, no wake) | Low | High |
| **smart** | started (adaptive) | Medium | Adaptive |

The action is derived from the mode in `actionForMode(mode)` and returned in the `/api/switch` response as `action: "start" | "stop"`.

## API Endpoints

### Core

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Health check |
| GET | `/ready` | Readiness probe |
| GET | `/api/modes` | List all 4 modes + config |
| GET | `/api/modes/:mode` | Get one mode |
| GET | `/api/current?deviceId=X` | Get current mode for device (default: 'manual') |
| POST | `/api/switch` | Switch mode. Body: `{deviceId?, mode, reason?}`. Returns `{deviceId, mode, previousMode, action, history}`. Fires device-integration webhook. |
| GET | `/api/history` | Mode change history (paginated, optional deviceId filter) |
| POST | `/api/config` | Update mode config (sensitivity, timeout, etc) |
| GET | `/api/config/:mode` | Get mode config |
| GET | `/api/stats` | Per-mode usage stats + currently-active devices |
| POST | `/api/auto` | Smart auto-switch based on context. Fires device-integration webhook. |

### device-integration webhook (Phase 7+)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/integration/device-integration` | Register a webhook URL. Body: `{url}`. De-dupes by url. |
| GET | `/api/integration/device-integration` | List hooks + delivery stats |
| DELETE | `/api/integration/device-integration` | Clear all hooks |

When a mode changes, listening-modes POSTs to each registered hook:
```
POST {hook.url}/api/devices/{deviceId}/mode
Headers: x-internal-token: ${INTERNAL_SERVICE_TOKEN}
Body: {deviceId, fromMode, toMode, reason, action, timestamp}
```

The device-integration service handles `action` by starting or stopping the wake-word session for that device.

## Quick Start

```bash
cd companies/HOJAI-AI/products/genie/genie-listening-modes
npm install
npm start  # Port 4768
```

To wire into device-integration in dev:

```bash
export INTERNAL_SERVICE_TOKEN=hojai-internal-service-token-change-me
npm start
# Then in another shell:
curl -X POST http://localhost:4768/api/integration/device-integration \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"url":"http://localhost:4769"}'
```

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| PORT | 4768 | Service port |
| INTERNAL_SERVICE_TOKEN | (required for device-integration hook) | Shared internal token for service-to-service auth |
| USE_DEVICE_INTEGRATION_HOOK | `true` | Set to `false` to disable the webhook fanout |
| DEVICE_HOOK_TIMEOUT_MS | 3000 | Timeout (ms) for device-integration webhook calls |

## Tests

```bash
npm test          # 27 assertions across full webhook lifecycle
npm run smoke     # curl-based smoke tests against a running instance
```

The unit test spawns wake-word + device-integration + listening-modes as child processes and verifies: webhook registry (register/dedupe/clear), action derivation for all 4 modes, hook delivery creates wake session on device-integration, hook stop tears it down, end-to-end mode→wake→audio→wake-detected, bad/missing internal token rejected (401), and `USE_DEVICE_INTEGRATION_HOOK=false` disables fanout.
