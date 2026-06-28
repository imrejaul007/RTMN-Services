# Lead Scoring Engine

**Port:** 5458
**Purpose:** Lead scoring with weighted signals, velocity, recency decay

## What It Does

Scores website visitors (0-100) based on behavioral signals, velocity, and recency.

## Scoring Model

| Signal | Weight |
|---|---|
| Pricing page visit | +15 |
| Add to cart | +20 |
| Checkout started | +30 |
| Payment complete | +50 |
| Exit intent | +5 |
| Bounce | -20 |
| Unsubscribe | -30 |

## Intent Levels

| Level | Score | Action |
|---|---|---|
| Cold | 0-25 | Nurture |
| Warm | 26-50 | Educate |
| Hot | 51-75 | Engage |
| Purchase Ready | 76-90 | Convert |
| Closing | 91-100 | Call now |

## API

- POST /api/lead/score — Score a lead
- GET /api/lead/intent-levels — Get level definitions
