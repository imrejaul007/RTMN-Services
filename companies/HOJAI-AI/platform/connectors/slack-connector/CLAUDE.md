# Slack Connector

## Overview
Team communication integration for TwinOS.

## Purpose
Syncs Slack messages with communication twins.

## Key Features
- Message sync
- Channel mapping
- Reaction tracking
- Thread sync

## API Endpoints
- `GET /connect` - Test connection
- `POST /sync` - Trigger sync
- `POST /webhooks/slack` - Webhook receiver

## Startup
```bash
cd platform/connectors/slack-connector && npm run dev
```
