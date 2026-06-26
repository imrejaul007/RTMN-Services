# CalendarOS - Port 4875

## Overview
Smart scheduling, briefing preparation, conflict resolution.

## Purpose
Intelligent calendar management with AI-powered scheduling.

## Key Features
- Smart meeting scheduling
- Conflict detection
- Daily briefing generation
- Meeting preparation notes
- Timezone awareness
- Focus time protection

## API Endpoints

### Calendars
- `GET /api/calendars` - List calendars
- `POST /api/calendars` - Create calendar
- `PATCH /api/calendars/:id` - Update calendar

### Events
- `GET /api/events` - List events
- `POST /api/events` - Create event
- `GET /api/events/:id` - Get event
- `PATCH /api/events/:id` - Update event
- `DELETE /api/events/:id` - Cancel event
- `POST /api/events/:id/briefing` - Generate briefing

### Scheduling
- `POST /api/schedule` - Smart schedule meeting

### Availability
- `GET /api/availability/:userId` - Check availability

### Time Blocks
- `GET /api/time-blocks` - List blocks
- `POST /api/time-blocks` - Create block
- `DELETE /api/time-blocks/:id` - Delete block

### Briefings
- `GET /api/briefings/daily/:userId` - Daily briefing

### Conflicts
- `POST /api/conflicts/check` - Check conflicts

## Tests
Vitest tests: `__tests__/calendar-os.test.ts`

## Environment
- Port: 4875

## Startup
```bash
cd platform/sutar-os/core/calendar-os && npm run dev
```
