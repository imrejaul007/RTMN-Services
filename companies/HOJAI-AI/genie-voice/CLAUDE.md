# Genie Voice Service

## Overview
Communication hub - email, SMS, WhatsApp, calls for the RTMN ecosystem.

## Port
**4760**

## Service Dependencies
- None (standalone service)

## Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Health check |
| POST | `/api/message/send` | Send email/SMS/WhatsApp |
| GET | `/api/message/status/:id` | Get message status |
| GET | `/api/message/log` | Get message log |
| POST | `/api/communication/call` | Initiate call |
| GET | `/api/communication/call/:id` | Get call details |
| POST | `/api/meeting/schedule` | Schedule meeting |
| GET | `/api/meeting/:id` | Get meeting details |
| PATCH | `/api/meeting/:id` | Update meeting |
| DELETE | `/api/meeting/:id` | Cancel meeting |

## Authentication
Uses `X-Internal-Token` header for authentication in production.

## Run Commands
```bash
npm install
npm run build
npm start
```

## Environment Variables
- `PORT`: Server port (default: 4760)
- `INTERNAL_TOKEN`: Authentication token
- `ALLOWED_ORIGINS`: CORS allowed origins
- `NODE_ENV`: development/production
- `SMTP_*`: Email settings
- `TWILIO_*`: SMS settings
