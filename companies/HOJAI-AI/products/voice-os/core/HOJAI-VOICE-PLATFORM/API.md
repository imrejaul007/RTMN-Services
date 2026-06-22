# HOJAI VOICE PLATFORM - API Documentation

## Base URL
```
http://localhost:4850/api
```

## Authentication

All API requests require JWT authentication:

```
Authorization: Bearer <token>
```

## Common Response Format

### Success
```json
{
  "success": true,
  "data": { ... },
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 100,
    "totalPages": 5
  }
}
```

### Error
```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human readable message",
    "details": { ... }
  }
}
```

---

## Agents API

### Create Agent
```http
POST /api/agents
Content-Type: application/json
Authorization: Bearer <token>

{
  "name": "Customer Support",
  "type": "customer-service",
  "language": "en-IN",
  "greeting": "Namaste! How can I help you?",
  "voiceConfig": {
    "voiceId": "预设-indian-female-1",
    "ttsEngine": "elevenlabs",
    "sttEngine": "whisper"
  },
  "intents": [
    {
      "name": "greeting",
      "description": "User is greeting",
      "examples": ["hello", "hi", "namaste"],
      "action": "handleGreeting"
    }
  ]
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "agent-uuid",
    "name": "Customer Support",
    "type": "customer-service",
    "status": "active",
    "language": "en-IN",
    "...": "..."
  }
}
```

### List Agents
```http
GET /api/agents?type=customer-service&status=active&page=1&limit=20
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "data": [ ... ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 10,
    "totalPages": 1
  }
}
```

### Get Agent
```http
GET /api/agents/:id
Authorization: Bearer <token>
```

### Update Agent
```http
PUT /api/agents/:id
Content-Type: application/json
Authorization: Bearer <token>

{
  "name": "Updated Name",
  "greeting": "New greeting message"
}
```

### Delete Agent
```http
DELETE /api/agents/:id
Authorization: Bearer <token>
```

### Train Agent
```http
POST /api/agents/:id/train
Authorization: Bearer <token>
```

---

## Calls API

### Initiate Call
```http
POST /api/calls
Content-Type: application/json
Authorization: Bearer <token>

{
  "to": "+919876543210",
  "agentId": "agent-uuid",
  "from": "+919876543211"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "call-uuid",
    "direction": "outbound",
    "status": "initiated",
    "...": "..."
  }
}
```

### List Calls
```http
GET /api/calls?agentId=xxx&status=completed&page=1&limit=50
Authorization: Bearer <token>
```

### Get Call
```http
GET /api/calls/:id
Authorization: Bearer <token>
```

### Transfer Call
```http
POST /api/calls/:id/transfer
Content-Type: application/json
Authorization: Bearer <token>

{
  "transferTo": "+919876543299"
}
```

### Get Call Transcript
```http
GET /api/calls/:id/transcript
Authorization: Bearer <token>
```

---

## Sessions API

### Start Session
```http
POST /api/sessions
Content-Type: application/json
Authorization: Bearer <token>

{
  "agentId": "agent-uuid",
  "customerId": "customer-123",
  "language": "en-IN",
  "context": {
    "customerName": "John Doe",
    "customerEmail": "john@example.com"
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "sessionId": "session-uuid",
    "agentId": "agent-uuid",
    "status": "active",
    "language": "en-IN"
  }
}
```

### Get Session
```http
GET /api/sessions/:id
Authorization: Bearer <token>
```

### Send Message
```http
POST /api/sessions/:id/message
Content-Type: application/json
Authorization: Bearer <token>

{
  "content": "Hello, I need help with my order"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "userMessage": { ... },
    "response": "Hello! I'd be happy to help you with your order.",
    "intent": "order_status",
    "sentiment": 0.7
  }
}
```

### Send Audio
```http
POST /api/sessions/:id/audio
Content-Type: application/json
Authorization: Bearer <token>

{
  "audio": "base64-encoded-audio",
  "mimeType": "audio/webm"
}
```

### Get Session History
```http
GET /api/sessions/:id/history
Authorization: Bearer <token>
```

