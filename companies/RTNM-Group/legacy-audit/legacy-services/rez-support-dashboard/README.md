# ReZ Unified Support Dashboard

Unified support inbox that aggregates all support channels into one agent-facing dashboard.

## Features

- **Unified Inbox** - All channels (WhatsApp, Email, Instagram, Web, Chat) in one view
- **Real-time Updates** - Socket.io for live updates
- **Agent Assignment** - Assign conversations to agents
- **Priority Management** - Mark urgent/priority tickets
- **SLA Tracking** - SLA deadline indicators
- **Analytics** - Dashboard with metrics and KPIs
- **Channel Aggregation** - Pulls from Support Copilot, Support Agent, WhatsApp Commerce, Instagram Bridge

## API Endpoints (Port 4052)

```
GET  /api/inbox/conversations    - List conversations
GET  /api/inbox/conversations/:id - Get single conversation
POST /api/inbox/conversations/:id/reply - Send reply
PATCH /api/inbox/conversations/:id/assign - Assign agent
PATCH /api/inbox/conversations/:id/status - Update status
GET  /api/inbox/analytics        - Dashboard analytics
GET  /api/inbox/agents/stats     - Agent performance
GET  /api/inbox/queue            - Queue by channel
POST /api/inbox/sync             - Sync from all sources
```

## Getting Started

```bash
cd RTNM-Group/rez-support-dashboard
cp .env.example .env
npm install
npm run dev
```

## UI

The Next.js UI is in `RTNM-Group/rez-support-dashboard-ui`.

```bash
cd RTNM-Group/rez-support-dashboard-ui
npm install
npm run dev
# Open http://localhost:3000/dashboard
```
