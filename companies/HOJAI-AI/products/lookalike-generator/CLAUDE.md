# Lookalike Generator

**Port:** 5457
**Purpose:** Find best customers and generate lookalike profiles for ad platforms

## What It Does

- Finds best customers (3+ purchases, 10K+ spend, <2 tickets, 4.5+ rating, no returns 6mo)
- Generates lookalike profiles (demographics, behavior, interests)
- Syncs to Meta/Google/TikTok

## API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| GET | `/health` | Health check |
| GET | `/api/lookalikes/best-customers` | Find best customers |
| POST | `/api/lookalikes/generate` | Generate lookalike profiles |
| POST | `/api/lookalikes/sync/:platform` | Sync to Meta/Google/TikTok |
| GET | `/api/lookalikes/audiences` | List generated audiences |

## Startup

```bash
cd products/lookalike-generator && npm install && npm start  # Port 5457
```
