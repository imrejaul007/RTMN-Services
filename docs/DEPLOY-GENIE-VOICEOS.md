# Genie + VoiceOS Deployment Guide

## Quick Start

### Option 1: Docker (Recommended for Production)

```bash
# Build and start all services
docker compose -f docker-compose.genie-voiceos.yml up -d

# Check status
docker compose -f docker-compose.genie-voiceos.yml ps

# View logs
docker compose -f docker-compose.genie-voiceos.yml logs -f

# Stop
docker compose -f docker-compose.genie-voiceos.yml down
```

### Option 2: Local Development

```bash
# Start all services
bash scripts/start-genie-voice-complete.sh

# Or start individually
cd companies/HOJAI-AI/platform/voice/speaker-diarization && npm start  # Port 4894
cd companies/HOJAI-AI/platform/voice/voice-embedding && npm start      # Port 4895
cd companies/HOJAI-AI/platform/voice/meeting-intelligence && npm start # Port 4890
cd companies/HOJAI-AI/products/genie/genie-decision-twin && npm start # Port 4741
cd companies/HOJAI-AI/platform/voice/voice-cloning && npm start        # Port 4897
cd companies/HOJAI-AI/platform/storage/meeting-storage && npm start    # Port 4896
```

---

## Services

| Service | Port | Docker Port | Description |
|---------|------|-------------|-------------|
| **speaker-diarization** | 4894 | 4894 | Speaker detection (identifies your voice at 5%) |
| **voice-embedding** | 4895 | 4895 | Real voiceprints |
| **meeting-intelligence** | 4890 | 4890 | Full meeting analysis pipeline |
| **decision-twin** | 4741 | 4741 | Permanent decision memory |
| **voice-cloning** | 4897 | 4897 | Speak AS YOU (ElevenLabs) |
| **meeting-storage** | 4896 | 4896 | MongoDB-backed persistence |

### Infrastructure
| Service | Port | Docker Port | Description |
|---------|------|-------------|-------------|
| **Redis** | 6380 | 6379 | Caching |
| **MongoDB** | 27018 | 27017 | Database |

---

## Environment Variables

```bash
# Copy example env
cp .env.example .env

# Edit with your API keys
vim .env
```

### Required for Production

```bash
# Speech Recognition (choose one)
AZURE_SPEECH_KEY=your_azure_key
AZURE_SPEECH_REGION=eastus

# OR
OPENAI_API_KEY=sk-...  # For Whisper

# LLM Intelligence (choose one)
ANTHROPIC_API_KEY=sk-ant-...  # Claude (recommended)
# OR
OPENAI_API_KEY=sk-...        # GPT-4o

# Voice Cloning
ELEVENLABS_API_KEY=your_elevenlabs_key
```

---

## API Endpoints

### Meeting Analysis
```bash
# Full pipeline
POST http://localhost:4890/api/meeting/analyze
{
  "audio": "base64_audio_data",
  "userId": "user_001",
  "knownSpeakers": [
    {"userId": "user_001", "name": "Rejaul"},
    {"userId": "investor_001", "name": "Investor A"}
  ]
}
```

### Speaker Diarization
```bash
# Identify speakers
POST http://localhost:4894/api/diarize
{
  "audio": "base64_audio",
  "language": "en-US",
  "knownSpeakers": [...]
}
```

### Decision Twin
```bash
# Create decision
POST http://localhost:4741/api/decision
{
  "what": "Expand to Dubai",
  "why": "High GCC hospitality demand",
  "who": ["Founder", "Investor A"]
}

# Ask "Why?"
GET http://localhost:4741/api/decisions/why?what=Dubai
```

### Voice Cloning
```bash
# Clone voice
POST http://localhost:4897/api/voice/clone
{
  "userId": "user_001",
  "name": "Rejaul",
  "samples": ["base64_audio_1", "base64_audio_2"]
}

# Speak as user
POST http://localhost:4897/api/voice/speak
{
  "userId": "user_001",
  "text": "Hello, how can I help?",
  "emotion": "neutral"
}
```

---

## Health Checks

```bash
# Check all services
curl http://localhost:4399/api/health/all  # Via RTMN Hub

# Or individually
curl http://localhost:4890/health
curl http://localhost:4894/health
curl http://localhost:4895/health
curl http://localhost:4741/health
curl http://localhost:4896/health
curl http://localhost:4897/health
```

---

## RTMN Hub Integration

All services are registered in RTMN Hub at port 4399:

```
/api/meeting/*      → Meeting Intelligence (4890)
/api/diarization/*   → Speaker Diarization (4894)
/api/voice-embedding/* → Voice Embedding (4895)
/api/meeting-storage/* → Meeting Storage (4896)
/api/voice-cloning/*   → Voice Cloning (4897)
/api/decision-twin/*    → Decision Twin (4741)
```

---

## Troubleshooting

### Services won't start
```bash
# Check port conflicts
lsof -i :4890
lsof -i :4894
lsof -i :4895

# Kill existing processes
lsof -ti :4890 | xargs kill -9
```

### MongoDB connection failed
```bash
# Start MongoDB manually
mongod --dbpath /usr/local/var/mongodb
```

### Memory issues
```bash
# Increase Node memory
export NODE_OPTIONS="--max-old-space-size=4096"
```

---

## Docker Commands Reference

```bash
# Build
docker compose -f docker-compose.genie-voiceos.yml build

# Start
docker compose -f docker-compose.genie-voiceos.yml up -d

# Stop
docker compose -f docker-compose.genie-voiceos.yml down

# Restart single service
docker compose -f docker-compose.genie-voiceos.yml restart speaker-diarization

# View logs
docker compose -f docker-compose.genie-voiceos.yml logs -f speaker-diarization

# Scale service
docker compose -f docker-compose.genie-voiceos.yml up -d --scale speaker-diarization=3
```
