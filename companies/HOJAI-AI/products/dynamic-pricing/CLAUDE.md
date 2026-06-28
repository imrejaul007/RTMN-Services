# dynamic-pricing

**Port:** 5474
**Phase:** 5
**Purpose:** Demand-based + competitor-aware pricing

## Features

- Demand multiplier: high +15%, low -15%
- Competitor price matching
- Inventory-based adjustments
- ROI calculations

## API

- `POST /api/pricing/recommend` — Get price recommendation
- `GET /api/pricing/optimize/:productId` — Optimize all prices

## Startup

```bash
cd products/dynamic-pricing && npm install && npm start
```
