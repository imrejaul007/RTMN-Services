# RAZO Keyboard v2.0 - Developer API Documentation

## Overview

RAZO Keyboard v2.0 is a comprehensive AI-powered keyboard system with transformer-based predictions, voice integration, and smart suggestions. This document covers all APIs for integration.

## Base URL

```
Production: https://api.razo.app/v2
Staging:    https://staging.razo.app/v2
Local:      http://localhost:4601
```

## Authentication

All API requests require authentication via JWT Bearer token.

```
Authorization: Bearer <session_token>
```

### Session Initialization

**POST** `/session/init`

Initialize a new session and receive a session token.

**Request:**
```json
{
  "userId": "user_123",
  "platform": "android|ios|web",
  "keyboardVersion": "2.0"
}
```

**Response:**
```json
{
  "sessionToken": "eyJhbGciOiJIUzI1NiIs...",
  "expiresAt": 1709312400000,
  "features": {
    "voice": true,
    "predictions": true,
    "suggestions": true
  }
}
```

---

## Prediction Engine

**POST** `/predict`

Get word predictions based on current input context.

**Request:**
```json
{
  "text": "hel",
  "userId": "user_123",
  "language": "en|hi|en-hi",
  "context": [
    {"role": "user", "content": "Hello, how are you?", "timestamp": 1709312400000}
  ]
}
```

**Response:**
```json
{
  "predictions": ["hello", "help", "hell"],
  "confidence": 0.95,
  "model": "transformer-v2",
  "language": "en"
}
```

---

## Smart Suggestions

**POST** `/suggestions`

Get contextual suggestions based on input.

**Request:**
```json
{
  "text": "meeting at 3pm",
  "userId": "user_123",
  "language": "en",
  "context": []
}
```

**Response:**
```json
{
  "suggestions": [
    {
      "type": "text",
      "content": "Please confirm the time.",
      "confidence": 0.88,
      "source": "grammar"
    },
    {
      "type": "action",
      "actionType": "calendar",
      "content": "📅 Add to Calendar",
      "icon": "calendar"
    }
  ]
}
```

---

## Intent Router

**POST** `/intent/route`

Route voice/text commands to appropriate services.

**Request:**
```json
{
  "text": "set reminder for tomorrow",
  "userId": "user_123",
  "language": "en",
  "wakeWord": null,
  "context": []
}
```

**Response:**
```json
{
  "intent": "set_reminder",
  "entities": {
    "action": "set",
    "type": "reminder",
    "time": "tomorrow"
  },
  "confidence": 0.92,
  "route": "genie"
}
```

---

## Action Cards

**POST** `/actions`

Get available action cards based on context.

**Request:**
```json
{
  "userId": "user_123",
  "context": "sending email to team"
}
```

**Response:**
```json
{
  "actions": [
    {
      "id": "calendar_quick",
      "type": "calendar",
      "title": "Quick Add Event",
      "icon": "calendar-plus",
      "provider": "google"
    },
    {
      "id": "email_template",
      "type": "email",
      "title": "Team Update Template",
      "icon": "mail",
      "provider": "gmail"
    }
  ]
}
```

### Execute Action

**POST** `/actions/execute`

Execute a specific action.

**Request:**
```json
{
  "actionType": "calendar",
  "actionData": {
    "title": "Team Meeting",
    "date": "2024-03-15",
    "time": "15:00"
  },
  "userId": "user_123"
}
```

**Response:**
```json
{
  "success": true,
  "result": "Event added to calendar",
  "actionId": "calendar_event_123"
}
```

---

## Command Bar

**POST** `/commands`

Search and get available commands.

**Request:**
```json
{
  "userId": "user_123",
  "query": "remind me"
}
```

**Response:**
```json
{
  "commands": [
    {
      "id": "reminder_create",
      "name": "Create Reminder",
      "description": "Set a reminder for later",
      "icon": "bell",
      "pattern": "remind me *"
    }
  ]
}
```

### Execute Command

**POST** `/commands/execute`

Execute a specific command.

**Request:**
```json
{
  "commandId": "reminder_create",
  "commandData": {
    "message": "Call doctor",
    "time": "tomorrow 10am"
  },
  "userId": "user_123"
}
```

