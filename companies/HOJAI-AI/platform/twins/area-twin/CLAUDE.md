# Area Twin - Port 4820

## Overview
Territorial/geographic representation of sales regions, territories, zones.

## Purpose
Manages area-based twins for sales territories, geographic zones, and regional planning.

## Key Features
- Area definitions
- Territory management
- Zone boundaries
- Regional analytics

## API Endpoints

### Areas
- `GET /api/areas` - List areas
- `POST /api/areas` - Create area
- `GET /api/areas/:id` - Get area
- `PATCH /api/areas/:id` - Update area

### Territories
- `GET /api/territories` - List territories
- `POST /api/territories` - Create territory

## Environment
- Port: 4820

## Startup
```bash
cd platform/twins/area-twin && npm run dev
```
