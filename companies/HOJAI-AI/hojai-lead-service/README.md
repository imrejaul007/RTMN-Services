# HOJAI Lead Service

Lead scoring, enrichment, and prospect data for the RTMN ecosystem.

## Features

- **Lead Scoring**: Multi-factor scoring model with tier assignment
- **Lead Enrichment**: Enrich lead data with company and contact info
- **Prospect Management**: View and filter prospect database

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
curl http://localhost:4752/health
```

### Score a Lead
```bash
curl -X POST http://localhost:4752/score \
  -H "Content-Type: application/json" \
  -d '{
    "company_name": "Acme Corp",
    "company_size": "enterprise",
    "industry": "technology",
    "employees_count": 500,
    "email_opens": 10,
    "email_clicks": 3,
    "demo_requested": true
  }'
```

### Enrich Lead Data
```bash
curl -X POST http://localhost:4752/enrich \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john.doe@company.com",
    "first_name": "John",
    "last_name": "Doe",
    "company_name": "Acme Corp"
  }'
```

### List Prospects
```bash
curl "http://localhost:4752/prospects?limit=10&tier=hot"
```

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| PORT | 4752 | Server port |
| INTERNAL_TOKEN | dev-internal-token | Auth token |
| NODE_ENV | development | Environment |

## Architecture

```
hojai-lead-service/
├── src/
│   ├── index.ts          # Main server
│   └── routes/
│       ├── score.ts      # Lead scoring
│       ├── enrich.ts     # Lead enrichment
│       └── prospects.ts  # Prospect listing
├── package.json
├── tsconfig.json
└── .env.example
```

## License
MIT
