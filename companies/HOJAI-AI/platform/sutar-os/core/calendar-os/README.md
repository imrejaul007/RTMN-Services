# Calendar OS

## Purpose
Events, scheduling, availability management, and calendar integrations for team collaboration.

## Port
4875

## Features
- Event CRUD with full details (title, description, location, attendees)
- Conflict detection for overlapping time ranges
- Availability slot calculation for multiple attendees
- Calendar management (work, personal, custom)
- Event filtering by date range, attendee, visibility
- Statistics aggregation
- Public/private event visibility
- All-day event support
- Event reminders
- Event attachments

## Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | /health | Health check |
| GET | /ready | Readiness check |
| GET | /api/events | List events with filters |
| GET | /api/events/:id | Get event details |
| POST | /api/events | Create event |
| PUT | /api/events/:id | Update event |
| DELETE | /api/events/:id | Delete event |
| GET | /api/conflicts | Check for conflicts (query: userId, start, end) |
| POST | /api/availability | Find available slots |
| GET | /api/calendars | List calendars |
| POST | /api/calendars | Create calendar |
| GET | /api/stats | Get calendar statistics |

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| PORT | 4875 | Service port |

## Commands

```bash
npm run dev        # Development with hot reload
npm start          # Production
npm test           # Run tests
npm run test:watch # Watch mode
```

## Query Parameters

### GET /api/events
- `from` - Start date filter (ISO 8601)
- `to` - End date filter (ISO 8601)
- `attendee` - Filter by attendee ID
- `visibility` - Filter by 'public' or 'private'

### GET /api/conflicts
- `userId` - User to check conflicts for
- `start` - Time range start
- `end` - Time range end

### POST /api/availability
- `attendees` - Array of attendee IDs
- `duration` - Meeting duration in minutes
- `startDate` - Start of search range
- `endDate` - End of search range

## Conflict Detection

Two events conflict if:
```
event.start < newEnd AND event.end > newStart
```

This detects partial overlaps on both sides.

## Availability Algorithm

1. Generate hourly slots in date range
2. For each slot, check if any attendee has a conflicting event
3. Return first 10 available slots that fit the duration