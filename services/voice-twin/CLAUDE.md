# Voice Twin Service

**Version:** 1.0.0  
**Port:** 4876  
**Status:** Ready for Development

## Overview

Voice Twin is a microservice that stores voice call data, transcriptions, sentiment analysis, and AI-generated summaries. It connects to Customer Operations through the Customer Twin service and supports multi-tenant deployments.

## Features

- [x] Voice call recording and tracking
- [x] Twilio integration (webhook for incoming/outgoing calls)
- [x] OpenAI Whisper transcription
- [x] Sentiment analysis (positive/neutral/negative)
- [x] AI-powered call summaries
- [x] Customer Twin synchronization
- [x] Event Bus integration
- [x] Multi-tenant support
- [x] Voice analytics dashboard
- [x] Recording management

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         Voice Twin Service                       │
│                            Port: 4876                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐ │
│  │  Calls API  │  │Transcription│  │      Analytics API      │ │
│  │  /api/calls │  │   /api/     │  │    /api/analytics       │ │
│  └──────┬──────┘  │ transcription│  └───────────┬─────────────┘ │
│         │         └──────┬──────┘                │               │
│         └────────┬───────┴────────────────────────┘               │
│                  │                                                │
│  ┌───────────────▼────────────────────────────────────────────┐ │
│  │                    Service Layer                            │ │
│  │  ┌──────────┐  ┌────────────┐  ┌──────────┐  ┌──────────┐ │ │
│  │  │ Twilio   │  │Transcription│ │ Sentiment │  │ Summary  │ │ │
│  │  │ Service  │  │  Service   │  │  Service  │  │ Service  │ │ │
│  │  └──────────┘  └────────────┘  └──────────┘  └──────────┘ │ │
│  └───────────────────────────────────────────────────────────┘ │
│                              │                                   │
│  ┌───────────────────────────▼───────────────────────────────┐ │
│  │               Customer Twin Sync Service                    │ │
│  │     (Syncs voice data to Customer Twin at port 3017)       │ │
│  └───────────────────────────────────────────────────────────┘ │
│                              │                                   │
├──────────────────────────────┼───────────────────────────────────┤
│                              │                                   │
│  ┌───────────────────────────▼───────────────────────────────┐ │
│  │                      MongoDB                                 │ │
│  │         (Collections: calls, recordings)                     │ │
│  └───────────────────────────────────────────────────────────┘ │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

## API Endpoints

### Calls

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/calls` | Create new call |
| GET | `/api/calls` | List all calls |
| GET | `/api/calls/:callId` | Get call by ID |
| PATCH | `/api/calls/:callId` | Update call |
| DELETE | `/api/calls/:callId` | Delete call |
| GET | `/api/calls/customer/:customerId` | Get calls by customer |

### Transcriptions

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/transcriptions` | Transcribe a call |
| GET | `/api/transcriptions/:callId` | Get transcription |
| PATCH | `/api/transcriptions/:callId` | Update transcription |
| POST | `/api/transcriptions/batch` | Batch transcription |
| GET | `/api/transcriptions/customer/:customerId` | Customer transcription history |

### Analytics

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/analytics/calls` | Call statistics |
| GET | `/api/analytics/customer/:customerId` | Customer voice analytics |
| GET | `/api/analytics/performance` | Performance metrics |
| GET | `/api/analytics/sentiment` | Sentiment analysis |
| GET | `/api/analytics/dashboard` | Real-time dashboard |

### Webhooks

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/webhooks/twilio/call` | Incoming call webhook |
| POST | `/webhooks/twilio/status` | Call status update |
| POST | `/webhooks/twilio/recording` | Recording completed |

### Health

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Health check |
| GET | `/ready` | Readiness check |

## Data Models

### Call Schema

```typescript
{
  callId: string;              // Unique call ID (VC-XXXXXXXX)
  tenantId: string;            // Tenant identifier
  customerId: string;           // Customer identifier
  direction: 'inbound' | 'outbound';
  duration: number;            // Duration in seconds
  status: 'ringing' | 'answered' | 'completed' | 'missed' | 'failed';
  twilioSid?: string;         // Twilio call SID
  from: string;                // Caller phone number
  to: string;                   // Receiver phone number
  recordingUrl?: string;
  transcript?: string;
  sentiment?: 'positive' | 'neutral' | 'negative';
  intent?: string;
  summary?: string;
  connectedTo?: {
    twinId: string;
    serviceType: string;
  };
  startedAt?: Date;
  answeredAt?: Date;
  endedAt?: Date;
}
```

