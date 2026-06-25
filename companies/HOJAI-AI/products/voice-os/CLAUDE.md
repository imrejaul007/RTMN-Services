# Voice OS Product

> **Status:** 🟢 **Phase G (2026-06-24) — Production Ready.** Voice Gateway (canonical) + 4 legacy services from REZ-Workspace import.
> **Source:** `companies/REZ-Workspace/companies/hojai-ai/{HOJAI-VOICE-PLATFORM,hojai-voice-os,hojai-voice-commerce,voice-training,voice-ai-service}`
> **Parent division:** [05 Communication Cloud](../../divisions/05-communication-cloud/CLAUDE.md)

## Mission

Enterprise-grade voice AI platform: TTS adapters (Sarvam, ElevenLabs, Cartesia), STT, NLU (intent + sentiment), telecom integrations (Twilio, Exotel, Knowlarity), voice agents (appointment, commerce, search, customer service), and a Next.js voice studio frontend.

## Service Inventory

| Sub-product | Path | Port | Status | Source |
|-------------|------|------|--------|--------|
| **Voice Gateway** ⭐ (STT/TTS routing + training pipeline) | [./core/voice-gateway/](./core/voice-gateway/) | 4880 | ✅ **Canonical** (Phase F flagship) | Built 2026-06-24 |
| **Core Platform** (HOJAI-VOICE-PLATFORM) | [./core/HOJAI-VOICE-PLATFORM/](./core/HOJAI-VOICE-PLATFORM/) | 4850 | 🟡 Real (TTS/STT/NLU/telecom/agents) | REZ-Workspace |
| **Voice AI Service** (recording/transcription/synthesis) | [./ai/voice-ai-service/](./ai/voice-ai-service/) | 4590 | 🟡 Real | REZ-Workspace |
| **Frontend (Next.js Studio)** | [./frontend/hojai-voice-os/](./frontend/hojai-voice-os/) | 3000 | 🟡 Real (Next.js) | REZ-Workspace |
| **Backend (Voice Commerce API)** | [./backend/voice-commerce/](./backend/voice-commerce/) | 4880 | ⚠️ Deprecated (replaced by Voice Gateway) | REZ-Workspace |
| **Training Pipeline** (Python) | [./training/voice-training/](./training/voice-training/) | n/a | 🟡 Real (Colab scripts, datasets) | REZ-Workspace |

### Voice Gateway (canonical, port 4880)

The **Voice Gateway** is the canonical STT/TTS routing service (Phase F flagship, 2026-06-24):
- Routes speech-to-text via Whisper / Deepgram / Google / Sarvam / HOJAI
- Routes text-to-speech via ElevenLabs / Cartesia / HOJAI
- Adaptive routing based on language, domain, budget mode, and quality threshold
- Training pipeline: collects audio→transcript pairs, benchmarks engines, promotes HOJAI when accuracy ≥ 92%
- Redis-backed event bus for async training job processing
- WebSocket streaming support for real-time voice UX
- 12 Indic languages (hi, bn, ta, te, mr, kn, ml, gu, pa, or, as) + 10 global languages
- Wired into RTMN Hub at `/api/foundation/voice-gateway/*`

See [./core/voice-gateway/CLAUDE.md](./core/voice-gateway/CLAUDE.md) for full documentation. |

## Architecture

```
Voice OS (4850)
├── TTS adapters        (Sarvam, ElevenLabs, Cartesia)
├── STT adapters        (provider-pluggable)
├── NLU
│   ├── Intent classifier
│   └── Sentiment analyzer
├── Telecom adapters    (Twilio, Exotel, Knowlarity)
├── Voice agents
│   ├── Appointment agent
│   ├── Voice commerce agent
│   ├── Voice search agent
│   └── Customer service agent
├── Models (Mongo)      (Call, Session, Transcript, VoiceAgent, Analytics)
├── Routes              (/api/voice/*)
└── Middleware          (auth, rateLimit)
```

## Connection to Canonical Voice Twin

Canonical HOJAI AI has:
- **Voice Twin** ([../../platform/twins/voice-twin/](../../platform/twins/voice-twin/)) at port 4876 — TTS/STT/voice profiles

Voice OS **complements** Voice Twin:
- Voice Twin = twin-level (one voice profile per entity)
- Voice OS = platform-level (telephony, NLU, agents, studio)

## Production Readiness

**Voice Gateway (canonical, `./core/voice-gateway/`) is ✅ production-ready** (Phase F, 2026-06-24):
- [x] JWT auth middleware
- [x] Helmet security headers
- [x] Rate limiting
- [x] `/health` + `/ready` endpoints
- [x] Graceful shutdown
- [x] Redis-backed event bus
- [x] TypeScript with 0 compile errors
- [x] Unit tests

Legacy services (HOJAI-VOICE-PLATFORM, voice-commerce, voice-ai-service) still need production-readiness audit per [../../PRODUCTION-READINESS-SUMMARY.md](../../PRODUCTION-READINESS-SUMMARY.md).
- [ ] Add `requireEnv` for env validation
- [ ] Add `/ready` endpoint
- [ ] Add `installGracefulShutdown`
- [ ] Add `PersistentMap` for any in-memory state
- [ ] Add tests
- [ ] Add Docker / healthcheck

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `PORT` | No | Default 4850 (core), 4590 (ai), 3000 (frontend), 4880 (backend) |
| `MONGODB_URI` | Yes | MongoDB connection |
| `REDIS_URL` | No | Redis cache |
| `JWT_SECRET` | Yes | JWT signing |
| `OPENAI_API_KEY` | No | LLM provider |
| `ELEVENLABS_API_KEY` | No | TTS provider |
| `SARVAM_API_KEY` | No | Indic TTS provider |
| `CARTESIA_API_KEY` | No | TTS provider |
| `TWILIO_*` | No | Twilio telecom |
| `EXOTEL_*` | No | Exotel telecom |
| `KNOWLARITY_*` | No | Knowlarity telecom |

## Commands

| Command | Description |
|---------|-------------|
| `npm install` | Install dependencies |
| `npm run dev` | Start dev server (tsx watch) |
| `npm run build` | TypeScript build |
| `npm start` | Run production build |
| `npm test` | Run vitest |

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Health check |
| GET | `/ready` | Readiness probe (TBD) |
| POST | `/api/voice/calls` | Initiate outbound call |
| POST | `/api/voice/agents/:id/invoke` | Invoke a voice agent |
| POST | `/api/voice/transcribe` | Speech-to-text |
| POST | `/api/voice/synthesize` | Text-to-speech |
| POST | `/api/voice/nlu/intent` | Intent classification |
| POST | `/api/voice/nlu/sentiment` | Sentiment analysis |

## Integration Points

### RTMN Foundation

| Service | Port | Integration |
|---------|------|-------------|
| CorpID | 4702 | JWT validation |
| MemoryOS | 4703 | Call context, transcripts |
| Voice Twin | 4876 | Voice profile lookup |

### Communication Cloud

| Service | Port | Integration |
|---------|------|-------------|
| RAZO Keyboard | 4725 | Voice-to-text bridge |
| Notification Service | 4870 | Post-call notifications |
| Live Support | 4868 | Escalation to human |

## Migration Notes

- 2026-06-22: 5 services migrated from `companies/REZ-Workspace/companies/hojai-ai/`. Originals preserved in REZ-Workspace per "don't lose anything" rule. See [../../REZ-WORKSPACE-AUDIT.md](../../REZ-WORKSPACE-AUDIT.md).

---

*Last Updated: 2026-06-22*
