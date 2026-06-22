# REZ Notification Service

## Basic Info

| Field | Value |
|-------|-------|
| **Git Path** | `@rez/notifications-service` |
| **Type** | Library/Internal Service |
| **Status** | Active |
| **Distribution** | npm package (`@rez/notifications-service`) |

---

## Purpose

The Notification Service is a unified multi-channel notification system supporting Push (FCM), SMS (Twilio), Email (SMTP), WhatsApp (Twilio), and In-App notifications. It provides template-based rendering with Handlebars, per-user channel preferences, rate limiting per channel, exponential backoff retry logic, dead letter queue for failed notifications, and analytics tracking.

---

## Technology Stack

- **Runtime**: Node.js 20.x
- **Queue**: BullMQ
- **Cache**: Redis
- **Templates**: Handlebars
- **Channels**: Firebase Admin (Push), Twilio (SMS/WhatsApp), Nodemailer (Email)
- **Logging**: Winston, Pino

---

## Notification Channels

| Channel | Provider | Rate Limit |
|---------|----------|------------|
| `push` | Firebase Admin | 100/minute |
| `sms` | Twilio | 10/hour |
| `email` | Nodemailer/SMTP | 50/hour |
| `whatsapp` | Twilio WhatsApp | 20/hour |
| `inApp` | Redis Pub/Sub | 200/minute |

---

## API (Library Interface)

### Service Instantiation

```typescript
import { createNotificationService, NotificationService } from '@rez/notifications-service';

const notificationService = createNotificationService({
  redis: redisClient,
  emailTransport: nodemailerTransport,
  twilioClient: twilioClient,
  firebaseAdmin: firebaseAdminApp,
  rateLimits: {
    push: { windowMs: 60000, maxRequests: 100 },
    sms: { windowMs: 3600000, maxRequests: 10 },
    email: { windowMs: 3600000, maxRequests: 50 },
    whatsapp: { windowMs: 3600000, maxRequests: 20 },
    inApp: { windowMs: 60000, maxRequests: 200 },
  },
  retryConfig: {
    maxAttempts: 5,
    initialDelayMs: 1000,
    maxDelayMs: 60000,
    backoffMultiplier: 2,
  },
});
```

---

## Public API Methods

### Send Notifications

```typescript
// Push notification
await notificationService.sendPush(userId, {
  title: 'Order Confirmed',
  body: 'Your order #12345 has been confirmed',
  data: { orderId: '12345' },
  badge: 1,
  sound: 'default',
});

// SMS
await notificationService.sendSMS(phone, 'Your OTP is 123456');

// Email
await notificationService.sendEmail(email, 'welcome_email', {
  name: 'John Doe',
});

// WhatsApp
await notificationService.sendWhatsApp(phone, 'order_confirmation', {
  orderId: '12345',
  status: 'confirmed',
});

// In-App
await notificationService.sendInApp(userId, {
  type: 'order_update',
  template: 'order_notification',
  data: { orderId: '12345', status: 'delivered' },
});

// Batch
const batchResult = await notificationService.sendBatch(notifications);
```

### User Preferences

```typescript
await notificationService.setUserPreferences({
  userId: 'user123',
  channels: {
    push: true,
    sms: true,
    email: false,
    whatsapp: true,
    inApp: true,
  },
  quietHours: {
    start: '22:00',
    end: '07:00',
    timezone: 'Asia/Kolkata',
  },
  email: 'user@example.com',
  phone: '+919876543210',
  pushToken: 'fcm_token',
  whatsappNumber: '+919876543210',
});

const prefs = await notificationService.getUserPreferences('user123');
```

### Templates

```typescript
// Register custom template
notificationService.registerTemplate({
  id: 'order_delivered',
  name: 'Order Delivered',
  channel: 'email',
  subject: 'Your order {{orderId}} has been delivered!',
  body: '<h1>Delivered!</h1><p>Your order {{orderId}} is now complete.</p>',
  variables: ['orderId'],
});

// Compile template
const compiled = templateEngine.compile('order_delivered', { orderId: '12345' });
// Returns: { subject: 'Your order 12345 has been delivered!', body: '<h1>Delivered!</h1>...' }
```

### Queue Management

```typescript
const stats = await notificationService.getQueueStats();
// { waiting: 5, active: 2, completed: 1000, failed: 10, delayed: 0 }

await notificationService.pauseQueue();
await notificationService.resumeQueue();
```

### Dead Letter Queue

```typescript
const dlqStats = await notificationService.getDeadLetterQueueStats();
// { total: 10, byChannel: { push: 2, sms: 3, email: 5, whatsapp: 0, inApp: 0 } }

const entries = await notificationService.getDeadLetterQueueEntries(100);
await notificationService.retryDeadLetterEntry(entry);
```

