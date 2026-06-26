# NegotiationOS - Port 4869

## Overview
BATNA, multi-round bargaining, contract optimization.

## Purpose
Handles multi-party negotiations and contract optimization.

## Key Features
- BATNA calculation
- Multi-round bargaining
- Strategy memory
- Contract optimization
- Fairness scoring

## API Endpoints

### Negotiations
- `GET /api/negotiations` - List negotiations
- `POST /api/negotiations` - Start negotiation
- `POST /api/negotiations/:id/offer` - Make offer
- `POST /api/negotiations/:id/accept` - Accept terms

### Strategies
- `GET /api/strategies` - List strategies

## Negotiation Types
- `price` - Pricing negotiation
- `contract` - Contract terms
- `partnership` - Partnership deals
- `supply` - Supply chain

## Status
- `proposal` - Initial offer
- `negotiating` - Active negotiation
- `agreed` - Terms accepted
- `failed` - Negotiation failed

## Tests
Vitest tests: `__tests__/negotiation-os.test.ts`

## Environment
- Port: 4869

## Startup
```bash
cd platform/sutar-os/core/negotiation-os && npm run dev
```
