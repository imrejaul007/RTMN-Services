# Unified Support Bridge v2.0

> **Service:** Unified Support Bridge
> **Port:** 4885
> **Version:** 2.0.0 (production-ready)
> **Built:** June 28, 2026
> **RTMN Hub:** `/api/support/*` → `http://localhost:4885`
> **Source:** [src/](src/) — `index.js` + `storage.js` + `emailHandler.js` + `whatsappWebhook.js` + `events.js`

## What it does

**The missing layer that connects Email, WhatsApp, and App channels to unified customer support — with customer identity resolution, conversation merging, and real-time events.**

## Production Features (v2.0)

| Feature | Implementation |
|---------|----------------|
| **Storage** | In-memory (dev) / Redis / MongoDB / Redis+MongoDB (production) |
| **CorpID Integration** | Retry (3x), exponential backoff, 5-min cache |
| **Email Inbound** | SMTP receiver (port 1025 dev) + IMAP polling + SendGrid/SES/Mailgun/Postmark webhooks |
| **WhatsApp Verification** | Meta Cloud API + Twilio + 360dialog, HMAC-SHA256 signature verification |
| **Real-Time Events** | SSE (agent dashboards) + WebSocket (chat) + Redis Pub/Sub (multi-process) |

## Run Modes

```bash
# Dev (in-memory, no deps)
npm start

# Redis-backed
USE_REDIS=true npm start

# MongoDB-backed
USE_MONGODB=true npm start

# Full production (Redis + MongoDB)
USE_REDIS=true USE_MONGODB=true npm start

# Production env vars
REDIS_URL=redis://localhost:6379 \
MONGODB_URI=mongodb://localhost:27017/unified-support-bridge \
WHATSAPP_VERIFY_TOKEN=your-token \
WHATSAPP_APP_SECRET=your-secret \
CORPID_URL=http://localhost:4702 \
npm start
```

## Architecture

```
 WhatsApp ──► Meta/Twilio/360dialog ──► WhatsApp webhook ──► customerId ──► unified-inbox
               (verified + signed)       (port 4885)
                                                         │
 Email ───────► SMTP (1025) ───────────────────────────────► │
               IMAP polling (Gmail/etc.)                  │
               SendGrid/SES/Mailgun ─────────────────────► │ ──► ticket-engine
               (webhook)                                    │
 App ─────────► /webhooks/app ────────────────────────────► │
                                                         │
 WhatsApp ──► Meta/Twilio ──► Webhook verification ──► GET challenge ──► 200 OK

 Agent Dashboard ◄──── SSE stream (/api/events/stream)
 Agent App    ◄──── WebSocket (/ws/events)
 Multi-process ◄─── Redis Pub/Sub
```

## Customer Identity Resolution

```
phone: +91-8123456789 ─┐
email: sarah@corp.com   ─┼──► customerId: cust-abc123
appUserId: usr_123    ─┘
```

- **E.164 phone normalization** (handles `8123456789`, `+91-81234-56789`, etc.)
- **Lowercase email** (stored normalized)
- **Reverse index** for fast lookups from any identifier
- **CorpID lookup** with retry (3x), backoff, 5-min cache
- **Cross-channel linking** — if `appUserId` given alongside phone/email, links to existing customer

## Channel Webhooks

### WhatsApp (`POST /api/webhooks/whatsapp`)
- Verifies Meta/Twilio/360dialog challenge token (GET) and HMAC signature (POST)
- Accepts Meta Cloud API format, Twilio format, or our own `whatsapp-os` format
- Extracts text, images, audio, video, documents, locations, reactions, stickers
- Handles delivery status callbacks (sent/delivered/read/failed)
- Auto-responds `200 OK` within Meta's 20s timeout

### Email (`POST /api/webhooks/email`)
- Normalizes from SendGrid, AWS SES, Mailgun, Postmark, or generic formats
- Email threading via `In-Reply-To` header — links reply to existing conversation
- HTML stripping + plain text extraction

### App (`POST /api/webhooks/app`)
- Accepts `{ appUserId, message, sessionId, platform }`
- Supports Do App, Genie, and any custom platform

## Email Inbound Methods

| Method | Config | Use Case |
|--------|--------|----------|
| **SMTP receiver** | `SMTP_PORT=1025` | Run as MX for your domain |
| **IMAP polling** | `IMAP_USER`, `IMAP_PASSWORD`, `IMAP_HOST` | Poll Gmail/Outlook |
| **SendGrid webhook** | `POST /api/webhooks/email` | SendGrid Inbound Parse |
| **SES webhook** | `POST /api/webhooks/email` | AWS SES rules |
| **Mailgun webhook** | `POST /api/webhooks/email` | Mailgun routes |
| **Postmark webhook** | `POST /api/webhooks/email` | Postmark inbound |

## Real-Time Events (SSE + WebSocket)

### SSE — Agent Dashboards
```bash
# Subscribe to all events
curl -N http://localhost:4885/api/events/stream

# Filter by customer
curl -N "http://localhost:4885/api/events/stream?customerId=cust-xxx"

# Filter by channel
curl -N "http://localhost:4885/api/events/stream?channel=whatsapp"
```

