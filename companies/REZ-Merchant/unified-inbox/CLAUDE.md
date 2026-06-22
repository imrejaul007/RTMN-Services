# Unified Inbox Service

**Port:** 4870  
**Status:** ✅ BUILT  
**Purpose:** All customer support channels in one place

---

## Overview

Unified Inbox brings all customer support channels together:
- Email, Chat, Phone, WhatsApp, Social
- Team collaboration
- Smart routing
- Macros & templates
- Real-time messaging

## Features

- ✅ 8 Channels (Email, Chat, Phone, WhatsApp, Instagram, Twitter, Facebook, Telegram)
- ✅ Agent management with skills
- ✅ Team management
- ✅ Smart routing
- ✅ Macros & templates
- ✅ Conversation management
- ✅ Statistics & analytics

## API Endpoints

### Conversations
- `GET /api/conversations` - List conversations (filters: status, channel, priority, assignedTo, team)
- `GET /api/conversations/:id` - Get conversation with messages
- `POST /api/conversations` - Create conversation
- `PATCH /api/conversations/:id` - Update conversation
- `POST /api/conversations/:id/assign` - Assign conversation

### Messages
- `POST /api/conversations/:id/messages` - Send message
- `GET /api/conversations/:id/messages` - Get messages
- `POST /api/conversations/:id/read` - Mark as read

### Channels
- `GET /api/channels` - List channels
- `GET /api/channels/:id` - Get channel with conversations

### Agents
- `GET /api/agents` - List agents
- `GET /api/agents/:id` - Get agent with conversations
- `PATCH /api/agents/:id/status` - Update status
- `GET /api/agents/available` - Get available agent for routing

### Teams
- `GET /api/teams` - List teams
- `GET /api/teams/:id` - Get team with agents and conversations

### Macros
- `GET /api/macros` - List macros
- `GET /api/macros/:id` - Get macro
- `POST /api/macros` - Create macro
- `POST /api/macros/:id/use` - Use macro (increment usage)

### Statistics
- `GET /api/stats` - Get inbox statistics

## Quick Start

```bash
cd services/unified-inbox
npm install
npm start
```

## Integration

- **Customer Intelligence** - Links to customer profiles
- **Ticket Engine** - Syncs with ticketing
- **Notification Service** - Sends alerts
- **Agent Copilot** - AI assistance
