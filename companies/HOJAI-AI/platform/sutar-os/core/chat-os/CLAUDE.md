# ChatOS - Port 4876

## Overview
WhatsApp, Teams, Slack intelligence.

## Purpose
Unified messaging intelligence across all communication channels.

## Key Features
- Multi-channel message management
- Conversation intelligence
- Sentiment analysis
- Smart routing
- Auto-responses
- Intent detection

## API Endpoints

### Channels
- `GET /api/channels` - List channels
- `POST /api/channels` - Add channel
- `PATCH /api/channels/:id` - Update channel

### Messages
- `POST /api/messages` - Send message
- `GET /api/messages/:conversationId` - Get messages

### Conversations
- `GET /api/conversations` - List conversations
- `GET /api/conversations/:id` - Get conversation
- `PATCH /api/conversations/:id` - Update conversation

### Auto-Responses
- `GET /api/auto-responses` - List responses
- `POST /api/auto-responses` - Create response

### Analytics
- `GET /api/analytics/sentiment` - Sentiment analysis
- `GET /api/analytics/intents` - Intent breakdown

## Channel Types
- `slack` - Slack
- `teams` - Microsoft Teams
- `whatsapp` - WhatsApp
- `telegram` - Telegram
- `discord` - Discord
- `internal` - Internal chat

## Sentiment Labels
- `positive` - Good sentiment
- `negative` - Bad sentiment
- `neutral` - Neutral

## Tests
Vitest tests: `__tests__/chat-os.test.ts`

## Environment
- Port: 4876

## Startup
```bash
cd platform/sutar-os/core/chat-os && npm run dev
```
