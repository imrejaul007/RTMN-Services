# Sales Intelligence Service

**Service Name:** @rtmn/sales-intelligence
**Version:** 1.0.0
**Port:** 5181
**Status:** Ready for Development

---

## Overview

AI-powered sales insights and forecasting service for the RTMN ecosystem. Provides revenue forecasting, pipeline health analysis, rep performance tracking, trend detection, and AI predictions.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Sales Intelligence Service                 │
│                         Port: 5181                          │
├─────────────────────────────────────────────────────────────┤
│  Routes                                                        │
│  ├── /api/forecast     Revenue & quota forecasting          │
│  ├── /api/pipeline      Pipeline health & analysis           │
│  ├── /api/performance   Rep & team performance               │
│  └── /api/trends        Trend analysis & anomalies           │
├─────────────────────────────────────────────────────────────┤
│  Services                                                     │
│  ├── ForecastingService       AI revenue predictions         │
│  ├── PipelineAnalysisService  Pipeline health scoring        │
│  ├── TrendAnalysisService     Trend detection & insights      │
│  └── SalesOpsBridge           RTMN ecosystem integration      │
└─────────────────────────────────────────────────────────────┘
                              │
         ┌────────────────────┼────────────────────┐
         │                    │                    │
    ┌────▼────┐        ┌─────▼─────┐       ┌─────▼─────┐
    │Sales Hub│        │Memory OS  │       │Event Bus   │
    │  :4100  │        │  :4703    │       │  :4510     │
    └─────────┘        └───────────┘       └───────────┘
```

## Features

### Revenue Forecasting
- Linear regression and moving average predictions
- Confidence intervals (pessimistic/expected/optimistic)
- Quota attainment forecasting per rep
- Territory-level revenue predictions
- Historical forecast accuracy tracking

### Pipeline Health Analysis
- Overall health score (0-100)
- Health factor breakdown (coverage, velocity, win rate, etc.)
- Bottleneck identification by stage
- Stalled deal detection
- At-risk deal identification
- Velocity analysis by stage

### Performance Tracking
- Individual rep metrics (revenue, attainment, win rate, etc.)
- Team performance aggregation
- Activity metrics (calls, emails, meetings, demos)
- Leaderboard rankings
- Coaching insights

### Trend Detection
- Revenue trend analysis
- Deal velocity trends
- Win rate patterns
- Deal size trends
- Cycle time analysis
- Seasonal pattern detection
- Anomaly detection with severity scoring

## API Endpoints

### Forecast Routes (`/api/forecast`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/forecast` | Generate revenue forecast |
| GET | `/api/forecast/accuracy` | Get forecast accuracy |
| GET | `/api/forecast/quota` | Get quota attainment forecasts |
| GET | `/api/forecast/territory` | Get territory forecasts |
| GET | `/api/forecast/scenarios` | Get forecast scenarios |
| POST | `/api/forecast/refresh` | Refresh all forecasts |

**Query Parameters:**
- `horizon` (number): Forecast horizon in days (default: 90)
- `granularity` (string): daily, weekly, monthly, quarterly
- `scenario` (boolean): Include scenarios (default: false)
- `territories` (string): Comma-separated territory IDs
- `products` (string): Comma-separated product lines

### Pipeline Routes (`/api/pipeline`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/pipeline/health` | Get pipeline health score |
| GET | `/api/pipeline/metrics` | Get comprehensive metrics |
| GET | `/api/pipeline/stages` | Get stage breakdown |
| GET | `/api/pipeline/bottlenecks` | Identify bottlenecks |
| GET | `/api/pipeline/conversion` | Get conversion rates |
| GET | `/api/pipeline/stalled` | Get stalled deals |
| GET | `/api/pipeline/at-risk` | Get at-risk deals |
| GET | `/api/pipeline/velocity` | Get velocity analysis |

### Performance Routes (`/api/performance`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/performance/reps` | Get rep performance |
| GET | `/api/performance/reps/:id` | Get individual rep |
| GET | `/api/performance/teams` | Get team performance |
| GET | `/api/performance/leaderboard` | Get leaderboard |
| GET | `/api/performance/activities` | Get activity metrics |
| GET | `/api/performance/trends` | Get performance trends |
| GET | `/api/performance/coaching` | Get coaching insights |

### Trends Routes (`/api/trends`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/trends` | Get overall trend analysis |
| GET | `/api/trends/:type` | Get specific trend type |
| GET | `/api/trends/seasonal` | Get seasonal patterns |
| GET | `/api/trends/anomalies` | Get detected anomalies |
| GET | `/api/trends/anomalies/:id` | Get anomaly details |
| PATCH | `/api/trends/anomalies/:id` | Update anomaly status |
| GET | `/api/trends/insights` | Get AI-generated insights |
| GET | `/api/trends/momentum` | Get momentum indicators |
| GET | `/api/trends/compare` | Compare periods |

