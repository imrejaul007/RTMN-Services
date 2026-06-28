# Presence OS

User presence, availability management, timezone handling, and meeting coordination.

**Port:** 4880

## Purpose

Presence OS tracks user availability and presence across the organization. It provides real-time status updates, availability windows, meeting coordination, and timezone-aware scheduling support.

## Features

- Real-time user presence tracking
- Multiple status types (online, away, busy, DND, offline)
- Status messages and emoji
- Timezone-aware availability
- Working hours configuration
- Meeting management
- Meeting attendance tracking
- Status history and audit trail
- Bulk presence updates
- Status suggestions

## API Endpoints

### Users

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/users` | List users |
| GET | `/api/users/:userId` | Get user details |
| POST | `/api/users` | Register user |
| PATCH | `/api/users/:userId` | Update user |
| DELETE | `/api/users/:userId` | Remove user |

### Status

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/update` | Update presence status |
| POST | `/api/bulk-update` | Bulk status update |

### History

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/history/:userId` | Get status history |

### Meetings

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/meetings` | List meetings |
| GET | `/api/meeting` | Get active meetings |
| POST | `/api/meetings` | Create meeting |
| POST | `/api/meetings/:id/start` | Start meeting |
| POST | `/api/meetings/:id/end` | End meeting |

### Availability

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/availability/:userId` | Get availability |
| POST | `/api/availability` | Set availability |

### Suggestions

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/suggestions/:userId` | Get status suggestions |

### Stats

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/stats` | Get statistics |

## Status Types

| Status | Description |
|--------|-------------|
| `online` | Available and active |
| `away` | Temporarily away |
| `busy` | Busy, limited availability |
| `dnd` | Do not disturb |
| `offline` | Not signed in |

## Request/Response Examples

### Update Presence

```bash
curl -X POST http://localhost:4880/api/update \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer <token>' \
  -d '{
    "userId": "alice-123",
    "status": "busy",
    "statusMessage": "In quarterly review",
    "statusEmoji": ":calendar:",
    "inMeeting": true
  }'
```

### Bulk Update

```bash
curl -X POST http://localhost:4880/api/bulk-update \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer <token>' \
  -d '{
    "updates": [
      { "userId": "alice-123", "status": "offline" },
      { "userId": "bob-456", "status": "away" }
    ]
  }'
```

### Create Meeting

```bash
curl -X POST http://localhost:4880/api/meetings \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer <token>' \
  -d '{
    "title": "Sprint Planning",
    "participants": ["alice-123", "bob-456", "carol-789"],
    "startTime": "2024-11-15T10:00:00Z",
    "endTime": "2024-11-15T11:00:00Z"
  }'
```

### Check Availability

```bash
curl "http://localhost:4880/api/availability/alice-123?date=2024-11-15"
```

## Default Seed Users

| ID | Name | Status | Timezone |
|----|------|--------|----------|
| u1 | Alice Engineer | online | America/New_York |
| u2 | Bob Designer | busy | Europe/London |
| u3 | Carol Manager | away | Asia/Tokyo |
| u4 | David Developer | dnd | America/Los_Angeles |
| u5 | Eve QA | offline | Europe/Berlin |

## Working Hours

Configure per-user working hours:
- `start`: Start time (HH:mm)
- `end`: End time (HH:mm)
- `days`: Array of day numbers (0=Sunday, 1=Monday, etc.)

## Meeting Statuses

| Status | Description |
|--------|-------------|
| `scheduled` | Upcoming meeting |
| `active` | Currently in progress |
| `ended` | Completed meeting |

## Availability Check

Availability considers:
- Current status (must be online)
- In-meeting flag (must be false)
- Current time within working hours
- Current day is a working day

## Status Suggestions

Automatic suggestions based on:
- Time of day (before/after work hours)
- Meeting attendance
- Current meeting title

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | 4880 | Service port |
| `JWT_SECRET` | - | JWT secret for authentication |

## Dependencies

- `@rtmn/shared` - Shared utilities
- `express` - HTTP framework
- `helmet` - Security headers
- `cors` - CORS support
- `zod` - Schema validation
- `uuid` - ID generation

## Commands

```bash
npm install        # Install dependencies
npm start          # Start the service
npm test           # Run tests
```

## History Retention

- Maximum 10,000 events per session
- Automatic cleanup of oldest events when limit exceeded