### Analytics

```typescript
const stats = await notificationService.getChannelStats('email');
// { queued: 500, sent: 490, delivered: 480, failed: 10, clicked: 100 }

const engagement = await notificationService.getUserEngagement('user123');
// { clickedCount: 25, deliveredCount: 100, engagementRate: 25 }
```

---

## Default Templates

| Template ID | Channel | Subject/Body |
|-------------|---------|--------------|
| `welcome_email` | email | Welcome to ReZ, {{name}}! |
| `verification_code` | sms | Your ReZ verification code is: {{code}} |
| `order_confirmation` | email | Order #{{orderId}} Confirmed |
| `promotional` | push | {{message}} |
| `chat_message` | inApp | {{sender}}: {{message}} |

---

## Database/Collections

Notifications are stored in Redis:

| Key Pattern | Type | Purpose |
|-------------|------|---------|
| `ratelimit:{channel}:{userId}` | Sorted Set | Rate limiting |
| `analytics:{channel}:{eventType}` | Sorted Set | Event tracking |
| `notifications:inapp:{userId}` | List | In-app notification cache |
| `user:{userId}:notification_prefs` | String | User preferences |
| `notifications:deadletterqueue` | List | Failed notifications |

---

## Dependencies

| Service | Purpose |
|---------|---------|
| Redis | Queue, caching, rate limiting |
| Firebase Admin | Push notifications |
| Twilio | SMS and WhatsApp |
| Nodemailer | Email delivery |

---

## Dependents (Services that call this service)

| Service | Usage |
|---------|-------|
| Payment Service | Payment confirmation |
| Order Service | Order updates |
| Auth Service | OTP delivery, verification |
| Wallet Service | Balance alerts |
| Profile Service | Profile updates |
| All apps | User notifications |

---

## Environment Variables

```env
# Redis
REDIS_URL=redis://localhost:6379

# Firebase (Push)
FIREBASE_PROJECT_ID=your-project
FIREBASE_PRIVATE_KEY=<base64>
FIREBASE_CLIENT_EMAIL=<email>

# Twilio (SMS/WhatsApp)
TWILIO_ACCOUNT_SID=<sid>
TWILIO_AUTH_TOKEN=<token>
TWILIO_PHONE_NUMBER=+1234567890
TWILIO_WHATSAPP_NUMBER=+1234567890

# Email
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=<user>
SMTP_PASS=<password>
EMAIL_FROM=noreply@rez.app

# Logging
LOG_LEVEL=info
```

---

## Rate Limiting

Per-user rate limits are enforced per channel:

| Channel | Window | Max Requests |
|---------|--------|--------------|
| push | 1 minute | 100 |
| sms | 1 hour | 10 |
| email | 1 hour | 50 |
| whatsapp | 1 hour | 20 |
| inApp | 1 minute | 200 |

---

## Retry Logic

Failed notifications are retried with exponential backoff:

```typescript
{
  maxAttempts: 5,
  initialDelayMs: 1000,    // 1 second
  maxDelayMs: 60000,       // 1 minute
  backoffMultiplier: 2,
}
```

Retry schedule: 1s, 2s, 4s, 8s, 16s

---

## Dead Letter Queue

Notifications that fail after all retry attempts are moved to the DLQ:

- Max size: 10,000 entries
- Accessible via admin endpoints
- Can be manually retried
- Analytics tracked separately

---

## Quiet Hours

Users can configure quiet hours during which push and SMS notifications are blocked:

```typescript
{
  start: '22:00',    // 10 PM
  end: '07:00',      // 7 AM
  timezone: 'Asia/Kolkata',
}
```

---

## Security Features

- [x] Rate limiting per channel per user
- [x] Quiet hours enforcement
- [x] Input validation
- [x] Template variable escaping
- [x] HTTPS for all external calls
- [x] Webhook signature verification (Twilio)

---

## Business Logic

### Notification Flow

1. Client calls send method
2. Check user preferences
3. Check rate limits
4. Compile template with Handlebars
5. Queue notification via BullMQ
6. Worker processes notification
7. Send via appropriate channel
8. Track analytics
9. Retry on failure or move to DLQ

### Template Variables

Templates use Handlebars syntax:

```handlebars
Hello {{name}}, your order {{orderId}} is {{status}}.
```

---

## Deployment

The service can be deployed as:
1. **npm package**: Imported by other services
2. **Standalone worker**: Dedicated notification worker service

---

## Related Documentation

- [API Reference](../API_REFERENCE.md)
