# QuickBooks Connector

## Overview
Accounting integration for TwinOS.

## Purpose
Syncs QuickBooks data with financial twins.

## Key Features
- Invoice sync
- Expense tracking
- Payment sync
- Report generation

## API Endpoints
- `GET /connect` - Test connection
- `POST /sync` - Trigger sync

## Startup
```bash
cd platform/connectors/quickbooks-connector && npm run dev
```
