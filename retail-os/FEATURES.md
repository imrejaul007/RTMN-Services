# Retail OS - Features

**Version:** 1.0.0  
**Last Updated:** June 15, 2026  
**Port:** 5030  
**Status:** ✅ RUNNING

---

## Core Features

### 1. Product Management

| Feature | Description | Status |
|---------|-------------|--------|
| CRUD Operations | Create, read, update, delete products | ✅ |
| SKU Management | Stock keeping unit | ✅ |
| Categories | Product categorization | ✅ |
| Pricing | Price management | ✅ |
| Images | Product images | ✅ |
| Variants | Size, color variants | ✅ |

### 2. Inventory Management

| Feature | Description | Status |
|---------|-------------|--------|
| Stock Tracking | Track stock levels | ✅ |
| Low Stock Detection | Alert when low | ✅ |
| Reorder Levels | Automatic reorder points | ✅ |
| Batch Tracking | Batch numbers | ✅ |
| Expiry Tracking | Expiry date tracking | ✅ |

### 3. Customer Management

| Feature | Description | Status |
|---------|-------------|--------|
| Customer CRUD | Manage customers | ✅ |
| Tier System | Bronze, Silver, Gold | ✅ |
| Loyalty Points | Point accumulation | ✅ |
| Spending Tracking | Track spending | ✅ |
| Preferences | Customer preferences | ✅ |

### 4. Cart & Checkout

| Feature | Description | Status |
|---------|-------------|--------|
| Cart Creation | Create shopping cart | ✅ |
| Auto Pricing | Apply prices | ✅ |
| Tax Calculation | GST calculation | ✅ |
| Discounts | Apply discounts | ✅ |
| Checkout | Complete purchase | ✅ |

### 5. Orders

| Feature | Description | Status |
|---------|-------------|--------|
| Order Creation | Create orders | ✅ |
| Inventory Deduction | Auto deduct stock | ✅ |
| Status Tracking | pending, shipped, delivered | ✅ |
| Order History | Past orders | ✅ |

### 6. Suppliers

| Feature | Description | Status |
|---------|-------------|--------|
| Supplier CRUD | Manage suppliers | ✅ |
| Contact Management | Contact details | ✅ |
| Product Assignment | Assign products | ✅ |
| Lead Times | Delivery times | ✅ |

---

## API Endpoints

### Products

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/products` | List products |
| POST | `/api/products` | Add product |
| GET | `/api/products/:id` | Get product |
| PUT | `/api/products/:id` | Update product |

### Inventory

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/inventory` | List inventory |
| PATCH | `/api/inventory/:productId` | Update stock |

### Customers

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/customers` | List customers |
| POST | `/api/customers` | Add customer |

### Cart

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/cart` | Create cart |
| GET | `/api/cart/:id` | Get cart |

### Orders

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/orders` | List orders |
| POST | `/api/orders` | Create order |
| PATCH | `/api/orders/:id/status` | Update status |

### Suppliers

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/suppliers` | List suppliers |
| POST | `/api/suppliers` | Add supplier |

---

## Integration

| Service | Port | Integration |
|---------|------|-------------|
| REZ-ecosystem-connector | 4399 | Service registry |
| REZ-event-bus | 4510 | Event publishing |

---

*Last Updated: June 15, 2026*
*Retail OS - Retail Industry OS*