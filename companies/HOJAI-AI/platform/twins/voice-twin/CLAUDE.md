# voice-twin

**Port:** 4876
**Service name:** `voice-twin`
**Status:** ✅ Production-ready | **Phase 4 wired** (June 21, 2026)

---

## Overview

Voice Twin is the canonical digital-twin service for **voice profiles,
TTS, STT, and voice sessions** in the RTMN ecosystem. It manages:

- **Voices** — Custom synthetic voices (cloned, branded, multilingual)
- **Profiles** — Per-user voice preferences and biometrics
- **TTS** — Text-to-speech synthesis
- **STT** — Speech-to-text transcription
- **Sessions** — Active voice call/session state
- **Recordings** — Persistent audio storage

Voice Twin is consumed by Genie Voice Services (the wake-word,
listening-modes, and device-integration services in the Genie suite) and
exposes a REST API for any other service that needs to speak or
transcribe.

## Storage

| Store | Path | Purpose |
|-------|------|---------|
| `voices` | `data/voices.json` | Voice catalog (system + custom) |
| `profiles` | `data/profiles.json` | Per-user voice profiles |
| `recordings` | `data/recordings.json` | Audio recordings |
| `sessions` | `data/sessions.json` | Active voice sessions |

## API

| Method | Path | Description |
|--------|------|-------------|
| GET | `/health` | Liveness check |
| GET | `/api/voices` | List voices |
| GET | `/api/voices/:id` | Get one voice |
| POST | `/api/voices` | Create custom voice (publishes `voice.voice.created`) |
| POST | `/api/tts` | Synthesize speech (publishes `voice.tts.generated`) |
| POST | `/api/stt` | Transcribe audio |
| GET | `/api/profiles` | List profiles |
| GET | `/api/profiles/:id` | Get one profile |
| POST | `/api/profiles` | Create profile (publishes `voice.profile.created`) |
| PUT | `/api/profiles/:id` | Update profile (publishes `voice.profile.updated`) |
| DELETE | `/api/profiles/:id` | Delete profile (publishes `voice.profile.deleted`) |

## Platform Integration (Phase 4)

| Endpoint | Bridge | MemoryOS | Policy audit | Event |
|----------|:------:|:--------:|:------------:|:------|
| POST `/api/voices` | — | — | — | `voice.voice.created` |
| POST `/api/tts` | — | — | — | `voice.tts.generated` |
| POST `/api/profiles` | ✓ | ✓ | ✓ | `voice.profile.created` |
| PUT `/api/profiles/:id` | — | — | — | `voice.profile.updated` |
| DELETE `/api/profiles/:id` | — | — | — | `voice.profile.deleted` |

## Quick Start

```bash
cd /Users/rejaulkarim/Documents/RTMN/companies/HOJAI-AI
./start-twins.sh

# Standalone
cd platform/twins/voice-twin
PORT=4876 \
  JWT_SECRET="dev_jwt_secret_change_in_production_minimum_64_characters_required_for_security" \
  JWT_ISSUER="rtmn-corpid" \
  SERVICE_NAME="voice-twin" \
  npm start
```

## Sample Request

```bash
TOKEN=$(python3 -c "
import json, base64, time
p = {'sub':'u1','email':'a@b.com','role':'superadmin','exp':int((time.time()+3600)*1000)}
print(base64.b64encode(json.dumps(p).encode()).decode())
")

curl -X POST http://localhost:4876/api/tts \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"text":"Hello, welcome to RTMN","voiceId":"voice-en-us-001"}'
```

Response:

```json
{
  "success": true,
  "audio": {
    "id": "audio-abc123",
    "audioUrl": "/api/audio/abc123.mp3",
    "userId": "user-admin",
    "createdAt": "2026-06-21T21:00:00.000Z"
  }
}
```

---

*Last Updated: June 21, 2026 (Phase 4 cross-service wiring)*