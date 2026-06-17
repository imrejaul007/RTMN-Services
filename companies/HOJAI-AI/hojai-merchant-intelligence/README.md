# HOJAI Merchant Intelligence Service

Business intelligence, sales insights, and company profiles for the RTMN ecosystem.

## Features

- **Company Intelligence**: Comprehensive company data including insights and buying signals
- **Company Profiles**: Detailed company profiles with financials and leadership
- **Market Intelligence**: Industry-specific market data and benchmarks

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
curl http://localhost:4751/health
```

### Get Company Intelligence
```bash
curl "http://localhost:4751/company-intel?name=acme%20corp"
```

### Get Company Profile
```bash
curl "http://localhost:4751/company-profile?name=shopify"
```

### Get Market Intelligence
```bash
curl "http://localhost:4751/market-intel?industry=restaurant"
```

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| PORT | 4751 | Server port |
| INTERNAL_TOKEN | dev-internal-token | Auth token |
| NODE_ENV | development | Environment |

## Architecture

```
hojai-merchant-intelligence/
├── src/
│   ├── index.ts              # Main server
│   └── routes/
│       ├── company-intel.ts   # Company intelligence
│       ├── company-profile.ts # Company profiles
│       └── market-intel.ts    # Market intelligence
├── package.json
├── tsconfig.json
└── .env.example
```

## License
MIT
