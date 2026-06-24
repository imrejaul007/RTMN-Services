# CLAUDE.md - HOJAI Bizora SDK (@hojai/bizora)

> **Package:** `@hojai/bizora` v1.0.0
> **TypeScript:** First-class with full type definitions
> **Runtime:** Node.js >= 18
> **Status:** Built and tested (8/8 tests passing, 0 failures)

## What this SDK is

**The official TypeScript client for the Bizora Reports Dashboard (port 4874).** Wraps the dashboard + widget + report generation services into a single ergonomic client.

| Sub-client | Purpose | Methods |
|---|---|---|
| `dashboards` | CRUD for dashboards (collections of widgets) | 5 |
| `widgets` | CRUD for widgets + data fetcher | 6 |
| `reports` | Async report generation in PDF/CSV/XLSX/JSON + download | 4 |

## Architecture

```
@hojai/bizora
├── Bizora                      # Main client (facade)
│   ├── dashboards              # DashboardsClient  — 5 methods
│   ├── widgets                 # WidgetsClient     — 6 methods
│   └── reports                 # ReportsClient     — 4 methods
├── HojaiConfig                 # Shared config
└── resolveConfig()             # Apply defaults
```

Self-contained — does NOT import from other `@hojai/*` packages. Carries its own copy of `HojaiConfig` + `request()` + `buildQueryString` (~80 LOC).

## Quick Start

```ts
import { Bizora } from '@hojai/bizora';

const b = new Bizora({ apiKey, baseUrl: 'https://api.hojai.ai' });

// 1. Create dashboard
const dash = await b.dashboards.create({ name: 'Q3' });

// 2. Add a KPI widget
const w = await b.widgets.create({
  dashboardId: dash.id, kind: 'kpi', title: 'MRR',
  position: { x: 0, y: 0, w: 3, h: 2 }, source: 'sales.mrr'
});

// 3. Get widget data
const data = await b.widgets.getData(w.id, { granularity: 'month' });

// 4. Generate + auto-wait for a PDF report
const report = await b.reports.generateAndWait(
  { name: 'Q3 Report', format: 'pdf', dashboardId: dash.id },
  { timeoutMs: 30000 }
);
```

## Build & test

```bash
cd companies/HOJAI-AI/sdk/hojai-bizora
npm install
npm run build
npm test
```

## Tests (8/8 passing)

- Bizora client instantiates with all 3 sub-clients
- DashboardsClient.create
- WidgetsClient.create
- WidgetsClient.getData
- ReportsClient.generate
- ReportsClient.generateAndWait polls until ready
- Retries on 5xx
- Throws on 4xx

## Related

- [@hojai/foundation](../hojai-foundation/CLAUDE.md) — Core platform
- [@hojai/department](../hojai-department/CLAUDE.md) — Department OSes (BI source)
- [Bizora Reports Dashboard service](https://github.com/hojai/bizora) — the underlying Express service

The SDK family is now **24 deep** with this addition.
