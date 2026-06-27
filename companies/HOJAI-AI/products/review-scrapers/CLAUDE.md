# Review Scrapers

**Port:** 5456
**Purpose:** Monitor reviews across Google, social, app stores

## What It Does

- Scrapes/fetches reviews from multiple sources
- Analyzes sentiment (positive/negative/neutral)
- Detects complaint spikes (>2x normal)
- Generates AI responses with human approval

## API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| GET | `/health` | Health check |
| GET | `/api/reviews/:source` | Fetch reviews from source |
| GET | `/api/reviews/all` | Aggregate all reviews |
| GET | `/api/reviews/alerts` | Get spike alerts |
| GET | `/api/reviews/sentiment` | Sentiment analysis |
| POST | `/api/reviews/ingest` | Ingest reviews |
| POST | `/api/reviews/respond` | Generate AI response |

## Startup

```bash
cd products/review-scrapers && npm install && npm start  # Port 5456
```