**Response:**
```json
{
  "success": true,
  "result": "Reminder set for tomorrow at 10:00 AM"
}
```

---

## Genie Service

**POST** `/genie/briefing`

Get Genie briefing for current context.

**Request:**
```json
{
  "userId": "user_123",
  "context": [
    {"role": "user", "content": "I have a meeting tomorrow", "timestamp": 1709312400000}
  ],
  "language": "en"
}
```

**Response:**
```json
{
  "briefing": "You have 2 meetings tomorrow:\n• 10:00 AM - Team Standup\n• 2:00 PM - Project Review",
  "actionItems": ["Prepare slides for 2PM meeting"],
  "weather": "Sunny, 72°F"
}
```

---

## Whisper (Voice Processing)

**POST** `/whisper/process`

Process voice input through Whisper.

**Request:**
```json
{
  "text": "remind me to call mom",
  "userId": "user_123",
  "language": "en"
}
```

**Response:**
```json
{
  "corrected": "Remind me to call Mom",
  "confidence": 0.96,
  "entities": [
    {"type": "action", "value": "reminder"},
    {"type": "person", "value": "Mom"}
  ]
}
```

---

## Analytics

**POST** `/analytics/track`

Track user interactions and analytics.

**Request:**
```json
{
  "event": "prediction_selected",
  "data": {
    "prediction": "hello",
    "language": "en"
  },
  "userId": "user_123",
  "timestamp": 1709312400000
}
```

**Response:**
```json
{
  "success": true
}
```

---

## Offline Sync

**POST** `/sync`

Sync offline data when connection is restored.

**Request:**
```json
{
  "data": "encrypted_offline_data",
  "userId": "user_123"
}
```

**Response:**
```json
{
  "success": true,
  "synced": 15,
  "conflicts": []
}
```

---

## Error Codes

| Code | Description |
|------|-------------|
| 400 | Bad Request - Invalid parameters |
| 401 | Unauthorized - Invalid or expired token |
| 403 | Forbidden - Feature not available |
| 404 | Not Found - Resource doesn't exist |
| 429 | Rate Limited - Too many requests |
| 500 | Internal Error - Server error |
| 503 | Service Unavailable - Try again later |

---

## Rate Limits

| Endpoint | Limit | Window |
|----------|-------|--------|
| `/predict` | 100/min | 1 minute |
| `/suggestions` | 60/min | 1 minute |
| `/analytics/track` | 200/min | 1 minute |
| All others | 30/min | 1 minute |

---

## WebSocket (Real-time)

For real-time updates, connect to WebSocket:

```
wss://api.razo.app/v2/ws?token=<session_token>
```

### Events

**Client → Server:**
```json
{"type": "subscribe", "channel": "predictions"}
{"type": "subscribe", "channel": "suggestions"}
```

**Server → Client:**
```json
{"type": "prediction", "data": {"predictions": [...]}}
{"type": "suggestion", "data": {"suggestions": [...]}}
```

---

## Mobile SDK

### Android

```kotlin
// Add to build.gradle
implementation 'com.razo:keyboard-sdk:2.0.0'

// Initialize
RazoKeyboard.init(context, sessionToken)

// Use in InputMethodService
RazoKeyboard.predict(text) { predictions ->
    // Handle predictions
}
```

### iOS

```swift
// Add to Podfile
pod 'RazoKeyboardSDK', '~> 2.0'

// Initialize
RazoKeyboard.initialize(sessionToken: token)

// Use in UIInputViewController
RazoKeyboard.predict(text) { predictions in
    // Handle predictions
}
```

---

## Testing

### Sandbox Environment

Use sandbox for testing:
```
https://sandbox.razo.app/v2
```

### Test User

```
userId: test_user_001
sessionToken: test_token_sandbox
```

---

## Changelog

### v2.0 (2024-03)
- Added transformer-based predictions
- Multi-language support (en/hi/en-hi)
- Real-time suggestions
- Action cards with OAuth providers
- Genie integration
- Whisper voice processing
- Offline mode with E2E encryption