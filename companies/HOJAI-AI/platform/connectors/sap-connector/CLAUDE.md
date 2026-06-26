# SAP Connector

## Overview
Enterprise ERP integration for TwinOS.

## Purpose
Syncs SAP ERP data with organization twins.

## Key Features
- Financial sync
- HR data
- Inventory tracking
- Procurement sync

## API Endpoints
- `GET /connect` - Test connection
- `POST /sync` - Trigger sync

## Startup
```bash
cd platform/connectors/sap-connector && npm run dev
```
