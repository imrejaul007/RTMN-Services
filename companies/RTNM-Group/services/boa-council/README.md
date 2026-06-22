# BOA Council - RTMN Multi-BOA Orchestration

Multi-BOA coordination engine that synthesizes decisions from CEO, CFO, COO, CMO, CHRO, and CLO perspectives.

## Quick Start

```bash
cd core/boa-council
npm install
npm start
```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/council` | Full council overview |
| GET | `/api/council/members` | List all BOA members |
| GET | `/api/council/member/:id` | Get specific member |
| POST | `/api/council/consult` | Consult council on question |
| POST | `/api/synthesis/multi-perspective` | Synthesize perspectives |
| GET | `/api/decisions` | List decisions |
| POST | `/api/decisions` | Create decision |

## Example

```bash
# Consult the council
curl -X POST http://localhost:3016/api/council/consult \
  -H "Content-Type: application/json" \
  -d '{"question": "Should we expand to new market?"}'
```

## Docker

```bash
docker build -t rtmn-boa-council core/boa-council
docker run -p 3016:3016 rtmn-boa-council
```
