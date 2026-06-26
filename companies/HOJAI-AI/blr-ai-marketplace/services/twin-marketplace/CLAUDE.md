# Twin Marketplace

## Overview
Marketplace for digital twins.

## Purpose
Buy and sell digital twin configurations.

## Key Features
- Twin listings
- Configuration sharing
- Versioning
- Installation

## API Endpoints
- `GET /api/marketplace` - Browse twins
- `POST /api/marketplace` - List twin
- `GET /api/marketplace/:id` - Get twin
- `POST /api/marketplace/:id/install` - Install twin

## Startup
```bash
cd blr-ai-marketplace/services/twin-marketplace && npm run dev
```
