# Hojai Studio - Visual Conversation Builder

**Port:** 4850

Low-code/no-code platform for building AI-powered conversational bots without heavy engineering.

## Features

- **Visual Flow Builder**: Drag-and-drop interface for creating conversation flows
- **Multi-Channel Support**: WhatsApp, Instagram, Web Chat, Voice, Email, Telegram
- **AI-Powered Responses**: Integration with Claude, GPT-4 for intelligent responses
- **Pre-built Templates**: Ready-to-use bot templates for various industries
- **Conditional Logic**: Branch conversations based on user attributes
- **Webhooks**: Connect to external services and APIs
- **Analytics**: Track conversation metrics and performance
- **Human Handoff**: Transfer to live agents when needed

## Quick Start

```bash
cd hojai-ai/hojai-studio

# Install dependencies
npm install

# Copy environment
cp .env.example .env

# Start development
npm run dev

# Build for production
npm run build

# Start production
npm start
```

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                       HOJAI STUDIO                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐  │
│  │                    REST API (4850)                        │  │
│  │  Bots │ Templates │ Conversations │ Node Types           │  │
│  └─────────────────────────────────────────────────────────┘  │
│                              │                                 │
│  ┌───────────────────────────┼───────────────────────────────┐  │
│  │                    Services Layer                         │  │
│  │  BotService │ FlowExecutor │ TemplateService             │  │
│  └───────────────────────────┼───────────────────────────────┘  │
│                              │                                 │
│  ┌───────────────────────────┼───────────────────────────────┐  │
│  │                    Data Layer                             │  │
│  │  Bot │ Template │ Conversation │ Message (MongoDB)      │  │
│  └───────────────────────────────────────────────────────────┘  │
│                              │                                 │
│  ┌───────────────────────────┴───────────────────────────────┐  │
│  │                    Integration Layer                      │  │
│  │  Hojai Agents │ WhatsApp │ REZ Intelligence             │  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## Node Types

| Type | Description |
|------|-------------|
| **Trigger** | Starts the conversation (welcome, keyword, webhook, schedule) |
| **Message** | Send text, media, quick replies, or buttons |
| **AI Response** | AI-powered intelligent responses |
| **Condition** | Branch based on user attributes/conditions |
| **Action** | Perform actions (send email, create ticket, update variable) |
| **Webhook** | Call external APIs |
| **Delay** | Wait before next step |
| **Handoff** | Transfer to human agent |
| **End** | End the conversation |

## API Endpoints

### Bots

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/bots` | List all bots |
| POST | `/api/bots` | Create new bot |
| GET | `/api/bots/:id` | Get bot by ID |
| PUT | `/api/bots/:id` | Update bot |
| DELETE | `/api/bots/:id` | Delete bot |
| POST | `/api/bots/:id/status` | Change bot status |
| POST | `/api/bots/:id/clone` | Clone bot |
| GET | `/api/bots/:id/analytics` | Get bot analytics |
| POST | `/api/bots/:id/test` | Test bot flow |

### Flows & Nodes

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/bots/:id/flows` | Add flow to bot |
| PUT | `/api/bots/:id/flows/:flowId` | Update flow |
| DELETE | `/api/bots/:id/flows/:flowId` | Delete flow |
| POST | `/api/bots/:id/flows/:flowId/nodes` | Add node |
| PUT | `/api/bots/:id/flows/:flowId/nodes/:nodeId` | Update node |
| DELETE | `/api/bots/:id/flows/:flowId/nodes/:nodeId` | Delete node |
| POST | `/api/bots/:id/flows/:flowId/nodes/:nodeId/connect` | Connect nodes |

### Templates

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/templates` | List templates |
| GET | `/api/templates/search?q=` | Search templates |
| GET | `/api/templates/:id` | Get template |
| POST | `/api/templates` | Create template |
| PUT | `/api/templates/:id` | Update template |
| DELETE | `/api/templates/:id` | Delete template |
| POST | `/api/templates/:id/duplicate` | Duplicate template |
| POST | `/api/templates/:id/create-bot` | Create bot from template |

### Conversations

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/conversations/start` | Start conversation |
| POST | `/api/conversations/message` | Process message |
| GET | `/api/conversations/:id` | Get conversation |
| GET | `/api/conversations/:id/messages` | Get messages |
| POST | `/api/conversations/:id/end` | End conversation |
| POST | `/api/conversations/:id/transfer` | Transfer to agent |

### Meta

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/node-types` | All node types |
| GET | `/api/industries` | All industries |
| GET | `/api/categories` | All categories |
| GET | `/api/action-types` | All action types |

## Example: Create a Bot

```bash
# Create bot
curl -X POST http://localhost:4850/api/bots \
  -H "Content-Type: application/json" \
  -H "X-Tenant-Id: tenant_123" \
  -H "X-User-Id: user_456" \
  -d '{
    "name": "Customer Support Bot",
    "description": "AI-powered customer support",
    "channels": ["whatsapp", "instagram"]
  }'

# Add flow
curl -X POST http://localhost:4850/api/bots/{bot_id}/flows \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Main Flow",
    "description": "Primary conversation flow"
  }'

# Add nodes
curl -X POST http://localhost:4850/api/bots/{bot_id}/flows/{flow_id}/nodes \
  -H "Content-Type: application/json" \
  -d '{
    "type": "message",
    "label": "Welcome",
    "position": { "x": 250, "y": 50 },
    "config": {
      "message": {
        "text": "Hello! How can I help you?",
        "quickReplies": [
          { "id": "qr1", "text": "Support" },
          { "id": "qr2", "text": "Sales" }
        ]
      }
    }
  }'
```

## Example: Start Conversation

```bash
curl -X POST http://localhost:4850/api/conversations/start \
  -H "Content-Type: application/json" \
  -H "X-Tenant-Id: tenant_123" \
  -d '{
    "botId": "bot_123",
    "userId": "user_456",
    "channel": "whatsapp",
    "metadata": {
      "userPhone": "+919876543210"
    }
  }'

# Send message
curl -X POST http://localhost:4850/api/conversations/message \
  -H "Content-Type: application/json" \
  -d '{
    "sessionId": "session_xxx",
    "message": "I need help with my order"
  }'
```

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| PORT | Server port | 4850 |
| MONGODB_URI | MongoDB URI | mongodb://localhost:27017/hojai_studio |
| REDIS_URL | Redis URL | redis://localhost:6379 |
| HOJAI_AGENTS_URL | Hojai Agents service | http://localhost:4550 |
| REZ_WHATSAPP_URL | REZ WhatsApp service | http://localhost:4202 |
| INTERNAL_SERVICE_TOKEN | Internal auth token | - |
| RATE_LIMIT_WINDOW_MS | Rate limit window | 900000 |
| RATE_LIMIT_MAX_REQUESTS | Max requests per window | 100 |

## License

MIT
