# Economic Graph - RTMN Value Flow Mapping

Graph-based network analysis engine for mapping value flows across the RTMN ecosystem.

## Quick Start

```bash
cd core/economic-graph
npm install
npm start
```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/graph` | Get full graph |
| POST | `/api/graph/node` | Add node |
| POST | `/api/graph/edge` | Add edge |
| GET | `/api/flows` | List value flows |
| POST | `/api/flows/calculate` | Calculate flow |
| GET | `/api/analysis/metrics` | Graph metrics |
| GET | `/api/visualization/d3` | D3.js data |

## Example

```bash
# Add company node
curl -X POST http://localhost:3017/api/graph/node \
  -H "Content-Type: application/json" \
  -d '{"type": "company", "name": "FitnessCo"}'

# Create value flow
curl -X POST http://localhost:3017/api/graph/edge \
  -H "Content-Type: application/json" \
  -d '{"source": "industry:fitness", "target": "company:fitnessco", "type": "revenue", "value": 500000}'
```

## Docker

```bash
docker build -t rtmn-economic-graph core/economic-graph
docker run -p 3017:3017 rtmn-economic-graph
```
