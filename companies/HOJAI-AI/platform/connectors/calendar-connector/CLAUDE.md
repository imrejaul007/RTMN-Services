# Calendar Connector

## Overview
Google Calendar, Outlook integration for TwinOS.

## Purpose
Syncs calendar events with employee twins.

## Key Features
- Event sync
- Meeting tracking
- Availability sync
- Multi-calendar support

## API Endpoints
- `GET /connect` - Test connection
- `POST /sync` - Trigger sync

## Startup
```bash
cd platform/connectors/calendar-connector && npm run dev
```
