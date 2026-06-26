# Oracle Connector

## Overview
Enterprise ERP integration for TwinOS.

## Purpose
Syncs Oracle ERP data with organization twins.

## Key Features
- Financial sync
- Inventory mapping
- Supplier tracking
- Order sync

## API Endpoints
- `GET /connect` - Test connection
- `POST /sync` - Trigger sync

## Startup
```bash
cd platform/connectors/oracle-connector && npm run dev
```
