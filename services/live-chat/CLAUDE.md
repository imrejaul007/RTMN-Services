# Live Chat Server

**Version:** 1.0.0  
**Port:** 4892  
**Status:** Ready

Real-time web chat service with WebSocket support for customer-agent conversations.

## Quick Start

```bash
cd services/live-chat
npm install
npm run dev
```

## Features

- Real-time WebSocket chat
- Agent availability queue with auto-assignment
- Chat rooms (1:1 customer-agent)
- Message history
- Typing indicators
- Online/offline status
- Transfer to different agent
- REST API for management

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    LIVE CHAT SERVER                         │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────┐     ┌─────────────┐     ┌─────────────┐   │
│  │   Express   │     │  WebSocket  │     │   REST      │   │
│  │   Server    │     │   Server    │     │   Routes    │   │
│  └──────┬──────┘     └──────┬──────┘     └──────┬──────┘   │
│         │                  │                  │          │
│  ┌──────▼──────────────────▼──────────────────▼──────┐    │
│  │              Chat Handler                          │    │
│  │  - Message routing  - Connection management       │    │
│  │  - Event handling    - Typing indicators          │    │
│  └──────────────────────────┬─────────────────────────┘    │
│                             │                               │
│  ┌──────────────────────────▼─────────────────────────┐    │
│  │              Room Manager                            │    │
│  │  - Room lifecycle  - User management               │    │
│  │  - Broadcasting     - Transfer handling             │    │
│  └──────────────────────────┬─────────────────────────┘    │
│                             │                               │
│  ┌──────────────────────────▼─────────────────────────┐    │
│  │              Agent Queue                            │    │
│  │  - Auto-assignment  - Availability tracking         │    │
│  │  - Load balancing   - Queue management              │    │
│  └──────────────────────────┬─────────────────────────┘    │
│                             │                               │
│  ┌──────────────────────────▼─────────────────────────┐    │
│  │              Message Store                         │    │
│  │  - In-memory storage - Message history            │    │
│  │  - Room state         - User presence              │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

## WebSocket API

### Connection

```javascript
const ws = new WebSocket('ws://localhost:4892/ws');

ws.onopen = () => {
  // Join a room
  ws.send(JSON.stringify({
    type: 'join_room',
    payload: {
      userId: 'user-123',
      userName: 'John Doe',
      userRole: 'customer'
    }
  }));
};
```

### Message Types

#### Client to Server

| Type | Description | Payload |
|------|-------------|---------|
| `join_room` | Join or create room | `{ roomId?, userId, userName, userRole, agentId? }` |
| `leave_room` | Leave current room | `{}` |
| `send_message` | Send message | `{ roomId, content, type? }` |
| `typing` | Typing indicator | `{ roomId, isTyping: true }` |
| `stop_typing` | Stop typing | `{ roomId, isTyping: false }` |
| `transfer` | Transfer room | `{ roomId, fromAgentId, toAgentId? }` |
| `close_room` | Close room | `{}` |
| `get_online_agents` | Get available agents | `{}` |

#### Server to Client

| Type | Description | Payload |
|------|-------------|---------|
| `connected` | Connection established | `{ message }` |
| `room_joined` | Joined existing room | `{ roomId, room }` |
| `room_created` | Created new room | `{ roomId, room }` |
| `waiting_for_agent` | Queued for agent | `{ queuePosition }` |
| `new_message` | New message received | `{ message }` |
| `message_history` | Chat history | `{ roomId, messages }` |
| `user_typing` | User is typing | `{ roomId, userId, userName }` |
| `user_stop_typing` | User stopped typing | `{ roomId, userId }` |
| `agent_join` | Agent joined | `{ userId, userName, roomId }` |
| `agent_leave` | Agent left | `{ userId, roomId, reason }` |
| `transfer` | Room transferred | `{ roomId, fromAgentId, toAgentId }` |
| `close_room` | Room closed | `{ roomId, closedBy }` |
| `online_agents` | Agent list | `{ agents }` |
| `error` | Error occurred | `{ message }` |

### Example: Full Chat Flow

