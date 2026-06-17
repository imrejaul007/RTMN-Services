# Restaurant OS

**Industry:** Hospitality  
**Port:** 5010  
**Status:** ✅ RUNNING  
**Digital Twins:** Menu, Order, Kitchen, Table, Customer

## Overview

Restaurant OS is a comprehensive restaurant management system that handles:
- Menu management
- Order processing
- Kitchen display
- Table management
- Customer loyalty

## Quick Start

```bash
cd restaurant-os
npm install
npm start
```

## API Endpoints

### Menu
- `GET /api/menu` - List menu items
- `POST /api/menu` - Create menu item
- `GET /api/menu/:id` - Get menu item
- `PUT /api/menu/:id` - Update menu item
- `DELETE /api/menu/:id` - Delete menu item

### Orders
- `GET /api/orders` - List orders
- `POST /api/orders` - Create order
- `GET /api/orders/:id` - Get order
- `PATCH /api/orders/:id/status` - Update status
- `DELETE /api/orders/:id` - Cancel order

### Tables
- `GET /api/tables` - List tables
- `POST /api/tables/:id/reserve` - Reserve table

### Kitchen
- `GET /api/kitchen` - Kitchen queue
- `PATCH /api/kitchen/:orderId` - Update kitchen item

### Customers
- `GET /api/customers` - List customers
- `POST /api/customers` - Add customer
- `POST /api/customers/:id/points` - Add loyalty points

### Reviews
- `GET /api/reviews` - List reviews
- `POST /api/reviews` - Submit review

### Analytics
- `GET /api/analytics` - Dashboard analytics

### Digital Twins
- `GET /api/twins` - All twins
- `GET /api/twins/:name` - Specific twin
- `POST /api/twins/sync` - Sync twins

### Health
- `GET /health` - Health check

## Digital Twins

| Twin | Purpose |
|------|---------|
| Menu Twin | Menu items, categories, prices |
| Order Twin | Orders, status, history |
| Kitchen Twin | Kitchen queue, prep times |
| Table Twin | Table assignments, reservations |
| Customer Twin | Customer profiles, loyalty |

## Loyalty Tiers

| Tier | Points Required |
|------|----------------|
| Bronze | 0 |
| Silver | 500 |
| Gold | 2000 |
| Platinum | 5000 |