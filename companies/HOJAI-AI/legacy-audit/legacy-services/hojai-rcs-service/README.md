# Hojai RCS Service - Rich Communication Services

**Port:** 4900

RCS (Rich Communication Services) messaging for Jio, Airtel, and Vi in India.

## Features

- **RCS Cards**: Rich interactive messages with images and actions
- **RCS Carousels**: Multiple cards in a swipeable view
- **Brand Verification**: Verified brand sender IDs
- **Suggestion Chips**: Quick reply, URL, phone actions
- **Multi-Provider**: Jio RCS (active), Airtel RCS, Vi RCS (coming soon)
- **Campaign Management**: Schedule and track campaigns
- **Analytics**: Delivery, read, click tracking

## Quick Start

```bash
cd hojai-ai/hojai-rcs-service
npm install
cp .env.example .env
npm run dev
```

## API Endpoints

### Send Messages

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/rcs/send/text` | Send text message |
| POST | `/api/rcs/send/card` | Send rich card |
| POST | `/api/rcs/send/carousel` | Send carousel |
| POST | `/api/rcs/send/suggestions` | Send with suggestions |

### Campaigns

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/rcs/campaigns` | Create campaign |
| GET | `/api/rcs/campaigns` | List campaigns |
| POST | `/api/rcs/campaigns/:id/start` | Start campaign |

### Analytics

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/rcs/analytics` | Get analytics |
| GET | `/api/rcs/messages` | List messages |

## Example

```bash
# Send text
curl -X POST http://localhost:4900/api/rcs/send/text \
  -H "Content-Type: application/json" \
  -H "X-Tenant-Id: tenant_123" \
  -d '{"to": "+919876543210", "text": "Hello from RCS!"}'

# Send card
curl -X POST http://localhost:4900/api/rcs/send/card \
  -H "Content-Type: application/json" \
  -H "X-Tenant-Id: tenant_123" \
  -d '{
    "to": "+919876543210",
    "card": {
      "title": "Welcome to Our Store!",
      "description": "Check out our latest products",
      "mediaUrl": "https://example.com/image.jpg",
      "actions": [
        {"id": "shop", "label": "Shop Now", "type": "url", "value": "https://store.com"}
      ]
    }
  }'
```

## License

MIT
