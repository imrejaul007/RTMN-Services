# Analytics Dashboard Service

**Version:** 1.0.0
**Port:** 4988
**Status:** Active

## Overview

Real-time analytics dashboard service for the RTMN ecosystem. Provides dashboard and widget management, data aggregation, chart generation, and export functionality across all 24 industry verticals.

## Quick Start

```bash
# Install dependencies
cd services/analytics-dashboard
npm install

# Start service
npm start

# Development mode with hot reload
npm run dev
```

## Health Check

```
GET http://localhost:4988/health
```

## API Endpoints

### Dashboards

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/dashboards` | Create dashboard |
| GET | `/api/dashboards` | List dashboards |
| GET | `/api/dashboards/:id` | Get dashboard with widgets |
| PUT | `/api/dashboards/:id` | Update dashboard |
| DELETE | `/api/dashboards/:id` | Delete dashboard |
| POST | `/api/dashboards/:id/widgets` | Add widget to dashboard |
| GET | `/api/dashboards/:id/widgets` | Get dashboard widgets |
| POST | `/api/dashboards/:id/duplicate` | Duplicate dashboard |

### Widgets

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/widgets` | Create widget |
| GET | `/api/widgets` | List widgets |
| GET | `/api/widgets/:id` | Get widget |
| PUT | `/api/widgets/:id` | Update widget |
| PATCH | `/api/widgets/:id/position` | Update position |
| DELETE | `/api/widgets/:id` | Delete widget |
| POST | `/api/widgets/:id/duplicate` | Duplicate widget |
| GET | `/api/widgets/types/list` | List widget types |

### Analytics

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/analytics/overview` | Get overview metrics |
| GET | `/api/analytics/industry/:industry` | Industry metrics |
| GET | `/api/analytics/industries` | All industries summary |
| GET | `/api/analytics/timeseries` | Time series data |
| GET | `/api/analytics/compare` | Comparison data |
| GET | `/api/analytics/realtime` | Real-time data |
| GET | `/api/analytics/widget/:id` | Widget data |
| POST | `/api/analytics/charts` | Generate chart |
| GET | `/api/analytics/kpi/:metric` | KPI data |
| GET | `/api/analytics/top` | Top performers |
| GET | `/api/analytics/trends` | Trends |
| GET | `/api/analytics/geographic` | Geographic data |
| POST | `/api/analytics/export` | Export data |
| POST | `/api/analytics/export/dashboard/:id` | Export dashboard |

## Widget Types

| Type | Description |
|------|-------------|
| `kpi` | Key Performance Indicator |
| `line-chart` | Line chart for trends |
| `bar-chart` | Bar chart for comparisons |
| `pie-chart` | Pie chart for proportions |
| `area-chart` | Area chart for cumulative |
| `scatter-chart` | Scatter plot |
| `heatmap` | Heatmap visualization |
| `table` | Tabular data |
| `gauge` | Gauge display |
| `funnel` | Funnel chart |
| `donut` | Donut chart |
| `metric` | Simple metric |

## Data Sources

Widgets can connect to:

- **API**: External service endpoints
- **Static**: Predefined data
- **Computed**: Calculated values

## Export Formats

- `json` - JSON format
- `csv` - CSV format
- `xlsx` - Excel format
- `pdf` - PDF format

## Environment Variables

```env
PORT=4988
NODE_ENV=development
LOG_LEVEL=info
EVENT_BUS_URL=http://localhost:4510
SERVICE_REGISTRY_URL=http://localhost:4399
```

## Integration

Connects with:
- Industry OS services (5010-5240)
- Event Bus (4510)
- Service Registry (4399)
- RTMN Gateway

## Related Services

| Service | Port | Purpose |
|---------|------|---------|
| Hotel OS | 5025 | Hotel data |
| Restaurant OS | 5010 | Restaurant data |
| Healthcare OS | 5020 | Healthcare data |
| Retail OS | 5030 | Retail data |
