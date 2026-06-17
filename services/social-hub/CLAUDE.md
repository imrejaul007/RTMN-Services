# Social Hub Service - RTMN Ecosystem

**Version:** 1.0.0  
**Port:** 4893  
**Status:** Production Ready

---

## Overview

The Social Hub service provides a unified inbox for managing social media channels across multiple platforms:
- Instagram
- Telegram
- Facebook Messenger
- Twitter/X

## Architecture

```
                    ┌─────────────────────────────────────────┐
                    │              Social Hub                  │
                    │              (Port 4893)                 │
                    ├─────────────────────────────────────────┤
                    │  Routes:                                │
                    │  - /api/channels   Channel Management  │
                    │  - /api/messages   Message Handling    │
                    │  - /api/webhooks   Platform Webhooks   │
                    ├─────────────────────────────────────────┤
                    │  Connectors:                            │
                    │  - Instagram API (Graph API)           │
                    │  - Telegram Bot API                     │
                    │  - Facebook Messenger API               │
                    │  - Twitter/X API                        │
                    ├─────────────────────────────────────────┤
                    │  Models:                                │
                    │  - Channel       Social Accounts       │
                    │  - SocialMessage Unified Messages      │
                    └─────────────────────────────────────────┘
                                     │
                    ┌────────────────┼────────────────┐
                    ▼                ▼                ▼
              ┌──────────┐    ┌───────────┐    ┌──────────┐
              │MongoDB   │    │ Event Bus │    │Integration│
              │(Messages)│    │  (4510)   │    │  Hub     │
              └──────────┘    └───────────┘    └──────────┘
```

## API Endpoints

### Health Check
```
GET /health
```

### Channels

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/channels | List all channels |
| GET | /api/channels/:id | Get channel by ID |
| POST | /api/channels | Create new channel |
| PATCH | /api/channels/:id | Update channel |
| DELETE | /api/channels/:id | Delete channel |
| POST | /api/channels/:id/activate | Activate channel |
| POST | /api/channels/:id/deactivate | Deactivate channel |
| GET | /api/channels/platform/:platform | Get channels by platform |
| GET | /api/channels/stats/summary | Get channel statistics |

### Messages

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/messages | List messages (with filters) |
| GET | /api/messages/:id | Get message by ID |
| GET | /api/messages/thread/:threadId | Get thread messages |
| GET | /api/messages/sender/:senderId | Get messages by sender |
| POST | /api/messages/send | Send message |
| PATCH | /api/messages/:id | Update message |
| POST | /api/messages/thread/:threadId/read | Mark thread as read |
| GET | /api/messages/stats/unread | Get unread count |
| DELETE | /api/messages/:id | Delete message |

### Webhooks

| Method | Endpoint | Platform |
|--------|----------|----------|
| GET | /api/webhooks/instagram | Instagram verification |
| POST | /api/webhooks/instagram | Instagram webhook |
| POST | /api/webhooks/telegram/setup | Set Telegram webhook |
| POST | /api/webhooks/telegram | Telegram webhook |
| GET | /api/webhooks/facebook | Facebook verification |
| POST | /api/webhooks/facebook | Facebook webhook |
| GET | /api/webhooks/twitter | Twitter CRC verification |
| POST | /api/webhooks/twitter | Twitter webhook |
| POST | /api/webhooks/register/:channelId | Register webhooks |

## Data Models

### Channel
```typescript
{
  name: string;
  platform: 'instagram' | 'telegram' | 'facebook' | 'twitter';
  credentials: {
    accessToken?: string;
    botToken?: string;
    // ... platform-specific
  };
  status: 'active' | 'inactive' | 'error' | 'pending';
  settings: {
    autoReply: boolean;
    autoReplyDelay: number;
    notifications: boolean;
    syncInterval: number;
  };
  metadata: {
    pageId?: string;
    botUsername?: string;
  };
}
```

### SocialMessage
```typescript
{
  platform: string;
  platformMessageId: string;
  senderId: string;
  senderName?: string;
  channelId: ObjectId;
  content: {
    type: 'text' | 'image' | 'video' | 'audio' | 'document' | 'location';
    text?: string;
    mediaUrl?: string;
  };
  threadId: string;
  direction: 'inbound' | 'outbound';
  status: 'received' | 'processing' | 'processed' | 'failed';
  processed: boolean;
  customerId?: string;
}
```

## Message Normalization

All platform messages are normalized to a unified format:

| Platform | Field Mapping |
|----------|---------------|
| Instagram | DM ID -> platformMessageId, sender.id -> senderId |
| Telegram | message_id -> platformMessageId, from.id -> senderId |
| Facebook | mid -> platformMessageId, sender.id -> senderId |
| Twitter | id_str -> platformMessageId, user.id_str -> senderId |

## Webhook Integration

### Instagram Setup
1. Create Facebook Developer App
2. Add Instagram Messaging product
3. Configure webhook URL: `https://your-domain.com/api/webhooks/instagram`
4. Set verify token in channel credentials

### Telegram Setup
1. Create bot via @BotFather
2. Get bot token
3. Call setup endpoint: `POST /api/webhooks/telegram/setup`
4. Webhook URL: `https://your-domain.com/api/webhooks/telegram`

### Facebook Messenger Setup
1. Create Facebook Page
2. Create Facebook App with Messenger product
3. Configure webhook URL: `https://your-domain.com/api/webhooks/facebook`
4. Generate page access token

### Twitter Setup
1. Create Twitter Developer App
2. Enable Direct Messages and Webhooks
3. Configure webhook CRC URL: `https://your-domain.com/api/webhooks/twitter`
4. Subscribe to app events

## Auto-Reply Configuration

Enable auto-reply per channel:
```json
{
  "settings": {
    "autoReply": true,
    "autoReplyDelay": 5000
  }
}
```

Default delay: 5000ms

## Environment Variables

```env
PORT=4893
MONGODB_URI=mongodb://localhost:27017/social-hub

# Instagram
INSTAGRAM_ACCESS_TOKEN=
INSTAGRAM_VERIFY_TOKEN=

# Telegram
TELEGRAM_BOT_TOKEN=
TELEGRAM_WEBHOOK_SECRET=

# Facebook
FACEBOOK_PAGE_ACCESS_TOKEN=
FACEBOOK_VERIFY_TOKEN=

# Twitter
TWITTER_BEARER_TOKEN=
TWITTER_APP_SECRET=

# Integration
WEBHOOK_BASE_URL=https://your-domain.com
```

## Integration with Unified Inbox

The service integrates with the RTMN Unified Inbox for:
- Real-time message sync
- Customer profile linking
- Notification routing
- Analytics aggregation

## Development

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Start production server
npm start
```

## Testing Webhooks Locally

Use ngrok or similar for local webhook testing:

```bash
ngrok http 4893
```

Set webhook URLs to ngrok URL for each platform.

---

**Last Updated:** June 2026
