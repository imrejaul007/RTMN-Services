# PresenceOS - Port 4880

## Overview
Availability, timezone, status management.

## Purpose
Tracks user presence and availability across the organization.

## Key Features
- Status tracking
- Timezone awareness
- Working hours
- Availability checking
- Location tracking

## API Endpoints

### Users
- `GET /api/users` - List users
- `POST /api/users` - Add user
- `GET /api/users/:id` - Get user
- `PATCH /api/users/:id/status` - Update status

### Availability
- `GET /api/availability/:userId` - Check availability

## Status Types
- `online` - Available
- `away` - Away
- `busy` - Busy
- `dnd` - Do Not Disturb
- `offline` - Offline

## Tests
Vitest tests: `__tests__/presence-os.test.ts`

## Environment
- Port: 4880

## Startup
```bash
cd platform/sutar-os/core/presence-os && npm run dev
```
