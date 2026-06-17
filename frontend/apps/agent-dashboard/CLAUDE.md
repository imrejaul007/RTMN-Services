# Agent Dashboard - Support Agent Dashboard

**Version:** 1.0.0
**Port:** 3015
**Status:** Development

---

## Overview

Agent Dashboard is the support agent interface for the RTMN ecosystem - providing ticket management, customer 360 views, AI suggestions, and knowledge base access.

## Features

- **Ticket Queue** - View, filter, and manage support tickets
- **Customer 360** - Complete customer profile with orders, payments, tickets, and AI predictions
- **AI Suggestions** - Intelligent recommendations for ticket handling
- **Knowledge Base** - Search and access support articles
- **Quick Actions** - One-click actions for common tasks

## Tech Stack

| Component | Technology |
|-----------|------------|
| Framework | Next.js 14 (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS |
| State | React Query (TanStack) |
| Icons | Lucide React |

## Pages

| Route | Description |
|-------|-------------|
| `/` | Dashboard with metrics and recent tickets |
| `/tickets` | Ticket queue with filters |
| `/tickets/[id]` | Single ticket detail view |
| `/customers` | Customer search and list |
| `/customers/[id]` | Customer 360 view |
| `/knowledge` | Knowledge base search |
| `/settings` | Agent settings |

## API Integration

Connects to RTMN services via the API client in `lib/api.ts`:

- **Service Registry:** http://localhost:4399
- **Customer Data:** Customer 360 endpoints
- **Ticket Management:** Ticket CRUD operations
- **AI Suggestions:** RTMN Intelligence layer

## Components

| Component | Purpose |
|-----------|---------|
| `Sidebar` | Navigation sidebar |
| `TicketCard` | Ticket display card |
| `Customer360` | Customer profile panel |
| `AISuggestions` | AI recommendation panel |
| `QuickActions` | Action buttons panel |

## Running

```bash
cd frontend/apps/agent-dashboard
npm install
npm run dev
```

Access at: http://localhost:3015

## Environment Variables

- `NEXT_PUBLIC_API_URL` - Backend API URL (default: http://localhost:4399)

---

*Last Updated: June 2026*
