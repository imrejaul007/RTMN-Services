# Deal Twin

## Overview
Sales deal tracking and prediction.

## Purpose
Digital twin for sales opportunities and deals.

## Key Features
- Deal tracking
- Win probability
- Deal velocity
- Stage prediction

## API Endpoints

### Deals
- `GET /api/deals` - List deals
- `POST /api/deals` - Create deal
- `GET /api/deals/:id` - Get deal
- `PATCH /api/deals/:id` - Update deal

### Predictions
- `GET /api/deals/:id/win-probability` - Get win probability

## Startup
```bash
cd platform/twins/deal-twin && npm run dev
```
