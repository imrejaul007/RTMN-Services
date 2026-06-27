# Heatmap Aggregator

**Port:** 5454
**Purpose:** Aggregates click/scroll data into heatmaps for SiteOS analytics

## What It Does

- Records click positions on pages
- Tracks scroll depth distribution
- Detects rage clicks (multiple clicks in same spot)
- Generates heatmap data for visualization

## API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| GET | `/health` | Health check |
| POST | `/api/heatmap/clicks` | Record click positions |
| POST | `/api/heatmap/scrolls` | Record scroll depth |
| POST | `/api/heatmap/rage-clicks` | Record rage clicks |
| GET | `/api/heatmap/page/:pageId` | Get heatmap data for page |
| GET | `/api/heatmap/summary` | Site-wide heatmap summary |

## Startup

```bash
cd products/heatmap-aggregator && npm install && npm start  # Port 5454
```
