# Hojai Human Handoff - AI to Agent Transfer

**Port:** 4880

Seamless handoff from AI chatbots to human agents.

## Features

- **Smart Routing**: Round-robin, skills-based, priority-based
- **Agent Offers**: Time-limited offers to agents
- **Queue Management**: Priority queue with real-time updates
- **Rules Engine**: Configurable handoff triggers
- **Analytics**: Wait times, handle times, satisfaction
- **Context Transfer**: AI conversation summary to agent

## Quick Start

```bash
cd hojai-ai/hojai-human-handoff
npm install
cp .env.example .env
npm run dev
```

## API Endpoints

### Handoffs

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/handoffs` | Initiate handoff |
| GET | `/api/handoffs/:id` | Get handoff |
| POST | `/api/handoffs/:id/queue` | Add to queue |
| POST | `/api/handoffs/:id/offer` | Offer to agent |
| POST | `/api/handoffs/:id/complete` | Complete handoff |
| POST | `/api/handoffs/:id/cancel` | Cancel handoff |

### Offers

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/offers/:id/accept` | Accept offer |
| POST | `/api/offers/:id/decline` | Decline offer |

### Queue

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/queue` | Get queue |
| GET | `/api/queue/stats` | Queue stats |

### Rules

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/rules` | Get rules |
| POST | `/api/rules` | Create rule |
| PUT | `/api/rules/:id` | Update rule |
| DELETE | `/api/rules/:id` | Delete rule |
| POST | `/api/rules/evaluate` | Evaluate rules |

### Analytics

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/analytics` | Get analytics |

## Example

```bash
# Initiate handoff
curl -X POST http://localhost:4880/api/handoffs \
  -H "Content-Type: application/json" \
  -H "X-Tenant-Id: tenant_123" \
  -d '{
    "conversationId": "conv_123",
    "channel": "whatsapp",
    "botId": "bot_456",
    "flowId": "flow_789",
    "conversationSummary": "Customer asked about refund policy",
    "reason": "user_request",
    "targetTeam": "support"
  }'

# Accept offer
curl -X POST http://localhost:4880/api/offers/{id}/accept \
  -H "X-Agent-Id: agent_001"
```

## License

MIT
