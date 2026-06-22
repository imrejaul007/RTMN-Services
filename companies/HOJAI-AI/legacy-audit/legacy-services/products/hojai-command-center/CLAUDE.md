# HOJAI Command Center - Development Guide

## Product Overview

**Name**: HOJAI AI Command Center
**Purpose**: Executive Command Center Dashboard for CoPilot - provides a unified view of the entire business with natural language queries
**Port**: 4801

## Architecture

### Tech Stack
- Next.js 14 with App Router
- TypeScript for type safety
- Tailwind CSS for styling
- TanStack Query for data fetching with auto-refresh
- Recharts for data visualization
- Lucide React for icons

### Directory Structure

```
src/
├── app/                    # Next.js App Router pages
│   ├── layout.tsx          # Root layout with sidebar
│   ├── providers.tsx       # React Query provider
│   ├── page.tsx            # Command center (main dashboard)
│   ├── revenue/page.tsx
│   ├── customers/page.tsx
│   ├── products/page.tsx
│   ├── projects/page.tsx
│   ├── team/page.tsx
│   ├── goals/page.tsx
│   ├── meetings/page.tsx
│   ├── competitors/page.tsx
│   ├── decisions/page.tsx
│   ├── agents/page.tsx
│   └── workflows/page.tsx
├── components/
│   ├── layout/             # Layout components
│   │   ├── DashboardLayout.tsx
│   │   ├── Sidebar.tsx
│   │   └── Header.tsx
│   ├── dashboard/          # Dashboard-specific components
│   │   ├── KPICard.tsx
│   │   ├── AlertFeed.tsx
│   │   ├── QueryInput.tsx
│   │   ├── TrendChart.tsx
│   │   ├── DataTable.tsx
│   │   ├── StatusBadge.tsx
│   │   ├── MetricCard.tsx
│   │   ├── ActivityFeed.tsx
│   │   └── QuickActions.tsx
│   └── ui/                 # Reusable UI components
│       ├── Button.tsx
│       ├── Card.tsx
│       ├── Input.tsx
│       ├── Select.tsx
│       ├── Badge.tsx
│       └── Chart.tsx
├── lib/
│   ├── api.ts              # API client for all CoPilot services
│   ├── utils.ts            # Utility functions
│   └── constants.ts        # Service URLs, constants
└── styles/
    └── globals.css         # Global styles and Tailwind
```

## API Integrations

The Command Center connects to these CoPilot services:

| Service | Port | Data Retrieved |
|---------|------|----------------|
| hojai-revenue-intelligence | 4757 | Revenue metrics, pipeline, forecasts |
| hojai-customer-intelligence | 4752 | Customer data, health scores, segments |
| hojai-product-intelligence | 4755 | Product metrics, PMF scores, feedback |
| genie-project-service | 4708 | Project data, milestones, budget |
| hojai-workforce | 4820 | Team metrics, AI employees, performance |
| hojai-goal-os | 4242 | Goals, OKRs, milestones |
| hojai-meeting-intelligence | 4700 | Meetings, action items, decisions |
| hojai-competitive-intelligence | 4756 | Competitor data, threats, news |
| hojai-board | 4870 | Decisions, outcomes, impact |
| hojai-agent-marketplace | 4580 | AI agents, teams, permissions |
| hojai-sutar-flow-os | 4244 | Workflows, runs, automation |

## Components

### Layout Components

- **DashboardLayout**: Main layout wrapper with sidebar and header
- **Sidebar**: Collapsible navigation sidebar with all page links
- **Header**: Top header with search, notifications, profile menu

### Dashboard Components

- **KPICard**: Metric card with trend indicator, optional chart
- **MetricCard**: Large metric display with progress bars
- **AlertFeed**: Severity-sorted alert list with filters
- **QueryInput**: Natural language query input with AI response
- **TrendChart**: Line/bar/area chart with time range selector
- **DataTable**: Sortable, filterable, paginated table with export
- **StatusBadge**: Status indicator (success/warning/error)
- **ActivityFeed**: Timeline of recent activities
- **QuickActions**: Action buttons panel

### UI Components

- **Button**: Button with variants (default, destructive, outline, ghost)
- **Card**: Card container with header, content, footer
- **Input**: Input with optional icon and error state
- **Select**: Dropdown select component
- **Badge**: Badge with variants (default, secondary, destructive, success)
- **Chart**: Recharts wrapper with tooltip and legend

## Pages

1. `/` - Executive Command Center Dashboard
2. `/revenue` - Revenue Intelligence
3. `/customers` - Customer 360
4. `/products` - Product Hub
5. `/projects` - Project Hub
6. `/team` - Workforce Dashboard
7. `/goals` - GoalOS
8. `/meetings` - Meeting Hub
9. `/competitors` - Competitive Intelligence
10. `/decisions` - Decision Center
11. `/agents` - Agent Workforce
12. `/workflows` - Workflow Hub

## Data Fetching

All pages use TanStack Query for data fetching:

```typescript
const { data, isLoading, refetch } = useQuery<RevenueData>({
  queryKey: ["revenue"],
  queryFn: () => revenueApi.getRevenueData(),
  refetchInterval: 30000, // Auto-refresh every 30 seconds
});
```

The API client (`src/lib/api.ts`) includes:
- Mock data for when services are unavailable
- Timeout handling (10 seconds default)
- Error handling with fallback to mock data

## Deployment Notes

### Development
```bash
npm run dev  # Runs on port 4801
```

### Production
```bash
npm run build
npm start   # Runs on port 4801
```

### Environment Variables
Required in `.env.local`:
- Service URLs for all CoPilot services
- API timeout (default: 10000ms)
- Refresh interval (default: 30000ms)

## Development Guidelines

1. **Components**: Use the component library before creating custom ones
2. **Types**: Define TypeScript interfaces for all data types
3. **Mock Data**: Always include mock data in the API client for offline development
4. **Loading States**: Always handle loading states in pages
5. **Error Handling**: Use try-catch in API calls with fallback to mock data
6. **Responsive Design**: Use Tailwind's responsive utilities (sm:, md:, lg:)
7. **Icons**: Use Lucide React for consistent iconography
8. **Charts**: Use Recharts for data visualization