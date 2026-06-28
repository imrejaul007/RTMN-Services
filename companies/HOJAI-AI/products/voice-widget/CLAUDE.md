# Voice Widget

**Port:** 5463
**Phase:** 3
**Purpose:** TTS, STT, phone IVR

## Features

- Text-to-Speech with 6 Indian languages
- Speech-to-Text
- IVR menu builder
- Voice sessions

## API

- `POST /api/voice/synthesize` — TTS
- `POST /api/voice/transcribe` — STT
- `POST /api/voice/ivr/start` — Start IVR

## Startup

```bash
cd products/voice-widget && npm install && npm start
```