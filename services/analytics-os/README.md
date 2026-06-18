# Analytics OS v1.0.0 - Complete Documentation

> **Port:** 4750  
> **Status:** ✅ **PRODUCTION READY** - BI Dashboards, KPIs, Reporting, Analytics

---

## Overview

Analytics OS provides **Business Intelligence** for the entire RTMN ecosystem:
- Real-time KPIs from all 9 Department OS
- Customizable dashboards
- Automated reports
- Advanced analytics (Funnel, Cohort, Attribution)
- Anomaly detection
- Industry benchmarks
- Cross-OS unified data

---

## Features

### Core Analytics

| Feature | Description |
|---------|-------------|
| **BI Dashboards** | Customizable widget-based dashboards |
| **KPI Engine** | 70+ pre-built KPIs across 8 categories |
| **Report Templates** | 8 automated report templates |
| **Trend Analysis** | Historical trend tracking |
| **Forecasting** | Predictive analytics |

### Advanced Analytics

| Feature | Description |
|---------|-------------|
| **Funnel Analysis** | 3 funnel templates (Sales, Marketing, Onboarding) |
| **Cohort Analysis** | Monthly/weekly retention cohorts |
| **Attribution Modeling** | 6 models (First, Last, Linear, etc.) |
| **Anomaly Detection** | Statistical anomaly identification |
| **Benchmarks** | Industry comparisons |

### Automation

| Feature | Description |
|---------|-------------|
| **Scheduled Reports** | Daily/weekly/monthly delivery |
| **Cross-OS Data** | Unified data from all services |
| **Alerts** | Threshold-based notifications |

---

## KPI Registry (70+ KPIs)

### Revenue KPIs
| KPI | Unit | Description |
|-----|------|-------------|
| Total Revenue | ₹ | All revenue streams |
| Revenue MTD | ₹ | Month-to-date |
| Revenue QTD | ₹ | Quarter-to-date |
| Revenue YTD | ₹ | Year-to-date |
| Revenue Growth | % | YoY growth |
| Revenue Per Customer | ₹ | Average per customer |
| Avg Order Value | ₹ | Average transaction |
| Total Transactions | count | Number of transactions |

### Sales KPIs
| KPI | Unit | Description |
|-----|------|-------------|
| Total Leads | count | All leads |
| New Leads | count | Leads this period |
| Qualified Leads | count | MQLs |
| Lead Conversion Rate | % | Lead to customer |
| Deals Won | count | Closed won |
| Deals Lost | count | Closed lost |
| Pipeline Value | ₹ | Active pipeline |
| Pipeline Coverage | ratio | Pipeline/quota |
| Avg Deal Size | ₹ | Average deal |
| Sales Cycle Time | days | Avg time to close |
| Win Rate | % | Won/lost ratio |
| Quota Attainment | % | Rep quota achievement |

### Marketing KPIs
| KPI | Unit | Description |
|-----|------|-------------|
| Active Campaigns | count | Running campaigns |
| Total Campaigns | count | All campaigns |
| Impressions | count | Ad impressions |
| Reach | count | Unique reach |
| Click Rate | % | CTR |
| Conversion Rate | % | CVR |
| Bounce Rate | % | Website bounces |
| Engagement Rate | % | Social engagement |
| CAC | ₹ | Acquisition cost |
| CPL | ₹ | Cost per lead |
| CPC | ₹ | Cost per click |
| ROAS | ratio | Return on ad spend |
| Email Open Rate | % | Email opens |
| Social Followers | count | Total followers |

### Customer KPIs
| KPI | Unit | Description |
|-----|------|-------------|
| Total Customers | count | All customers |
| Active Customers | count | Active users |
| New Customers | count | New signups |
| Churned Customers | count | Lost customers |
| NPS Score | score | Net Promoter Score |
| NPS Promoters | % | Promoters |
| NPS Detractors | % | Detractors |
| Churn Rate | % | Monthly churn |
| Retention Rate | % | Monthly retention |
| CSAT Score | % | Satisfaction |
| LTV | ₹ | Lifetime value |
| Avg Health Score | score | Customer health |

### Operations KPIs
| KPI | Unit | Description |
|-----|------|-------------|
| Open Tickets | count | Pending tickets |
| Total Tickets | count | All tickets |
| Resolved Tickets | count | Closed tickets |
| First Response Time | min | Time to first reply |
| Avg Resolution Time | hours | Time to close |
| SLA Compliance | % | SLA adherence |

