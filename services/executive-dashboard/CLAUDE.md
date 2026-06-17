# Executive Dashboard Service

**Service:** Executive Dashboard
**Port:** 4896
**Version:** 1.0.0
**Status:** Ready for Development

---

## Overview

The Executive Dashboard Service provides real-time insights, metrics, and analytics for CEOs and executives. It delivers a comprehensive view of business performance across multiple dimensions including financial, operational, customer, employee, and product metrics.

---

## Features

### Core Capabilities

- **Health Score Dashboard**: Calculate and display overall business health scores with component breakdowns
- **Risk Management**: Track, assess, and mitigate business risks with severity levels
- **Opportunity Identification**: Identify and track strategic opportunities with ROI analysis
- **Team Performance**: Monitor team metrics, top performers, and department analytics
- **Product Performance**: Track product revenue, growth, and market performance
- **Financial Metrics**: Revenue, costs, profit margins, cash flow, and burn rate
- **SLA Compliance**: Monitor service level agreements and uptime metrics
- **Real-time Updates**: SSE and WebSocket support for live data streaming
- **Multi-tenant Support**: Complete tenant isolation with X-Tenant-ID header

### Widget System

- KPI Cards with trends and targets
- Line, bar, and pie charts
- Data tables with sorting and filtering
- Gauge visualizations
- Alert lists
- Score cards
- Heat maps

---

## API Endpoints

### Health Check
```
GET /health
```

### Dashboard Management
```
GET    /api/dashboards         - List all dashboards
POST   /api/dashboards         - Create dashboard
GET    /api/dashboards/:id     - Get dashboard
PUT    /api/dashboards/:id     - Update dashboard
DELETE /api/dashboards/:id     - Delete dashboard
POST   /api/dashboards/:id/clone          - Clone dashboard
POST   /api/dashboards/:id/set-default   - Set as default
PUT    /api/dashboards/:id/layout         - Update layout
PUT    /api/dashboards/:id/filters        - Update filters
```

### Widget Management
```
GET    /api/widgets                - List widgets
POST   /api/widgets                - Create widget
GET    /api/widgets/types          - Widget types
GET    /api/widgets/:id            - Get widget
PUT    /api/widgets/:id            - Update widget
DELETE /api/widgets/:id            - Delete widget
PATCH  /api/widgets/:id/position   - Update position
PATCH  /api/widgets/:id/datasource - Update data source
PATCH  /api/widgets/:id/visualization - Update visualization
```

### Insights
```
GET    /api/insights           - List insights
GET    /api/insights/summary   - Insights summary
GET    /api/insights/recent    - Recent insights
GET    /api/insights/unread    - Unread insights
POST   /api/insights/generate  - Generate insights
PATCH  /api/insights/:id/view  - Mark as viewed
```

### Risks
```
GET    /api/risks               - List risks
GET    /api/risks/assessment    - Risk assessment
GET    /api/risks/top            - Top risks
GET    /api/risks/by-level       - By severity level
GET    /api/risks/by-status      - By status
POST   /api/risks                - Create risk
PATCH  /api/risks/:id/status     - Update status
PATCH  /api/risks/:id/mitigation - Update mitigation plan
POST   /api/risks/:id/mitigate   - Mark as mitigated
POST   /api/risks/:id/close      - Close risk
```

### Opportunities
```
GET    /api/opportunities           - List opportunities
GET    /api/opportunities/assessment - Opportunity assessment
GET    /api/opportunities/top        - Top opportunities
GET    /api/opportunities/pipeline   - Pipeline view
POST   /api/opportunities            - Create opportunity
PATCH  /api/opportunities/:id/status  - Update status
PATCH  /api/opportunities/:id/evaluate - Evaluate
POST   /api/opportunities/:id/approve  - Approve
POST   /api/opportunities/:id/reject   - Reject
POST   /api/opportunities/:id/implement - Start implementation
POST   /api/opportunities/:id/complete  - Complete
GET    /api/opportunities/roi-analysis - ROI analysis
```

### Metrics
```
GET    /api/metrics             - All metrics
GET    /api/metrics/health-score - Health score
GET    /api/metrics/financial    - Financial metrics
GET    /api/metrics/sla          - SLA compliance
GET    /api/team/performance      - Team performance
GET    /api/products/performance  - Product performance
GET    /api/trends               - Trend analysis
POST   /api/forecast             - Generate forecast
```

### Alerts
```
GET    /api/alerts              - List alerts
POST   /api/alerts              - Create alert
PATCH  /api/alerts/:id/acknowledge - Acknowledge
PATCH  /api/alerts/:id/resolve     - Resolve
```

### Real-time
```
GET    /api/stream              - SSE stream
WS     /api/ws                 - WebSocket
```

