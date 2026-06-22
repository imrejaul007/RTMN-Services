# Memory Network - RTMN Multi-Tier Memory

Personal, business, industry, ecosystem, and agent memory with federation and sync.

## Quick Start

```bash
cd core/memory-network
npm install
npm start
```

## Memory Tiers

- **Personal** - Individual user memories
- **Business** - Company-wide context
- **Industry** - Industry knowledge
- **Ecosystem** - Cross-company context
- **Agent** - AI agent memories

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/memory` | Get memory |
| POST | `/api/memory` | Store memory |
| GET | `/api/memory/federate` | Federated search |
| POST | `/api/memory/sync` | Sync memory |
| GET | `/api/tiers` | List tiers |
| POST | `/api/tiers/:tier` | Store by tier |

## Example

```bash
# Store personal memory
curl -X POST http://localhost:3015/api/memory \
  -H "Content-Type: application/json" \
  -d '{"tier": "personal", "content": "User prefers morning meetings"}'

# Federated search
curl "http://localhost:3015/api/memory/federate?q=meetings"
```

## Docker

```bash
docker build -t rtmn-memory-network core/memory-network
docker run -p 3015:3015 rtmn-memory-network
```
