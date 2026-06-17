# Retail OS

**Industry:** Retail  
**Port:** 5030  
**Status:** ✅ RUNNING  
**Digital Twins:** Product, Inventory, Customer, Cart

## Overview

Retail OS is a comprehensive retail management system that handles:
- Product catalog
- Inventory management
- Customer management
- Cart & checkout
- Supplier management

## Quick Start

```bash
cd retail-os
npm install
npm start
```

## API Endpoints

### Products
- `GET /api/products` - List products
- `POST /api/products` - Add product
- `GET /api/products/:id` - Get product
- `PUT /api/products/:id` - Update product

### Inventory
- `GET /api/inventory` - List inventory
- `PATCH /api/inventory/:productId` - Update stock

### Customers
- `GET /api/customers` - List customers
- `POST /api/customers` - Add customer

### Cart
- `POST /api/cart` - Create cart
- `GET /api/cart/:id` - Get cart

### Orders
- `GET /api/orders` - List orders
- `POST /api/orders` - Create order
- `PATCH /api/orders/:id/status` - Update status

### Suppliers
- `GET /api/suppliers` - List suppliers
- `POST /api/suppliers` - Add supplier

### Analytics
- `GET /api/analytics` - Dashboard analytics

### Health
- `GET /health` - Health check

## Digital Twins

| Twin | Purpose |
|------|---------|
| Product Twin | Product catalog |
| Inventory Twin | Stock levels |
| Customer Twin | Customer profiles |
| Cart Twin | Shopping carts |