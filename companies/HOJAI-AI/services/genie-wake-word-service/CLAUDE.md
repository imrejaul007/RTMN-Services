# Genie Wake Word Service

**Version:** 1.0.0  
**Port:** 4767  
**Status:** ✅ Production Ready

---

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
cd companies/HOJAI-AI/services/genie-wake-word-service
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
