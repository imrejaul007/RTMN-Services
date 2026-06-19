# RTMN Notification Service

> **Version:** 1.0.0
> **Port:** 4870
> **Status:** ✅ Built - Phase 2 High Priority

---

## Overview

The Notification Service provides multi-channel notification delivery (email, SMS, push, in-app, Slack, webhooks) with template management, subscriptions, and analytics.

---

## Features

### Core Capabilities

| Feature | Description |
|---------|-------------|
| **Multi-Channel Delivery** | Email, SMS, Push, In-app, Slack, Webhooks |
| **Template System** | Reusable notification templates with variables |
| **Subscription Management** | User preferences for notification channels |
| **Bulk Notifications** | Send to multiple recipients at once |
| **Priority Levels** | Low, Normal, High, Urgent |
| **Tracking** | Sent, Delivered, Read status |
| **Statistics** | Delivery rates, read rates, channel analytics |

### Supported Channels

| Channel | Status | Use Case |
|---------|--------|----------|
| Email | ✅ Active | Transactional, Marketing |
| SMS | ✅ Active | Urgent alerts, 2FA |
| Push | ✅ Active | Mobile notifications |
| In-App | ✅ Active | Real-time alerts |
| Slack | ✅ Active | Team notifications |
| Webhook | ✅ Active | External integrations |

---

## API Endpoints

### Notifications

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/notifications/send` | Send single notification |
| GET | `/api/notifications` | List notifications |
| GET | `/api/notifications/:id` | Get notification |
| POST | `/api/notifications/:id/read` | Mark as read |
| POST | `/api/notifications/read-all` | Mark all as read |
| DELETE | `/api/notifications/:id` | Delete notification |
| POST | `/api/notifications/bulk` | Send bulk notifications |

### Templates

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/templates` | List templates |
| GET | `/api/templates/:id` | Get template |
| POST | `/api/templates` | Create template |
| PUT | `/api/templates/:id` | Update template |
| DELETE | `/api/templates/:id` | Delete template |
| POST | `/api/templates/:id/preview` | Preview with sample data |

### Subscriptions

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/subscriptions` | List subscriptions |
| GET | `/api/subscriptions/:id` | Get subscription |
| POST | `/api/subscriptions` | Create subscription |
| PUT | `/api/subscriptions/:id` | Update subscription |
| DELETE | `/api/subscriptions/:id` | Delete subscription |

### Channels

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/channels` | Get channel statuses |
| PUT | `/api/channels/:channel` | Update channel status |
| POST | `/api/channels/:channel/test` | Test channel |

### Statistics

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/statistics` | Get notification stats |

### Health

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Service health check |

---

## Data Model

### Notification

```javascript
{
  id: "notif-abc123",
  recipientId: "user-1",
  recipientName: "John Doe",
  recipientEmail: "john@example.com",
  channel: "email",
  subject: "Deal Won!",
  body: "Congratulations on closing...",
  templateId: "tmpl-3",
  priority: "normal",
  status: "delivered",
  sentAt: "2025-06-18T10:00:00.000Z",
  deliveredAt: "2025-06-18T10:00:05.000Z",
  readAt: "2025-06-18T10:15:00.000Z",
  data: { customer: "Acme Corp", amount: "$50,000" },
  createdAt: "2025-06-18T10:00:00.000Z"
}
```

### Template

```javascript
{
  id: "tmpl-1",
  name: "Welcome Email",
  type: "email",
  subject: "Welcome to RTMN Platform",
  body: "Dear {{name}},\n\nWelcome...",
  variables: ["name", "email", "role"],
  status: "active",
  createdAt: "2025-01-01T00:00:00.000Z"
}
```

### Subscription

```javascript
{
  id: "sub-1",
  userId: "user-1",
  userName: "John Doe",
  email: "john@example.com",
  phone: "+1234567890",
  channels: ["email", "inapp"],
  preferences: {
    marketing: true,
    product: true,
    weekly: true
  },
  status: "active"
}
```

---

## Template Variables

Templates use `{{variable}}` syntax for dynamic content:

```handlebars
Dear {{name}},

Your order #{{orderId}} has been shipped!

Tracking: {{trackingLink}}

Best regards,
{{companyName}}
```

---

## Usage Examples

### Send Notification

```bash
curl -X POST http://localhost:4870/api/notifications/send \
  -H "Content-Type: application/json" \
  -d '{
    "recipientId": "user-1",
    "recipientName": "John Doe",
    "recipientEmail": "john@example.com",
    "channel": "email",
    "templateId": "tmpl-1",
    "data": {
      "name": "John Doe",
      "email": "john@example.com",
      "role": "Admin"
    }
  }'
```

### Create Template

```bash
curl -X POST http://localhost:4870/api/templates \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Order Confirmation",
    "type": "email",
    "subject": "Order #{{orderId}} Confirmed",
    "body": "Thank you for your order...",
    "variables": ["orderId", "customerName"]
  }'
```

### Preview Template

```bash
curl -X POST http://localhost:4870/api/templates/tmpl-1/preview \
  -H "Content-Type: application/json" \
  -d '{"data": {"name": "Test User"}}'
```

### Bulk Send

```bash
curl -X POST http://localhost:4870/api/notifications/bulk \
  -H "Content-Type: application/json" \
  -d '{
    "notifications": [
      {"recipientEmail": "user1@example.com", "channel": "email", "body": "Hello!"},
      {"recipientEmail": "user2@example.com", "channel": "email", "body": "Hello!"}
    ]
  }'
```

### Test Channel

```bash
curl -X POST http://localhost:4870/api/channels/email/test \
  -H "Content-Type: application/json" \
  -d '{"recipient": "test@example.com", "testMessage": "Test successful!"}'
```

---

## Integration Points

| Service | Connection | Purpose |
|---------|------------|---------|
| **Unified Hub** | Hub routes notifications | Centralized notifications |
| **Sales OS** | Deal alerts, commission notices | Sales team updates |
| **Customer Success OS** | Ticket updates, NPS surveys | CS notifications |
| **Workforce OS** | Leave approvals, payroll | HR notifications |
| **REZ Care** | Support ticket updates | Customer notifications |
| **REZ Wallet** | Payment confirmations | Transaction alerts |

---

## Statistics

| Metric | Description |
|--------|-------------|
| Total Notifications | Count of all notifications |
| By Channel | Distribution across channels |
| By Status | Pending, sent, delivered, read |
| Delivery Rate | % of sent that were delivered |
| Read Rate | % of delivered that were read |
| Avg Delivery Time | Time from send to delivery |

---

## Quick Start

```bash
cd services/notification-service
npm install
npm start
```

---

*Built with Phase 2 - High Priority Services*
