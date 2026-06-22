# HOJAI Meeting Intelligence

> **HOJAI AI** | Company: hojai-ai  
> **Port:** 4700 | **Status:** ✅ **BUILT** (June 13, 2026)

## Overview

**HOJAI Meeting Intelligence** provides comprehensive meeting management capabilities. Track meetings, action items, decisions, and generate AI summaries.

### Key Features

- 📅 **Meeting Management** - Create, track, and manage meetings
- ✅ **Action Items** - Assign and track tasks from meetings
- 📝 **Decisions** - Capture and track decisions made
- 📋 **Notes** - Meeting notes and summaries
- 👥 **Attendees** - Track meeting participants
- ⏱️ **Time Tracking** - Start/end time management

## Architecture

| Component | Technology |
|-----------|------------|
| Runtime | Node.js 20+ |
| Framework | Express.js 4.x |
| Language | TypeScript 5.x |
| Database | MongoDB 6.x |
| Validation | Zod 3.x |

## API Endpoints

### Meetings

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/meetings` | List meetings |
| POST | `/api/v1/meetings` | Create meeting |
| GET | `/api/v1/meetings/:id` | Get meeting |
| PUT | `/api/v1/meetings/:id` | Update meeting |
| DELETE | `/api/v1/meetings/:id` | Delete meeting |

## Data Models

### Meeting

```typescript
{
  id: string;
  title: string;
  attendees: string[];
  startTime: Date;
  endTime: Date;
  summary?: string;
  actionItems: ActionItem[];
  decisions: Decision[];
  notes?: string;
}
```

### ActionItem

```typescript
{
  id: string;
  task: string;
  assignee?: string;
  completed: boolean;
}
```

## Security Features

| Feature | Status |
|---------|--------|
| Input Validation (Zod) | ✅ |
| Graceful Shutdown | ✅ |
| Health Checks | ✅ |

## Quick Start

```bash
npm install
npm run dev
npm run build
npm start
```

---

**License:** Proprietary - RTNM Digital  
**Last Updated:** June 13, 2026
