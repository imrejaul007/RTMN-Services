# Nexha - Commerce & Procurement OS

**Location:** `companies/Nexha/`  
**Purpose:** B2B commerce, procurement, distribution, and supply chain automation  
**Status:** ✅ **10+ MICROSERVICES** | **June 14, 2026**

---

## Nexha Overview

Nexha is the commerce and procurement backbone of RTMN, enabling businesses to automate their supply chain, manage procurement intelligently, and optimize distribution across the ecosystem.

### Nexha vs Traditional Procurement

| Feature | Traditional Procurement | Nexha |
|---------|----------------------|-------|
| AI-Powered Sourcing | ❌ | ✅ |
| Auto Reorder | ❌ | ✅ |
| Supplier Negotiation | Manual | ✅ Automated |
| Multi-channel Distribution | ❌ | ✅ |
| Inventory Intelligence | Basic | ✅ Predictive |
| Demand Forecasting | ❌ | ✅ |
| Supplier Portal | ❌ | ✅ |
| RFQ Automation | ❌ | ✅ |

---

## Core Services (10+)

| Service | Port | Description |
|---------|------|-------------|
| **nexha-commerce-gateway** | 8000 | API Gateway |
| **NexhaBizz** | 8001 | B2B commerce platform |
| **NexhaProcurementOS** | 8002 | Procurement automation |
| **NexhaDistributionOS** | 8003 | Distribution management |
| **NexhaSupplierPortal** | 8004 | Supplier self-service |
| **NexhaInventoryOS** | 8005 | Inventory intelligence |
| **NexhaPricingOS** | 8006 | Dynamic pricing |
| **NexhaLogisticsOS** | 8007 | Logistics coordination |
| **NexhaRFQEngine** | 8008 | Request for quotes |
| **NexhaAnalytics** | 8009 | Supply chain analytics |

---

## Key Features

### Procurement Automation
| Feature | Description |
|---------|-------------|
| Auto Reorder | Trigger reorder when inventory low |
| Smart Sourcing | AI-powered supplier selection |
| Price Comparison | Multi-supplier price comparison |
| RFQ Management | Create, send, compare RFQs |
| PO Management | Purchase order creation & tracking |
| Supplier Scorecard | Performance tracking |

### B2B Commerce
| Feature | Description |
|---------|-------------|
| Product Catalog | B2B product management |
| Bulk Ordering | Volume-based pricing |
| Credit Management | Credit limits, payments |
| Multi-warehouse | Inventory across locations |
| Order Tracking | Real-time order status |
| Invoice Management | Digital invoices |

### Distribution Management
| Feature | Description |
|---------|-------------|
| Route Optimization | Efficient delivery routes |
| Delivery Scheduling | Time-slot booking |
| Fleet Management | Vehicle tracking |
| Last-mile Delivery | Final delivery optimization |
| Returns Management | Reverse logistics |

### Supplier Intelligence
| Feature | Description |
|---------|-------------|
| Supplier Discovery | Find new suppliers |
| Verification | KYC, quality checks |
| Performance Monitoring | Delivery, quality, price |
| Risk Assessment | Supplier risk scoring |
| Collaboration | Direct supplier communication |

---

## API Endpoints

```
# Products
POST   /api/products                 # Create product
GET    /api/products                # List products
GET    /api/products/:id            # Get product
PATCH  /api/products/:id            # Update product

# Procurement
POST   /api/procurement/orders      # Create PO
GET    /api/procurement/orders      # List orders
GET    /api/procurement/orders/:id  # Get order
PATCH  /api/procurement/orders/:id  # Update order

# Suppliers
POST   /api/suppliers               # Add supplier
GET    /api/suppliers               # List suppliers
GET    /api/suppliers/:id           # Get supplier
POST   /api/rfq                     # Create RFQ

# Inventory
GET    /api/inventory/:warehouseId  # Get inventory
POST   /api/inventory/reorder       # Trigger reorder
GET    /api/inventory/forecast      # Demand forecast

# Distribution
POST   /api/deliveries              # Create delivery
GET    /api/deliveries/:id          # Track delivery
GET    /api/routes/optimize         # Optimize routes
```

---

## File Structure

```
companies/Nexha/
├── NexhaBizz/                     # B2B Commerce
├── ProcurementOS/                 # Procurement
├── DistributionOS/                 # Distribution
├── SupplierPortal/                 # Supplier Interface
├── InventoryOS/                    # Inventory
├── PricingOS/                     # Pricing
├── LogisticsOS/                   # Logistics
├── RFQEngine/                     # RFQ
├── Analytics/                     # Analytics
├── ecosystem-connector/            # RTMN Integration
└── nexha-bridge/                  # Bridge Services
```

---

## Integration with RTMN

| Service | Integration | Purpose |
|---------|-------------|---------|
| Waitron | Auto Reorder | Restaurant inventory |
| RisaCare | Medical Supplies | Healthcare procurement |
| REZ-Mart | Supplier Connection | Grocery supplies |
| BuzzLocal | Bulk Orders | Community orders |
| CorpPerks | Employee Supplies | Office supplies |

---

## Quick Start

```bash
# Start gateway
cd NexhaBizz && npm install && npm start

# Health check
curl http://localhost:8000/health

# Start procurement
cd ProcurementOS && npm start
```
