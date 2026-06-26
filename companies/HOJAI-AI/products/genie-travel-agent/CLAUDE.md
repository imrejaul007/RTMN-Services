# genie-travel-agent

**Port:** 4714
**Vision Role:** Travel
**Capabilities:** flight-booking, hotel-booking, itinerary-planning, rebooking, price-comparison

## What it does

AI-powered travel agent that handles flight search, hotel booking, itinerary planning, cancellations, and rebooking. Designed to integrate with Amadeus, Sabre, Skyscanner, Booking.com in production. MVP uses deterministic mock data with real price-comparison logic and itinerary optimization.

## Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/health` | — | Health check |
| GET | `/ready` | — | Readiness (booking count) |
| GET | `/info` | — | Service info + vision role |
| POST | `/api/v1/travel/search/flights` | API key | Search flights by route + date |
| POST | `/api/v1/travel/search/hotels` | API key | Search hotels by city + dates |
| POST | `/api/v1/travel/itinerary/plan` | API key | Build optimized multi-city itinerary |
| POST | `/api/v1/travel/rebook` | API key | Rebook or cancel existing booking |

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `TRAVEL_PORT` | `4714` | Service port |
| `TRAVEL_REQUIRE_AUTH` | `true` | Require API key auth |
| `HOJAI_API_KEY` | `INTERNAL_SERVICE_TOKEN` | API key for auth |

## Startup

```bash
cd products/genie-travel-agent
npm install
npm start
```

## Testing

```bash
npm test
# Runs: helpers.test.js — flight sorting, hotel filtering, itinerary scoring
```
