# RTMN Sync Integration Guide

**Version:** 1.0  
**Date:** June 18, 2026

---

## Overview

This guide shows how to integrate each OS with the **RTMN Sync Hub** so that when any product/service updates, all related OS automatically reflect those changes.

---

## Sync Hub Connection

**Sync Hub URL:** `http://localhost:4399`

---

## Integration for Each OS

### 1. Finance OS (Port 4801)

**Sync Points:**
- New invoice → Sync to Legal OS (contracts)
- New payment → Sync to Workforce OS (payroll)
- Budget update → Sync to Operations OS (projects)

**Integration:**

```javascript
// On invoice creation
POST http://localhost:4399/api/sync
{
  "source": "finance-os",
  "target": "legal-os",
  "type": "invoice",
  "data": {
    "invoiceId": "INV001",
    "amount": 50000,
    "client": "Acme Corp"
  }
}
```

---

### 2. Legal OS (Port 5035)

**Sync Points:**
- New contract → Sync to Finance OS (budget)
- Contract renewal → Sync to Operations OS (tasks)
- Compliance update → Sync to all OS

**Integration:**

```javascript
// On contract creation
POST http://localhost:4399/api/sync
{
  "source": "legal-os",
  "target": "finance-os",
  "type": "contract",
  "data": {
    "contractId": "CTR001",
    "value": 5000000,
    "client": "Acme Corp"
  }
}

// On contract creation - notify Operations
POST http://localhost:4399/api/sync
{
  "source": "legal-os",
  "target": "operations-os",
  "type": "contract",
  "data": {
    "contractId": "CTR001",
    "action": "create_project"
  }
}
```

---

### 3. Workforce OS (Port 5077)

**Sync Points:**
- New employee → Sync to Operations OS (team)
- Payroll run → Sync to Finance OS (journal entries)
- Leave request → Sync to Operations OS (calendar)

**Integration:**

```javascript
// On employee joining
POST http://localhost:4399/api/sync
{
  "source": "workforce-os",
  "target": "operations-os",
  "type": "employee",
  "data": {
    "employeeId": "EMP001",
    "name": "John Doe",
    "department": "Engineering"
  }
}

// On payroll run
POST http://localhost:4399/api/sync
{
  "source": "workforce-os",
  "target": "finance-os",
  "type": "payroll",
  "data": {
    "month": "2026-06",
    "totalAmount": 5000000,
    "employees": 50
  }
}
```

---

### 4. Sales OS (Port 5055)

**Sync Points:**
- Deal won → Sync to Operations OS (project creation)
- Deal won → Sync to Finance OS (revenue)
- New lead → Sync to Marketing OS (campaign)

**Integration:**

```javascript
// On deal won
POST http://localhost:4399/api/sync
{
  "source": "sales-os",
  "target": "operations-os",
  "type": "deal_won",
  "data": {
    "dealId": "DEAL001",
    "value": 5000000,
    "client": "Acme Corp",
    "action": "create_project"
  }
}

// Notify Finance
POST http://localhost:4399/api/sync
{
  "source": "sales-os",
  "target": "finance-os",
  "type": "deal_won",
  "data": {
    "dealId": "DEAL001",
    "revenue": 5000000,
    "client": "Acme Corp"
  }
}
```

---

### 5. Operations OS (Port 5250)

**Sync Points:**
- Project completed → Sync to Finance OS (billing)
- Incident created → Sync to relevant OS
- Task completed → Update related systems

**Integration:**

```javascript
// On project completion
POST http://localhost:4399/api/sync
{
  "source": "operations-os",
  "target": "finance-os",
  "type": "project_complete",
  "data": {
    "projectId": "PRJ001",
    "billing": 5000000
  }
}

// On incident
POST http://localhost:4399/api/sync
{
  "source": "operations-os",
  "target": "relevant-os",
  "type": "incident",
  "data": {
    "incidentId": "INC001",
    "severity": "high"
  }
}
```

---

## Event-Based Sync

### Subscribe to Events

```javascript
// Subscribe Operations OS to Sales events
POST http://localhost:4399/api/subscriptions
{
  "subscriber": "operations-os",
  "service": "sales-os",
  "events": ["deal_won", "lead_created"]
}
```