## Data Models

### Forecast
```typescript
interface Forecast {
  id: string;
  period: string;
  startDate: Date;
  endDate: Date;
  predictedRevenue: number;
  confidence: number; // 0-1
  range: {
    pessimistic: number;
    expected: number;
    optimistic: number;
  };
  generatedAt: Date;
  methodology: string;
}
```

### Pipeline Health
```typescript
interface PipelineHealth {
  score: number; // 0-100
  status: 'healthy' | 'at_risk' | 'critical';
  factors: HealthFactor[];
  bottlenecks: Bottleneck[];
  recommendations: string[];
}
```

### Rep Performance
```typescript
interface RepPerformance {
  repId: string;
  repName: string;
  teamId: string;
  metrics: RepMetrics;
  period: string;
  trends: PerformanceTrend[];
  comparisons: ComparisonData;
}
```

## Environment Variables

```bash
# Service Configuration
PORT=5181
NODE_ENV=development

# Service URLs
REZ_ECOSYSTEM_CONNECTOR_URL=http://localhost:4399
REZ_EVENT_BUS_URL=http://localhost:4510
REZ_GRAPHQL_FEDERATION_URL=http://localhost:4000
MEMORY_OS_URL=http://localhost:4703

# Sales Hub Integration
SALES_HUB_URL=http://localhost:4100
SALES_HUB_API_KEY=your_sales_hub_api_key

# Forecasting Configuration
FORECAST_MODEL=linear_regression
FORECAST_HORIZON_DAYS=90
FORECAST_CONFIDENCE_LEVEL=0.95

# AI/ML Configuration
AI_MODEL_ENDPOINT=http://localhost:4500
AI_API_KEY=your_ai_api_key

# Logging
LOG_LEVEL=info
```

## Running the Service

```bash
# Install dependencies
cd services/sales-intelligence
npm install

# Development mode
npm run dev

# Production build
npm run build
npm start
```

## Health Check

```bash
curl http://localhost:5181/health
```

Response:
```json
{
  "status": "healthy",
  "service": "sales-intelligence",
  "version": "1.0.0",
  "timestamp": "2024-...",
  "uptime": 1234.56,
  "services": {
    "salesOpsBridge": { "healthy": true },
    "forecasting": { "healthy": true },
    "pipelineAnalysis": { "healthy": true },
    "trendAnalysis": { "healthy": true }
  }
}
```

## Integration with RTMN Ecosystem

### Connected Services

| Service | Port | Purpose |
|---------|------|---------|
| REZ-ecosystem-connector | 4399 | Service discovery |
| REZ-event-bus | 4510 | Event publishing |
| Memory OS | 4703 | Context storage |
| Sales Hub | 4100 | Core sales data |

### Events Published

- `forecast.generated` - When new forecast is generated
- `anomaly.detected` - When anomaly is detected

### Events Consumed

- Pipeline updates from Sales Hub
- Deal stage changes
- Closed won/lost notifications

## Development

### Project Structure
```
sales-intelligence/
├── package.json
├── tsconfig.json
├── .env.example
├── CLAUDE.md
└── src/
    ├── index.ts              # Express server entry
    ├── models/
    │   └── Insights.ts       # TypeScript interfaces
    ├── routes/
    │   ├── forecast.ts      # Forecast endpoints
    │   ├── pipeline.ts      # Pipeline endpoints
    │   ├── performance.ts   # Performance endpoints
    │   └── trends.ts        # Trend endpoints
    └── services/
        ├── forecasting.ts         # AI forecasting
        ├── pipelineAnalysis.ts   # Pipeline health
        ├── trendAnalysis.ts      # Trend detection
        └── salesOpsBridge.ts     # Ecosystem bridge
```

### Testing

```bash
# Test health endpoint
curl http://localhost:5181/health

# Test forecast
curl "http://localhost:5181/api/forecast?horizon=30&granularity=weekly"

# Test pipeline health
curl http://localhost:5181/api/pipeline/health

# Test trends
curl "http://localhost:5181/api/trends?startDate=2024-01-01&endDate=2024-03-31"
```

## Future Enhancements

- [ ] ML model integration for advanced predictions
- [ ] Real-time streaming of pipeline changes
- [ ] Predictive deal scoring
- [ ] AI-powered next best action recommendations
- [ ] Competitor win/loss analysis
- [ ] Territory optimization suggestions

---

**Last Updated:** June 2024
**RTMN Ecosystem**
