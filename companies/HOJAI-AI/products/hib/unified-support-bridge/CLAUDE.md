# Unified Support Bridge

> **Service:** Unified Support Bridge
> **Port:** 4885
> **Layer:** 5 (Communication Cloud — Channel Services)
> **Built:** June 28, 2026
> **Status:** ✅ Production-ready v1.0
> **RTMN Hub:** `/api/support/*` → `http://localhost:4885`

## What it does

**The missing layer that connects Email, WhatsApp, and App channels to unified
customer support — with customer identity resolution and conversation merging.**

Before this service: a customer could message on WhatsApp, then email, then app —
and support agents would see **three separate conversations** with **no way to
know they're the same person**.

After this service: every message is resolved to a canonical `customerId`, all
conversations are linked, and agents can merge threads across channels.

## Architecture

```
 WhatsApp ──────► WhatsApp OS (4860) ──────► unified-support-bridge ──────► unified-inbox (4870)
                  (provider)                      │                        (8-channel inbox)
                                                  │
 Email ────────────────────────────────────────────► │
                                                  │
 App / Chat ──────────────────────────────────────► │ ──► ticket-engine (4872)
                                                  │              (tickets)
 WhatsApp ──────► Meta/Twilio ───────────────────► │
 webhook                                                 │
        ▲                                              │
        │◄──────── CorpID (4702) ── customer resolution
```

## The Problem We Solve

| Before | After |
|--------|-------|
| WhatsApp: phone-based conversations | All channels resolve to same `customerId` |
| Email: email-based conversations | Agent sees ALL conversations for same customer |
| App: appUserId-based conversations | Customer can continue ticket from any channel |
| No merge capability | One API call to merge 2+ conversations |
| Siloed channel support | Unified customer view across channels |

## Customer Identity Resolution

The bridge maps identifiers to a canonical `customerId`:

```
phone: +91-8123456789  ─┐
email: sarah@corp.com   ─┼──► customerId: cust-a1b2c3d4e5f6
appUserId: usr_12345   ─┘
```

- **Phone normalization**: E.164 format (`+91XXXXXXXXXX`) from any input format
- **Email normalization**: lowercase, trimmed
- **CorpID lookup**: if customer exists in CorpID, use that `customerId`
- **Reverse index**: `channelToCustomerMap` lets us find customer from any identifier
- **Link additional IDs**: `POST /api/customers/link` to add phone/email/appUserId to existing customer

## Channel Webhooks

### WhatsApp (`POST /api/webhooks/whatsapp`)
- Accepts Meta WhatsApp webhook format or our own `whatsapp-os` format
- Extracts `from` (phone), `contactName`, `messageText`
- Resolves `customerId` from phone
- Creates conversation in `unified-inbox` with `source:whatsapp` tag
- Adds message to conversation
- Returns `customerId` and `conversationId` for continuity

### Email (`POST /api/webhooks/email`)
- Accepts SendGrid, AWS SES, and generic formats
- Extracts `from` (email), `subject`, `body`, `messageId`, `inReplyTo`
- Handles email threading via `inReplyTo` — links to existing conversation
- Same customer resolution flow

### App (`POST /api/webhooks/app`)
- Accepts `{ appUserId, message, sessionId, platform }`
- `platform` defaults to `do-app`
- Links to existing conversation if `sessionId` matches

## Cross-Channel Continuity

```
Customer starts on WhatsApp:
  WhatsApp webhook → customerId=cust-xxx, conversationId=conv-whatsapp-1

Customer continues via Email:
  Email webhook → same customerId=cust-xxx
               → finds existing conv-whatsapp-1 OR creates new
               → agent sees "Same customer, different channel"

Customer calls support:
  App webhook → same customerId=cust-xxx
             → all 3 conversations visible in unified view
```

## Conversation Merge

```bash
# Merge WhatsApp + Email + App conversations into one
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
  "linkedConversations": ["conv-email-1", "conv-app-1"]
}
```

After merge:
- Primary conversation has `linkedConversations` array
- All merged conversations point to primary via `mergedInto`
- Unified-inbox gets tagged with `merged:*` labels
- All messages accessible via `GET /api/customers/:id/activity`

## Key Endpoints

| Method | Path | Purpose |
|--------|------|---------|
| `GET` | `/health` | Health + counts |
| `POST` | `/api/webhooks/whatsapp` | Receive WhatsApp messages |
| `POST` | `/api/webhooks/email` | Receive email (SendGrid/SES/generic) |
| `POST` | `/api/webhooks/app` | Receive app/chat messages |
| `POST` | `/api/customers/resolve` | Resolve customer identity |
| `POST` | `/api/customers/link` | Link additional IDs to customer |
| `GET` | `/api/customers` | List all tracked customers |
| `GET` | `/api/customers/:id` | Customer + all their conversations |
| `GET` | `/api/customers/:id/conversations` | All conversations across channels |
| `GET` | `/api/customers/:id/activity` | Unified timeline of all messages |
| `POST` | `/api/conversations/:id/merge` | Merge 2+ conversations |
| `GET` | `/api/conversations/:id/linked` | Linked conversations |
| `POST` | `/api/conversations/:id/ticket` | Create ticket from conversation |
| `GET` | `/api/stats` | Bridge statistics |

## Via RTMN Hub

All endpoints accessible through RTMN Hub:

```bash
# WhatsApp message received
curl -X POST http://localhost:4399/api/support/webhooks/whatsapp \
  -H 'Content-Type: application/json' \
  -d '{"from": "+918123456789", "text": "My order is late"}'

# Email received
curl -X POST http://localhost:4399/api/support/webhooks/email \
  -H 'Content-Type: application/json' \
  -d '{"from": "sarah@corp.com", "subject": "Billing question", "text": "..."}'

# Resolve customer
curl -X POST http://localhost:4399/api/support/customers/resolve \
  -H 'Content-Type: application/json' \
  -d '{"email": "sarah@corp.com"}'

# Get all conversations for customer
curl http://localhost:4399/api/support/customers/cust-xxx/conversations

# Merge conversations
curl -X POST http://localhost:4399/api/support/conversations/conv-1/merge \
  -H 'Content-Type: application/json' \
  -d '{"mergeWith": ["conv-2", "conv-3"]}'
```

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `4885` | Service port |
| `UNIFIED_INBOX_URL` | `http://localhost:4870` | Unified Inbox service |
| `TICKET_ENGINE_URL` | `http://localhost:4872` | Ticket Engine service |
| `CORPID_URL` | `http://localhost:4702` | CorpID for customer lookup |
| `INTERNAL_SERVICE_TOKEN` | `dev-token` | Internal auth token |

## Integration Points

- **unified-inbox (4870)**: Creates conversations, adds messages
- **ticket-engine (4872)**: Creates tickets from conversations
- **whatsapp-os (4860)**: Can route webhooks through bridge
- **CorpID (4702)**: Customer identity resolution
- **RTMN Hub (4399)**: `/api/support/*` routes

## Limitations (v1.0)

- **In-memory stores**: Production should use Redis/MongoDB
- **No real CorpID integration**: Falls back to local customer creation
- **No real external service calls**: Uses local storage when upstreams unavailable
- **Merge is metadata-only**: Messages aren't physically moved to primary conversation
- **No real-time events**: No SSE/WebSocket for live updates

## Startup

```bash
cd companies/HOJAI-AI/products/hib/unified-support-bridge
npm install
npm start
# Listens on port 4885
```