```javascript
// Customer joins
ws.send(JSON.stringify({
  type: 'join_room',
  payload: {
    userId: 'customer-1',
    userName: 'Alice',
    userRole: 'customer'
  }
}));

// Agent joins with room ID
ws.send(JSON.stringify({
  type: 'join_room',
  payload: {
    roomId: 'received-room-id',
    userId: 'agent-1',
    userName: 'Bob',
    userRole: 'agent'
  }
}));

// Send message
ws.send(JSON.stringify({
  type: 'send_message',
  payload: {
    roomId: 'room-id',
    content: 'Hello, I need help!'
  }
}));

// Typing indicator
ws.send(JSON.stringify({
  type: 'typing',
  payload: {
    roomId: 'room-id',
    isTyping: true
  }
}));

// Transfer to another agent
ws.send(JSON.stringify({
  type: 'transfer',
  payload: {
    roomId: 'room-id',
    fromAgentId: 'agent-1',
    toAgentId: 'agent-2' // Optional for auto-assign
  }
}));

// Close room
ws.send(JSON.stringify({
  type: 'close_room',
  payload: {}
}));
```

## REST API

### Authentication

Include JWT token in Authorization header:
```
Authorization: Bearer <token>
```

### Endpoints

#### Health & Status

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Health check |
| GET | `/api/health` | API health check |
| GET | `/api/stats` | Server statistics |
| GET | `/ws-info` | WebSocket info |

#### Rooms

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/rooms` | List all rooms (agent/admin) |
| GET | `/api/rooms/:id` | Get room by ID |
| GET | `/api/my-rooms` | Get user's rooms |
| POST | `/api/rooms` | Create new room |
| PATCH | `/api/rooms/:id` | Update room |
| POST | `/api/rooms/:id/close` | Close room |
| POST | `/api/rooms/:id/transfer` | Transfer room |
| GET | `/api/rooms/:id/messages` | Get room messages |

#### Agents

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/agents` | List online agents |
| GET | `/api/queue` | Queue statistics |

#### Admin

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/users` | List online users |
| POST | `/api/broadcast` | Broadcast message |

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | 4892 | Server port |
| `ALLOWED_ORIGINS` | http://localhost:3000 | CORS origins (comma-separated) |
| `JWT_SECRET` | - | JWT signing secret |
| `DEBUG` | false | Enable debug logging |

## Data Structures

### ChatRoom

```typescript
interface ChatRoom {
  id: string;
  customerId: string;
  agentId?: string;
  status: 'waiting' | 'active' | 'closed';
  createdAt: Date;
  updatedAt: Date;
  metadata?: Record<string, unknown>;
}
```

### Message

```typescript
interface Message {
  id: string;
  roomId: string;
  senderId: string;
  senderRole: 'customer' | 'agent' | 'admin';
  senderName: string;
  content: string;
  type: 'text' | 'system' | 'transfer';
  timestamp: Date;
  read: boolean;
}
```

### AgentInfo

```typescript
interface AgentInfo {
  id: string;
  name: string;
  isAvailable: boolean;
  currentChats: number;
  maxChats: number;
}
```

## Agent Queue System

1. Customer joins without specific agent
2. Customer added to waiting queue
3. System auto-assigns to available agent with least load
4. Agent can transfer to another agent
5. Room can be closed by agent

### Queue Priority

- Higher priority customers served first
- Within same priority, FIFO ordering
- Default priority is 0

## Integration

### Client SDK Example

```typescript
class LiveChatClient {
  private ws: WebSocket;
  private handlers: Map<string, Function[]>;

  constructor(url: string) {
    this.ws = new WebSocket(url);
    this.handlers = new Map();
    this.setupListeners();
  }

  on(event: string, handler: Function) {
    const handlers = this.handlers.get(event) || [];
    handlers.push(handler);
    this.handlers.set(event, handlers);
  }

  private setupListeners() {
    this.ws.onmessage = (event) => {
      const msg = JSON.parse(event.data);
      const handlers = this.handlers.get(msg.type) || [];
      handlers.forEach(h => h(msg.payload));
    };
  }

  joinRoom(userId: string, userName: string, role: string, roomId?: string) {
    this.send('join_room', { userId, userName, userRole: role, roomId });
  }

  sendMessage(roomId: string, content: string) {
    this.send('send_message', { roomId, content });
  }

  private send(type: string, payload: any) {
    this.ws.send(JSON.stringify({ type, payload }));
  }
}
```

## Testing

```bash
# Test WebSocket connection
npm run test:ws

# Test REST endpoints
npm run test:rest

# Test with wscat
wscat -c ws://localhost:4892/ws
```

## Production Checklist

- [ ] Set secure `JWT_SECRET`
- [ ] Configure `ALLOWED_ORIGINS` for production domains
- [ ] Enable TLS/SSL
- [ ] Set up Redis for message persistence (optional)
- [ ] Configure load balancing for scale
- [ ] Set up monitoring/alerting
- [ ] Enable debug logging only in staging

---

*Live Chat Server - Real-time customer support powered by RTMN*
