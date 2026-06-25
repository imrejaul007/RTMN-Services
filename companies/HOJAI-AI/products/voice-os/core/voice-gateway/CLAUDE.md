# HOJAI Voice Gateway — Service Documentation

> **Version:** 1.0.0
> **Port:** 4880
> **Path:** `companies/HOJAI-AI/products/voice-os/core/voice-gateway/`

## Overview

The **HOJAI Voice Gateway** is a unified STT/TTS routing service with a built-in training pipeline. It routes audio transcription and speech synthesis through external providers (Whisper, Deepgram, Google, Sarvam, ElevenLabs, Cartesia) while simultaneously collecting audio→transcript pairs to train HOJAI's own voice model.

**Key constraint:** *"our voice should get trained"* — every external provider call is logged as a training sample. When HOJAI model accuracy exceeds the external provider on benchmark tests, routing switches to HOJAI.

## Architecture

```
Audio Input (base64)
       │
       ▼
┌─────────────────────────┐
│   HOJAI VOICE GATEWAY   │  port 4880
│                         │
│  1. Route to engine     │
│  2. Log training sample │
│  3. Emit training event │
│  4. Return result       │
└────────┬────────────────┘
         │
    ┌────┴────┬──────────────┐
    ▼         ▼              ▼
Whisper  Deepgram/Google  Sarvam     ← External STT (collects samples)
    │         │              │
    └─────────┴──────────────┘
              │
              ▼
    ┌──────────────────┐
    │  Training Queue  │  → HOJAI model training
    │  (Redis/Kafka)   │
    └────────┬─────────┘
             │
             ▼
    ┌──────────────────┐
    │  HOJAI Voice     │  ← promoted when accuracy >= threshold
    │  Model           │
    └──────────────────┘
```

## Quick Start

```bash
cd companies/HOJAI-AI/products/voice-os/core/voice-gateway
npm install
cp .env.example .env   # fill in API keys
npm run dev            # port 4880
```

## Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/v1/stt` | Transcribe audio → text |
| `GET` | `/api/v1/stt/engines` | List STT engines + accuracy |
| `POST` | `/api/v1/tts` | Synthesize text → audio |
| `GET` | `/api/v1/tts/engines` | List TTS engines |
| `GET` | `/api/v1/training/stats` | Training pipeline stats |
| `POST` | `/api/v1/training/benchmark` | Run accuracy benchmark |
| `POST` | `/api/v1/training/export` | Export training dataset |
| `DELETE` | `/api/v1/training/samples` | Clear samples after deploy |
| `GET` | `/health` | Health check |
| `GET` | `/ready` | Readiness probe |

## STT Usage

```bash
curl -X POST http://localhost:4880/api/v1/stt \
  -H 'Content-Type: application/json' \
  -d '{
    "audio": "'$(base64 -i audio.webm)'",
    "filename": "audio.webm",
    "language": "en",
    "engine": "auto"      // or whisper|deepgram|google|sarvam|hojai
  }'
```

Response:
```json
{
  "success": true,
  "data": {
    "text": "Book a table for two",
    "language": "en",
    "confidence": 0.87,
    "engine": "whisper",
    "latencyMs": 340,
    "hojaiReady": false,
    "hojaiAccuracy": 0.0
  }
}
```

## TTS Usage

```bash
curl -X POST http://localhost:4880/api/v1/tts \
  -H 'Content-Type: application/json' \
  -d '{
    "text": "Your table has been booked for two at seven PM",
    "engine": "auto",      // or elevenlabs|cartesia|hojai
    "language": "en",
    "voiceId": "EXAVITQu4vr4xnSDxMaL"
  }'
```

## Training Pipeline

### How it works

