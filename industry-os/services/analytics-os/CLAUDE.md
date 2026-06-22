# Analytics OS - Developer Context

## Overview

**Port:** 4750  
**Version:** 1.0.0  
**Status:** ✅ PRODUCTION READY

Analytics OS provides unified Business Intelligence for the entire RTMN ecosystem.

## Architecture

```
Analytics OS (4750)
    │
    ├── KPI Engine (70+ metrics)
    │   ├── Revenue (8 KPIs)
    │   ├── Sales (12 KPIs)
    │   ├── Marketing (14 KPIs)
    │   ├── Customer (12 KPIs)
    │   ├── Operations (7 KPIs)
    │   ├── Workforce (7 KPIs)
    │   ├── Procurement (5 KPIs)
    │   └── Financial (7 KPIs)
    │
    ├── Dashboard Manager
    │   ├── Create/Update Dashboards
    │   ├── Widget Management
    │   └── Layout Customization
    │
    ├── Report Generator (8 templates)
    │   ├── Executive Summary
    │   ├── Sales Performance
    │   ├── Marketing Dashboard
    │   ├── Customer Health
    │   ├── Financial Report
    │   ├── Operations Report
    │   ├── Workforce Report
    │   └── Procurement Report
    │
    ├── Funnel Analyzer (3 templates)
    │   ├── Sales Funnel
    │   ├── Marketing Funnel
    │   └── Onboarding Funnel
    │
    ├── Cohort Analyzer
    │   └── Monthly retention cohorts
    │
    ├── Attribution Engine (6 models)
    │   ├── First Touch
    │   ├── Last Touch
    │   ├── Linear
    │   ├── Time Decay
    │   ├── Position Based
    │   └── Data Driven
    │
    ├── Anomaly Detection
    │   └── Statistical outlier detection
    │
    ├── Benchmarking
    │   └── Industry comparisons
    │
    └── Cross-OS Connector
        └── Unified data from all services
```

## Service Connections

| Service | Port | Data Used |
|---------|------|----------|
| Sales OS | 5055 | Leads, Pipeline, Deals |
| Marketing OS | 5500 | Campaigns, ROI, CAC |
| Finance OS | 4801 | Revenue, P&L |
| Workforce OS | 5077 | HR Metrics |
| Operations OS | 5250 | Tickets, SLAs |
| Procurement OS | 5096 | Spend, Suppliers |
| Customer Success | 4050 | NPS, Churn |
| REZ Care | 4055 | Support Tickets |
| REZ CRM | 4056 | Contacts |
| REZ Wallet | 4004 | Transactions |

## KPI Registry

```javascript
const KPI_REGISTRY = {
  // Revenue (8)
  'revenue_total': { name: 'Total Revenue', unit: '₹', category: 'revenue' },
  'revenue_growth': { name: 'Revenue Growth', unit: '%', category: 'revenue' },
  
  // Sales (12)
  'leads_total': { name: 'Total Leads', unit: 'count', category: 'sales' },
  'pipeline_value': { name: 'Pipeline Value', unit: '₹', category: 'sales' },
  'win_rate': { name: 'Win Rate', unit: '%', category: 'sales' },
  
  // Marketing (14)
  'cac': { name: 'Customer Acquisition Cost', unit: '₹', category: 'marketing' },
  'roas': { name: 'ROAS', unit: 'ratio', category: 'marketing' },
  
  // Customer (12)
  'nps_score': { name: 'NPS Score', unit: 'score', category: 'customer' },
  'churn_rate': { name: 'Churn Rate', unit: '%', category: 'customer' },
  'ltv': { name: 'Lifetime Value', unit: '₹', category: 'customer' },
  
  // Operations (7)
  // Workforce (7)
  // Procurement (5)
  // Financial (7)
};
```

## Report Templates

```javascript
const REPORT_TEMPLATES = {
  'executive_summary': {
    sections: ['revenue', 'sales', 'customer', 'operations']
  },
  'sales_performance': {
    sections: ['leads', 'pipeline', 'deals', 'forecasting']
  },
  'marketing_dashboard': {
    sections: ['campaigns', 'engagement', 'cac', 'roas']
  },
  'customer_health': {
    sections: ['nps', 'churn', 'csat', 'health']
  },
  'financial_report': {
    sections: ['revenue', 'expenses', 'margins', 'cash']
  },
  'operations_report': {
    sections: ['tickets', 'response', 'sla']
  },
  'workforce_report': {
    sections: ['headcount', 'turnover', 'attendance']
  },
  'procurement_report': {
    sections: ['orders', 'spend', 'suppliers']
  }
};
```

## Environment Variables

```bash
PORT=4750
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

## Key Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| /health | GET | Service health |
| /api/kpis | GET | All KPIs |
| /api/kpis/:id | GET | Single KPI |
| /api/dashboards | POST | Create dashboard |
| /api/reports/generate | POST | Generate report |
| /api/funnels/analyze | POST | Analyze funnel |
| /api/cohorts/analyze | POST | Analyze cohorts |
| /api/attribution/analyze | POST | Attribution model |
| /api/crossos/360 | GET | Complete data |

## Metrics Collection

```javascript
// Fetch data from services
const CrossOSData = {
  async get360(view = 'summary') {
    const [sales, marketing, financial, customer, operations] = 
      await Promise.all([
        this.getSalesData(),
        this.getMarketingData(),
        this.getFinancialData(),
        this.getCustomerData(),
        this.getOperationsData()
      ]);
    return { sales, marketing, financial, customer, operations };
  }
};
```

## Performance

| Metric | Target |
|--------|--------|
| KPI Response | < 50ms |
| Report Generation | < 2s |
| Funnel Analysis | < 500ms |
| Cross-OS Query | < 5s |

---

*Last Updated: June 18, 2026*
