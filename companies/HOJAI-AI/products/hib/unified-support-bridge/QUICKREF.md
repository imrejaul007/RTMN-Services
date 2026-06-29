# USB Quick Reference

> Last updated: June 29, 2026

## Start
```bash
cd /Users/rejaulkarim/Documents/RTMN/companies/HOJAI-AI/products/hib/unified-support-bridge
USE_REDIS=false USE_MONGODB=false node src/index.js
# Port: 4885
```

## Run Tests
```bash
node --test __tests__/integration/usb.integration.test.js
# 17/17 passing
```

## API Quick Reference

### Health
- `GET /health` — returns version, features, upstream connectivity

### Customer Identity
- `POST /api/customers/resolve` — `{ phone, email, appUserId }` → `{ customerId, customer }`
- `POST /api/customers/link` — `{ customerId, phone, email, appUserId }` → links identifiers
- `GET /api/customers/:id` — customer + conversations
- `GET /api/customers/:id/conversations` — all conversations across channels
- `GET /api/customers/:id/activity` — unified timeline

### Channels
- `POST /api/webhooks/whatsapp` — WhatsApp inbound (verified)
- `POST /api/webhooks/email` — Email inbound (SendGrid/SES/Mailgun/Postmark/generic)
- `POST /api/webhooks/app` — App/chat inbound

### Conversations
- `POST /api/conversations/:id/merge` — `{ mergeWith: [conv1, conv2] }`
- `GET /api/conversations/:id/linked` — linked conversations
- `POST /api/conversations/:id/ticket` — create ticket

### Real-Time
- `GET /api/events/stream` — SSE
- `POST /api/support/notify` — send to customer via RAZO

### Admin
- `POST /api/admin/keys/generate` — API key
- `POST /api/admin/webhooks/whatsapp/register` — register with Meta/Twilio/360dialog
- `GET /api/admin/webhooks/whatsapp/status` — verify webhook URL reachable

### Stats
- `GET /api/stats` — counts, by-channel, multi-channel

## Files
- `src/index.js` — main service
- `src/storage.js` — Redis/MongoDB/memory
- `src/emailHandler.js` — SMTP/IMAP/provider webhooks
- `src/whatsappWebhook.js` — Meta/Twilio/360dialog
- `src/events.js` — SSE/WebSocket

## Env Vars
```
PORT=4885
USE_REDIS=true|false
USE_MONGODB=true|false
REDIS_URL=redis://localhost:6379
MONGODB_URI=mongodb://localhost:27017/unified-support-bridge
WHATSAPP_VERIFY_TOKEN=...
WHATSAPP_APP_SECRET=...
CORPID_URL=http://localhost:4702
UNIFIED_INBOX_URL=http://localhost:4870
TICKET_ENGINE_URL=http://localhost:4872
WEBHOOK_PUBLIC_URL=https://your-domain.com
WEBHOOK_API_KEYS=key1,key2,key3
SMTP_PORT=1025
IMAP_USER=...
IMAP_PASSWORD=...
RAZO_URL=http://localhost:4299
```