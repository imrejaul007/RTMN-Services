# Zoom Connector

## Overview
Video conferencing integration for TwinOS.

## Purpose
Syncs Zoom meetings with calendar twins.

## Key Features
- Meeting sync
- Recording tracking
- Participant mapping
- Summary sync

## API Endpoints
- `GET /connect` - Test connection
- `POST /sync` - Trigger sync
- `POST /webhooks/zoom` - Webhook receiver

## Startup
```bash
cd platform/connectors/zoom-connector && npm run dev
```
