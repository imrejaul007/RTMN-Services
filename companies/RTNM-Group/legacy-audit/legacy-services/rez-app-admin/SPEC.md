# REZ App Admin - SPEC.md

**Version:** 1.0.0
**Port:** 8083
**Company:** RTNM-Group
**Category:** Admin

---

## Overview

Mobile admin application for managing REZ platform operations. Enables administrators to monitor services, manage users, and handle support tickets from mobile devices.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        REZ App Admin                                       │
├─────────────────────────────────────────────────────────────────────────────┤
│  Components:                                                                │
│  ├── Dashboard View   → Service health overview                          │
│  ├── User Management → Mobile user administration                        │
│  ├── Support Handler  → Ticket management                                │
│  └── Notifications   → Push notification handling                        │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Features

### Core Features
- Real-time service health monitoring
- User search and management
- Support ticket handling
- Push notifications
- Offline capability

### Screens
| Screen | Purpose |
|--------|---------|
| Dashboard | Service overview and metrics |
| Users | User search and management |
| Tickets | Support ticket queue |
| Settings | Admin preferences |

---

## Dependencies

```json
{
  "expo": "~53.0.26",
  "react": "^19.0.0",
  "react-native": "0.79.5",
  "@react-navigation/native": "^7.1.17",
  "@tanstack/react-query": "^5.85.3",
  "axios": "^1.15.0",
  "socket.io-client": "^4.8.1",
  "zod": "^4.1.12"
}
```

---

## Status

- [x] Service monitoring
- [x] User management
- [x] Support tickets
- [x] Push notifications
- [x] Offline support

