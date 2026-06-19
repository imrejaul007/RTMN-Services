# Finance Copilot Service

**Port:** 4930  
**Status:** ✅ BUILT  
**Purpose:** AI-powered financial analysis and insights

---

## Overview

Finance Copilot provides AI-powered financial analysis:
- Cash flow forecasting
- Budget analysis
- Anomaly detection
- Refund analysis
- Fraud detection
- Financial reports
- KPI tracking

## Features

- ✅ Cash Flow Forecasting
- ✅ Budget Analysis & Variance
- ✅ Anomaly Detection
- ✅ Refund Analysis
- ✅ Financial Reports (Income, Balance, Cash Flow, ARR)
- ✅ KPI Tracking (8 KPIs)
- ✅ Alert System
- ✅ AI Insights
- ✅ Fraud Detection

## API Endpoints

### Forecasting
- `POST /api/cashflow/forecast` - Forecast cash flow
- `POST /api/budget/analyze` - Analyze budget vs actual

### Anomaly Detection
- `POST /api/anomaly/detect` - Detect anomalies
- `POST /api/refund/analyze` - Analyze refunds
- `POST /api/fraud/detect` - Fraud detection

### Reports
- `GET /api/reports/:type` - Generate reports (income, balance, cashflow, arr)

### KPIs
- `GET /api/kpis` - List all KPIs
- `GET /api/kpis/:id` - Get KPI with trend

### Alerts
- `GET /api/alerts` - List alerts
- `POST /api/alerts` - Create alert

### Insights
- `GET /api/insights` - Get AI insights

## Quick Start

```bash
cd services/finance-copilot
npm install
npm start
```

## Integration

- **Finance Twin** - Financial data
- **Customer Intelligence** - Customer metrics
- **Sales OS** - Revenue data
