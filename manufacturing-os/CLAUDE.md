# Manufacturing OS - Development Guide

**Port:** 5150  
**Type:** Industry OS (Manufacturing Management)  
**Tagline:** "Smart manufacturing management"
**Status:** ✅ PRODUCTION READY

---

## Overview

Manufacturing OS is a comprehensive manufacturing management platform that handles product management, production orders, machine maintenance, material inventory, worker management, and quality control for manufacturing facilities.

---

## Core Features

### Product Management
- Product CRUD with SKU
- Description and cost tracking
- Unit cost and selling price
- Status management (active, inactive, discontinued)

### Production Orders
- Order CRUD with product association
- Quantity tracking
- Auto cost calculation
- Priority levels (low, normal, high, urgent)
- Status tracking (pending, in_production, completed, cancelled)
- Status filtering

### Machine Management
- Machine CRUD
- Type classification
- Capacity rating
- Location tracking
- Status (idle, running, maintenance, offline)
- Maintenance tracking

### Material Management
- Material CRUD with SKU
- Quantity and unit of measure
- Reorder level
- Low stock alerts
- Status (in_stock, low_stock, out_of_stock)

### Worker Management
- Worker CRUD
- Role assignment
- Machine assignment
- Shift management (day, night, swing)
- Skills tracking
- Status (available, working, off)

### Production Tracking
- Production CRUD
- Order, machine, worker association
- Quantity tracking
- Status (in_progress, completed, paused)
- Time tracking (start/completion)

### Quality Control
- Quality check CRUD
- Production association
- Defect tracking
- Pass/fail status
- Inspection notes

### Analytics Dashboard
- Product stats
- Order stats (total, pending)
- Machine stats (total, active)
- Worker stats
- Low stock alerts
- Production metrics

---

## Authentication & Database

### Authentication System
- **Register:** `POST /auth/register` - Create new business/account
- **Login:** `POST /auth/login` - Authenticate and get token
- **Verify:** `GET /auth/verify` - Validate JWT token
- **requireAuth middleware** - Protects API endpoints

### Database
- **MongoDB Support** - Full persistence via MONGODB_URI
- **Demo Mode** - Runs in-memory without MongoDB
- **Multi-tenancy** - All data isolated by tenantId/businessId

### CRM Integration
- **REZ CRM Hub** - Production sync on registration
- **Order Tracking** - Track orders in CRM
- **Industry Tagging** - Automatic industry classification (manufacturing)