### WebSocket — Real-Time Chat
```javascript
const ws = new WebSocket('ws://localhost:4885/ws/events');
ws.send(JSON.stringify({ type: 'subscribe', channel: 'customer:cust-xxx' }));
ws.send(JSON.stringify({ type: 'ping' }));

ws.onmessage = (e) => {
  const event = JSON.parse(e.data);
  console.log(event.type, event.data);
};
```

### Event Types
| Event | When |
|-------|------|
| `message.received` | New message from any channel |
| `conversation.created` | New conversation opened |
| `conversation.updated` | Conversation status/tags changed |
| `conversation.merged` | Conversations merged |
| `ticket.created` | Ticket created from conversation |
| `ticket.updated` | Ticket status changed |
| `conversation.assigned` | Agent assigned |
| `customer.linked` | Identifiers linked |
| `escalation.created` | Escalation triggered |

## Conversation Merge

```bash
POST /api/support/conversations/conv-whatsapp-1/merge
{
  "mergeWith": ["conv-email-1", "conv-app-1"]
}

# Response:
{
  "success": true,
  "primaryConversationId": "conv-whatsapp-1",
  "mergedFrom": ["conv-email-1", "conv-app-1"],
  "channels": ["whatsapp", "email", "chat"],
  "customerId": "cust-xxx"
}
```

## All Endpoints

| Method | Path | Purpose |
|--------|------|---------|
| `GET` | `/health` | Health + storage + feature flags |
| `POST` | `/api/webhooks/whatsapp` | WhatsApp inbound (verified) |
| `POST` | `/api/webhooks/email` | Email inbound (any provider) |
| `POST` | `/api/webhooks/app` | App/chat inbound |
| `POST` | `/api/customers/resolve` | Resolve customerId from identifier |
| `POST` | `/api/customers/link` | Link additional IDs to customer |
| `GET` | `/api/customers` | List all customers |
| `GET` | `/api/customers/:id` | Customer + conversations |
| `GET` | `/api/customers/:id/conversations` | All conversations across channels |
| `GET` | `/api/customers/:id/activity` | Unified timeline |
| `POST` | `/api/conversations/:id/merge` | Merge conversations |
| `GET` | `/api/conversations/:id/linked` | Linked conversations |
| `POST` | `/api/conversations/:id/ticket` | Create ticket from conversation |
| `GET` | `/api/stats` | Bridge statistics |
| `GET` | `/api/events/stream` | SSE real-time events |
| `GET` | `/api/events/stats` | Event stream stats |
| `POST` | `/api/events/emit` | Manually emit event (testing) |

## Via RTMN Hub

```bash
# WhatsApp message
curl -X POST http://localhost:4399/api/support/webhooks/whatsapp \
  -H 'Content-Type: application/json' \
  -d '{"from": "+918123456789", "text": "My order is late"}'

# Email
curl -X POST http://localhost:4399/api/support/webhooks/email \
  -H 'Content-Type: application/json' \
  -d '{"from": "sarah@corp.com", "subject": "Billing", "text": "..."}'

# Resolve customer
curl -X POST http://localhost:4399/api/support/customers/resolve \
  -d '{"email": "sarah@corp.com"}'

# SSE stream
curl -N http://localhost:4399/api/support/events/stream
```

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `4885` | Service port |
| `USE_REDIS` | `false` | Enable Redis storage |
| `USE_MONGODB` | `false` | Enable MongoDB storage |
| `REDIS_URL` | `redis://localhost:6379` | Redis connection URL |
| `MONGODB_URI` | `mongodb://localhost:27017/usb` | MongoDB URI |
| `UNIFIED_INBOX_URL` | `http://localhost:4870` | Unified Inbox service |
| `TICKET_ENGINE_URL` | `http://localhost:4872` | Ticket Engine service |
| `CORPID_URL` | `http://localhost:4702` | CorpID for customer lookup |
| `WHATSAPP_VERIFY_TOKEN` | `usb-verify-token-change-me` | WhatsApp webhook verify token |
| `WHATSAPP_APP_SECRET` | (same as verify token) | Meta App Secret for HMAC |
| `WHATSAPP_PROVIDER` | `meta` | `meta` \| `twilio` \| `360dialog` |
| `TWILIO_AUTH_TOKEN` | — | Twilio auth token for signature |
| `SMTP_PORT` | `0` (disabled) | SMTP receiver port (25/1025/2525) |
| `IMAP_USER` | — | IMAP polling username |
| `IMAP_PASSWORD` | — | IMAP polling password |
| `IMAP_HOST` | `imap.gmail.com` | IMAP server |
| `IMAP_PORT` | `993` | IMAP port |
| `IMAP_TLS` | `true` | Use TLS |
| `IMAP_POLL_INTERVAL` | `60000` | Poll interval in ms |
| `INTERNAL_SERVICE_TOKEN` | `dev-token` | Internal auth token |

## Source Files

| File | Lines | Purpose |
|------|-------|---------|
| `src/index.js` | ~800 | Main service, routes, storage integration |
| `src/storage.js` | ~500 | In-memory / Redis / MongoDB abstraction |
| `src/emailHandler.js` | ~420 | SMTP receiver, IMAP polling, provider normalizers |
| `src/whatsappWebhook.js` | ~350 | Webhook verification, signature, message parsing |
| `src/events.js` | ~300 | SSE, WebSocket, Redis Pub/Sub, emit helpers |
