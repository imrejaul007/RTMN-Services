# HOJAI SiteOS Support Widget Service

**Port:** 5482
**Version:** 1.0.0
**Status:** Production Ready

## Overview

Support Ticket Management with Live Chat - ticket system, chat sessions, canned responses, satisfaction ratings.

## Features

- **Ticket Management** - Create, update, assign, close tickets
- **Live Chat Sessions** - Real-time chat with typing indicators
- **Auto-categorization** - Detects billing/technical/account/sales from subject
- **Auto-prioritization** - Detects urgent/high from keywords
- **Canned Responses** - Pre-built response templates
- **Satisfaction Ratings** - Customer feedback after resolution
- **SLA Tracking** - First response and resolution time stats

## Support Categories

- `billing` - Payment, invoice, refund issues
- `technical` - Bugs, errors, functionality issues
- `account` - Login, password, profile
- `sales` - Pricing, demos, purchase questions
- `general` - Everything else

## Priority Levels

- `low` - Non-urgent, no deadline
- `medium` - Standard priority
- `high` - Important, needs attention
- `urgent` - Emergency, immediate response needed

## API Endpoints

### Tickets
- `GET /api/tickets` - List tickets (filters: status, priority, category, agent)
- `POST /api/tickets` - Create ticket
- `GET /api/tickets/:id` - Get ticket
- `PUT /api/tickets/:id` - Update ticket
- `PUT /api/tickets/:id/status` - Change status
- `PUT /api/tickets/:id/assign` - Assign agent
- `DELETE /api/tickets/:id` - Delete ticket

### Messages
- `GET /api/tickets/:id/messages` - Get messages
- `POST /api/tickets/:id/messages` - Add message

### Satisfaction
- `POST /api/tickets/:id/rate` - Rate ticket (1-5)

### Canned Responses
- `GET /api/canned-responses` - List responses
- `POST /api/canned-responses` - Create response

### Chat Sessions
- `GET /api/sessions` - List active sessions
- `POST /api/sessions` - Start session
- `POST /api/sessions/:id/join` - Agent joins
- `POST /api/sessions/:id/messages` - Send message
- `POST /api/sessions/:id/typing` - Typing indicator
- `POST /api/sessions/:id/end` - End session

### Stats
- `GET /api/stats` - Support statistics

## Example Usage

```bash
# Create ticket
curl -X POST http://localhost:5482/api/tickets \
  -H "Content-Type: json" \
  -H "X-API-Key: your-key" \
  -d '{"subject": "Cannot login to my account", "customerName": "John", "customerEmail": "john@example.com"}'

# Add message
curl -X POST http://localhost:5482/api/tickets/ticket-uuid/messages \
  -H "Content-Type: json" \
  -H "X-API-Key: your-key" \
  -d '{"sender": "agent", "senderName": "Agent Smith", "content": "I can help you reset your password."}'

# Get stats
curl http://localhost:5482/api/stats -H "X-API-Key: your-key"
```

## Files

```
support-widget/
├── src/index.js       # Main service (500 lines)
├── package.json
├── vitest.config.js
├── CLAUDE.md
├── __tests__/
│   └── unit/
│       └── support-widget.test.js  # 14 tests
```

## Test Results

```
✓ 14 tests passing
- Categories (5)
- Priorities (4)
- Statuses (4)
- Auto-detect category (5)
- Auto-detect priority (3)
```
