# Voice Widget - HOJAI SiteOS

Text-to-Speech, Speech-to-Text, and IVR services for HOJAI SiteOS.

## Quick Start

```bash
cd voice-widget
npm install
npm start
```

## Features

- **TTS (Text-to-Speech)**: Convert text to natural speech
- **STT (Speech-to-Text)**: Transcribe speech to text
- **IVR (Interactive Voice Response)**: Automated phone menus
- **Multi-language**: Support for 10 Indian languages
- **Configurable**: Per-company voice settings

## API Reference

### Start IVR Session

```bash
curl -X POST http://localhost:5463/api/voice/ivr/start \
  -H 'Content-Type: application/json' \
  -d '{
    "companyId": "your-company",
    "phone": "+919876543210",
    "context": "support"
  }'
```

### Process IVR Input

```bash
curl -X POST http://localhost:5463/api/voice/ivr/SESSION_ID/input \
  -H 'Content-Type: application/json' \
  -d '{"dtmf": "1"}'
```

### Synthesize Speech

```bash
curl -X POST http://localhost:5463/api/voice/synthesize \
  -H 'Content-Type: application/json' \
  -d '{
    "text": "Welcome to our service",
    "voice": "female-premium",
    "language": "en-IN"
  }'
```

### Transcribe Audio

```bash
curl -X POST http://localhost:5463/api/voice/transcribe \
  -H 'Content-Type: application/json' \
  -d '{
    "audioUrl": "https://example.com/audio.webm",
    "language": "en-IN"
  }'
```

## Configuration

### Environment Variables

```bash
VOICE_WIDGET_PORT=5463
VOICE_GATEWAY_URL=http://localhost:4880
MEMORY_OS_URL=http://localhost:4703
```

### Voice Configuration

Get company voice config:

```bash
curl http://localhost:5463/api/voice/config/your-company
```

Update voice config:

```bash
curl -X PUT http://localhost:5463/api/voice/config/your-company \
  -H 'Content-Type: application/json' \
  -d '{
    "defaultLanguage": "hi-IN",
    "defaultVoice": "female-hindi"
  }'
```

## Available Voices

| Voice ID | Language | Gender |
|----------|----------|--------|
| female-premium | en-IN | Female |
| male-premium | en-IN | Male |
| female-hindi | hi-IN | Female |
| male-hindi | hi-IN | Male |
| female-tamil | ta-IN | Female |
| female-telugu | te-IN | Female |

## Available Languages

- English (en-IN)
- Hindi (hi-IN)
- Tamil (ta-IN)
- Telugu (te-IN)
- Malayalam (ml-IN)
- Bengali (bn-IN)
- Gujarati (gu-IN)
- Kannada (kn-IN)
- Marathi (mr-IN)
- Punjabi (pa-IN)

## Analytics

Get voice analytics:

```bash
curl "http://localhost:5463/api/voice/analytics?companyId=your-company"
```

Response:

```json
{
  "success": true,
  "data": {
    "totalSessions": 150,
    "completed": 120,
    "transferred": 25,
    "abandoned": 5,
    "completionRate": "80.00",
    "transferRate": "16.67",
    "avgDuration": 145
  }
}
```

## License

Proprietary - HOJAI AI
