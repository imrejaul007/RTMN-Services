# Unified Support Bridge v2.0

> **Service:** Unified Support Bridge
> **Port:** 4885
> **Version:** 2.0.0 (production-ready)
> **Built:** June 28-29, 2026
> **Tested:** WhatsApp ✅ Email ✅ App ✅ SSE ✅ WebSocket ✅ Cross-channel linking ✅
> **Tests:** 17/17 passing (integration tests)
> **RTMN Hub:** `/api/support/*` → `http://localhost:4885`

## What it does

**The missing layer that connects Email, WhatsApp, and App channels to unified customer support — with customer identity resolution, conversation merging, and real-time events.**

## Start

```bash
cd companies/HOJAI-AI/products/hib/unified-support-bridge
npm start  # dev (in-memory)

# Production
USE_REDIS=true USE_MONGODB=true npm start
```

## All Endpoints

| Method | Path | Purpose |
|--------|------|---------|
| `GET` | `/health` | Health + upstream connectivity |
| `POST` | `/api/webhooks/whatsapp` | WhatsApp inbound |
| `POST` | `/api/webhooks/email` | Email inbound |
| `POST` | `/api/webhooks/app` | App/chat inbound |
| `POST` | `/api/customers/resolve` | Resolve customerId |
| `POST` | `/api/customers/link` | Link identifiers |
| `GET` | `/api/customers` | List customers |
| `GET` | `/api/customers/:id` | Customer + conversations |
| `POST` | `/api/conversations/:id/merge` | Merge conversations |
| `POST` | `/api/conversations/:id/ticket` | Create ticket |
| `GET` | `/api/events/stream` | SSE real-time events |
| `POST` | `/api/support/notify` | Send to customer via RAZO |
| `POST` | `/api/admin/keys/generate` | Generate API key |
| `GET` | `/api/admin/webhooks/whatsapp/status` | Check webhook URL |
| `POST` | `/api/admin/webhooks/whatsapp/register` | Register with Meta/Twilio |
| `GET` | `/api/stats` | Aggregate statistics |

## Quick Test

```bash
# WhatsApp
curl -X POST http://localhost:4885/api/webhooks/whatsapp \
  -H "Content-Type: application/json" \
  -d '{"from":"+919876543210","contactName":"Rahul","text":"Hello"}'

# Email
curl -X POST http://localhost:4885/api/webhooks/email \
  -H "Content-Type: application/json" \
  -d '{"from":"rahul@company.com","subject":"Help","text":"I need help"}'

# App
curl -X POST http://localhost:4885/api/webhooks/app \
  -H "Content-Type: application/json" \
  -d '{"appUserId":"usr_123","message":"Hello","platform":"do-app"}'

# Stats
curl http://localhost:4885/api/stats

# SSE
curl -N http://localhost:4885/api/events/stream
```

## Source Files

| File | Purpose |
|------|---------|
| `src/index.js` | Main service (routes, storage, identity) |
| `src/storage.js` | In-memory / Redis / MongoDB abstraction |
| `src/emailHandler.js` | Email (SMTP + IMAP + provider webhooks) |
| `src/whatsappWebhook.js` | WhatsApp (Meta/Twilio/360dialog) |
| `src/events.js` | SSE + WebSocket + Redis Pub/Sub |
