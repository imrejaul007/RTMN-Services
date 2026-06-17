# HOJAI Knowledge Graph Service

Entity relationships and knowledge graph queries for the RTMN ecosystem.

## Features

- **Knowledge Graph Queries**: Query relationships between entities
- **Entity Search**: Search across all entity types
- **Entity Management**: Create, read, update, delete entities

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
curl http://localhost:4786/health
```

### Query Knowledge Graph
```bash
curl "http://localhost:4786/query?entity=TechCorp"
```

### Search Entities
```bash
curl "http://localhost:4786/search?q=cloud&type=product"
```

### Get Entity
```bash
curl http://localhost:4786/entity/company-1
```

### Create Entity
```bash
curl -X POST http://localhost:4786/entity \
  -H "Content-Type: application/json" \
  -d '{
    "type": "company",
    "name": "New Company Inc",
    "properties": { "industry": "Tech", "employees": 100 }
  }'
```

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| PORT | 4786 | Server port |
| INTERNAL_TOKEN | dev-internal-token | Auth token |
| NODE_ENV | development | Environment |

## Architecture

```
hojai-knowledge-graph/
├── src/
│   ├── index.ts          # Main server
│   └── routes/
│       ├── query.ts      # KG queries
│       ├── search.ts     # Entity search
│       └── entity.ts     # Entity CRUD
├── package.json
├── tsconfig.json
└── .env.example
```

## License
MIT
