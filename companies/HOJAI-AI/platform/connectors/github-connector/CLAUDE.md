# GitHub Connector

## Overview
Code repository integration for TwinOS.

## Purpose
Syncs code, PRs, and issues with employee twins.

## Key Features
- PR tracking
- Issue sync
- Code review mapping
- Commit history

## API Endpoints
- `GET /connect` - Test connection
- `POST /sync` - Trigger sync
- `GET /webhooks/github` - Webhook receiver

## Startup
```bash
cd platform/connectors/github-connector && npm run dev
```
