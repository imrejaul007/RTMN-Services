# Executive Assistant Service

Personal AI-powered assistant for HOJAI AI that helps with calendar, email, notes, reminders, and tasks.

## Features

### Calendar Management
- Schedule, reschedule, and cancel events
- Attendee management
- Availability checking
- Free/busy lookups
- Recurring events support

### Email Management
- Draft emails
- Send emails
- Reply and forward
- Email templates
- Folder management (inbox, drafts, sent, starred, archived)

### Notes
- Create and organize notes
- Rich text support
- Tags and folders
- Pin important notes
- Search functionality

### Reminders
- Set reminders with custom times
- Recurring reminders
- Snooze functionality
- Link to events, tasks, notes, emails

### Tasks
- Create tasks with priority
- Subtasks and checklists
- Assign team members
- Due dates and progress tracking
- Project organization

## Quick Start

```bash
# Install dependencies
npm install

# Run in development mode
npm run dev

# Run tests
npm test

# Build for production
npm run build
npm start
```

## API Endpoints

### Calendar
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/calendar/events | Create event |
| GET | /api/calendar/events | List events |
| GET | /api/calendar/events/:id | Get event |
| PATCH | /api/calendar/events/:id | Update event |
| DELETE | /api/calendar/events/:id | Cancel event |
| GET | /api/calendar/availability | Check availability |
| GET | /api/calendar/freebusy | Get free/busy |

### Email
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/emails/draft | Create draft |
| POST | /api/emails/send | Send email |
| GET | /api/emails | List emails |
| GET | /api/emails/:id | Get email |
| PATCH | /api/emails/:id | Update email |
| POST | /api/emails/:id/reply | Reply |
| POST | /api/emails/:id/forward | Forward |

### Notes
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/notes | Create note |
| GET | /api/notes | List notes |
| GET | /api/notes/:id | Get note |
| PATCH | /api/notes/:id | Update note |
| DELETE | /api/notes/:id | Delete note |
| POST | /api/notes/:id/pin | Pin note |
| POST | /api/notes/:id/archive | Archive note |

### Reminders
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/reminders | Create reminder |
| GET | /api/reminders | List reminders |
| GET | /api/reminders/:id | Get reminder |
| PATCH | /api/reminders/:id | Update reminder |
| DELETE | /api/reminders/:id | Delete reminder |
| POST | /api/reminders/:id/complete | Complete |
| POST | /api/reminders/:id/snooze | Snooze |

### Tasks
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/tasks | Create task |
| GET | /api/tasks | List tasks |
| GET | /api/tasks/:id | Get task |
| PATCH | /api/tasks/:id | Update task |
| DELETE | /api/tasks/:id | Delete task |
| POST | /api/tasks/:id/complete | Complete |
| POST | /api/tasks/:id/subtasks | Add subtask |
| POST | /api/tasks/:id/checklist | Add checklist |

## Headers

| Header | Required | Description |
|--------|----------|-------------|
| X-User-ID | Yes | User identifier |
| X-Tenant-ID | No | Tenant identifier (default: default) |
| X-User-Email | No | User email for email module |
| X-User-Name | No | User name for email module |
| X-Request-ID | No | Request tracking ID |

## Health Check

```bash
curl http://localhost:4755/health
```

## Architecture

```
ExecutiveAssistant
├── Calendar Module   - Event management
├── Email Module      - Email drafting & sending
├── Notes Module      - Note taking & organization
├── Reminders Module  - Reminder tracking
└── Tasks Module      - Task management
```

## Tech Stack

- Express.js
- TypeScript
- In-memory storage (mock implementation)
- Zod validation
- CORS & Helmet security

## Production Notes

For production deployment:
1. Replace in-memory storage with MongoDB/PostgreSQL
2. Add email service integration (SendGrid/SES/SMTP)
3. Set up reminder scheduler (Redis/Bull)
4. Add authentication middleware
5. Configure proper CORS origins
