# HOJAI Voice Studio API

> **Port:** 4430
> **Version:** 1.0.0
> **Status:** ✅ Built (2026-06-25)

Voice agent management API for HOJAI Studio.

---

## Quick Start

```bash
cd services/voice-studio-api
npm install
npm start        # Port 4430
```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/v1/agents` | List agents |
| `GET` | `/api/v1/agents/:id` | Get agent |
| `POST` | `/api/v1/agents` | Create agent |
| `PATCH` | `/api/v1/agents/:id` | Update agent |
| `DELETE` | `/api/v1/agents/:id` | Delete agent |
| `POST` | `/api/v1/agents/:id/activate` | Activate agent |
| `POST` | `/api/v1/agents/:id/pause` | Pause agent |
| `POST` | `/api/v1/conversations` | Start conversation |
| `GET` | `/api/v1/conversations/:id` | Get conversation |
| `POST` | `/api/v1/conversations/:id/transcript` | Add transcript entry |
| `POST` | `/api/v1/conversations/:id/end` | End conversation |
| `GET` | `/api/v1/stats` | Get statistics |

## Providers

**STT:** whisper, deepgram, google, sarvam
**TTS:** elevenlabs, cartesia, google, sarvam

## Related

- **Voice Gateway** (:4880) — STT/TTS routing
- **AI Studio UI** (:3000) — Web UI
