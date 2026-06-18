# Sales Sync Service - Bidirectional Synchronization

**Version:** 1.0.0  
**Port:** 5182  
**Status:** Active Development

---

## Overview

The Sales Sync Service provides bidirectional synchronization between all sales systems in the RTMN ecosystem:

- **SalesMind** - Lead management and CRM
- **Sales OS** - Opportunity and pipeline management
- **Customer Ops** - Customer relationship management
- **BrandPulse** - Sales analytics and reporting

---

## Features

### Real-Time Synchronization
- Event-driven sync via internal event bus
- Webhook endpoints for external triggers
- Periodic batch sync for consistency
- Queue-based processing for reliability

### Conflict Resolution
- Multiple strategies: last-write-wins, source-wins, target-wins, smart-merge, manual
- Field-level merge logic with priorities
- Manual resolution queue for critical conflicts
- Full conflict audit trail

### Audit Logging
- Complete sync activity tracking
- Before/after state snapshots
- Performance metrics
- Time-series data for dashboards

---

## API Endpoints

### Health & Status
```
GET  /health              - Service health check
GET  /api/sync/status    - Synchronizer status
GET  /api/audit/logs     - Audit log entries
GET  /api/audit/stats    - Audit statistics
```

### Sync Control
```
POST /api/sync/trigger    - Trigger manual sync
POST /api/sync/pause     - Pause synchronization
POST /api/sync/resume     - Resume synchronization
```

### SalesMind Integration
```
GET  /api/salesmind/health           - Integration health
GET  /api/salesmind/leads            - Get all leads
GET  /api/salesmind/leads/:id        - Get single lead
POST /api/salesmind/leads            - Create lead
PUT  /api/salesmind/leads/:id        - Update lead
DELETE /api/salesmind/leads/:id      - Delete lead
POST /api/salesmind/sync             - Trigger sync
POST /api/salesmind/webhook          - Inbound webhook
```

### Sales OS Integration
```
GET  /api/salesos/health             - Integration health
GET  /api/salesos/opportunities      - Get all opportunities
GET  /api/salesos/opportunities/:id  - Get single opportunity
POST /api/salesos/opportunities      - Create opportunity
PUT  /api/salesos/opportunities/:id  - Update opportunity
DELETE /api/salesos/opportunities/:id - Delete opportunity
GET  /api/salesos/pipeline           - Get sales pipeline
GET  /api/salesos/analytics          - Get sales analytics
POST /api/salesos/sync               - Trigger sync
POST /api/salesos/webhook            - Inbound webhook
```

### Customer Ops Integration
```
GET  /api/customerops/health         - Integration health
GET  /api/customerops/customers      - Get all customers
GET  /api/customerops/customers/:id - Get single customer
POST /api/customerops/customers      - Create customer
PUT  /api/customerops/customers/:id - Update customer
DELETE /api/customerops/customers/:id - Delete customer
GET  /api/customerops/customers/:id/activities - Customer activities
GET  /api/customerops/customers/:id/tickets    - Support tickets
POST /api/customerops/sync           - Trigger sync
POST /api/customerops/webhook        - Inbound webhook
```

### BrandPulse Integration
```
GET  /api/brandpulse/health          - Integration health
GET  /api/brandpulse/sales           - Get all sales
GET  /api/brandpulse/sales/:id       - Get single sale
POST /api/brandpulse/sales           - Create sale
PUT  /api/brandpulse/sales/:id       - Update sale
DELETE /api/brandpulse/sales/:id     - Delete sale
GET  /api/brandpulse/analytics       - Brand analytics
GET  /api/brandpulse/campaigns      - Campaign performance
GET  /api/brandpulse/reports/revenue - Revenue reports
POST /api/brandpulse/sync            - Trigger sync
POST /api/brandpulse/webhook         - Inbound webhook
```

---

## Configuration

### Environment Variables

```env
# Service
PORT=5182
NODE_ENV=development
LOG_LEVEL=info

# SalesMind
SALESMIND_API_URL=http://localhost:4250
SALESMIND_API_KEY=your_key

# Sales OS
SALESOS_API_URL=http://localhost:5055
SALESOS_API_KEY=your_key

# Customer Ops
CUSTOMEROPS_API_URL=http://localhost:4780
CUSTOMEROPS_API_KEY=your_key

# BrandPulse
BRANDPULSE_API_URL=http://localhost:5057
BRANDPULSE_API_KEY=your_key

# Event Bus
EVENT_BUS_URL=http://localhost:4510
EVENT_BUS_TOKEN=your_token

# Sync Settings
SYNC_INTERVAL_MS=30000
CONFLICT_STRATEGY=last-write-wins
MAX_RETRY_ATTEMPTS=3
BATCH_SIZE=100

# Audit
AUDIT_RETENTION_DAYS=90
```

