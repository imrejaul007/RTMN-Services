# Twin Working Memory - CLAUDE.md

## Service Overview

**Name:** Twin Working Memory
**Port:** 4724
**Type:** Memory Layer
**Category:** TwinOS Short-term Memory

## Purpose

Short-term context storage for digital twins.

## Key Features

1. **Context Management** - Store current focus and tasks
2. **Priority Queue** - Priority-based memory items
3. **TTL Expiration** - Auto-expire old items (default 30 min)
4. **FIFO Stack** - Pending items stack
5. **Focus Tracking** - Track current focus areas

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /health | Health check |
| POST | /api/working/:twinId | Set context |
| GET | /api/working/:twinId | Get context |
| POST | /api/working/:twinId/push | Push item |
| POST | /api/working/:twinId/pop | Pop item |
| DELETE | /api/working/:twinId | Clear memory |
| GET | /api/working/:twinId/items | Get all items |

## Memory Item

```typescript
interface MemoryItem {
  id: string;
  key: string;
  value: any;
  priority: number;
  createdAt: string;
  expiresAt: string;
}
```

## Testing

```bash
npm test  # 7 tests
```

## Status

✅ Production Ready