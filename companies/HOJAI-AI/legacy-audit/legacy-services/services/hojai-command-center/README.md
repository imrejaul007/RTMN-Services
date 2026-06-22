# HOJAI Command Center - Executive Dashboard

> **HOJAI AI** | Company: hojai-ai  
> **Port:** 4801 | **Status:** ✅ **BUILT** (June 13, 2026)

## Overview

**HOJAI Command Center** provides executive dashboard capabilities with configurable widgets. Create and manage dashboards for real-time business insights.

### Key Features

- 📊 **Dashboard Management** - Create and manage multiple dashboards
- 🧩 **Widget System** - Configurable dashboard widgets
- 📈 **Widget Types** - Metric, chart, table, alert, news, goals
- 📍 **Position Control** - Grid-based widget positioning
- 🔄 **Refresh Intervals** - Auto-refresh widget data
- 👤 **Owner Management** - Dashboard ownership

## Architecture

| Component | Technology |
|-----------|------------|
| Runtime | Node.js 20+ |
| Framework | Express.js 4.x |
| Language | TypeScript 5.x |
| Database | MongoDB 6.x |
| Validation | Zod 3.x |

## API Endpoints

### Dashboards

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/dashboards` | List dashboards |
| POST | `/api/v1/dashboards` | Create dashboard |
| GET | `/api/v1/dashboards/:id` | Get dashboard |
| PUT | `/api/v1/dashboards/:id` | Update dashboard |
| DELETE | `/api/v1/dashboards/:id` | Delete dashboard |

### Widgets

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/widgets` | List widgets |
| POST | `/api/v1/widgets` | Create widget |
| GET | `/api/v1/widgets/:id` | Get widget |
| PUT | `/api/v1/widgets/:id` | Update widget |

### Overview

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/overview` | System overview stats |

## Widget Types

| Type | Description |
|------|-------------|
| metric | Single metric display |
| chart | Line, bar, pie charts |
| table | Tabular data |
| alert | Alert notifications |
| news | News feed |
| goals | Goal progress |

## Data Models

### Dashboard

```typescript
{
  id: string;
  name: string;
  description?: string;
  widgets: string[];
  ownerId?: string;
  isDefault: boolean;
}
```

### Widget

```typescript
{
  id: string;
  type: 'metric' | 'chart' | 'table' | 'alert' | 'news' | 'goals';
  title: string;
  config: Record<string, unknown>;
  position: { x: number; y: number; w: number; h: number };
  refreshInterval: number; // seconds
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
