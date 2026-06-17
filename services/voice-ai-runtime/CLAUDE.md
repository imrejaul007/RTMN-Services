# Voice AI Runtime

**Port:** 4876  
**Status:** Active  
**Service Type:** Voice/Communication Layer

---

## Overview

Voice AI Runtime is the voice layer for the RTMN ecosystem. It handles all voice interactions including IVR flows, speech recognition, AI-powered responses, and human agent transfers.

```
┌─────────────────────────────────────────────────────────────────┐
│                    VOICE AI RUNTIME                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐         │
│  │   Twilio    │    │  WebSocket  │    │  HTTP API   │         │
│  │  (Inbound)  │    │  (Clients)   │    │  (Manage)   │         │
│  └──────┬──────┘    └──────┬──────┘    └──────┬──────┘         │
│         │                  │                  │                │
│  ┌──────▼──────────────────▼──────────────────▼──────┐         │
│  │              VOICE SESSION MANAGER                 │         │
│  │         (Call State, Transcript, IVR)              │         │
│  └──────┬──────────────────┬──────────────────┬──────┘         │
│         │                  │                  │                │
│  ┌──────▼──────┐    ┌──────▼──────┐    ┌──────▼──────┐         │
│  │     STT     │    │     LLM     │    │     TTS     │         │
│  │  (Whisper)  │    │  (GPT-4o)   │    │  (Speech)   │         │
│  └─────────────┘    └─────────────┘    └─────────────┘         │
│                            │                                    │
│  ┌─────────────────────────▼─────────────────────────┐          │
│  │              INTEGRATION LAYER                   │          │
│  │  Ticket Engine │ Customer Twin │ Agent Copilot   │          │
│  └───────────────────────────────────────────────────┘          │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Features

### Core Voice Features
- **Real-time Voice Conversations** - WebSocket-based bidirectional audio streaming
- **IVR Flows** - Configurable interactive voice response menus
- **Speech Recognition** - OpenAI Whisper for accurate transcription
- **Text-to-Speech** - Natural-sounding voice synthesis
- **Voice LLM** - AI-powered conversational responses

### Integrations
- **Twilio** - Inbound/outbound voice calls
- **Ticket Engine** - Auto-create tickets on transfer/completion
- **Customer Twin** - Update customer profiles with call data
- **Agent Copilot** - Real-time AI suggestions for human agents
- **Memory OS** - Save call transcripts to memory

### Capabilities
- Multi-language support (English, Spanish configured)
- Queue-based agent routing
- Priority-based transfers
- Session management and analytics
- Audio buffering for streaming STT

---

## API Endpoints

### Health & Info
```
GET /health          - Service health check
GET /api            - API information
GET /docs           - API documentation
```

### Call Management
```
POST /api/calls              - Initiate outbound call
GET  /api/calls/:sessionId   - Get call details
POST /api/calls/:sessionId/transfer  - Transfer to agent
POST /api/calls/status       - Twilio status webhook
GET  /api/calls/stats        - Call statistics
```

### Session Management
```
GET  /api/sessions           - List all sessions
GET  /api/sessions/:id       - Get session details
GET  /api/sessions/:id/transcript - Get transcript
POST /api/sessions/:id/end   - End session
GET  /api/sessions/active    - List active sessions
```

### WebSocket
```
WS /ws/voice?sessionId=<id>  - Voice WebSocket connection
```

---

## WebSocket Protocol

### Client -> Server Messages

#### Send Audio
```json
{
  "type": "audio",
  "sessionId": "abc123",
  "data": { "audio": "<base64>" }
}
```

#### Send Text (DTMF or typed)
```json
{
  "type": "text",
  "sessionId": "abc123",
  "data": { "text": "I need help" }
}
```

#### Perform Action
```json
{
  "type": "action",
  "sessionId": "abc123",
  "data": {
    "action": "transfer",
    "params": { "queue": "support" }
  }
}
```

### Server -> Client Messages

#### Audio Response
```json
{
  "type": "audio",
  "sessionId": "abc123",
  "data": {
    "audio": "<base64>",
    "text": "How can I help you today?"
  }
}
```

#### Transcript Update
```json
{
  "type": "transcript",
  "sessionId": "abc123",
  "data": {
    "text": "Hello, I need assistance",
    "confidence": 0.95
  }
}
```

#### Transfer Notification
```json
{
  "type": "transfer",
  "sessionId": "abc123",
  "data": {
    "success": true,
    "transferId": "TF-xxx",
    "targetType": "queue",
    "targetId": "support",
    "waitTime": 25
  }
}
```

---

## IVR Flows

### Default Flows

#### Main Menu (`main`)
1. Welcome (language selection)
2. Main menu (Sales, Support, Accounting, Agent)
3. Department-specific flows

#### Support Menu (`support`)
1. Issue type selection
2. Route to appropriate queue

#### Appointment (`appointment`)
1. Service type selection
2. Information collection

### Custom Flow Configuration

```typescript
const flow: IVRFlow = {
  id: 'custom',
  name: 'Custom Menu',
  initialState: 'welcome',
  states: {
    welcome: {
      prompt: 'Welcome to our service. Press 1 for X, Press 2 for Y.',
      timeout: 5,
      maxAttempts: 3,
      options: [
        { digit: '1', prompt: 'Option 1', action: 'transfer', params: { queue: 'team-a' } },
        { digit: '2', prompt: 'Option 2', action: 'transfer', params: { queue: 'team-b' } },
      ],
      onFallback: 'agent',
    },
  },
};

