# Supplier Twin

## Overview
Supplier profiles, performance, risk.

## Purpose
Digital twin for suppliers.

## Key Features
- Supplier profiles
- Performance tracking
- Risk assessment
- Compliance monitoring

## API Endpoints

### Suppliers
- `GET /api/suppliers` - List suppliers
- `POST /api/suppliers` - Create supplier
- `GET /api/suppliers/:id` - Get supplier
- `PATCH /api/suppliers/:id` - Update supplier

### Performance
- `GET /api/suppliers/:id/performance` - Get performance

## Startup
```bash
cd platform/twins/supplier-twin && npm run dev
```
