# Lead Scoring Engine

**Port:** 5458
**Phase:** 2
**Purpose:** Score leads 0-100 with weighted signals, velocity, recency

## Scoring Model

| Signal | Weight |
|---|---|
| Payment complete | +50 |
| Checkout started | +30 |
| Add to cart | +20 |
| Pricing page visit | +15 |
| Bounce | -20 |

## Intent Levels

| Level | Score | Action |
|---|---|---|
| Cold | 0-25 | Nurture |
| Warm | 26-50 | Educate |
| Hot | 51-75 | Engage |
| Purchase Ready | 76-90 | Convert |
| Closing | 91-100 | Call now |

## API

- `POST /api/lead/score` — Score a lead
- `GET /api/lead/intent-levels` — Get level definitions

## Startup

```bash
cd products/lead-scoring && npm install && npm start
```