### Workforce KPIs
| KPI | Unit | Description |
|-----|------|-------------|
| Total Employees | count | Headcount |
| Active Employees | count | Active staff |
| Open Positions | count | Job openings |
| Applications | count | Job applications |
| Attendance Rate | % | Attendance |
| Turnover Rate | % | Attrition |
| Avg Tenure | months | Employment length |

### Procurement KPIs
| KPI | Unit | Description |
|-----|------|-------------|
| Purchase Orders | count | POs created |
| PO Value | ₹ | Total PO value |
| Active Suppliers | count | Vendors |
| Procurement Cycle | days | Avg PO time |
| Savings Rate | % | Cost savings |

### Financial KPIs
| KPI | Unit | Description |
|-----|------|-------------|
| Burn Rate | ₹ | Monthly burn |
| Cash Runway | months | Runway |
| Gross Margin | % | Gross profit |
| Net Margin | % | Net profit |
| Current Ratio | ratio | Liquidity |
| AR Turnover | days | Receivables |
| Total Expenses | ₹ | All expenses |

---

## API Reference

### Health
```
GET /health
```

### KPIs
```
GET /api/kpis                           # All KPIs
GET /api/kpis?category=revenue         # By category
GET /api/kpis?source=sales             # By source
GET /api/kpis?search=revenue           # Search
GET /api/kpis/categories               # Category summary
GET /api/kpis/:kpiId                   # Single KPI
GET /api/kpis/category/:category       # Category KPIs
```

### Dashboards
```
GET  /api/dashboards                    # List all
POST /api/dashboards                    # Create
GET  /api/dashboards/:id               # Get
POST /api/dashboards/:id/widgets        # Add widget
```

### Reports
```
GET  /api/reports/templates             # List templates
POST /api/reports/generate              # Generate report
```

### Funnels
```
GET  /api/funnels/templates            # List templates
POST /api/funnels/analyze              # Analyze funnel
```

### Cohorts
```
POST /api/cohorts/analyze              # Analyze cohorts
```

### Attribution
```
GET  /api/attribution/models            # List models
POST /api/attribution/analyze           # Analyze
```

### Anomalies
```
GET  /api/anomalies                    # All anomalies
POST /api/anomalies/detect             # Detect anomaly
```

### Benchmarks
```
GET  /api/benchmarks                  # All benchmarks
GET  /api/benchmarks/:metric         # Single metric
```

### Cross-OS
```
GET /api/crossos/sales                # Sales data
GET /api/crossos/marketing            # Marketing data
GET /api/crossos/financial            # Financial data
GET /api/crossos/customer            # Customer data
GET /api/crossos/operations           # Operations data
GET /api/crossos/360                 # Complete 360 view
```

---

## Quick Start

```bash
# Install & Start
cd services/analytics-os
npm install
npm start  # Port 4750

# Test
curl http://localhost:4750/health

# Get KPIs
curl http://localhost:4750/api/kpis

# Get Reports
curl http://localhost:4750/api/reports/templates

# Generate Report
curl -X POST http://localhost:4750/api/reports/generate \
  -H "Content-Type: application/json" \
  -d '{"type":"executive_summary"}'

# Funnel Analysis
curl -X POST http://localhost:4750/api/funnels/analyze \
  -H "Content-Type: application/json" \
  -d '{"type":"sales_funnel"}'

# Cohort Analysis
curl -X POST http://localhost:4750/api/cohorts/analyze \
  -H "Content-Type: application/json" \
  -d '{"type":"monthly"}'

# Attribution
curl -X POST http://localhost:4750/api/attribution/analyze \
  -H "Content-Type: application/json" \
  -d '{"model":"linear"}'
```

---

## Integrations

### Connected Services

| Service | Port | Data |
|---------|------|------|
| Sales OS | 5055 | Leads, Pipeline, Deals |
| Marketing OS | 5500 | Campaigns, ROI |
| Finance OS | 4801 | Revenue, Margins |
| Workforce OS | 5077 | HR Metrics |
| Operations OS | 5250 | Tickets, SLAs |
| Procurement OS | 5096 | Spend, Suppliers |
| Customer Success | 4050 | NPS, Churn |
| REZ Care | 4055 | Support Tickets |
| REZ CRM | 4056 | Contacts |
| REZ Wallet | 4004 | Transactions |

---

## Example Responses

### KPI Response
```json
{
  "success": true,
  "kpi": {
    "kpiId": "revenue_total",
    "name": "Total Revenue",
    "unit": "₹",
    "category": "revenue",
    "value": 15234567.89,
    "previousValue": 14123456.78,
    "change": 7.87,
    "trend": "up",
    "calculatedAt": "2026-06-18T12:00:00Z"
  }
}
```

