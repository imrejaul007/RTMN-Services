# Teams Connector

## Overview
Microsoft Teams integration for TwinOS.

## Purpose
Syncs Teams messages and meetings with communication twins.

## Key Features
- Message sync
- Meeting tracking
- Channel mapping
- Presence sync

## API Endpoints
- `GET /connect` - Test connection
- `POST /sync` - Trigger sync
- `POST /webhooks/teams` - Webhook receiver

## Startup
```bash
cd platform/connectors/teams-connector && npm run dev
```