---

## Conflict Resolution Strategies

| Strategy | Description | Use Case |
|----------|-------------|----------|
| `last-write-wins` | Uses data with latest timestamp | Default, high-volume sync |
| `source-wins` | Always uses source data | Source is authoritative |
| `target-wins` | Always uses target data | Target is authoritative |
| `smart-merge` | Field-level intelligent merge | Balanced data preservation |
| `manual` | Queues for human resolution | Critical data requiring review |

### Smart Merge Field Priorities

**Lead:**
1. `email` - Source wins (authoritative identifier)
2. `name`, `phone` - Merge (combine information)
3. `status` - Source wins (ownership)
4. `company`, `value` - Latest wins

**Opportunity:**
1. `stage` - Source wins (current state)
2. `value`, `probability` - Latest wins

**Customer:**
1. `email` - Source wins
2. `name`, `phone` - Merge
3. `address` - Latest wins

---

## Data Flow

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│  SalesMind   │────▶│              │────▶│   Sales OS   │
│   (Leads)    │◀────│  Sales Sync  │◀────│ (Opportunity)│
└──────────────┘     │              │     └──────────────┘
                     │  ┌─────────┐ │
┌──────────────┐     │  │Conflict │ │
│ Customer Ops │────▶│  │Resolver │ │
│ (Customers)  │◀────│  └─────────┘ │
└──────────────┘     │              │     ┌──────────────┐
                     │  ┌─────────┐ │────▶│  BrandPulse  │
                     │  │ Audit   │ │◀────│   (Sales)    │
                     │  │  Log    │ │     └──────────────┘
                     │  └─────────┘ │
                     └──────────────┘
```

---

## Quick Start

```bash
# Install dependencies
cd services/sales-sync
npm install

# Copy environment file
cp .env.example .env
# Edit .env with your configuration

# Build TypeScript
npm run build

# Start service
npm start

# Development mode
npm run dev
```

---

## Service Status

```bash
curl http://localhost:5182/health
```

Response:
```json
{
  "status": "healthy",
  "service": "sales-sync",
  "version": "1.0.0",
  "port": 5182,
  "syncStatus": {
    "isRunning": true,
    "isPaused": false,
    "queueLength": 0
  }
}
```

---

## Monitoring

### Sync Status
```bash
curl http://localhost:5182/api/sync/status
```

### Audit Logs
```bash
# Get recent logs
curl http://localhost:5182/api/audit/logs?limit=50

# Get by source
curl "http://localhost:5182/api/audit/logs?source=salesmind"

# Get failures
curl "http://localhost:5182/api/audit/logs?status=failure"
```

### Audit Stats
```bash
curl http://localhost:5182/api/audit/stats
```

---

## Architecture

### Synchronizer
- Event queue for incoming changes
- Periodic sync for consistency
- Target-specific data transformations
- Retry logic with exponential backoff

### Conflict Resolver
- Detection of conflicting fields
- Strategy-based resolution
- Manual resolution queue
- Field priority metadata

### Audit Log
- Immutable event stream
- State snapshots (before/after)
- Performance tracking
- Time-series metrics

---

## Integration with Event Bus

The service can integrate with the REZ Event Bus for distributed sync:

```typescript
// Subscribe to sales events
eventBus.subscribe('sales.*', async (event) => {
  await synchronizer.queueEvent({
    id: event.id,
    type: event.type,
    source: mapSource(event.source),
    target: 'all',
    entityType: event.entityType,
    entityId: event.entityId,
    timestamp: new Date(),
    data: event.data
  });
});
```

---

## Error Handling

All API errors return consistent format:
```json
{
  "error": "Error message",
  "code": "ERROR_CODE"
}
```

Common error codes:
- `SYNC_FAILED` - Synchronization failed
- `CONFLICT_UNRESOLVED` - Conflict requires manual resolution
- `TARGET_UNAVAILABLE` - Target system unreachable
- `INVALID_DATA` - Data validation failed

---

*Last Updated: June 2026*
