# Next-Step Intelligence Service

**Port: 4597** | **Part of HOJAI AI**

Extract NEXT-STEP ACTIONS from conversations and proactively remind customers - the core MeetKin feature.

## Overview

This service automatically:
1. **Extracts** next steps, action items, and reminders from conversations, transcripts, summaries, and support issues
2. **Schedules** reminders at optimal times with configurable frequency
3. **Proactively alerts** customers via WhatsApp, SMS, Email, and Push notifications
4. **Tracks** completion rates and provides analytics

## Features

- **AI-Powered Extraction** - GPT-4 enhanced step extraction with rule-based fallback
- **Multi-Channel Reminders** - WhatsApp, SMS, Email, Push notifications
- **Smart Scheduling** - One-time, daily, weekly, monthly, and custom recurrence
- **Proactive Intelligence** - Predict next steps, detect abandoned actions
- **Analytics Dashboard** - Completion rates, by priority, by type, trends

## Quick Start

```bash
# Install dependencies
npm install

# Build
npm run build

# Run development
npm run dev

# Run production
npm start
```

## Environment Variables

```env
PORT=4597
NODE_ENV=development
MONGODB_URI=mongodb://localhost:27017/nextstep

# OpenAI for AI extraction (optional)
OPENAI_API_KEY=sk-...

# WhatsApp Integration
WHATSAPP_API_URL=http://localhost:4011/api/whatsapp/send
WHATSAPP_API_KEY=...

# SMS Integration
SMS_API_URL=http://localhost:4011/api/sms/send
SMS_API_KEY=...
SMS_SENDER_ID=REZAI

# Email Integration
EMAIL_API_URL=http://localhost:4011/api/email/send
EMAIL_API_KEY=...

# Push Notifications
PUSH_API_URL=http://localhost:4011/api/push/send
PUSH_API_KEY=...

# CORS
CORS_ORIGIN=http://localhost:3000,http://localhost:4000

# Frontend URL for email links
FRONTEND_URL=https://app.rez.ai

# Logging
LOG_LEVEL=info
LOG_DIR=./logs
```

## API Endpoints

### Extraction

```bash
# Extract from text
POST /api/nextstep/extract
{
  "text": "I'll send you the proposal tomorrow and we can discuss on Friday",
  "customerId": "cust_123",
  "tenantId": "tenant_456"
}

# Extract from transcript
POST /api/nextstep/extract
{
  "transcript": "Agent: ...\nCustomer: ...",
  "customerId": "cust_123",
  "tenantId": "tenant_456"
}

# Extract from summary
POST /api/nextstep/extract
{
  "summary": "Customer wants to upgrade plan. Follow up needed after demo.",
  "customerId": "cust_123",
  "tenantId": "tenant_456"
}

# Extract from support issue
POST /api/nextstep/extract
{
  "issue": {
    "title": "Billing Issue #1234",
    "description": "Customer reported overcharge...",
    "priority": "high"
  },
  "customerId": "cust_123",
  "tenantId": "tenant_456"
}
```

### Step Management

```bash
# Create step
POST /api/nextstep/create
{
  "customerId": "cust_123",
  "tenantId": "tenant_456",
  "title": "Follow up on proposal",
  "description": "Send updated pricing",
  "stepType": "followup",
  "priority": "high",
  "dueDate": "2026-06-15T10:00:00Z",
  "sourceService": "sales-agent",
  "reminderChannels": ["whatsapp", "push"]
}

# Get customer steps
GET /api/nextstep/:customerId
GET /api/nextstep/:customerId?status=pending,overdue&priority=high,urgent

# Get step details
GET /api/nextstep/detail/:stepId

# Update step
PUT /api/nextstep/:stepId
{
  "title": "Updated title",
  "priority": "urgent"
}

# Complete step
PUT /api/nextstep/:stepId/complete
{
  "completionMethod": "manual",
  "notes": "Completed via phone call"
}

# Snooze step
PUT /api/nextstep/:stepId/snooze
{
  "newTime": "2026-06-20T10:00:00Z",
  "reason": "Customer requested extension"
}

# Delete step
DELETE /api/nextstep/:stepId
```

