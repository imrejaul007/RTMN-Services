# TwinOS Hub

Central digital twin synchronization hub for RTMN - manages all digital twins across the platform.

## Overview

TwinOS Hub provides centralized management, synchronization, and monitoring of all digital twins in the RTMN ecosystem. It acts as the single source of truth for twin registry and state.

## Quick Start

```bash
cd services/twinos-hub
npm install
npm start
```

## Features

- **Twin Registry**: Track all digital twins across services
- **State Management**: Store and retrieve twin states
- **Synchronization**: Sync twins individually or in bulk
- **Relationship Mapping**: Define and query twin relationships
- **Health Monitoring**: Track twin health and status
- **Categories**: Organize twins by category (foundation, business, restaurant, hotel, etc.)
- **Export/Import**: Backup and restore hub state

## API Endpoints

### Twin Management
- `GET /api/twins` - List all twins
- `GET /api/twins/:id` - Get twin details
- `POST /api/twins` - Register new twin
- `PUT /api/twins/:id` - Update twin metadata
- `DELETE /api/twins/:id` - Unregister twin

### Twin State
- `GET /api/twins/:id/state` - Get twin state
- `PUT /api/twins/:id/state` - Update twin state

### Sync Operations
- `POST /api/sync/:id` - Sync single twin
- `POST /api/sync` - Bulk sync
- `POST /api/sync/category/:category` - Sync by category
- `GET /api/sync/history` - Sync history

### Relationships
- `GET /api/relationships` - Get all relationships
- `POST /api/relationships` - Link twins

### Hub Operations
- `GET /api/stats` - Hub statistics
- `GET /api/categories` - List categories
- `GET /api/services` - List services
- `GET /api/health/all` - Health check all twins
- `GET /api/export` - Export hub state
- `POST /api/import` - Import hub state

## Twin Categories

| Category | Description | Services |
|----------|-------------|----------|
| foundation | Core identity & memory | CorpID, MemoryOS |
| business | Business operations | Marketing, Finance, Commerce |
| restaurant | Restaurant industry | Restaurant OS |
| hotel | Hotel industry | Hotel OS |
| hospitality | Cross-industry | Hospitality OS |
| intelligence | AI & analytics | Knowledge Graph, BOA |

## Port

**4705** - TwinOS Hub Port

## Health Check

```bash
curl http://localhost:4705/health
```
