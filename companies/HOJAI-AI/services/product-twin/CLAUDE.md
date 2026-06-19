# RTMN Product Twin Service

> **Version:** 1.0.0
> **Port:** 4720
> **Status:** ✅ Built - Phase 2 High Priority

---

## Overview

The Product Twin Service provides digital twin capabilities for products and inventory. It maintains real-time inventory tracking, pricing, variants, and product analytics.

---

## Features

### Core Capabilities

| Feature | Description |
|---------|-------------|
| **Product Catalog** | Full product information and metadata |
| **Inventory Tracking** | Real-time stock levels across warehouses |
| **Variant Management** | Product variants with attributes |
| **Pricing Engine** | Price, cost, margin calculations |
| **Analytics** | Sales, revenue, profit analytics |
| **Reservation System** | Reserve inventory for orders |

### Product Types

| Type | Description |
|------|-------------|
| software | SaaS, applications |
| service | Professional services |
| physical | Physical goods |
| bundle | Product bundles |
| subscription | Recurring products |

---

## API Endpoints

### Products

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/products` | List all products |
| GET | `/api/products/:id` | Get product |
| POST | `/api/products` | Create product |
| PUT | `/api/products/:id` | Update product |
| DELETE | `/api/products/:id` | Delete product |

### Inventory

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/products/:id/inventory` | Get inventory |
| PUT | `/api/products/:id/inventory` | Update inventory |
| POST | `/api/products/:id/inventory/reserve` | Reserve stock |

### Variants

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/products/:id/variants` | List variants |
| POST | `/api/products/:id/variants` | Create variant |

### Analytics

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/products/:id/analytics` | Get product analytics |

### Comparison

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/compare` | Compare products |

### Statistics

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/statistics` | Get platform stats |

### Health

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Service health check |

---

## Data Model

### Product

```javascript
{
  id: "prod-1",
  name: "Enterprise CRM Suite",
  sku: "CRM-ENT-001",
  type: "software",
  category: "Sales Software",
  description: "Full-featured CRM for enterprise",
  price: 999.99,
  cost: 200,
  currency: "USD",
  status: "active",
  features: ["Contact Management", "Deal Tracking"],
  specifications: { users: "Unlimited", storage: "100GB" },
  stats: {
    sold: 1250,
    rating: 4.5,
    reviews: 234
  }
}
```

### Inventory

```javascript
{
  id: "inv-1",
  productId: "prod-1",
  warehouseId: "wh-1",
  quantity: 1000,
  reserved: 50,
  available: 950,
  reorderPoint: 100,
  status: "in_stock"
}
```

---

## Usage Examples

### Create Product

```bash
curl -X POST http://localhost:4720/api/products \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Pro Analytics Suite",
    "sku": "ANA-PRO-001",
    "type": "software",
    "category": "Analytics",
    "price": 599.99,
    "cost": 100
  }'
```

### Reserve Inventory

```bash
curl -X POST http://localhost:4720/api/products/prod-1/inventory/reserve \
  -H "Content-Type: application/json" \
  -d '{"quantity": 10, "orderId": "order-123"}'
```

### Get Analytics

```bash
curl http://localhost:4720/api/products/prod-1/analytics
```

---

## Integration Points

| Service | Connection | Purpose |
|---------|------------|---------|
| **Unified Hub** | Routes product data | Central access |
| **Sales OS** | Product catalog | Sales proposals |
| **Marketing OS** | Product promotions | Campaigns |
| **Procurement OS** | Supplier products | Inventory |
| **REZ Wallet** | Product purchases | Payments |
| **TwinOS Hub** | Twin synchronization | State sync |

---

## Quick Start

```bash
cd services/product-twin
npm install
npm start
```

---

*Built with Phase 2 - High Priority Services*
