# Marketing OS - RTMN Multi-Industry Marketing

Multi-industry marketing orchestration engine for campaigns, channels, and content.

## Quick Start

```bash
cd core/marketing-os
npm install
npm start
```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/campaigns` | List campaigns |
| POST | `/api/campaigns` | Create campaign |
| POST | `/api/campaigns/:id/launch` | Launch campaign |
| GET | `/api/channels` | List channels |
| GET | `/api/content` | List content |
| POST | `/api/content` | Create content |
| GET | `/api/analytics` | Analytics overview |

## Example

```bash
# Create campaign
curl -X POST http://localhost:3020/api/campaigns \
  -H "Content-Type: application/json" \
  -d '{"name": "Summer Sale", "industry": "retail", "budget": 50000}'
```

## Docker

```bash
docker build -t rtmn-marketing-os core/marketing-os
docker run -p 3020:3020 rtmn-marketing-os
```
