# @hojai/bizora

> The official TypeScript SDK for the **Bizora Reports Dashboard** (port 4874). Embedded dashboards, widgets, and async report generation in PDF/CSV/XLSX/JSON.

[![npm version](https://img.shields.io/npm/v/@hojai/bizora.svg)](https://www.npmjs.com/package/@hojai/bizora)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.3-blue.svg)](https://www.typescriptlang.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## What it does

Bizora is the **reports + dashboards platform** for HOJAI. It lets you:

- Create **dashboards** (collections of widgets)
- Add **widgets** (KPIs, charts, tables, heatmaps) with drag-and-drop positions
- Fetch **computed widget data** (time series, aggregates)
- Trigger **report generation** in PDF, CSV, XLSX, or JSON — async with pollable status

Every HOJAI app that needs an embedded dashboard or scheduled report uses this SDK.

## Install

```bash
npm install @hojai/bizora
```

## Quick start

```ts
import { Bizora } from '@hojai/bizora';

const b = new Bizora({ apiKey, baseUrl: 'https://api.hojai.ai' });

// 1. Create a dashboard
const dash = await b.dashboards.create({ name: 'Q3 Overview' });

// 2. Add a KPI widget
const w = await b.widgets.create({
  dashboardId: dash.id,
  kind: 'kpi',
  title: 'MRR',
  position: { x: 0, y: 0, w: 3, h: 2 },
  source: 'sales.mrr'
});

// 3. Get widget data
const data = await b.widgets.getData(w.id, { granularity: 'month' });
console.log(data.totals.mrr);

// 4. Generate a PDF report (with auto-wait)
const report = await b.reports.generateAndWait(
  { name: 'Q3 Report', format: 'pdf', dashboardId: dash.id },
  { timeoutMs: 30000 }
);
console.log('Download:', report.downloadUrl);
```

## What's inside

3 sub-clients, ~14 methods:

| Sub-client | Purpose | Methods |
|---|---|---|
| `dashboards` | CRUD for dashboards | 5 |
| `widgets` | CRUD for widgets + data fetcher | 6 |
| `reports` | Async report generation + download | 4 |

## Subpath imports

```ts
import { DashboardsClient } from '@hojai/bizora/dashboards';
import { WidgetsClient } from '@hojai/bizora/widgets';
import { ReportsClient } from '@hojai/bizora/reports';
```

## Configuration

```ts
const b = new Bizora({
  apiKey: 'hojai_live_...',         // required
  baseUrl: 'https://api.hojai.ai',  // required
  timeout: 10_000,                  // optional, default 10s
  maxRetries: 3,                    // optional, default 3
  fetchImpl: customFetch,           // optional
  logger: (level, msg, meta) => {}  // optional
});
```

When `baseUrl` includes `localhost`, sub-clients automatically target port **4874** (the Bizora Reports Dashboard port).

## Tests

```bash
cd companies/HOJAI-AI/sdk/hojai-bizora
npm install
npm run build
npm test
```

## See also

- [@hojai/foundation](../hojai-foundation/) — CorpID, Memory, Twin, Trust, Flow, Policy
- [@hojai/department](../hojai-department/) — Department OSes (dashboards often show department KPIs)
- [@hojai/revenue-intelligence-os](../hojai/department) — Source of revenue KPIs that Bizora dashboards typically surface

The SDK family is now **24 deep**.
