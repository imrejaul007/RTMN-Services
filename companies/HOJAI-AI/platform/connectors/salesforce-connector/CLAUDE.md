# Salesforce Connector

## Overview
CRM integration for TwinOS.

## Purpose
Syncs Salesforce CRM with customer twins.

## Key Features
- Lead sync
- Opportunity tracking
- Account mapping
- Activity logging

## API Endpoints
- `GET /connect` - Test connection
- `POST /sync` - Trigger sync

## Startup
```bash
cd platform/connectors/salesforce-connector && npm run dev
```