---

## Data Models

### Dashboard
```typescript
{
  dashboardId: string;
  tenantId: string;
  name: string;
  description?: string;
  widgets: string[];
  layout: { columns: number; rows: WidgetPosition[] };
  filters: DashboardFilter[];
  refreshInterval: number;
  isDefault: boolean;
  isPublic: boolean;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}
```

### Widget
```typescript
{
  widgetId: string;
  tenantId: string;
  name: string;
  type: WidgetType;
  title?: string;
  dataSource: { type: 'metric' | 'query' | 'external'; ... };
  visualization: { showTitle: boolean; showLegend: boolean; ... };
  refreshInterval: number;
  position: { x: number; y: number; width: number; height: number };
}
```

### Risk
```typescript
{
  id: string;
  title: string;
  description: string;
  category: string;
  level: 'critical' | 'high' | 'medium' | 'low';
  status: 'open' | 'mitigated' | 'monitoring' | 'closed';
  likelihood: number;  // 1-10
  impact: number;      // 1-10
  score: number;       // likelihood * impact
  mitigationPlan?: string;
}
```

### Opportunity
```typescript
{
  id: string;
  title: string;
  description: string;
  type: string;
  category: string;
  status: 'identified' | 'evaluating' | 'approved' | 'implementing' | 'completed' | 'rejected';
  estimatedValue?: number;
  probability: number;  // 0-100
  priority: 'critical' | 'high' | 'medium' | 'low';
}
```

---

## Configuration

### Environment Variables
```bash
PORT=4896
MONGODB_URI=mongodb://localhost:27017/executive_dashboard
NODE_ENV=development
LOG_LEVEL=info
ALLOWED_ORIGINS=http://localhost:3000
```

### Multi-tenant Headers
```
X-Tenant-ID: <tenant-id>
X-User-ID: <user-id>
X-User-Roles: admin,executive
```

---

## Services

### MetricsService
- Real-time metrics calculation
- Health score computation
- Financial metrics
- Team performance
- Product performance
- SLA compliance

### TrendsService
- Trend analysis and detection
- Anomaly detection
- Period comparison
- Trend forecasting

### ForecastingService
- Metric forecasting
- Revenue forecasting
- Cash flow and runway analysis
- Demand forecasting
- Scenario analysis

### AlertingService
- Alert generation
- Threshold monitoring
- Alert acknowledgment
- Auto-resolution

### InsightsService
- Business insight generation
- Category analysis
- Recommendations

### RisksService
- Risk tracking and assessment
- Mitigation planning
- Trend analysis

### OpportunitiesService
- Opportunity identification
- Pipeline management
- ROI analysis

---

## Quick Start

```bash
# Install dependencies
npm install

# Copy environment file
cp .env.example .env

# Start development server
npm run dev

# Build for production
npm run build

# Start production server
npm start
```

---

## Port Configuration

This service runs on port **4896** as defined in CLAUDE.md.

For integration with the RTMN ecosystem:
- Service Registry: Port 4399
- Event Bus: Port 4510
- GraphQL Federation: Port 4000

---

## Health Score Calculation

The health score is calculated from weighted components:

| Component | Weight | Metrics |
|-----------|--------|---------|
| Financial Health | 25% | Revenue growth, margins, burn rate |
| Customer Satisfaction | 20% | NPS, CSAT, churn rate |
| Operational Efficiency | 20% | Uptime, SLA compliance, error rates |
| Employee Engagement | 15% | Engagement scores, turnover |
| Product Quality | 10% | Ratings, defect rates |
| Market Position | 10% | Growth, market share |

---

## Event Subscriptions

The service subscribes to events from the Event Bus (port 4510):
- `metrics.*` - Real-time metric updates
- `alert.*` - Alert notifications
- `risk.*` - Risk changes

---

## Error Handling

All API errors return consistent format:
```json
{
  "success": false,
  "error": "Error message",
  "requestId": "uuid"
}
```

---

## Dependencies

- express: ^4.18.2 - Web framework
- mongoose: ^8.0.3 - MongoDB ODM
- cors: ^2.8.5 - CORS middleware
- helmet: ^7.1.0 - Security headers
- zod: ^3.22.4 - Schema validation
- uuid: ^9.0.1 - UUID generation
- winston: ^3.11.0 - Logging

---

## RTMN Integration

This service is part of the RTMN ecosystem and integrates with:

- **REZ-ecosystem-connector** (4399): Service registry
- **REZ-event-bus** (4510): Event messaging
- **REZ-graphql-federation** (4000): Unified API
- **memory-os** (4703): Business memory
- **goal-os** (4242): Autonomous goals

---

*Last Updated: June 2026*
