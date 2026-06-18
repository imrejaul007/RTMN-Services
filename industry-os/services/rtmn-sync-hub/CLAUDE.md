# RTMN Sync Hub v1.0

**Port:** 4399  
**Status:** ✅ **NEW**  
**Updated:** June 18, 2026

---

## Overview

**RTMN Sync Hub** is the **Real-Time Synchronization System** that ensures when any product/service updates, all related OS automatically reflect those changes.

> **"One change anywhere, syncs everywhere."**

---

## Problem It Solves

| Before | After |
|--------|-------|
| Product updates, OS doesn't know | ✅ OS auto-updates on product change |
| Version conflicts | ✅ Version tracking |
| Manual sync | ✅ Real-time sync |
| Unknown service health | ✅ Auto health monitoring |
| Feature drift | ✅ Centralized feature registry |

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         RTMN SYNC HUB (4399)                           │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐        │
│  │   Service       │  │   Event Bus    │  │   Webhook      │        │
│  │   Registry     │  │   (Pub/Sub)    │  │   System       │        │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘        │
│                                                                         │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐        │
│  │   Version      │  │   Sync Engine  │  │   Feature      │        │
│  │   Tracker      │  │   (Auto-sync)  │  │   Registry     │        │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘        │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
          │                  │                  │
          ▼                  ▼                  ▼
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Finance   │     │  Workforce  │     │   Sales     │
│     OS      │     │     OS      │     │     OS      │
└─────────────┘     └─────────────┘     └─────────────┘
```

---

## Features

### 1. Service Registry

Track all services, their versions, modules, and features.

```javascript
// Auto-populated with all RTMN services
{
  id: 'finance-os',
  name: 'Finance OS',
  port: 4801,
  version: '1.0.0',
  modules: ['accounting', 'ar', 'ap'],
  features: ['24-industry-integration'],
  health: 'healthy',
}
```

### 2. Event Bus (Real-time Pub/Sub)

Get instant notifications when anything changes.

```javascript
// Subscribe to events
GET /api/events/stream

// Events:
// - service:registered
// - service:updated
// - service:healthy
// - service:unhealthy
// - data:sync
// - feature:updated
```

### 3. Webhook System

Notify external systems on changes.

```javascript
// Register webhook
POST /api/webhooks
{
  "url": "https://external-system.com/webhook",
  "events": ["service:updated", "feature:updated"]
}
```

### 4. Version Tracker

Know exactly what's running where.

```javascript
GET /api/versions

// Response:
{
  "versions": [
    { "id": "finance-os", "version": "1.0.0" },
    { "id": "operations-os", "version": "2.1.0" }
  ]
}
```

### 5. Sync Engine

Auto-sync data between services.

```javascript
POST /api/sync
{
  "source": "lawgens",
  "target": "legal-os",
  "data": { "contracts": [...] },
  "type": "full"
}
```

### 6. Feature Registry

Track features across all services.

```javascript
POST /api/features
{
  "service": "finance-os",
  "name": "New Invoice Feature",
  "category": "billing",
  "status": "active"
}
```

---

## How It Works

### 1. Service Registration

```javascript
// When a service starts, it registers itself
POST /api/registry
{
  "id": "new-service",
  "name": "New Service",
  "port": 5000,
  "version": "1.0.0",
  "modules": ["module1", "module2"],
  "features": ["feature1"]
}
```

### 2. Event Emission

```javascript
// When a feature updates
POST /api/features
// → Emits "feature:updated" event
// → All subscribers get notified
// → Webhooks triggered
// → Sync initiated
```

### 3. Real-time Updates

```javascript
// Frontend subscribes to SSE stream
GET /api/events/stream

