# Event Bus - Message Broker

**Version:** 1.0.0  
**Port:** 4751  
**Status:** ✅ RUNNING | **June 18, 2026**

---

## Overview

Event Bus is the **message broker** for the RTMN ecosystem, enabling asynchronous communication between services.

---

## Architecture

```
services/event-bus/
├── src/
│   └── index.js              # Event bus API
├── package.json
└── CLAUDE.md
```

---

## Features

| Feature | Description |
|---------|-------------|
| Event Publishing | Publish events to topics |
| Event Subscription | Subscribe to event topics |
| Event Routing | Route events to subscribers |
| Message Queue | Async message processing |

---

## API Endpoints

```
POST /api/events           # Publish event
GET  /api/events          # List events
GET  /api/events/:id      # Get event
GET  /api/topics          # List topics
POST /api/subscribe       # Subscribe to topic
GET  /health              # Health check
```

---

## Quick Start

```bash
cd companies/HOJAI-AI/services/event-bus
npm install
npm start

curl http://localhost:4751/health
```

---

*Last Updated: June 18, 2026*
