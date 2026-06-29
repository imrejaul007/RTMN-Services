# Voice Identity Bridge

**Port:** 4885  
**Package:** `@hojai/voice-identity-bridge`

Link voice fingerprints to CorpID for personalized voice experiences.

## Architecture

```
Voice Fingerprint → Voice Identity Bridge → CorpID
```

## Features

- Voice fingerprint to CorpID registration
- Bidirectional mapping
- Trust score tracking
- Verification level management

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/register` | Register voice with CorpID |
| POST | `/lookup` | Lookup CorpID from voice |
| GET | `/corp/:corpId/voices` | Get all voices for CorpID |
| PUT | `/trust` | Update trust score |
| DELETE | `/unregister` | Remove voice link |
| GET | `/health` | Health check |

## Quick Start

```bash
npm install
npm start
```

## Example

```bash
# Register voice
curl -X POST http://localhost:4885/register \
  -H "Content-Type: application/json" \
  -d '{"voiceFingerprint": "abc123", "corpId": "user_001", "trustScore": 80}'

# Lookup
curl -X POST http://localhost:4885/lookup \
  -H "Content-Type: application/json" \
  -d '{"voiceFingerprint": "abc123"}'
```

## Testing

```bash
npm test
```
