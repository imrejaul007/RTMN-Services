# HOJAI AI Command Center

**Executive Command Center Dashboard for CoPilot**

A production Next.js dashboard that provides a unified view of the entire business with natural language queries.

## Port

**4801** - The dashboard runs on `http://localhost:4801`

## Purpose

The Command Center is the central hub for HOJAI AI's CoPilot product. It aggregates data from all CoPilot services to provide executives with:

- A single unified view of the entire business
- Natural language queries ("Why did sales drop?", "What is our biggest risk?")
- Real-time KPI tracking
- Alert feeds with severity indicators
- Drill-down navigation to detailed dashboards

## Pages

| Page | Route | Description |
|------|-------|-------------|
| Command Center | `/` | Executive dashboard with KPIs, alerts, activity feed |
| Revenue | `/revenue` | ARR/MRR, pipeline, CAC/LTV, forecasts |
| Customers | `/customers` | Customer 360, health scores, segments |
| Products | `/products` | Product hub, feature pipeline, PMF scores |
| Projects | `/projects` | Active projects, milestones, budget tracking |
| Team | `/team` | Workforce metrics, AI employee registry |
| Goals | `/goals` | OKRs, goal progress, milestones |
| Meetings | `/meetings` | Meeting hub, action items, decisions |
| Competitors | `/competitors` | Competitive intelligence, threat alerts |
| Decisions | `/decisions` | Decision center, impact analysis |
| Agents | `/agents` | AI employee workforce, permissions |
| Workflows | `/workflows` | Workflow hub, automation suggestions |

## Features

### Natural Language Queries
- Query input field for natural language questions
- AI-powered query interpretation across all services
- Results displayed in appropriate format
- Query history

### Real-time Data
- Auto-refresh every 30 seconds
- Loading states and error handling
- Connection to all CoPilot services

### Alert System
- Severity indicators (critical/high/medium/low)
- Filter by type/severity
- Read/unread status
- Dismiss alerts

### Drill-down Navigation
- Click KPIs to see detail pages
- Breadcrumb navigation
- Back to dashboard links

### Export
- Export data as CSV
- Share dashboard links

## Tech Stack

- **Next.js 14** - App Router with server components
- **TypeScript** - Type-safe code
- **Tailwind CSS** - Utility-first styling
- **TanStack Query** - Data fetching and caching
- **Recharts** - Charts and visualizations
- **Lucide React** - Icon library

## Service Integrations

The Command Center connects to these CoPilot services:

| Service | Port | Data |
|---------|------|------|
| hojai-revenue-intelligence | 4757 | Revenue metrics, pipeline, forecasts |
| hojai-customer-intelligence | 4752 | Customer data, health scores |
| hojai-product-intelligence | 4755 | Product metrics, feedback |
| genie-project-service | 4708 | Project data, milestones |
| hojai-workforce | 4820 | Team metrics, performance |
| hojai-goal-os | 4242 | Goals, OKRs, milestones |
| hojai-meeting-intelligence | 4700 | Meetings, action items |
| hojai-competitive-intelligence | 4756 | Competitor data, threats |
| hojai-board | 4870 | Decisions, outcomes |
| hojai-agent-marketplace | 4580 | AI agents, permissions |
| hojai-sutar-flow-os | 4244 | Workflows, automation |

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn

### Installation

```bash
cd hoojai-command-center
npm install
```

### Environment Variables

Copy `.env.example` to `.env.local` and configure service URLs:

```bash
cp .env.example .env.local
```

Edit `.env.local` with your service URLs:

```env
REVENUE_SERVICE_URL=http://localhost:4757
CUSTOMER_SERVICE_URL=http://localhost:4752
PRODUCT_SERVICE_URL=http://localhost:4755
PROJECT_SERVICE_URL=http://localhost:4708
WORKFORCE_SERVICE_URL=http://localhost:4820
GOAL_SERVICE_URL=http://localhost:4242
MEETING_SERVICE_URL=http://localhost:4700
COMPETITOR_SERVICE_URL=http://localhost:4756
BOARD_SERVICE_URL=http://localhost:4870
AGENT_SERVICE_URL=http://localhost:4580
WORKFLOW_SERVICE_URL=http://localhost:4244

API_TIMEOUT=10000
REFRESH_INTERVAL=30000
```

### Development

```bash
npm run dev
```

Open [http://localhost:4801](http://localhost:4801) in your browser.

### Production Build

```bash
npm run build
npm start
```

## Project Structure

```
hojai-command-center/
├── src/
│   ├── app/                    # Next.js App Router pages
│   │   ├── layout.tsx          # Root layout with sidebar
│   │   ├── page.tsx            # Command center dashboard
│   │   ├── revenue/page.tsx
│   │   ├── customers/page.tsx
│   │   ├── products/page.tsx
│   │   ├── projects/page.tsx
│   │   ├── team/page.tsx
│   │   ├── goals/page.tsx
│   │   ├── meetings/page.tsx
│   │   ├── competitors/page.tsx
│   │   ├── decisions/page.tsx
│   │   ├── agents/page.tsx
│   │   └── workflows/page.tsx
│   ├── components/
│   │   ├── layout/             # Layout components
│   │   │   ├── DashboardLayout.tsx
│   │   │   ├── Sidebar.tsx
│   │   │   └── Header.tsx
│   │   ├── dashboard/          # Dashboard-specific components
│   │   │   ├── KPICard.tsx
│   │   │   ├── AlertFeed.tsx
│   │   │   ├── QueryInput.tsx
│   │   │   ├── TrendChart.tsx
│   │   │   ├── DataTable.tsx
│   │   │   ├── StatusBadge.tsx
│   │   │   ├── MetricCard.tsx
│   │   │   ├── ActivityFeed.tsx
│   │   │   └── QuickActions.tsx
│   │   └── ui/                 # Reusable UI components
│   │       ├── Button.tsx
│   │       ├── Card.tsx
│   │       ├── Input.tsx
│   │       ├── Select.tsx
│   │       ├── Badge.tsx
│   │       └── Chart.tsx
│   ├── lib/
│   │   ├── api.ts              # API client for all services
│   │   ├── utils.ts            # Utility functions
│   │   └── constants.ts        # Service URLs, constants
│   └── styles/
│       └── globals.css         # Global styles
├── public/
├── package.json
├── next.config.js
├── tsconfig.json
├── tailwind.config.ts
├── postcss.config.js
├── .env.example
└── README.md
```

## License

Private - HOJAI AI