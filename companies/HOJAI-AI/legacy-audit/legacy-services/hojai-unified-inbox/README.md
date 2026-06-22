# Hojai Unified Inbox - Contact Center

**Port:** 4870

Multi-channel contact center for unified customer support across WhatsApp, Email, SMS, Instagram, and more.

## Features

- **Multi-Channel Support**: WhatsApp, Instagram, Email, SMS, Web Chat, Voice, Telegram
- **Real-Time**: Socket.IO for live updates and notifications
- **Agent Management**: Status, skills, teams, workload balancing
- **Smart Routing**: Round-robin, least-busy, skills-based assignment
- **Canned Responses**: Quick replies with usage tracking
- **Tags & Labels**: Organize and filter conversations
- **Statistics**: Real-time dashboard with metrics
- **Webhooks**: Integrate with external systems

## Quick Start

```bash
cd hojai-ai/hojai-unified-inbox

npm install
cp .env.example .env
npm run dev
```

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    HOJAI UNIFIED INBOX                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐  │
│  │              REST API + WebSocket (4870)                │  │
│  │  Conversations │ Messages │ Agents │ Teams │ Stats     │  │
│  └─────────────────────────────────────────────────────────┘  │
│                              │                                  │
│  ┌───────────────────────────┼────────────────────────────┐  │
│  │                   Services Layer                           │  │
│  │                   InboxService                            │  │
│  └───────────────────────────┼────────────────────────────┘  │
│                              │                                  │
│  ┌─────────────────────────────────────────────────────────┐  │
│  │              Data Layer (MongoDB)                        │  │
│  │  Conversation │ Message │ Agent │ Team │ CannedResponse  │  │
│  └─────────────────────────────────────────────────────────┘  │
│                              │                                  │
│  ┌───────────────────────────┴────────────────────────────┐  │
│  │              Real-Time (Socket.IO)                      │  │
│  │  Agent Presence │ Typing │ Notifications │ Live Updates   │  │
│  └─────────────────────────────────────────────────────────┘  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## Channels

| Channel | Icon | Status |
|---------|------|--------|
| WhatsApp | 📱 | Primary |
| Instagram | 📸 | Supported |
| Email | 📧 | Supported |
| SMS | 💬 | Supported |
| Web Chat | 💭 | Supported |
| Voice | 📞 | Supported |
| Telegram | ✈️ | Supported |

## API Endpoints

### Conversations

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/conversations` | List conversations |
| GET | `/api/conversations/:id` | Get conversation |
| POST | `/api/conversations` | Create conversation |
| POST | `/api/conversations/:id/assign` | Assign to agent |
| POST | `/api/conversations/:id/resolve` | Resolve conversation |
| POST | `/api/conversations/:id/close` | Close conversation |
| POST | `/api/conversations/:id/transfer` | Transfer to team |
| POST | `/api/conversations/:id/tags` | Add tag |
| DELETE | `/api/conversations/:id/tags/:tag` | Remove tag |

### Messages

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/conversations/:id/messages` | Get messages |
| POST | `/api/conversations/:id/messages` | Send message |

### Agents

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/agents` | List agents |
| POST | `/api/agents` | Create agent |
| GET | `/api/agents/:id` | Get agent |
| POST | `/api/agents/:id/status` | Set status |

### Teams

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/teams` | List teams |
| POST | `/api/teams` | Create team |

### Canned Responses

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/canned-responses?q=` | Search responses |
| POST | `/api/canned-responses` | Create response |
| POST | `/api/canned-responses/:id/use` | Use response |

### Statistics

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/stats` | Get inbox stats |

## WebSocket Events

### Client → Server

| Event | Payload | Description |
|-------|---------|-------------|
| `agent:login` | `{ agentId, tenantId }` | Agent login |
| `conversation:join` | `{ conversationId, tenantId }` | Join conversation |
| `conversation:leave` | `{ conversationId }` | Leave conversation |
| `typing:start` | `{ conversationId, agentId }` | Start typing |
| `typing:stop` | `{ conversationId, agentId }` | Stop typing |
| `message:new` | `{ conversationId, content, agentId }` | New message |

### Server → Client

| Event | Payload | Description |
|-------|---------|-------------|
| `agent:logged_in` | `{ success }` | Login confirmation |
| `conversation:user_joined` | `{ conversationId }` | User joined |
| `typing:started` | `{ agentId }` | Someone typing |
| `typing:stopped` | `{ agentId }` | Typing stopped |
| `message:received` | `{ message }` | New message |
| `notification:new_message` | `{ conversationId }` | New message notification |
| `notification:new_assignment` | `{ conversationId }` | New assignment |
| `agent:status_changed` | `{ agentId, status }` | Agent status changed |

## Example Usage

```bash
# Create conversation
curl -X POST http://localhost:4870/api/conversations \
  -H "Content-Type: application/json" \
  -H "X-Tenant-Id: tenant_123" \
  -d '{
    "channel": "whatsapp",
    "customer": {
      "id": "user_123",
      "name": "John Doe",
      "phone": "+919876543210"
    },
    "subject": "Order inquiry"
  }'

# Assign to agent
curl -X POST http://localhost:4870/api/conversations/{id}/assign \
  -H "Content-Type: application/json" \
  -d '{"agentId": "agent_456"}'

# Send message
curl -X POST http://localhost:4870/api/conversations/{id}/messages \
  -H "Content-Type: application/json" \
  -d '{
    "type": "text",
    "direction": "outbound",
    "content": {"text": "Hello! How can I help?"},
    "sender": {"id": "agent_456", "name": "Agent"}
  }'

# Get stats
curl http://localhost:4870/api/stats \
  -H "X-Tenant-Id: tenant_123"
```

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| PORT | Server port | 4870 |
| MONGODB_URI | MongoDB URI | mongodb://localhost:27017/hojai_unified_inbox |
| INTERNAL_SERVICE_TOKEN | Internal auth | - |
| RATE_LIMIT_MAX_REQUESTS | Rate limit | 100 |

## License

MIT