### Recording Schema

```typescript
{
  recordingId: string;
  callId: string;
  tenantId: string;
  twilioRecordingSid?: string;
  twilioRecordingUrl?: string;
  duration: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  transcription?: string;
  sentiment?: string;
  storageUrl?: string;
  fileSize?: number;
  mimeType?: string;
  processedAt?: Date;
}
```

## Environment Variables

```bash
# Service
PORT=4876

# MongoDB
MONGODB_URI=mongodb://localhost:27017/voice-twin

# Twilio
TWILIO_ACCOUNT_SID=ACxxxxxxxx
TWILIO_AUTH_TOKEN=xxxx
TWILIO_PHONE_NUMBER=+1234567890

# OpenAI
OPENAI_API_KEY=sk-xxxx

# Integrations
CUSTOMER_TWIN_URL=http://localhost:3017
EVENT_BUS_URL=http://localhost:4510

# Logging
LOG_LEVEL=info
```

## Customer Twin Integration

Voice Twin automatically syncs data with Customer Twin service:

- **Update on call creation**: Links call to customer
- **Update on call completion**: Syncs duration, sentiment, summary
- **Event publishing**: Publishes voice events to Event Bus

### Customer Twin Updates

| Field | Description |
|-------|-------------|
| `lastCallId` | Most recent call ID |
| `lastCallAt` | Last call timestamp |
| `lastCallDuration` | Duration in seconds |
| `lastCallSentiment` | Sentiment analysis |
| `lastCallIntent` | Detected intent |
| `lastCallSummary` | AI-generated summary |

## Quick Start

```bash
# Install dependencies
cd services/voice-twin
npm install

# Copy environment file
cp .env.example .env

# Configure environment variables
# Edit .env with your credentials

# Start development server
npm run dev

# Build for production
npm run build
npm start
```

## Health Check

```bash
curl http://localhost:4876/health
```

Response:
```json
{
  "status": "healthy",
  "service": "voice-twin",
  "version": "1.0.0",
  "port": 4876,
  "timestamp": "2026-06-16T10:00:00.000Z",
  "dependencies": {
    "mongodb": "connected"
  }
}
```

## Usage Examples

### Create a Call

```bash
curl -X POST http://localhost:4876/api/calls \
  -H "Content-Type: application/json" \
  -H "X-Tenant-ID: tenant123" \
  -d '{
    "customerId": "CUST-001",
    "direction": "inbound",
    "from": "+1234567890",
    "to": "+0987654321"
  }'
```

### Transcribe a Call

```bash
curl -X POST http://localhost:4876/api/transcriptions \
  -H "Content-Type: application/json" \
  -H "X-Tenant-ID: tenant123" \
  -d '{
    "callId": "VC-12345678",
    "audioUrl": "https://api.twilio.com/recordings/xxx.wav"
  }'
```

### Get Analytics

```bash
curl "http://localhost:4876/api/analytics/dashboard?tenantId=tenant123"
```

## Event Types

Voice Twin publishes the following events to Event Bus:

| Event | Description |
|-------|-------------|
| `voice.call.created` | New call initiated |
| `voice.call.answered` | Call answered |
| `voice.call.completed` | Call completed |
| `voice.call.missed` | Call missed |
| `voice.recording.available` | Recording ready |
| `voice.transcription.completed` | Transcription done |
| `voice.sentiment.analyzed` | Sentiment analyzed |

## Dependencies

| Package | Purpose |
|---------|---------|
| express | HTTP server |
| mongoose | MongoDB ODM |
| twilio | Twilio SDK |
| openai | OpenAI API (Whisper, GPT) |
| zod | Validation |
| winston | Logging |
| cors | CORS |
| helmet | Security headers |

## Port Registry

| Service | Port |
|---------|------|
| Voice Twin | 4876 |
| Customer Twin | 3017 |
| Event Bus | 4510 |

## Contributing

1. Follow existing code patterns
2. Add validation with Zod schemas
3. Include health check updates
4. Update PORT-REGISTRY.md
5. Add tests for new features

## License

MIT
