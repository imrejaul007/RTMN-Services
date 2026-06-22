# Integration Guide

## REZ Ecosystem

### Connect to REZ Intelligence

```bash
HOJAI_REZ_BRIDGE=true
REZ_EVENT_BUS_URL=https://rez-events.rez.money
```

## RABTUL Services

| Service | Port | Purpose |
|---------|------|---------|
| Auth | 4002 | User verification |
| Wallet | 4004 | Cashback |
| Payments | 4001 | Transactions |
| Notifications | 4011 | Push/SMS/WhatsApp |
| Analytics | 4016 | Insights |

## WhatsApp Business API

1. Create Meta Business App
2. Add WhatsApp Product
3. Configure webhook
4. Test with sandbox

## Environment Variables

```bash
HOJAI_API_KEY=
WHATSAPP_ACCESS_TOKEN=
OPENAI_API_KEY=
REZ_BRIDGE_ENABLED=true
REZ_EVENT_BUS_URL=
MONGODB_URI=mongodb+srv://
REDIS_URL=redis://
```
