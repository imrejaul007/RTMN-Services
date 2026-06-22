# Genie Wake Word Service

**Version:** 1.0.0  
**Port:** 4767  
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

Detects wake words "Hey Genie" and "हे जिनी" (Hindi) for hands-free voice activation of Genie AI.

## Features

- Multi-language wake word detection (English, Hindi, Hinglish)
- WebSocket-based real-time detection
- Configurable sensitivity (0.0-1.0)
- Integration with TwinOS for context
- Detection logging and statistics

## Supported Wake Words

| Language | Phrases |
|----------|---------|
| **English** | "Hey Genie", "Hi Genie", "Ok Genie" |
| **Hindi** | "हे जिनी", "अरे जिनी", "भाई जिनी" |

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Health check |
| GET | `/api/detections` | Get detection logs |
| GET | `/api/detections/latest` | Get latest detection |
| GET | `/api/statistics` | Detection statistics |
| POST | `/api/sessions` | Create session |
| POST | `/api/listen/start` | Start listening |
| POST | `/api/listen/stop` | Stop listening |
| WS | `/ws` | WebSocket for audio |

## Quick Start

```bash
cd products/genie/genie-wake-word-service
npm install
npm start  # Port 4767
```

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| PORT | 4767 | Service port |
| INTERNAL_TOKEN | dev-internal-token | Internal API auth |
| GENIE_THINK_URL | http://localhost:4701 | Genie Gateway |
| VOICE_TWIN_URL | http://localhost:4876 | Voice Twin |
