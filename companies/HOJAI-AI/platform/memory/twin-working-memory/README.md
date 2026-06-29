# Twin Working Memory

**Port:** 4724

Short-term context storage for digital twins.

## Features

- Priority-based memory items
- TTL expiration (default 30 min)
- FIFO stack for pending items
- Focus tracking
- Context management

## API

```bash
# Set working context
curl -X POST localhost:4724/api/working/emp-123 \
  -d '{"currentTask": "Review PR", "focus": ["code"]}'

# Get working context
curl localhost:4724/api/working/emp-123

# Push memory item
curl -X POST localhost:4724/api/working/emp-123/push \
  -d '{"key": "current-task", "value": "Meeting", "priority": 10}'

# Pop item
curl -X POST localhost:4724/api/working/emp-123/pop

# Get all items
curl localhost:4724/api/working/emp-123/items
```

## Tests

```bash
npm test  # 7 tests
```

## Status

✅ Production Ready - 7 tests passing