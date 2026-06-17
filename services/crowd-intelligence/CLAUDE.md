# Crowd Intelligence Service

**Port:** 4983  
**Version:** 1.0.0  
**Status:** Active

## Overview

The Crowd Intelligence Service provides real-time crowd pattern detection, trend analysis, and outbreak detection capabilities for the RTMN ecosystem. It analyzes crowd density data to identify anomalies, predict trends, and alert operators to potential issues.

## Capabilities

- **Pattern Detection:** Identify rush hours, quiet periods, sudden spikes, gradual changes, and periodic patterns
- **Trend Analysis:** Analyze crowd movement trends and predict future states
- **Outbreak Detection:** Detect sudden surges, persistent increases, zone concentrations, and rapid dispersal
- **Anomaly Alerts:** Real-time alerts when crowd behavior deviates from expected patterns
- **Crowd Profiling:** Track and analyze crowd profiles by location and zone

## API Endpoints

### Health & Status
- `GET /health` - Service health check
- `GET /api/status` - Service capabilities and stats

### Crowd Profiles
- `POST /api/profiles` - Create/update crowd profile
- `GET /api/profiles` - List profiles with filters
- `GET /api/profiles/:id` - Get specific profile

### Alerts
- `GET /api/alerts` - List alerts with filters
- `PATCH /api/alerts/:id` - Update alert status

### Trends
- `GET /api/trends` - Get trend history with analysis
- `GET /api/analytics` - Get current analytics and recommendations

### Patterns
- `POST /api/patterns/detect` - Detect patterns in profile data
- `GET /api/patterns` - List detected patterns
- `POST /api/patterns/analyze` - Analyze pattern characteristics
- `GET /api/patterns/stats/overview` - Pattern statistics

### Insights
- `POST /api/insights/generate` - Generate insights from trends
- `GET /api/insights` - List all insights
- `GET /api/insights/category/:category` - Get insights by category
- `GET /api/insights/dashboard/summary` - Get insights dashboard

## Pattern Types

| Type | Description |
|------|-------------|
| `rush_hour` | High density during typical busy periods |
| `quiet_period` | Unusually low crowd density |
| `gradual_increase` | Slow, steady increase in crowd |
| `sudden_spike` | Rapid, unexpected increase |
| `gradual_decrease` | Slow, steady decrease in crowd |
| `periodic` | Regular, repeating patterns |
| `weekend_surge` | Higher density on weekends |
| `event_burst` | Short-term burst due to event |

## Alert Severity Levels

| Level | Description | Z-Score Threshold |
|-------|-------------|-------------------|
| `critical` | Immediate action required | > 4.0 |
| `high` | Significant deviation | 3.0 - 4.0 |
| `medium` | Moderate deviation | 2.5 - 3.0 |
| `low` | Minor deviation | < 2.5 |

## Outbreak Types

| Type | Description |
|------|-------------|
| `sudden_surge` | Rapid increase in crowd density |
| `persistent_increase` | Sustained elevated density |
| `concentration` | High density in specific zones |
| `dispersal` | Rapid crowd evacuation |

## Configuration

```bash
# .env
PORT=4983
ANOMALY_THRESHOLD=2.5
MIN_SAMPLE_SIZE=10
OUTBREAK_THRESHOLD=3.0
OUTBREAK_WINDOW_MS=300000
ALERT_COOLDOWN_MS=600000
```

## Integration

### Event Bus Integration
Subscribe to events from the REZ Event Bus (port 4510):
- `crowd.profile.created`
- `crowd.anomaly.detected`
- `crowd.outbreak.detected`
- `crowd.pattern.detected`

### Service Discovery
Register with REZ-ecosystem-connector (port 4399) for automatic discovery.

## Usage Example

```bash
# Create a crowd profile
curl -X POST http://localhost:4983/api/profiles \
  -H "Content-Type: application/json" \
  -d '{
    "locationId": "mall-main",
    "zoneId": "entrance",
    "density": 0.85,
    "attributes": {
      "movementSpeed": 0.3,
      "停留时间": 120
    }
  }'

# Get alerts
curl http://localhost:4983/api/alerts?resolved=false

# Get trends
curl "http://localhost:4983/api/trends?hours=24&interval=hour"
```

## Files

```
services/crowd-intelligence/
├── package.json
├── tsconfig.json
├── .env.example
├── CLAUDE.md
└── src/
    ├── index.ts           # Express server
    ├── models/
    │   └── CrowdProfile.ts
    ├── routes/
    │   ├── patterns.ts
    │   └── insights.ts
    └── services/
        ├── patternDetector.ts
        ├── trendAnalyzer.ts
        └── outbreakDetector.ts
```

## Health Check

```bash
curl http://localhost:4983/health
```

Returns:
```json
{
  "status": "healthy",
  "service": "crowd-intelligence",
  "version": "1.0.0",
  "uptime": 12345,
  "metrics": {
    "activeProfiles": 150,
    "pendingAlerts": 3,
    "trendDataPoints": 240
  }
}
```