### Reminders

```bash
# Get upcoming reminders
GET /api/nextstep/:customerId/upcoming
GET /api/nextstep/:customerId/upcoming?hoursAhead=48

# Get overdue items
GET /api/nextstep/:customerId/overdue

# Trigger reminder manually
POST /api/nextstep/:stepId/trigger

# Batch schedule
POST /api/nextstep/schedule
{
  "stepIds": ["step_1", "step_2", "step_3"]
}
```

### Proactive Intelligence

```bash
# Analyze upcoming
GET /api/nextstep/:customerId/analyze

# Generate proactive alert
POST /api/nextstep/:customerId/proactive
{
  "eventType": "appointment",
  "title": "Appointment tomorrow",
  "description": "Your dentist appointment is scheduled for tomorrow at 2 PM",
  "triggerHoursBefore": 24
}

# Send follow-up
POST /api/nextstep/:customerId/followup/:stepId
{
  "customMessage": "Just checking in on this"
}
```

### Analytics

```bash
# Get analytics
GET /api/nextstep/:customerId/analytics
GET /api/nextstep/:customerId/analytics?days=30

# Get summary
GET /api/nextstep/:customerId/summary
```

### Health

```bash
# Health check
GET /health
GET /ready
```

## Step Types

| Type | Description |
|------|-------------|
| `followup` | Follow-up action |
| `reminder` | General reminder |
| `appointment` | Scheduled appointment |
| `medication` | Medication reminder |
| `task` | General task |
| `meeting` | Meeting/call |
| `payment` | Payment reminder |
| `document` | Document action |
| `call` | Phone call |
| `email` | Email action |
| `review` | Review/feedback |
| `check_in` | Status check-in |
| `deadline` | Deadline approaching |
| `renewal` | Renewal reminder |
| `feedback` | Feedback request |
| `onboarding` | Onboarding step |

## Priority Levels

| Priority | Description |
|----------|-------------|
| `urgent` | Immediate action needed |
| `high` | Important, do soon |
| `medium` | Normal priority |
| `low` | Can wait |

## Status Flow

```
PENDING → IN_PROGRESS → COMPLETED
    ↓          ↓           ↓
  OVERDUE ←────────── SKIPPED
    ↓
CANCELLED
```

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    API Layer (Express)                       │
├─────────────────────────────────────────────────────────────┤
│  Extraction   │  Scheduling   │  Proactive   │  Reminder     │
│  Service     │  Service      │  Service     │  Service      │
├─────────────────────────────────────────────────────────────┤
│  Tracking Service                                         │
├─────────────────────────────────────────────────────────────┤
│  MongoDB (NextStep, ProactiveAlert, DeliveryLog)            │
├─────────────────────────────────────────────────────────────┤
│  External: WhatsApp, SMS, Email, Push APIs                  │
└─────────────────────────────────────────────────────────────┘
```

## Data Models

### NextStep
- Customer and tenant identification
- Step content (title, description, type, priority)
- Scheduling (due date, recurrence)
- Reminder settings (channels, lead time)
- Completion tracking (when, how, feedback)
- AI predictions (suggested completion time, confidence)

### ProactiveAlert
- Alert tracking (type, channels, delivery status)
- Customer context

### ReminderDeliveryLog
- Delivery tracking per channel
- Error logging for debugging

## Error Handling

All errors return consistent format:
```json
{
  "success": false,
  "error": "Error message",
  "details": [...]
}
```

## Rate Limits

- General: 1000 requests/15 minutes
- Extraction: 50 requests/minute
- Analytics: 100 requests/minute

## License

Proprietary - RTNM Group / HOJAI AI
