# HOJAI Web Intelligence Service

Market signals, competitor analysis, and web intelligence for the RTMN ecosystem.

## Features

- **Market Signals Search**: Search across industry signals with filtering
- **Industry Trends**: Real-time trend data across 6+ industries
- **Competitor Analysis**: Track and analyze competitor positioning

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
curl http://localhost:4595/health
```

### Search Market Signals
```bash
curl "http://localhost:4595/signals/search?q=AI&limit=5"
```

### Get Industry Trends
```bash
curl "http://localhost:4595/trends?industry=restaurant"
```

### Competitor Analysis
```bash
curl "http://localhost:4595/competitors?company=starbucks"
```

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| PORT | 4595 | Server port |
| INTERNAL_TOKEN | dev-internal-token | Auth token |
| NODE_ENV | development | Environment |

## Architecture

```
hojai-web-intelligence/
├── src/
│   ├── index.ts          # Main server
│   └── routes/
│       ├── signals.ts    # Market signals
│       ├── trends.ts     # Industry trends
│       └── competitors.ts # Competitor analysis
├── package.json
├── tsconfig.json
└── .env.example
```

## License
MIT
