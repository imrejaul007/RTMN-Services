# REZ Support Dashboard UI - SPEC.md

**Version:** 1.0.0
**Port:** (see config)
**Company:** RTNM-Group
**Category:** Support

---

## Overview

Next.js-based support dashboard UI for the unified support system. Provides agents with real-time ticket management, customer context, and performance analytics.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                   REZ Support Dashboard UI                                 │
├─────────────────────────────────────────────────────────────────────────────┤
│  Pages:                                                                    │
│  ├── Dashboard     → Overview and metrics                                 │
│  ├── Tickets      → Ticket list and management                          │
│  ├── Customers    → Customer search and details                         │
│  └── Analytics    → Performance and CSAT reports                        │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Features

### Core Features
- Real-time ticket updates via WebSocket
- Customer 360 context panel
- Quick actions and shortcuts
- Ticket filtering and search
- Agent performance metrics

### State Management
- Zustand store for global state
- Socket.IO for real-time updates

---

## API Integration

| Service | Purpose |
|---------|---------|
| rez-support-dashboard | Ticket data |
| rez-auth-service | Agent authentication |
| rez-care-command-center | Customer 360 |

---

## Dependencies

```json
{
  "next": "14.0.4",
  "react": "^18.2.0",
  "react-dom": "^18.2.0",
  "zustand": "^4.4.7",
  "socket.io-client": "^4.7.2",
  "lucide-react": "^0.294.0",
  "clsx": "^2.0.0",
  "date-fns": "^2.30.0"
}
```

---

## Status

- [x] Dashboard page
- [x] Ticket management
- [x] Real-time updates
- [x] Customer search
- [x] Analytics view

