# Admin Portal - RTMN Configuration Management

**Version:** 1.0.0
**Last Updated:** June 16, 2026
**Status:** Development Ready

---

## Overview

The Admin Portal is a Next.js 14 application for configuring and managing the RTMN ecosystem. It provides a comprehensive interface for administrators to manage workflows, knowledge base, teams, integrations, SLA policies, and organization settings.

## Tech Stack

| Component | Technology |
|-----------|------------|
| Framework | Next.js 14 (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS |
| Icons | Lucide React |
| Drag & Drop | @dnd-kit |
| State | React Hooks (useState) |
| API Client | Custom REST client |

## Directory Structure

```
admin-portal/
├── app/
│   ├── layout.tsx          # Admin layout with sidebar
│   ├── page.tsx            # Dashboard
│   ├── globals.css         # Tailwind base styles
│   ├── workflows/
│   │   ├── page.tsx        # Workflow list
│   │   └── [id]/page.tsx   # Workflow editor
│   ├── knowledge/
│   │   ├── page.tsx        # KB article list
│   │   └── [id]/page.tsx   # KB editor
│   ├── teams/page.tsx      # Team management
│   ├── settings/page.tsx   # Organization settings
│   ├── integrations/page.tsx # Integration connectors
│   └── sla/page.tsx        # SLA policies
├── components/
│   ├── Sidebar.tsx         # Navigation sidebar
│   ├── WorkflowBuilder.tsx # Drag-drop workflow builder
│   ├── KBEditor.tsx        # Markdown article editor
│   └── IntegrationCard.tsx # Integration connector card
└── lib/
    ├── api.ts              # API client
    └── types.ts            # TypeScript types
```

## Features

### 1. Dashboard
- Overview statistics (workflows, KB, team, integrations)
- Quick action cards
- Recent activity feed
- System health monitoring

### 2. Workflows
- List all workflows with status filters
- Visual workflow builder with drag-and-drop
- Step types: Trigger, Action, Condition, Delay, Notification, API
- Workflow statistics and run history

### 3. Knowledge Base
- Category-based article organization
- Markdown editor with live preview
- SEO metadata configuration
- Tag management

### 4. Team Management
- Invite team members
- Role-based permissions (Admin, Editor, Viewer)
- Permission matrix visualization
- Member activity tracking

### 5. Integrations
- Connect third-party services
- Categories: Communication, CRM, Payments, Database, Automation
- Sync status and event tracking
- Configuration management

### 6. SLA Policies
- Define response and resolution times
- Priority levels (Critical, High, Medium, Low)
- Business hours vs 24/7 support
- Compliance tracking

### 7. Settings
- Organization configuration
- Notification preferences
- Security settings (2FA, session timeout)
- API key management
- Theme customization

## API Endpoints

The portal connects to the RTMN backend API:

| Resource | Endpoint |
|----------|----------|
| Workflows | `/api/workflows` |
| KB Articles | `/api/kb/articles` |
| Teams | `/api/teams` |
| Integrations | `/api/integrations` |
| SLA | `/api/sla` |
| Settings | `/api/settings` |

## Running Locally

```bash
# Navigate to directory
cd frontend/apps/admin-portal

# Install dependencies
npm install

# Start development server
npm run dev
```

Access at: http://localhost:3000

## Environment Variables

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_API_URL` | Backend API URL (default: Render backend) |

## Design System

Uses Tailwind CSS with custom CSS variables for theming:

- Primary color: Blue (#3B82F6)
- Background: White/Dark Slate
- Border radius: 0.5rem (8px)
- Font: System font stack

---

*Last Updated: June 16, 2026*
