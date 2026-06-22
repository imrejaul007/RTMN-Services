# Hojai Telecom Bridge

**Port:** 4860

Unified telecom integration for India-focused voice AI.

## Supported Providers

| Provider | Status | Features |
|----------|--------|----------|
| **Twilio** | ✅ Active | International, global |
| **Exotel** | ✅ Active | India, inbound, outbound, IVR |
| **Knowlarity** | ✅ Active | India, bulk calling |
| **Ozonetel** | 🔜 Coming | India |

## Features

- **Outbound Calling** - Make calls from dashboard
- **Bulk Campaigns** - Mass calling campaigns
- **SMS** - Send SMS via Exotel
- **Webhooks** - Call status updates
- **Metrics** - Call analytics

## Quick Start

```bash
cd hojai-telecom-bridge
npm install
cp .env.example .env
npm run dev
```

## API

### Make Call

```bash
curl -X POST http://localhost:4860/api/calls \
  -H "Content-Type: application/json" \
  -d '{
    "to": "+919876543210",
    "from": "+912223334445",
    "agentId": "agent_001",
    "context": {"callbackUrl": "https://your-app.com/webhook"}
  }'
```

### Get Metrics

```bash
curl http://localhost:4860/api/metrics
```

### Send SMS

```bash
curl -X POST http://localhost:4860/api/sms \
  -H "Content-Type: application/json" \
  -d '{
    "to": "+919876543210",
    "body": "Your appointment is confirmed for tomorrow at 10 AM"
  }'
```

### Create Campaign

```bash
curl -X POST http://localhost:4860/api/campaigns \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Summer Sale Campaign",
    "type": "promotional",
    "phoneNumbers": ["+919876543210", "+919876543211"]
  }'
```

## Environment

```bash
TELECOM_PROVIDER=twilio  # or exotel, knowlarity
```

### Exotel Setup

1. Get API key from Exotel dashboard
2. Set subdomain (your company name)
3. Configure webhook URL

### Knowlarity Setup

1. Get API key from Knowlarity
2. Set caller ID (outbound number)

## Architecture

```
Telecom Bridge (4860)
    │
    ├── Twilio (International)
    ├── Exotel (India - Primary)
    └── Knowlarity (India - Bulk)
    │
    └── Voice AI Services
```