### Event Types

| Event | Source | Targets |
|-------|--------|---------|
| `deal_won` | Sales OS | Operations, Finance, Legal |
| `invoice_created` | Finance OS | Legal, Operations |
| `contract_signed` | Legal OS | Finance, Operations |
| `employee_joined` | Workforce OS | Operations, Finance |
| `project_completed` | Operations OS | Finance, Sales |

---

## Feature Sync

### Register Features

```javascript
// Finance OS registers new feature
POST http://localhost:4399/api/features
{
  "service": "finance-os",
  "name": "GST Auto-Filing",
  "category": "tax",
  "status": "active"
}
```

### Other OS can query features

```javascript
// Get all features from Finance OS
GET http://localhost:4399/api/features?service=finance-os
```

---

## Health Monitoring

### Each OS reports health

```javascript
// Periodic health check
POST http://localhost:4399/api/health/finance-os
{
  "health": "healthy",
  "message": "All modules operational"
}
```

### Dashboard subscribes to health events

```javascript
// SSE stream
GET http://localhost:4399/api/events/stream

// Events received:
// - SERVICE_HEALTHY
// - SERVICE_UNHEALTHY
```

---

## Version Tracking

### Each OS registers version

```javascript
// Finance OS on startup
POST http://localhost:4399/api/registry
{
  "id": "finance-os",
  "name": "Finance OS",
  "port": 4801,
  "version": "1.0.0",
  "modules": ["accounting", "ar", "ap"],
  "features": ["24-industry", "gst"]
}
```

### Check for updates

```javascript
// Get version changes
GET http://localhost:4399/api/versions/changes?since=2026-06-17
```

---

## Webhook Integration

### Register external webhooks

```javascript
// Notify external CRM
POST http://localhost:4399/api/webhooks
{
  "url": "https://external-crm.com/webhook",
  "events": ["deal_won", "contract_signed"]
}
```

---

## Implementation Checklist

### For Each OS:

- [ ] Register with Sync Hub on startup
- [ ] Emit events on data changes
- [ ] Subscribe to relevant events
- [ ] Handle incoming sync requests
- [ ] Report health periodically
- [ ] Update feature registry on changes

---

## Code Example - OS Integration

```javascript
// Example: legal-os integration with Sync Hub

class SyncClient {
  constructor(syncHubUrl) {
    this.url = syncHubUrl;
  }

  async register(service) {
    await fetch(`${this.url}/api/registry`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(service)
    });
  }

  async sync(source, target, type, data) {
    await fetch(`${this.url}/api/sync`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ source, target, type, data })
    });
  }

  async updateFeature(feature) {
    await fetch(`${this.url}/api/features`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(feature)
    });
  }

  async updateHealth(health, message) {
    await fetch(`${this.url}/api/health/${this.serviceId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ health, message })
    });
  }
}

// Usage
const sync = new SyncClient('http://localhost:4399');

// Register service
await sync.register({
  id: 'legal-os',
  port: 5035,
  version: '1.0.0'
});

// On contract created
await sync.sync('legal-os', 'finance-os', 'contract', {
  contractId: 'CTR001',
  value: 5000000
});

// Update feature
await sync.updateFeature({
  service: 'legal-os',
  name: 'Digital Signature',
  status: 'active'
});

// Health check
await sync.updateHealth('healthy', 'All systems operational');
```

---

## Testing

```bash
# Start Sync Hub
cd industry-os/services/rtmn-sync-hub && npm start

# Check registry
curl http://localhost:4399/api/registry

# Trigger sync
curl -X POST http://localhost:4399/api/sync \
  -H "Content-Type: application/json" \
  -d '{"source":"legal-os","target":"finance-os","type":"contract","data":{"id":"TEST001"}}'

# Check sync log
curl http://localhost:4399/api/sync/log
```

---

## Benefits

| Benefit | Description |
|---------|-------------|
| **Real-time** | Changes sync instantly |
| **Automatic** | No manual copy-paste |
| **Traceable** | Full sync history |
| **Observable** | Health monitoring |
| **Versioned** | Track what changed |

---

*Last Updated: June 18, 2026*
