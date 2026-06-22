# GENIE WhatsApp Bot

**Port:** 4718

WhatsApp Genie - User talks to Genie on WhatsApp.

## Setup

1. Get WhatsApp Business API credentials
2. Set environment variables
3. Configure webhook URL

## Environment Variables

```bash
WHATSAPP_ACCESS_TOKEN=xxx
WHATSAPP_VERIFY_TOKEN=xxx
WHATSAPP_PHONE_NUMBER_ID=xxx
```

## Webhook

```
GET  /webhook - WhatsApp verification
POST /webhook - Incoming messages
```

## Example

User sends: "Give me my daily briefing"
Genie responds with personalized briefing.

---

**Status:** ✅ Built