1. Every `POST /api/v1/stt` call to an external provider logs the audio→transcript pair
2. Samples are deduplicated by audio hash (SHA-256 of first 4KB)
3. `GET /api/v1/training/stats` shows sample counts per engine
4. When `totalSamples >= TRAIN_MIN_SAMPLES`, run the benchmark
5. `POST /api/v1/training/benchmark` compares HOJAI vs external on the benchmark corpus
6. When HOJAI accuracy >= `STT_HOJAI_ACCURACY_THRESHOLD` (default 0.92), it's promoted
7. Set `STT_ENGINE=hojai` to route all traffic to the promoted model
8. `DELETE /api/v1/training/samples` clears old samples after model deployment

### Benchmark Corpus

Run `npm run seed` to see the 40-sample benchmark corpus (en, hi, ta, te, bn, mr + mixed-code).

To use real benchmark audio:
1. Place `.webm` files at `<TRAINING_DATASET_PATH>/benchmark/{audio_id}.webm`
2. Run `POST /api/v1/training/benchmark`

## HOJAI Model Promotion

```
Default: Whisper/Deepgram/Google/Sarvam
     ↓ (external call → training sample logged)
Training Queue
     ↓ (TRAIN_MIN_SAMPLES reached)
Benchmark Run
     ↓ (HOJAI accuracy >= threshold)
Promotion to default STT
     ↓ (traffic switches to HOJAI)
External calls stop → no more training samples
     ↓ (new model version needed)
Repeat
```

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | 4880 | Server port |
| `STT_ENGINE` | auto | Default STT engine |
| `TTS_ENGINE` | auto | Default TTS engine |
| `STT_HOJAI_ACCURACY_THRESHOLD` | 0.92 | Accuracy threshold for HOJAI promotion |
| `TRAINING_ENABLED` | true | Enable training sample collection |
| `TRAIN_MIN_SAMPLES` | 500 | Min samples before benchmark |
| `WHISPER_API_KEY` | - | OpenAI Whisper API key |
| `DEEPGRAM_API_KEY` | - | Deepgram API key |
| `SARVAM_API_KEY` | - | Sarvam AI API key |
| `ELEVENLABS_API_KEY` | - | ElevenLabs API key |
| `CARTESIA_API_KEY` | - | Cartesia API key |
| `HOJAI_STT_MODEL_URL` | localhost:4881 | Local HOJAI STT endpoint |
| `HOJAI_TTS_MODEL_URL` | localhost:4882 | Local HOJAI TTS endpoint |

## Adapter Architecture

Real adapters in `src/adapters/`:
- **STT:** `whisper/`, `deepgram/`, `google/`, `sarvam/`, `hojai/`
- **TTS:** `elevenlabs/`, `cartesia/`, `hojai/`

Each adapter implements `ISTTAdapter` or `ITTSAdapter` and is registered in `adapters/stt/index.ts` and `adapters/tts/index.ts`.

## Production Deployment

```bash
docker compose up -d
# Health check
curl http://localhost:4880/health
```

With custom API keys:
```bash
STT_ENGINE=deepgram \
ELEVENLABS_API_KEY=sk_xxx \
docker compose up -d
```

## File Structure

```
voice-gateway/
├── src/
│   ├── index.ts                    # Express server, routes
│   ├── config/index.ts             # Environment config
│   ├── types/index.ts              # Shared types
│   ├── adapters/
│   │   ├── stt/
│   │   │   ├── index.ts           # Registry + isSTTEngine
│   │   │   ├── whisper.adapter.ts
│   │   │   ├── deepgram.adapter.ts
│   │   │   ├── google.adapter.ts
│   │   │   ├── sarvam.adapter.ts
│   │   │   └── hojai.adapter.ts
│   │   └── tts/
│   │       ├── index.ts           # Registry + isTTSEngine
│   │       ├── elevenlabs.adapter.ts
│   │       ├── cartesia.adapter.ts
│   │       └── hojai.adapter.ts
│   └── scripts/
│       └── seed-benchmark.ts       # Benchmark corpus seeder
├── package.json
├── tsconfig.json
├── .env.example
├── docker-compose.yml
└── CLAUDE.md
```
