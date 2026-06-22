# Hojai Instagram Agent

**Port:** 4930

Instagram DM and comment automation for contact centers.

## Features

- Instagram Direct Message handling
- Auto-replies (keyword, first message, always)
- Story mention replies
- Comment auto-replies
- Campaign tracking
- Webhook integration with Instagram Graph API

## Quick Start

```bash
cd hojai-ai/hojai-instagram-agent
npm install
cp .env.example .env
npm run dev
```

## API

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/conversations` | List conversations |
| GET | `/api/conversations/:id/messages` | Get messages |
| POST | `/api/send-dm` | Send DM |
| POST | `/api/auto-replies` | Create auto-reply |
| GET | `/api/auto-replies` | List auto-replies |
| POST | `/api/campaigns` | Create campaign |

## Webhooks

- `GET /webhook/instagram` - Webhook verification
- `POST /webhook/instagram` - Handle incoming events

## Environment Variables

```
INSTAGRAM_ACCESS_TOKEN=your-access-token
INSTAGRAM_IG_USER_ID=your-ig-user-id
INSTAGRAM_APP_SECRET=your-app-secret
INSTAGRAM_VERIFY_TOKEN=your-verify-token
```
