# Genie Voice Service

Communication hub - email, SMS, WhatsApp, calls for the RTMN ecosystem.

## Features

- **Multi-Channel Messaging**: Send email, SMS, and WhatsApp messages
- **Voice Calls**: Initiate and manage voice/video calls
- **Meeting Scheduling**: Schedule meetings with calendar integration
- **Message Tracking**: Track message status and delivery

## Quick Start

```bash
# Install dependencies
npm install

# Build TypeScript
npm run build

# Start service
npm start

# Or run in dev mode
npm run dev
```

## API Endpoints

### Health Check
```bash
curl http://localhost:4760/health
```

### Send Email
```bash
curl -X POST http://localhost:4760/api/message/send \
  -H "Content-Type: application/json" \
  -d '{
    "channel": "email",
    "to": "user@example.com",
    "subject": "Meeting Reminder",
    "body": "Don'\''t forget our meeting tomorrow at 10 AM."
  }'
```

### Send SMS
```bash
curl -X POST http://localhost:4760/api/message/send \
  -H "Content-Type: application/json" \
  -d '{
    "channel": "sms",
    "to": "+1234567890",
    "body": "Your verification code is 123456"
  }'
```

### Initiate Call
```bash
curl -X POST http://localhost:4760/api/communication/call \
  -H "Content-Type: application/json" \
  -d '{
    "to": "+1234567890",
    "direction": "outbound",
    "type": "voice",
    "record": true
  }'
```

### Schedule Meeting
```bash
curl -X POST http://localhost:4760/api/meeting/schedule \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Product Demo",
    "start_time": "2026-06-20T10:00:00Z",
    "end_time": "2026-06-20T11:00:00Z",
    "host_email": "host@example.com",
    "attendees": [
      { "email": "user@example.com" }
    ],
    "meeting_type": "video"
  }'
```

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| PORT | 4760 | Server port |
| INTERNAL_TOKEN | dev-internal-token | Auth token |
| NODE_ENV | development | Environment |
| SMTP_HOST | - | SMTP server |
| SMTP_USER | - | SMTP username |
| TWILIO_ACCOUNT_SID | - | Twilio account |
| TWILIO_AUTH_TOKEN | - | Twilio auth token |

## Architecture

```
genie-voice/
├── src/
│   ├── index.ts          # Main server
│   └── routes/
│       ├── message.ts    # Email/SMS/WhatsApp
│       ├── call.ts       # Voice/Video calls
│       └── meeting.ts    # Meeting scheduling
├── package.json
├── tsconfig.json
└── .env.example
```

## License
MIT