ivrRouter.registerFlow(flow);
```

---

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `PORT` | No | 4876 | Server port |
| `TWILIO_ACCOUNT_SID` | For Twilio | - | Twilio Account SID |
| `TWILIO_AUTH_TOKEN` | For Twilio | - | Twilio Auth Token |
| `TWILIO_PHONE_NUMBER` | For outbound | - | Twilio phone number |
| `OPENAI_API_KEY` | For AI | - | OpenAI API key |
| `VOICE_MODEL` | No | ft-voice-2024-06-17 | Voice model |
| `WHISPER_MODEL` | No | whisper-1 | Whisper model |
| `TICKET_ENGINE_URL` | For tickets | localhost:4300 | Ticket engine URL |
| `CUSTOMER_TWIN_URL` | For profiles | localhost:3017 | Customer twin URL |
| `AGENT_COPILOT_URL` | For suggestions | localhost:4765 | Agent copilot URL |
| `MEMORY_OS_URL` | For memory | localhost:4703 | Memory OS URL |

---

## Running the Service

```bash
# Install dependencies
cd services/voice-ai-runtime
npm install

# Copy environment file
cp .env.example .env
# Edit .env with your API keys

# Development
npm run dev

# Production
npm run build
npm start

# Health check
npm run health
```

---

## Architecture Notes

### Session Management
- Sessions are stored in-memory (use Redis in production)
- Sessions auto-cleanup after 1 hour of inactivity
- Transcript history kept for LLM context

### Audio Processing
- Audio buffered in 5-second chunks for STT
- WebSocket supports both binary audio and JSON messages
- TTS responses returned as base64-encoded MP3

### Integration Patterns
- **Ticket Engine** - Creates ticket on transfer with transcript
- **Customer Twin** - Updates call count and last session
- **Agent Copilot** - Provides AI suggestions during calls
- **Memory OS** - Saves complete call history

---

## Port Registry

| Service | Port | Purpose |
|---------|------|---------|
| Voice AI Runtime | 4876 | Voice calls, IVR, STT/TTS |

**Related Services:**
- Ticket Engine: 4300
- Customer Twin: 3017
- Agent Copilot: 4765
- Memory OS: 4703

---

## Last Updated

June 16, 2026
