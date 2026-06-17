# Manufacturing OS

**Industry:** Manufacturing  
**Port:** 5150  
**Status:** ✅ RUNNING  
**Digital Twins:** Product, Order, Machine, Material, Worker

## Overview

Manufacturing OS is a comprehensive manufacturing management system that handles:
- Production orders
- Machine management
- Material tracking
- Worker management
- Quality control

## Quick Start

```bash
cd manufacturing-os
npm install
npm start
```

## API Endpoints

### Products
- `GET /api/products` - List products
- `POST /api/products` - Create product
- `GET /api/products/:id` - Get product

### Orders
- `GET /api/orders` - List orders
- `POST /api/orders` - Create order
- `GET /api/orders/:id` - Get order
- `PATCH /api/orders/:id/status` - Update status

### Machines
- `GET /api/machines` - List machines
- `POST /api/machines` - Add machine
- `GET /api/machines/:id` - Get machine

### Materials
- `GET /api/materials` - List materials
- `POST /api/materials` - Add material
- `PATCH /api/materials/:id` - Update stock

### Workers
- `GET /api/workers` - List workers
- `POST /api/workers` - Add worker

### Quality
- `GET /api/quality` - List checks
- `POST /api/quality` - Create check

### Analytics
- `GET /api/analytics` - Dashboard analytics

### Health
- `GET /health` - Health check

## Digital Twins

| Twin | Purpose |
|------|---------|
| Product Twin | Product catalog |
| Order Twin | Production orders |
| Machine Twin | Machine status |
| Material Twin | Material inventory |
| Worker Twin | Worker assignments |