### End Session
```http
POST /api/sessions/:id/end
Authorization: Bearer <token>
```

---

## Transcription API

### Transcribe Audio
```http
POST /api/transcription
Content-Type: application/json

{
  "audio": "base64-encoded-audio",
  "language": "en-IN",
  "engine": "whisper"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "text": "Hello, how can I help you today?",
    "language": "en-IN",
    "confidence": 0.95,
    "words": [
      { "word": "Hello", "startTime": 0, "endTime": 300, "confidence": 0.98 }
    ]
  }
}
```

### Get Engine Health
```http
GET /api/transcription/health
```

---

## Synthesis API

### Synthesize Speech
```http
POST /api/synthesis
Content-Type: application/json

{
  "text": "Namaste! How can I help you today?",
  "voiceId": "预设-indian-female-1",
  "language": "en-IN",
  "engine": "elevenlabs",
  "speed": 1.0,
  "pitch": 1.0
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "audioUrl": "data:audio/mp3;base64,...",
    "duration": 3.5,
    "format": "mp3"
  }
}
```

---

## Intent API

### Analyze Text
```http
POST /api/intent/analyze
Content-Type: application/json

{
  "text": "I want to track my order",
  "intents": [
    {
      "name": "order_tracking",
      "description": "Track an order",
      "examples": ["track my order", "where is my order"],
      "action": "handleTracking"
    }
  ],
  "language": "en-IN"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "intent": {
      "intent": "order_tracking",
      "confidence": 0.92,
      "parameters": { "orderId": null }
    },
    "sentiment": {
      "label": "neutral",
      "score": 0.1,
      "confidence": 0.85
    }
  }
}
```

### Analyze Sentiment Only
```http
POST /api/intent/sentiment
Content-Type: application/json

{
  "text": "I'm very happy with your service!",
  "language": "en-IN"
}
```

---

## Analytics API

### Get Overall Analytics
```http
GET /api/analytics?startDate=2026-01-01&endDate=2026-01-31
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "totalCalls": 1247,
    "completedCalls": 1098,
    "averageDuration": 195,
    "averageSentiment": 0.72,
    "completionRate": 88.1,
    "topIntents": [
      { "intent": "greeting", "count": 423, "percentage": 34 }
    ],
    "callsByHour": [
      { "hour": 9, "count": 78 }
    ]
  }
}
```

### Get Agent Analytics
```http
GET /api/analytics/agents/:id?startDate=2026-01-01&endDate=2026-01-31
Authorization: Bearer <token>
```

### Get Dashboard Data
```http
GET /api/analytics/dashboard
Authorization: Bearer <token>
```

---

## Webhooks

### Twilio Voice Webhook
```http
POST /api/webhooks/twilio
Content-Type: application/x-www-form-urlencoded

CallSid=CAxxx
From=+919876543210
To=+919876543211
SpeechResult=Hello
CallStatus=in-progress
```

### Twilio Status Callback
```http
POST /api/webhooks/twilio/status
Content-Type: application/x-www-form-urlencoded

CallSid=CAxxx
CallStatus=completed
CallDuration=120
```

---

## WebSocket

Connect to `ws://localhost:4850/ws`

### Messages

**Start Session:**
```json
{
  "type": "session:start",
  "agentId": "agent-uuid"
}
```

**Send Audio:**
```json
{
  "type": "audio",
  "audio": "base64-encoded-audio",
  "mimeType": "audio/webm"
}
```

**Send Text:**
```json
{
  "type": "text",
  "content": "Hello"
}
```

**Receive Response:**
```json
{
  "type": "synthesis",
  "text": "Hello! How can I help you?",
  "audio": "data:audio/mp3;base64,..."
}
```

---

## Error Codes

| Code | Description |
|------|-------------|
| UNAUTHORIZED | Missing or invalid token |
| FORBIDDEN | Insufficient permissions |
| NOT_FOUND | Resource not found |
| VALIDATION_ERROR | Invalid request body |
| RATE_LIMIT_EXCEEDED | Too many requests |
| INTERNAL_ERROR | Server error |
