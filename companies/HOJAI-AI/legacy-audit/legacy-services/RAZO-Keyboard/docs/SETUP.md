# RAZO Keyboard v2.0 - Setup & Deployment Guide

**Version:** 2.0
**Last Updated:** June 2026

---

## Prerequisites

- Node.js 18+
- npm or yarn
- Redis (optional, for caching)
- MongoDB (optional, for persistence)

---

## Quick Start

### 1. Clone & Install

```bash
cd RAZO-Keyboard
npm install
```

### 2. Start All Services

```bash
# Start all RAZO services
./start-all-services.sh

# Or individually:
cd CloudServices && npm run dev
```

### 3. Test APIs

```bash
# Test gateway health
curl http://localhost:4601/health

# Test predictions
curl -X POST http://localhost:4601/predict \
  -H "Content-Type: application/json" \
  -d '{"text":"hello","userId":"test"}'
```

---

## Service Architecture

```
RAZO Keyboard v2.0
├── Integration Gateway (4601) - Unified API
│   ├── Session Management
│   ├── Request Routing
│   └── Service Orchestration
│
├── Core Services
│   ├── Predictive Engine (4640) - Transformer predictions
│   ├── Intent Router (4650) - Wake word, VAD
│   ├── Smart Suggestions (4651) - Real-time suggestions
│   ├── Action Cards (4652) - OAuth plugins
│   └── Command Bar (4653) - Fuzzy commands
│
├── Supporting Services
│   ├── Cloud Sync (4631)
│   ├── Vault (4632)
│   ├── Search (4633)
│   ├── AI (4634)
│   ├── Cleanup (4635)
│   └── Snippets (4636)
│
└── External Integrations
    ├── Whisper (8081) - Speech-to-text
    ├── Genie (4706) - Personal AI
    └── Intelligence (4750) - Industry AI
```

---

## Environment Variables

### Gateway (.env)

```bash
# Server
PORT=4601
NODE_ENV=development

# Services
PREDICTIVE_URL=http://localhost:4640
INTENT_URL=http://localhost:4650
SUGGESTIONS_URL=http://localhost:4651
ACTIONS_URL=http://localhost:4652
COMMANDS_URL=http://localhost:4653

# External
WHISPER_URL=http://localhost:8081
GENIE_URL=http://localhost:4706
INTELLIGENCE_URL=http://localhost:4750

# Redis (optional)
REDIS_URL=redis://localhost:6379

# Security
JWT_SECRET=your-secret-key
API_KEY=your-api-key
```

---

## Docker Deployment

### docker-compose.yml

```yaml
version: '3.8'
services:
  gateway:
    build: ./CloudServices
    ports:
      - "4601:4601"
    environment:
      - NODE_ENV=production
    depends_on:
      - redis

  predictive:
    build: ./PREDICTIVE-ENGINE
    ports:
      - "4640:4640"

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
```

### Run with Docker

```bash
# Build and start
docker-compose up -d

# View logs
docker-compose logs -f

# Stop
docker-compose down
```

---

## Mobile SDK Integration

### Android

1. Add to `build.gradle`:
```kotlin
implementation 'com.razo:keyboard-sdk:2.0.0'
```

2. Initialize in your InputMethodService:
```kotlin
RazoKeyboard.init(context, sessionToken)
```

3. Use predictions:
```kotlin
RazoKeyboard.predict(text) { predictions ->
    // Handle predictions
}
```

### iOS

1. Add to `Podfile`:
```ruby
pod 'RazoKeyboardSDK', '~> 2.0'
```

2. Initialize:
```swift
RazoKeyboard.initialize(sessionToken: token)
```

3. Use predictions:
```swift
RazoKeyboard.predict(text) { predictions in
    // Handle predictions
}
```

---

## API Reference

### Session Initialization

```bash
POST /session/init
{
  "userId": "user_123",
  "platform": "android",
  "keyboardVersion": "2.0"
}
```

### Get Predictions

```bash
POST /predict
{
  "text": "hel",
  "userId": "user_123",
  "language": "en"
}
```

### Get Suggestions

```bash
POST /suggestions
{
  "text": "meeting at 3pm",
  "userId": "user_123",
  "language": "en"
}
```

### Execute Action

```bash
POST /actions/execute
{
  "actionType": "calendar",
  "actionData": {"title": "Meeting", "time": "3pm"},
  "userId": "user_123"
}
```

---

## Troubleshooting

### Services Not Starting

```bash
# Check port availability
lsof -i :4601

# Kill existing processes
pkill -f "tsx.*razo"
```

### Redis Connection Failed

Redis is optional. The system will fall back to in-memory caching.

### Mobile App Not Connecting

1. Ensure gateway is running: `curl http://localhost:4601/health`
2. Check firewall settings
3. Update mobile app URLs to point to correct server

---

## Performance Tuning

### Connection Pooling

```typescript
// Redis pool
const redisPool = {
  min: 5,
  max: 20
};

// MongoDB pool
const mongoPool = {
  poolSize: 10
};
```

### Rate Limiting

```typescript
const rateLimit = {
  windowMs: 60 * 1000,
  max: 100
};
```

---

## Security

### JWT Authentication

All API requests require a valid JWT token:
```
Authorization: Bearer <token>
```

### Rate Limiting

| Endpoint | Limit |
|----------|-------|
| /predict | 100/min |
| /suggestions | 60/min |
| /analytics/track | 200/min |

### E2E Encryption

Data is encrypted using AES-256-GCM with PBKDF2 key derivation.

---

## Monitoring

### Health Check

```bash
curl http://localhost:4601/health
```

### Service Status

```bash
curl http://localhost:4601/status
```

### Analytics Dashboard

```bash
curl http://localhost:4602/dashboard
```

---

## Support

For issues or questions:
- GitHub: github.com/imrejaul007/razo-keyboard
- Email: support@razo.app
