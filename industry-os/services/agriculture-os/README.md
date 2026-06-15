# Restaurant OS

Industry-specific digital twin service for the restaurant and food service industry within RTMN.

## Overview

Restaurant OS provides comprehensive management capabilities for restaurants including menu management, order processing, table reservations, kitchen queue management, customer loyalty, and analytics.

## Quick Start

```bash
# Install dependencies
cd services/restaurant-os
npm install

# Run locally
npm start

# Run with Docker
docker build -t rtmn-restaurant-os .
docker run -p 5010:5010 rtmn-restaurant-os
```

## API Endpoints

### Menu Management
- `GET /api/menu` - Get all menu items (with optional filters)
- `GET /api/menu/:id` - Get specific menu item
- `POST /api/menu` - Create menu item
- `PUT /api/menu/:id` - Update menu item
- `DELETE /api/menu/:id` - Delete menu item

### Order Management
- `POST /api/orders` - Create new order
- `GET /api/orders` - List orders (filterable)
- `GET /api/orders/:id` - Get order details
- `PATCH /api/orders/:id/status` - Update order status
- `DELETE /api/orders/:id` - Cancel order

### Table Management
- `GET /api/tables` - List all tables
- `GET /api/tables/:id` - Get table details
- `PUT /api/tables/:id` - Update table
- `POST /api/tables/:id/reserve` - Reserve table

### Kitchen Queue
- `GET /api/kitchen` - Get kitchen queue
- `PATCH /api/kitchen/:orderId` - Update preparation status

### Customer Management
- `POST /api/customers` - Create/update customer
- `GET /api/customers` - List customers
- `POST /api/customers/:id/points` - Add loyalty points

### Reviews
- `POST /api/reviews` - Create review
- `GET /api/reviews` - List reviews

### Analytics
- `GET /api/analytics` - Get daily analytics

### Digital Twins
- `GET /api/twins` - All twins status
- `GET /api/twins/:name` - Specific twin
- `POST /api/twins/sync` - Sync all twins

## Digital Twins

| Twin | Purpose |
|------|---------|
| menu-twin | Real-time menu item catalog |
| order-twin | Active order tracking |
| kitchen-twin | Kitchen queue management |
| table-twin | Table occupancy tracking |
| customer-twin | Customer loyalty data |

## Port

**5010** - Restaurant OS Port

## Health Check

```bash
curl http://localhost:5010/health
```
