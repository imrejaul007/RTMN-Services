# Voice AI Runtime

**Voice AI Runtime** is the voice layer for the RTMN ecosystem - handles voice calls, IVR flows, speech recognition (STT), text-to-speech (TTS), and AI-powered voice responses.

**Port:** 4876

## Quick Start

```bash
# Install dependencies
cd services/voice-ai-runtime
npm install

# Copy environment file
cp .env.example .env

# Edit .env with your API keys (OpenAI, Twilio)

# Start in development mode
npm run dev

# Health check
curl http://localhost:4876/health
```

## Features

- Real-time voice conversations via WebSocket
- IVR (Interactive Voice Response) flows
- Speech-to-text using OpenAI Whisper
- Text-to-speech using OpenAI
- Voice LLM with GPT-4o
- Transfer to human agents
- Integration with Ticket Engine, Customer Twin, Agent Copilot

## API Endpoints

### Call Management
- `POST /api/calls` - Initiate outbound call
- `GET /api/calls/:sessionId` - Get call details
- `POST /api/calls/:sessionId/transfer` - Transfer to agent

### Session Management
- `GET /api/sessions` - List sessions
- `GET /api/sessions/:id/transcript` - Get transcript
- `POST /api/sessions/:id/end` - End session

### WebSocket
- `WS /ws/voice?sessionId=<id>` - Voice connection

## Documentation

See [CLAUDE.md](./CLAUDE.md) for detailed documentation.
