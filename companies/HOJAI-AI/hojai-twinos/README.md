# HOJAI TwinOS Service

Digital twin management and AI persona data for the RTMN ecosystem.

## Features

- **Digital Twin Management**: Create and manage digital representations
- **Sentiment Analysis**: Analyze text sentiment and emotions
- **Topic Extraction**: Extract key topics from text
- **Objection Detection**: Detect sales objections and suggested responses

## Quick Start

```bash
# Install dependencies
npm install

# Build TypeScript
npm run build

# Start service
npm start

# Or run in dev mode
npm run dev
```

## API Endpoints

### Health Check
```bash
curl http://localhost:4521/health
```

### Get Twin
```bash
curl "http://localhost:4521/twin?id=twin-1"
```

### Create/Update Twin
```bash
curl -X POST http://localhost:4521/twin \
  -H "Content-Type: application/json" \
  -d '{
    "name": "John Doe",
    "type": "person",
    "preferences": { "industries": ["Tech"], "price_sensitivity": "low" }
  }'
```

### Sentiment Analysis
```bash
curl -X POST http://localhost:4521/analyze/sentiment \
  -H "Content-Type: application/json" \
  -d '{ "text": "This product is amazing! I love how easy it is to use." }'
```

### Topic Extraction
```bash
curl -X POST http://localhost:4521/analyze/topics \
  -H "Content-Type: application/json" \
  -d '{ "text": "The pricing is a bit high but the features are excellent." }'
```

### Objection Detection
```bash
curl -X POST http://localhost:4521/analyze/objections \
  -H "Content-Type: application/json" \
  -d '{ "text": "It seems too expensive for our budget." }'
```

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| PORT | 4521 | Server port |
| INTERNAL_TOKEN | dev-internal-token | Auth token |
| NODE_ENV | development | Environment |

## Architecture

```
hojai-twinos/
├── src/
│   ├── index.ts          # Main server
│   └── routes/
│       ├── twin.ts       # Twin management
│       └── analyze.ts    # Analysis endpoints
├── package.json
├── tsconfig.json
└── .env.example
```

## License
MIT
