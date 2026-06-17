# A/B Testing Service

**Version:** 1.0.0
**Port:** 4989
**Status:** Active

## Overview

A/B testing and experiment framework for the RTMN ecosystem. This service provides experiment management, variant assignment, and statistical analysis for running controlled experiments across the platform.

## Quick Start

```bash
cd services/ab-testing
npm install
npm run dev
```

## API Endpoints

### Experiments

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/experiments` | Create new experiment |
| GET | `/api/experiments` | List all experiments |
| GET | `/api/experiments/:id` | Get experiment by ID |
| PATCH | `/api/experiments/:id` | Update experiment |
| POST | `/api/experiments/:id/start` | Start experiment |
| POST | `/api/experiments/:id/pause` | Pause experiment |
| POST | `/api/experiments/:id/complete` | Complete experiment |
| POST | `/api/experiments/:id/archive` | Archive experiment |
| DELETE | `/api/experiments/:id` | Delete experiment |

### Variant Assignment

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/assign/variant` | Get variant assignment for user |
| POST | `/api/assign/conversion` | Record conversion event |
| POST | `/api/assign/event` | Record custom event |

### Results & Analytics

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/results/experiment/:id` | Get experiment results |
| GET | `/api/results/experiment/:id/timeseries` | Get time series data |
| GET | `/api/results/variant/:id` | Get variant details |
| GET | `/api/results/leaderboard` | Get best performing experiments |

## Usage Examples

### Create Experiment

```bash
curl -X POST http://localhost:4989/api/experiments \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Checkout Button Color",
    "description": "Test blue vs green checkout button",
    "variants": [
      { "name": "Control (Blue)", "weight": 50, "config": { "color": "#0066cc" } },
      { "name": "Variant (Green)", "weight": 50, "config": { "color": "#00cc66" } }
    ],
    "trafficAllocation": 100,
    "metrics": {
      "primary": "conversion_rate",
      "secondary": ["revenue", "cart_abandonment"]
    }
  }'
```

### Get Variant Assignment

```bash
curl -X POST http://localhost:4989/api/assign/variant \
  -H "Content-Type: application/json" \
  -d '{
    "experimentId": "exp-abc123",
    "userId": "user-456",
    "userAttributes": {
      "country": "US",
      "tier": "premium"
    }
  }'
```

### Record Conversion

```bash
curl -X POST http://localhost:4989/api/assign/conversion \
  -H "Content-Type: application/json" \
  -d '{
    "experimentId": "exp-abc123",
    "variantId": "var-xyz",
    "userId": "user-456",
    "sessionId": "sess-789",
    "metricValue": 99.99
  }'
```

### Get Results

```bash
curl http://localhost:4989/api/results/experiment/exp-abc123
```

## Statistical Features

- Two-proportion Z-test for significance testing
- Chi-squared test for multi-variant experiments
- Confidence intervals (95%, 99%)
- Bayesian probability calculations
- Sample size calculator
- Uplift calculation (absolute and relative)

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    A/B Testing Service                   │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  ┌──────────────┐    ┌──────────────┐    ┌────────────┐ │
│  │  Experiments │    │    Assign    │    │  Results   │ │
│  │    Routes    │    │    Routes    │    │   Routes   │ │
│  └──────┬───────┘    └──────┬───────┘    └─────┬──────┘ │
│         │                   │                   │        │
│  ┌──────▼───────────────────▼───────────────────▼──────┐ │
│  │                      Models                          │ │
│  │  Experiment │   Variant   │      Result             │ │
│  └─────────────────────────────────────────────────────┘ │
│                          │                                │
│  ┌───────────────────────▼─────────────────────────────┐ │
│  │                    Services                          │ │
│  │     Assigner      │        Stats Engine              │ │
│  └─────────────────────────────────────────────────────┘ │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

## Configuration

Environment variables (see `.env.example`):

| Variable | Default | Description |
|----------|---------|-------------|
| PORT | 4989 | Server port |
| NODE_ENV | development | Environment |
| LOG_LEVEL | info | Logging level |
| MIN_SAMPLE_SIZE | 100 | Minimum sample for significance |
| DEFAULT_CONFIDENCE_LEVEL | 0.95 | Default confidence level |

## Integration

This service integrates with:

- **Service Registry** (4399): Auto-registration
- **Event Bus** (4510): Event publishing
- **GraphQL Federation** (4000): GraphQL API

## Health Check

```bash
curl http://localhost:4989/health
```

Response:
```json
{
  "status": "healthy",
  "service": "ab-testing",
  "version": "1.0.0",
  "timestamp": "2026-06-16T10:30:00.000Z"
}
```

---

*Last Updated: June 16, 2026*
