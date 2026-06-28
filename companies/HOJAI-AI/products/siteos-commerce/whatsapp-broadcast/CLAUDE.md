# HOJAI SiteOS WhatsApp Broadcast Service

**Port:** 5483
**Version:** 1.0.0
**Status:** Production Ready

## Overview

WhatsApp Broadcast Campaign Builder - create, schedule, and track WhatsApp marketing campaigns.

## Features

- **Campaign Management** - Create, schedule, and track campaigns
- **Audience Segmentation** - Build targeted audiences with filters
- **Message Templates** - Reusable templates with personalization
- **Sequences** - Multi-step drip campaigns
- **Analytics** - Delivery, open, click, conversion tracking
- **A/B Testing** - Test different message variants

## API Endpoints

### Campaigns
- `GET /api/campaigns` - List campaigns
- `POST /api/campaigns` - Create campaign
- `GET /api/campaigns/:id` - Get campaign
- `PUT /api/campaigns/:id` - Update campaign
- `DELETE /api/campaigns/:id` - Delete campaign
- `POST /api/campaigns/:id/send` - Send campaign
- `POST /api/campaigns/:id/schedule` - Schedule campaign
- `GET /api/campaigns/:id/stats` - Get stats

### Audiences
- `GET /api/audiences` - List audiences
- `POST /api/audiences` - Create audience
- `GET /api/audiences/:id` - Get audience
- `PUT /api/audiences/:id` - Update audience
- `DELETE /api/audiences/:id` - Delete audience

### Templates
- `GET /api/templates` - List templates
- `POST /api/templates` - Create template
- `GET /api/templates/:id` - Get template
- `PUT /api/templates/:id` - Update template
- `DELETE /api/templates/:id` - Delete template

### Sequences
- `GET /api/sequences` - List sequences
- `POST /api/sequences` - Create sequence
- `GET /api/sequences/:id` - Get sequence
- `PUT /api/sequences/:id` - Update sequence
- `DELETE /api/sequences/:id` - Delete sequence
- `POST /api/sequences/:id/activate` - Activate sequence

### Contacts
- `GET /api/contacts` - List contacts
- `POST /api/contacts` - Add contact
- `POST /api/contacts/:id/unsubscribe` - Opt-out

### Stats
- `GET /api/stats` - Overall broadcast stats

## Personalization Tokens

| Token | Description |
|-------|-------------|
| `{{firstName}}` | Contact's first name |
| `{{lastName}}` | Contact's last name |
| `{{name}}` | Full name |
| `{{email}}` | Email address |
| `{{phone}}` | Phone number |
| `{{company}}` | Company name |
| `{{product}}` | Product name |
| `{{orderId}}` | Order ID |
| `{{amount}}` | Order amount |
| `{{date}}` | Current date |

## Example Usage

```bash
# Create audience
curl -X POST http://localhost:5483/api/audiences \
  -H "Content-Type: application/json" \
  -H "X-API-Key: your-key" \
  -d '{"name": "VIP Customers", "filters": [{"field": "lifetimeValue", "operator": "gt", "value": 10000}]}'

# Create campaign
curl -X POST http://localhost:5483/api/campaigns \
  -H "Content-Type: application/json" \
  -H "X-API-Key: your-key" \
  -d '{
    "name": "Diwali Sale",
    "audienceId": "audience-uuid",
    "message": {"content": "Hi {{firstName}}! Diwali sale is here. Use code DIWALI20 for 20% off!"},
    "schedule": {"type": "immediate"}
  }'

# Send campaign
curl -X POST http://localhost:5483/api/campaigns/campaign-uuid/send \
  -H "X-API-Key: your-key"
```

## Files

```
whatsapp-broadcast/
├── src/index.js       # Main service (550 lines)
├── package.json
├── vitest.config.js
└── CLAUDE.md
```
