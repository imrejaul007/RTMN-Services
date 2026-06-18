# Ticket Engine Service

**Port:** 4872  
**Status:** ✅ BUILT  
**Purpose:** Ticket lifecycle management

---

## Overview

Ticket Engine provides complete ticket lifecycle management:
- Ticket creation and tracking
- Status workflow (new → open → pending → resolved → closed)
- Priority levels
- SLA tracking
- Assignment and routing
- Comments and attachments
- Time tracking
- Tags and categories
- Escalation rules

## Features

- ✅ Ticket CRUD operations
- ✅ 8 Categories (Technical, Billing, Sales, Feature, Bug, etc.)
- ✅ 4 Priority levels (Low, Medium, High, Urgent)
- ✅ 3 SLA Policies (Standard, Premium, Enterprise)
- ✅ Comment system
- ✅ Time tracking
- ✅ Bulk operations
- ✅ SLA breach monitoring
- ✅ Statistics and analytics

## API Endpoints

### Tickets
- `GET /api/tickets` - List tickets (filters: status, priority, category, assignee, tags)
- `GET /api/tickets/:id` - Get ticket with comments
- `POST /api/tickets` - Create ticket
- `PATCH /api/tickets/:id` - Update ticket
- `POST /api/tickets/:id/assign` - Assign ticket
- `POST /api/tickets/:id/status` - Change status
- `POST /api/tickets/:id/tags` - Add tags
- `DELETE /api/tickets/:id` - Delete ticket

### Comments
- `GET /api/tickets/:id/comments` - Get comments
- `POST /api/tickets/:id/comments` - Add comment

### Time Tracking
- `POST /api/tickets/:id/time` - Log time

### Configuration
- `GET /api/categories` - List categories
- `GET /api/priorities` - List priorities
- `GET /api/sla-policies` - List SLA policies

### SLA
- `GET /api/tickets/sla/breached` - Get breached tickets
- `GET /api/tickets/sla/warnings` - Get at-risk tickets

### Bulk
- `POST /api/tickets/bulk` - Bulk operations

### Stats
- `GET /api/stats` - Get statistics

## Quick Start

```bash
cd services/ticket-engine
npm install
npm start
```

## Integration

- **Unified Inbox** - Links conversations to tickets
- **Customer Intelligence** - Links to customer profiles
- **SLA Manager** - SLA tracking
- **Agent Copilot** - AI assistance
