# Hojai WhatsApp BSP - Direct WhatsApp Business API

**Port:** 4890

Direct WhatsApp Business API integration (BSP) - compete with Gupshup's WhatsApp infrastructure.

## Features

- **Direct WhatsApp API**: No middleman BSP layer
- **All Message Types**: Text, Image, Video, Audio, Document, Location, Interactive
- **Template Management**: Create and manage WhatsApp templates
- **Media Handling**: Upload and download media
- **Webhook Processing**: Incoming messages and status updates
- **Signature Verification**: HMAC-SHA256 webhook verification

## Quick Start

```bash
cd hojai-ai/hojai-whatsapp-bsp
npm install
cp .env.example .env
npm run dev
```

## API Endpoints

### Send Messages

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/send` | Generic send |
| POST | `/api/send/text` | Send text |
| POST | `/api/send/image` | Send image |
| POST | `/api/send/video` | Send video |
| POST | `/api/send/audio` | Send audio |
| POST | `/api/send/document` | Send document |
| POST | `/api/send/location` | Send location |
| POST | `/api/send/buttons` | Send buttons |
| POST | `/api/send/list` | Send list |
| POST | `/api/send/template` | Send template |

### Templates

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/templates` | List templates |
| POST | `/api/templates` | Create template |

### Media

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/media/upload` | Upload media |
| GET | `/api/media/:id` | Download media |

### Messages

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/messages/:id/status` | Get status |

## Example

```bash
# Send text
curl -X POST http://localhost:4890/api/send/text \
  -H "Content-Type: application/json" \
  -d '{"to": "+919876543210", "body": "Hello!"}'

# Send image
curl -X POST http://localhost:4890/api/send/image \
  -H "Content-Type: application/json" \
  -d '{"to": "+919876543210", "url": "https://example.com/image.jpg", "caption": "Check this out!"}'

# Send buttons
curl -X POST http://localhost:4890/api/send/buttons \
  -H "Content-Type: application/json" \
  -d '{
    "to": "+919876543210",
    "body": "How can we help?",
    "buttons": [
      {"id": "support", "title": "Support"},
      {"id": "sales", "title": "Sales"}
    ]
  }'
```

## License

MIT
