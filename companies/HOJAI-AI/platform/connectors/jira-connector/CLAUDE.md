# Jira Connector

## Overview
Issue tracking integration for TwinOS.

## Purpose
Syncs Jira issues with employee twins.

## Key Features
- Issue sync
- Sprint tracking
- Epic mapping
- Time tracking

## API Endpoints
- `GET /connect` - Test connection
- `POST /sync` - Trigger sync

## Startup
```bash
cd platform/connectors/jira-connector && npm run dev
```
