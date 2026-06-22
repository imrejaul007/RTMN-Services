# Genie Device Integration Service

**Version:** 1.0.0  
**Port:** 4769  
**Status:** ✅ Production Ready

---
---

## 🔐 Auth (Phase 7)

This service now requires a **Bearer JWT** (CorpID-issued) on every request except `/health`, `/`, and `/ready`. Auth is enforced via `app.use(requireAuth)` from `@rtmn/shared/auth`.

**Get a token:**

```bash
# Dev shortcut (base64 JSON token — matches what requireAuth verifies):
TOKEN=$(curl -s -X POST http://localhost:4702/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"you@example.com","password":"dev"}' | jq -r .token)
```

**Call this service:**

```bash
curl http://localhost:PORT/health                      # public, no token
curl http://localhost:PORT/your-endpoint \
  -H "Authorization: Bearer $TOKEN"                   # protected
```

**Disable in dev/test:** Set `SERVICE_REQUIRE_AUTH=false` env var.

See [shared/MIGRATION-GUIDE.md](../../shared/MIGRATION-GUIDE.md) for the full `@rtmn/shared/auth` pattern and the canonical thin-shim approach.

## Overview

Connects Genie AI to various listening devices for the "Genie Everywhere" experience.

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

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Health check |
| GET | `/api/devices` | List registered devices |
| POST | `/api/devices` | Register device |
| GET | `/api/devices/:id` | Get device info |
| PUT | `/api/devices/:id` | Update device |
| DELETE | `/api/devices/:id` | Remove device |
| GET | `/api/types` | Supported device types |
| POST | `/api/audio` | Send audio to service |
| WS | `/ws` | WebSocket for devices |

## Quick Start

```bash
cd products/genie/genie-device-integration
npm install
npm start  # Port 4769
```
