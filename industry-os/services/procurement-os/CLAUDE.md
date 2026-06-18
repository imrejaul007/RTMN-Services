# Procurement OS v1.0.0

**Version:** 1.0.0  
**Port:** 5096  
**Status:** ✅ **RUNNING**

---

## Overview

Procurement OS is a comprehensive enterprise procurement management system that handles supplier relationships, purchase requisitions, contracts, inventory management, and spend analytics. It connects horizontally to all 24 Industry Operating Systems for unified procurement across verticals.

## Core Modules

| Module | Description | Endpoints |
|--------|-------------|-----------|
| **Supplier Management** | Supplier database, ratings, categories | CRUD, search, rate |
| **Requisitions** | Purchase requests, approval workflows | Create, approve, track |
| **Purchase Orders** | PO generation, order tracking | Create, update, fulfill |
| **Contracts** | Contract lifecycle, renewals | Create, amend, expire |
| **Inventory** | Stock levels, alerts, transfers | Track, alert, transfer |
| **Warehouses** | Warehouse capacity, locations | CRUD, capacity check |
| **Budget** | Department budgets, tracking | Allocate, track, alert |
| **Cost Centers** | Cost allocation, tracking | CRUD, reports |
| **Categories** | Procurement categories | CRUD, hierarchy |
| **RFQs** | Request for quotes, bidding | Create, bid, award |
| **Spend Analytics** | Category analysis, trends | Dashboard, reports |
| **Approval Templates** | Multi-level approval routing | CRUD, assign |

## AI Agents (10 Procurement Agents)

| Agent | Purpose |
|-------|---------|
| **Supplier Discovery Agent** | Find new suppliers matching criteria |
| **Price Optimization Agent** | Negotiate and optimize pricing |
| **Contract Intelligence Agent** | Extract key terms, flag risks |
| **Risk Assessment Agent** | Evaluate supplier risk scores |
| **Spend Analytics Agent** | Analyze spending patterns |
| **Approval Routing Agent** | Route approvals based on rules |
| **Inventory Prediction Agent** | Forecast demand, prevent stockouts |
| **Supplier Performance Agent** | Track and score supplier metrics |
| **Demand Forecasting Agent** | Predict future procurement needs |
| **Compliance Checker Agent** | Ensure policy adherence |

## Industry Bridges (24 Connections)

Procurement OS connects to all Industry OS for unified purchasing:

| Industry | Port | Industry | Port |
|----------|------|----------|------|
| Restaurant OS | 5010 | Manufacturing OS | 5150 |
| Hotel OS | 5025 | NonProfit OS | 5160 |
| Healthcare OS | 5020 | Professional OS | 5170 |
| Retail OS | 5030 | Sports OS | 5180 |
| Legal OS | 5035 | Travel OS | 5190 |
| Education OS | 5060 | Entertainment OS | 5200 |
| Sales OS | 5055 | Construction OS | 5210 |
| Automotive OS | 5080 | Financial OS | 5220 |
| Beauty OS | 5090 | RealEstate OS | 5230 |
| Fashion OS | 5095 | Transport OS | 5240 |
| Fitness OS | 5110 | Energy OS | 5260 |
| Gaming OS | 5120 | Exhibition OS | 5270 |
| Government OS | 5130 | | |
| HomeServices OS | 5140 | | |

## RTMN Ecosystem Integration

| Service | Port | Integration |
|---------|------|-------------|
| **CorpID** | 4702 | User authentication |
| **Finance OS** | 4801 | Budget sync, payments |
| **Inventory System** | External | Stock management |
| **ERP System** | External | Enterprise sync |

## Quick Start

```bash
cd industry-os/services/procurement-os
npm install
npm start
# Runs on http://localhost:5096
```

## Health Check

```bash
curl http://localhost:5096/health
```

## API Endpoints

### Suppliers
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/suppliers | List suppliers |
| POST | /api/suppliers | Add supplier |
| GET | /api/suppliers/:id | Get supplier |
| PUT | /api/suppliers/:id/rate | Rate supplier |

### Requisitions
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/requisitions | List requisitions |
| POST | /api/requisitions | Create requisition |
| POST | /api/requisitions/:id/approve | Approve |

### Purchase Orders
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/purchase-orders | List POs |
| POST | /api/purchase-orders | Create PO |
| PUT | /api/purchase-orders/:id/status | Update status |

### Contracts
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/contracts | List contracts |
| POST | /api/contracts | Create contract |
| GET | /api/contracts/expiring | Expiring soon |

### Inventory
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/inventory | List inventory |
| POST | /api/inventory/transfer | Transfer stock |
| GET | /api/inventory/alerts | Low stock alerts |

### Budget
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/budgets | List budgets |
| POST | /api/budgets | Allocate budget |
| GET | /api/budgets/:id/utilization | Usage stats |

### RFQs
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/rfqs | List RFQs |
| POST | /api/rfqs | Create RFQ |
| POST | /api/rfqs/:id/bid | Submit bid |

### AI Agents
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/ai-agents/status | Agent status |
| POST | /api/ai-agents/discover-supplier | Find suppliers |
| POST | /api/ai-agents/analyze-spend | Spend analysis |
| POST | /api/ai-agents/assess-risk | Risk assessment |

### Analytics
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/analytics/overview | Dashboard |
| GET | /api/analytics/spend-by-category | Category spend |
| GET | /api/analytics/supplier-performance | Supplier scores |

### Industry Bridges
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/industry-bridges | List connections |
| POST | /api/industry-bridges/order | Cross-industry PO |

---

*Procurement OS - Enterprise Procurement for All Industries*