### Report Response
```json
{
  "success": true,
  "report": {
    "id": "RPT-ABC123",
    "type": "executive_summary",
    "name": "Executive Summary",
    "sections": {
      "revenue": [...],
      "sales": [...],
      "customer": [...],
      "operations": [...]
    },
    "generatedAt": "2026-06-18T12:00:00Z"
  }
}
```

### Funnel Response
```json
{
  "success": true,
  "funnel": {
    "type": "sales_funnel",
    "name": "Sales Funnel",
    "steps": [
      { "step": 1, "name": "Visits", "value": 10000, "conversionRate": 100 },
      { "step": 2, "name": "Leads", "value": 2500, "conversionRate": 25 },
      { "step": 3, "name": "Qualified", "value": 800, "conversionRate": 32 }
    ],
    "overallConversion": 4.5
  }
}
```

---

## Report Templates

| Template | Sections | Frequency |
|----------|----------|-----------|
| Executive Summary | Revenue, Sales, Customer, Ops | Daily |
| Sales Performance | Leads, Pipeline, Deals, Forecast | Daily |
| Marketing Dashboard | Campaigns, Engagement, CAC, ROAS | Daily |
| Customer Health | NPS, Churn, CSAT, Health | Weekly |
| Financial Report | Revenue, Expenses, Margins, Cash | Monthly |
| Operations Report | Tickets, Response, SLA | Daily |
| Workforce Report | Headcount, Turnover, Attendance | Monthly |
| Procurement Report | Orders, Spend, Suppliers | Weekly |

---

## Funnel Templates

| Funnel | Steps |
|--------|-------|
| Sales Funnel | Visits → Leads → Qualified → Proposal → Negotiation → Won |
| Marketing Funnel | Impressions → Reach → Engagement → Leads → Conversion → Customer |
| Onboarding Funnel | Signup → Profile → First Action → Activated → Retained |

---

## Attribution Models

| Model | Description |
|-------|-------------|
| First Touch | 100% credit to first interaction |
| Last Touch | 100% credit to last interaction |
| Linear | Equal credit to all interactions |
| Time Decay | More credit to recent interactions |
| Position Based | 40% first, 40% last, 20% middle |
| Data Driven | AI-powered attribution |

---

## Environment Variables

```bash
PORT=4750

# Service URLs (optional - defaults provided)
SALES_OS_URL=http://localhost:5055
MARKETING_OS_URL=http://localhost:5500
FINANCE_OS_URL=http://localhost:4801
WORKFORCE_OS_URL=http://localhost:5077
OPERATIONS_OS_URL=http://localhost:5250
PROCUREMENT_OS_URL=http://localhost:5096
CRM_URL=http://localhost:4056
WALLET_URL=http://localhost:4004
CARE_URL=http://localhost:4055
CUSTOMER_SUCCESS_URL=http://localhost:4050
```

---

## Architecture

```
Analytics OS (4750)
        │
        ├── KPI Engine (70+ metrics)
        ├── Dashboard Manager
        ├── Report Generator (8 templates)
        ├── Funnel Analyzer (3 templates)
        ├── Cohort Analyzer
        ├── Attribution Engine (6 models)
        ├── Anomaly Detector
        ├── Benchmark Comparator
        ├── Scheduled Reports
        │
        └── Cross-OS Connector
                │
                ├── Sales OS (5055)
                ├── Marketing OS (5500)
                ├── Finance OS (4801)
                ├── Workforce OS (5077)
                ├── Operations OS (5250)
                ├── Procurement OS (5096)
                ├── Customer Success (4050)
                └── REZ Services (4055, 4056, 4004)
```

---

## Performance

| Metric | Value |
|--------|-------|
| Response Time | < 100ms |
| KPI Calculations | < 50ms |
| Report Generation | < 2s |
| Funnel Analysis | < 500ms |
| Cross-OS Data | < 5s |

---

## Status

**Analytics OS:** ✅ OPERATIONAL

| Component | Status |
|-----------|--------|
| KPI Engine | ✅ 70+ metrics |
| Dashboards | ✅ Customizable |
| Reports | ✅ 8 templates |
| Funnels | ✅ 3 types |
| Cohorts | ✅ Active |
| Attribution | ✅ 6 models |
| Anomaly Detection | ✅ Active |
| Benchmarks | ✅ Industry |
| Cross-OS | ✅ 10 services |

---

*Last Updated: June 18, 2026*
*Built for RTMN Ecosystem*
