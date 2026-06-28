# Notification OS

Multi-channel enterprise notification system with preferences, templates, and analytics.

**Port:** 4878

## Features

- **Multi-Channel Delivery** - Email, Push, SMS, Webhook
- **User Preferences** - Quiet hours, channel settings, category preferences
- **Template System** - Reusable notification templates with variable interpolation
- **Broadcast** - Send to all users or specific user segments
- **Priority Levels** - Low, Normal, High, Urgent
- **Statistics** - Real-time notification analytics by type and priority
- **Expiration** - Auto-expire notifications after specified time

## API Endpoints

### Health & Status

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Service health check |
| GET | `/ready` | Readiness probe |

### Notifications

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/notifications/send` | Send notification (requires auth) |
| GET | `/api/notifications` | Get notifications |
| GET | `/api/notifications/:id` | Get single notification |
| PUT | `/api/notifications/:id/read` | Mark as read (requires auth) |
| POST | `/api/notifications/read-all` | Mark all as read (requires auth) |
| DELETE | `/api/notifications/:id` | Delete notification (requires auth) |

### Preferences

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/notifications/preferences/:userId` | Get user preferences |
| POST | `/api/notifications/preferences` | Update preferences (requires auth) |

### Templates

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/notifications/templates` | List all templates |
| POST | `/api/notifications/templates` | Create template (requires auth) |
| POST | `/api/notifications/templates/:id/send` | Send from template (requires auth) |

### Broadcast & Stats

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/notifications/broadcast` | Broadcast to users (requires auth) |
| GET | `/api/notifications/stats` | Get notification statistics |

## Query Parameters

### Get Notifications

| Parameter | Type | Description |
|-----------|------|-------------|
| `userId` | string | Filter by user ID |
| `unreadOnly` | boolean | Show only unread notifications |
| `type` | string | Filter by type (info, warning, error, success) |
| `priority` | string | Filter by priority (low, normal, high, urgent) |
| `limit` | number | Results per page (default: 50) |
| `offset` | number | Pagination offset (default: 0) |

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | 4878 | Service port |
| `NODE_ENV` | development | Environment mode |

## Commands

```bash
# Development
npm run dev

# Production build
npm run build

# Start production server
npm start

# Run tests
npm test

# Watch mode for tests
npm run test:watch
```

## Notification Schema

```typescript
interface Notification {
  id: string;
  userId: string;
  type: 'info' | 'warning' | 'error' | 'success';
  title: string;
  message: string;
  read: boolean;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  actionUrl?: string;
  channels: ('email' | 'push' | 'sms' | 'webhook')[];
  metadata: Record<string, string>;
  createdAt: string;
  readAt?: string;
  expiresAt?: string;
}
```

## User Preferences Schema

```typescript
interface UserPreferences {
  userId: string;
  channels: ('email' | 'push' | 'sms' | 'webhook')[];
  quietHours: {
    enabled: boolean;
    start: string;  // HH:MM format
    end: string;    // HH:MM format
    timezone: string;
  };
  emailDigest: 'none' | 'daily' | 'weekly';
  pushEnabled: boolean;
  categories: Record<string, {
    enabled: boolean;
    email: boolean;
    push: boolean;
  }>;
  webhookUrl?: string;
}
```

## Default Templates

| ID | Name | Type | Variables |
|----|------|------|-----------|
| `tmpl-1` | Welcome | info | appName, name |
| `tmpl-2` | Password Reset | warning | link |
| `tmpl-3` | Task Completed | success | taskName |
| `tmpl-4` | Error Alert | error | errorType, errorMessage |

## Example Usage

```bash
# Send notification
curl -X POST http://localhost:4878/api/notifications/send \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{
    "userId": "user-123",
    "type": "info",
    "title": "New Message",
    "message": "You have a new message from John",
    "priority": "normal",
    "channels": ["push", "email"]
  }'

# Get notifications for user
curl "http://localhost:4878/api/notifications?userId=user-123&unreadOnly=true"

# Update preferences
curl -X POST http://localhost:4878/api/notifications/preferences \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{
    "userId": "user-123",
    "channels": ["push", "sms"],
    "quietHours": {
      "enabled": true,
      "start": "22:00",
      "end": "08:00",
      "timezone": "UTC"
    },
    "emailDigest": "daily",
    "pushEnabled": true
  }'

# Send template notification
curl -X POST http://localhost:4878/api/notifications/templates/tmpl-1/send \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{
    "userId": "user-123",
    "variables": {
      "appName": "MyApp",
      "name": "John"
    }
  }'

# Broadcast
curl -X POST http://localhost:4878/api/notifications/broadcast \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{
    "type": "info",
    "title": "System Maintenance",
    "message": "Scheduled maintenance at midnight",
    "priority": "high",
    "userIds": ["user-1", "user-2", "user-3"]
  }'

# Get stats
curl "http://localhost:4878/api/notifications/stats"
```

## Dependencies

- express - HTTP server
- cors - CORS support
- helmet - Security headers
- uuid - Unique ID generation
- zod - Schema validation
