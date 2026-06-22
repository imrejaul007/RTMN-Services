# ReZ Support Dashboard UI

**Port:** 3000
**Purpose:** Agent-facing dashboard for unified support inbox

---

## Overview

The Support Dashboard UI provides agents with a unified inbox to manage customer conversations across all channels (WhatsApp, Email, Instagram, Web Chat).

## Features

- **Unified Inbox** - All channels in one view
- **Real-time Updates** - Socket.io for live updates
- **Channel Filters** - Filter by WhatsApp, Email, Instagram, Web
- **Status Filters** - Open, In Progress, Pending, Resolved, Closed
- **Conversation Thread** - Full message history
- **Reply Composer** - Send responses
- **Agent Assignment** - Assign conversations to agents
- **Priority Management** - Mark urgent tickets
- **SLA Tracking** - SLA deadline indicators
- **Stats Dashboard** - Key metrics and KPIs

## Tech Stack

- Next.js 14
- React 18
- TypeScript
- Tailwind CSS
- Zustand (state management)
- Socket.io client

## Pages

| Route | Description |
|-------|-------------|
| `/dashboard` | Main inbox view |
| `/dashboard/conversations/[id]` | Single conversation |
| `/dashboard/analytics` | Stats and metrics |

## API Connection

The UI connects to `rez-support-dashboard` backend at port 4052.

```bash
NEXT_PUBLIC_API_URL=http://localhost:4052
INTERNAL_SERVICE_TOKEN=your-token
```

## Quick Start

```bash
cd RTNM-Group/rez-support-dashboard-ui
npm install
cp .env.example .env
npm run dev
# Open http://localhost:3000/dashboard
```

## Backend

The backend API is in `RTNM-Group/rez-support-dashboard/`.

## Related Services

- `rez-support-dashboard` - Backend API
- `REZ-support-tools-hub` - Zendesk/Freshdesk/Intercom integration
