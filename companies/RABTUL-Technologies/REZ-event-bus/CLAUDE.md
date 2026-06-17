# REZ-event-bus

**Service:** REZ Ecosystem Event Bus - Pub/Sub Messaging  
**Port:** 4510  
**Status:** ✅ RUNNING

## Overview

REZ-event-bus is the pub/sub event messaging hub for the RTMN ecosystem. It provides:
- Event publishing and subscribing
- Schema registry with 29 schemas
- Pattern-based subscriptions
- Event type management
- Real-time event delivery

## Quick Start

```bash
cd companies/RABTUL-Technologies/REZ-event-bus
npm install
npm start
```

## API Endpoints

### Events
- `POST /events` - Publish event
- `GET /events` - List events
- `GET /events/:id` - Get event by ID
- `GET /events/type/:type` - Get by event type

### Subscriptions
- `POST /subscriptions` - Create subscription
- `GET /subscriptions` - List subscriptions
- `DELETE /subscriptions/:id` - Delete subscription

### Schema Registry
- `GET /schemas` - List all schemas
- `GET /schemas/:name` - Get schema by name
- `POST /schemas` - Register new schema

### Event Types
- `GET /event-types` - List event types
- `GET /event-types/:type` - Get event type details

### Health
- `GET /health` - Health check
- `GET /health/ready` - Readiness check
- `GET /health/live` - Liveness check

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| PORT | 4510 | Service port |
| MONGODB_URI | mongodb://localhost:27017/event-bus | MongoDB connection |

## Current Status

| Metric | Value |
|--------|-------|
| Schemas | 29 |
| Subscriptions | 2 |
| Event Types | Multiple |

## Architecture

```
                    ┌─────────────────────┐
                    │   REZ-event-bus    │
                    │      (4510)        │
                    └──────────┬──────────┘
                               │
         ┌─────────────────────┼─────────────────────┐
         │                     │                     │
    ┌────▼────┐          ┌────▼────┐          ┌────▼────┐
    │Publish  │          │Subscribe│          │ Schema  │
    │Events   │          │Events   │          │Registry │
    └─────────┘          └─────────┘          └─────────┘
```

## Event Types

### Industry Events
- `restaurant.order.created`
- `restaurant.order.updated`
- `hotel.booking.created`
- `healthcare.appointment.scheduled`
- `retail.inventory.low`
- `legal.case.opened`
- `education.student.enrolled`

### Foundation Events
- `memory.created`
- `memory.updated`
- `goal.achieved`
- `agent.karma.earned`
- `trust.score.updated`

### System Events
- `service.registered`
- `service.heartbeat`
- `service.unregistered`