### Environment Variables
| Variable | Description | Required |
|----------|-------------|----------|
| PORT | Service port | No (default: 5150) |
| MONGODB_URI | MongoDB connection string | No (demo mode if not set) |
| CRM_HUB_URL | REZ CRM Hub URL | No (default: http://localhost:4056) |
| SERVICE_NAME | Service identifier for logs | No |

---

## API Endpoints

### Health
```
GET /health - Health check
```

### Products
```
GET  /api/products           - List products
POST /api/products           - Create product
GET  /api/products/:id       - Get product
PUT  /api/products/:id       - Update product
DELETE /api/products/:id     - Delete product
```

### Orders
```
GET  /api/orders             - List orders (filter: status)
POST /api/orders             - Create order
GET  /api/orders/:id         - Get order
PUT  /api/orders/:id         - Update order
PATCH /api/orders/:id/status - Update status
DELETE /api/orders/:id       - Delete order
```

### Machines
```
GET  /api/machines           - List machines
POST /api/machines           - Create machine
GET  /api/machines/:id       - Get machine
PUT  /api/machines/:id       - Update machine
DELETE /api/machines/:id     - Delete machine
```

### Materials
```
GET  /api/materials          - List materials
POST /api/materials          - Create material
GET  /api/materials/:id     - Get material
PUT  /api/materials/:id      - Update material
DELETE /api/materials/:id   - Delete material
```

### Workers
```
GET  /api/workers            - List workers
POST /api/workers            - Create worker
GET  /api/workers/:id        - Get worker
PUT  /api/workers/:id        - Update worker
DELETE /api/workers/:id      - Delete worker
```

### Production
```
GET  /api/production         - List production records
POST /api/production         - Create production record
GET  /api/production/:id     - Get production record
PUT  /api/production/:id     - Update production record
DELETE /api/production/:id   - Delete production record
```

### Quality
```
GET  /api/quality            - List quality checks
POST /api/quality            - Create quality check
GET  /api/quality/:id        - Get quality check
PUT  /api/quality/:id        - Update quality check
DELETE /api/quality/:id      - Delete quality check
```

### Analytics
```
GET /api/analytics - Get analytics dashboard
```

### Authentication
```
POST /auth/register - Register business
POST /auth/login    - Login
GET  /auth/verify   - Verify token
```

---

## Testing

```bash
# Health check
curl http://localhost:5150/health

# Register
curl -X POST http://localhost:5150/auth/register \
  -H "Content-Type: application/json" \
  -d '{"businessId":"biz_123","email":"owner@factory.com","password":"secret"}'

# Login
curl -X POST http://localhost:5150/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"owner@factory.com","password":"secret"}'

# Create product
curl -X POST http://localhost:5150/api/products \
  -H "Content-Type: application/json" \
  -d '{"Name":"Widget A","sku":"WGT-001","description":"Standard widget","unitCost":10,"sellingPrice":25}'

# List products
curl http://localhost:5150/api/products

# Create machine
curl -X POST http://localhost:5150/api/machines \
  -H "Content-Type: application/json" \
  -d '{"Name":"Press Machine 1","type":"hydraulic_press","capacity":100,"location":"Floor A"}'

# Create material
curl -X POST http://localhost:5150/api/materials \
  -H "Content-Type: application/json" \
  -d '{"Name":"Steel Sheet","sku":"STL-001","quantity":500,"unit":"sheets","reorderLevel":100}'

# Create worker
curl -X POST http://localhost:5150/api/workers \
  -H "Content-Type: application/json" \
  -d '{"Name":"John Smith","role":"machine_operator","shift":"day"}'

# Create order
curl -X POST http://localhost:5150/api/orders \
  -H "Content-Type: application/json" \
  -d '{"productId":"product-uuid","quantity":100,"priority":"normal"}'

# Create production record
curl -X POST http://localhost:5150/api/production \
  -H "Content-Type: application/json" \
  -d '{"orderId":"order-uuid","machineId":"machine-uuid","workerId":"worker-uuid","quantity":50}'

# Create quality check
curl -X POST http://localhost:5150/api/quality \
  -H "Content-Type: application/json" \
  -d '{"productionId":"production-uuid","defects":2,"status":"pass"}'

# Get analytics
curl http://localhost:5150/api/analytics
```

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                   Manufacturing OS (Port 5150)                  │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐            │
│  │  Products   │  │   Orders    │  │   Machines   │            │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘            │
│         │                 │                 │                    │
│  ┌──────▼──────┐  ┌──────▼──────┐  ┌──────▼──────┐            │
│  │  Materials  │  │ Production  │  │   Workers   │            │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘            │
│         │                 │                 │                    │
│         └────────────────┬┴────────────────┘                    │
│                          │                                      │
│                   ┌──────▼──────┐                              │
│                   │  Quality    │                              │
│                   └──────┬──────┘                              │
│                          │                                      │
│                   ┌──────▼──────┐                              │
│                   │  Analytics  │                              │
│                   └──────┬──────┘                              │
│                          │                                      │
│  ┌─────────────┐  ┌─────▼──────┐  ┌─────────────┐            │
│  │   Inventory  │  │  Auth/DB   │  │   Nexha    │            │
│  │   Alerts    │  │            │  │ Procurement │            │
│  └─────────────┘  └────────────┘  └─────────────┘            │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Digital Twins

Manufacturing OS supports Digital Twin architecture:
- **Product Twin** - Product catalog state
- **Order Twin** - Order pipeline tracking
- **Machine Twin** - Real-time machine status
- **Material Twin** - Inventory state
- **Worker Twin** - Worker availability
- **Production Twin** - Manufacturing state

---

## RTNM Ecosystem Integration

| Service | Port | Purpose |
|---------|------|---------|
| REZ CRM Hub | 4056 | Order sync |
| CorpID | 4702 | Business identity |
| GoalOS | 4242 | Production goals |
| Nexha | 4320 | Auto-procurement |
| SUTAR | 4140 | AI optimization |

---

**Last Updated:** June 15, 2026