// Receives real-time updates:
{
  "event": "FEATURE_UPDATED",
  "data": { "feature": "invoice-automation" },
  "timestamp": "2026-06-18T12:00:00Z"
}
```

### 4. Auto-Sync

```javascript
// When legal-os updates a contract
POST /api/sync
{
  "source": "legal-os",
  "target": "finance-os",
  "data": { "newContract": true }
}
// → Finance OS gets notified
// → Updates its records
```

---

## API Endpoints

### Service Registry

```bash
GET  /api/registry                    # List all services
GET  /api/registry/:id               # Service details
POST /api/registry                    # Register service
PATCH /api/registry/:id               # Update service
```

### Health Monitoring

```bash
GET  /api/health                      # All services health
POST /api/health/:id                 # Update service health
```

### Version Tracking

```bash
GET  /api/versions                   # All versions
GET  /api/versions/changes           # Recent changes
```

### Events

```bash
GET  /api/events/stream             # SSE stream
GET  /api/events/types              # Event types
```

### Data Sync

```bash
POST /api/sync                      # Trigger sync
GET  /api/sync/log                  # Sync history
```

### Webhooks

```bash
POST /api/webhooks                  # Register webhook
GET  /api/webhooks                  # List webhooks
DELETE /api/webhooks/:id             # Remove webhook
```

### Features

```bash
GET  /api/features                  # All features
POST /api/features                  # Add feature
PATCH /api/features/:id             # Update feature
```

### Subscriptions

```bash
POST /api/subscriptions             # Subscribe to events
GET  /api/subscriptions             # List subscriptions
```

---

## Integration with Other OS

### Each OS registers with Sync Hub on startup:

```javascript
// legal-os startup
POST http://localhost:4399/api/registry
{
  "id": "legal-os",
  "port": 5035,
  "version": "1.0.0",
  "modules": ["contracts", "compliance", "documents"],
  "features": ["digital-twin", "ai-assistant"]
}
```

### Each OS updates Sync Hub on feature change:

```javascript
// When legal-os adds a new feature
POST http://localhost:4399/api/features
{
  "service": "legal-os",
  "name": "Auto Contract Review",
  "category": "ai",
  "status": "active"
}
// → Emits "feature:updated" event
// → All subscribers notified
```

### Dashboard subscribes to changes:

```javascript
// Frontend SSE connection
GET http://localhost:4399/api/events/stream

// Receives:
{
  "event": "SERVICE_UPDATED",
  "data": {
    "service": "legal-os",
    "changes": ["new-feature-added"]
  }
}
```

---

## Event Types

| Event | Description | Trigger |
|-------|-------------|---------|
| `service:registered` | New service registered | New service starts |
| `service:updated` | Service config changed | Service config update |
| `service:healthy` | Health check passed | Periodic health check |
| `service:unhealthy` | Health check failed | Periodic health check |
| `data:sync` | Data synchronized | Sync completed |
| `feature:updated` | Feature changed | Feature added/updated/removed |
| `webhook:received` | Webhook received | External webhook |

---

## Quick Test

```bash
# Health
curl http://localhost:4399/health

# Registry
curl http://localhost:4399/api/registry

# Health Status
curl http://localhost:4399/api/health

# Versions
curl http://localhost:4399/api/versions

# Features
curl http://localhost:4399/api/features

# Trigger Sync
curl -X POST http://localhost:4399/api/sync \
  -H "Content-Type: application/json" \
  -d '{"source": "legal-os", "target": "finance-os", "type": "full"}'
```

---

## Start Service

```bash
cd industry-os/services/rtmn-sync-hub
npm start
# Port: 4399
```

---

## Benefits

| Benefit | Description |
|---------|-------------|
| **Real-time Sync** | Changes reflect instantly |
| **Version Tracking** | Know exactly what's running |
| **Auto Health** | Monitor all services |
| **Feature Registry** | Centralized feature tracking |
| **Webhook Support** | Notify external systems |
| **SSE Updates** | Real-time frontend updates |

---

## Comparison

| Feature | Manual | **Sync Hub** |
|---------|--------|--------------|
| Track versions | Spreadsheet | ✅ Auto |
| Sync data | Copy-paste | ✅ Auto |
| Health monitoring | Manual checks | ✅ Auto |
| Feature updates | Email/chat | ✅ Real-time |
| Notifications |分散 | ✅ Centralized |

---

## Future Enhancements

- [ ] MongoDB persistence
- [ ] Kafka integration for scale
- [ ] GraphQL subscriptions
- [ ] Admin dashboard
- [ ] SLA monitoring
- [ ] Cost tracking per service

---

*Last Updated: June 18, 2026*
