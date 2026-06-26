# Gmail Connector

## Overview
Email integration for TwinOS.

## Purpose
Syncs emails with communication twins.

## Key Features
- Email sync
- Attachment handling
- Thread grouping
- Label mapping

## API Endpoints
- `GET /connect` - Test connection
- `POST /sync` - Trigger sync
- `GET /webhooks/gmail` - Webhook receiver

## Startup
```bash
cd platform/connectors/gmail-connector && npm run dev
```
