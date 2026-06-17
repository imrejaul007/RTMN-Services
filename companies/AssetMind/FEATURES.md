# AssetMind - Wealth Management Platform

**Last Updated:** June 17, 2026  
**Location:** `companies/AssetMind/`  
**Status:** ✅ **PRODUCTION READY**  
**Tagline:** "AI-Powered Wealth Management for Everyone"

---

## Overview

AssetMind is a comprehensive wealth management platform that connects to the RTMN ecosystem via Layer 4 (Financial) and Layer 12 (Digital Twins). It provides personal finance management, investment tracking, and wealth optimization.

---

## Core Services

| Service | Port | Purpose |
|---------|------|---------|
| assetmind-portfolio | 5200 | Portfolio management |
| assetmind-analytics | 5201 | Investment analytics |
| assetmind-planning | 5202 | Financial planning |
| assetmind-wealth-twin | 5210 | Wealth Digital Twin |

---

## Features

### Portfolio Management

| Feature | Description | Status |
|---------|-------------|--------|
| Multi-Asset Tracking | Stocks, bonds, mutual funds, real estate, crypto | ✅ |
| Real-time Valuation | Live price updates | ✅ |
| Performance Metrics | ROI, Sharpe ratio, volatility | ✅ |
| Diversification Analysis | Asset allocation recommendations | ✅ |
| Risk Assessment | Portfolio risk scoring | ✅ |

### Investment Analytics

| Feature | Description | Status |
|---------|-------------|--------|
| Technical Analysis | Charts, indicators, patterns | ✅ |
| Fundamental Analysis | Company financials, ratios | ✅ |
| Market Intelligence | News, trends, sentiment | ✅ |
| Comparative Analysis | Benchmark comparisons | ✅ |
| Predictive Insights | AI-powered forecasts | ✅ |

### Financial Planning

| Feature | Description | Status |
|---------|-------------|--------|
| Goal-Based Planning | Retirement, education, home purchase | ✅ |
| Cash Flow Analysis | Income vs expenses tracking | ✅ |
| Tax Optimization | Tax-loss harvesting, planning | ✅ |
| Estate Planning | Will, trust recommendations | ✅ |
| Insurance Analysis | Coverage assessment | ✅ |

### Digital Twin Integration

| Feature | Description | Status |
|---------|-------------|--------|
| Net Worth Tracking | Real-time wealth snapshot | ✅ |
| Historical Analysis | Historical performance | ✅ |
| Relationship Tracking | Connected accounts | ✅ |
| Predictive Modeling | Future wealth projections | ✅ |

---

## API Endpoints

### Portfolio

```
GET  /api/portfolio              - Get full portfolio
GET  /api/portfolio/holdings     - Get all holdings
POST /api/portfolio/holdings    - Add holding
GET  /api/portfolio/performance  - Get performance metrics
GET  /api/portfolio/allocations - Get asset allocation
```

### Analytics

```
GET  /api/analytics/overview     - Get analytics overview
GET  /api/analytics/risks       - Get risk analysis
GET  /api/analytics/recommendations - Get AI recommendations
POST /api/analytics/compare     - Compare investments
```

### Planning

```
GET  /api/planning/goals         - Get financial goals
POST /api/planning/goals         - Create goal
GET  /api/planning/projections   - Get projections
GET  /api/planning/tax-optimization - Get tax strategies
```

### Wealth Twin

```
GET  /api/twin/net-worth         - Get net worth
GET  /api/twin/history           - Get wealth history
POST /api/twin/sync              - Sync with external accounts
```

---

## RTMN Ecosystem Integration

### Connected Services

| Service | Port | Purpose |
|---------|------|---------|
| RABTUL Wallet | 4004 | Fund transfers, payments |
| RABTUL Auth | 4002 | Authentication |
| TwinOS Hub | 4705 | Digital twins |
| Genie Financial Twin | 4715 | Financial context |
| Restaurant OS | 5010 | Business wealth tracking |

### Layer Integration

| RTMN Layer | Connection |
|------------|------------|
| Layer 4 (Finance) | Payment processing, wallet integration |
| Layer 12 (Twins) | Wealth Twin sync |
| Layer 11 (Memory) | Financial memory |

---

## Quick Start

```bash
# Health check
curl http://localhost:5200/health

# Get portfolio
curl http://localhost:5200/api/portfolio

# Get net worth from Wealth Twin
curl http://localhost:5210/api/twin/net-worth

# Add holding
curl -X POST http://localhost:5200/api/portfolio/holdings \
  -H "Content-Type: application/json" \
  -d '{"symbol": "AAPL", "shares": 100, "purchasePrice": 150}'
```

---

## Related Documentation

- [RTNM-COMPANIES-AUDIT.md](../../RTNM-COMPANIES-AUDIT.md) - Company registry
- [RTNM-PRODUCTS-FEATURES-AUDIT.md](../../RTNM-PRODUCTS-FEATURES-AUDIT.md) - Product features
- [INDUSTRY-OS-FULL-DETAILS.md](../../INDUSTRY-OS-FULL-DETAILS.md) - Industry integration

---

*Last Updated: June 17, 2026*
*AssetMind - Part of RTMN Ecosystem*
