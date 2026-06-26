# NotificationOS - Port 4878

## Overview
Smart notification routing, digest, priorities.

## Purpose
Intelligent notification delivery across all channels.

## Key Features
- Multi-channel delivery
- Smart routing
- Template management
- Quiet hours
- Digest mode
- Priority handling

## API Endpoints

### Notifications
- `POST /api/notifications` - Send notification
- `GET /api/notifications/:userId` - Get notifications
- `PATCH /api/notifications/:id/read` - Mark read

### Broadcast
- `POST /api/broadcast` - Broadcast to many

### Preferences
- `GET /api/preferences/:userId` - Get preferences
- `POST /api/preferences` - Set preferences

## Notification Types
- `info` - Information
- `success` - Success
- `warning` - Warning
- `error` - Error
- `urgent` - Urgent

## Channels
- `push` - Push notification
- `email` - Email
- `sms` - SMS
- `whatsapp` - WhatsApp
- `in_app` - In-app

## Tests
Vitest tests: `__tests__/notification-os.test.ts`

## Environment
- Port: 4878

## Startup
```bash
cd platform/sutar-os/core/notification-os && npm run dev
```
