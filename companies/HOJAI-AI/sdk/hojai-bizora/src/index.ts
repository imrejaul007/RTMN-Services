/**
 * @hojai/bizora SDK — Reports Dashboard + Widgets.
 *
 * 3 sub-clients, ~14 methods:
 *   dashboards — CRUD for dashboards (collections of widgets)
 *   widgets    — CRUD for widgets + data fetcher
 *   reports    — Trigger + wait + download reports in pdf/csv/xlsx/json
 *
 * Used by HOJAI applications that need embedded dashboards and
 * scheduled/async report generation.
 *
 * @example
 * ```ts
 * import { Bizora } from '@hojai/bizora';
 *
 * const b = new Bizora({ apiKey, baseUrl: 'https://api.hojai.ai' });
 *
 * // 1. Create a dashboard
 * const dash = await b.dashboards.create({ name: 'Q3 Overview' });
 *
 * // 2. Add a KPI widget
 * const w = await b.widgets.create({
 *   dashboardId: dash.id, kind: 'kpi', title: 'MRR',
 *   position: { x: 0, y: 0, w: 3, h: 2 }, source: 'sales.mrr'
 * });
 *
 * // 3. Get widget data
 * const data = await b.widgets.getData(w.id, { granularity: 'month' });
 *
 * // 4. Generate a PDF report
 * const report = await b.reports.generateAndWait(
 *   { name: 'Q3 Report', format: 'pdf', dashboardId: dash.id },
 *   { timeoutMs: 30000 }
 * );
 * console.log(report.downloadUrl);
 * ```
 */

import type { HojaiConfig } from './foundation-config.js';
import { resolveConfig } from './foundation-config.js';
import { DashboardsClient } from './dashboards.js';
import { WidgetsClient } from './widgets.js';
import { ReportsClient } from './reports.js';
import { BIZORA_PORT, type Dashboard, type Widget, type WidgetData, type WidgetKind, type Report, type ReportRequest } from './types.js';

export type { HojaiConfig } from './foundation-config.js';
export { resolveConfig } from './foundation-config.js';
export { DashboardsClient, type CreateDashboardRequest } from './dashboards.js';
export { WidgetsClient, type CreateWidgetRequest } from './widgets.js';
export { ReportsClient } from './reports.js';
export { BIZORA_PORT, type Dashboard, type Widget, type WidgetData, type WidgetKind, type Report, type ReportRequest } from './types.js';

export class Bizora {
  public readonly dashboards: DashboardsClient;
  public readonly widgets: WidgetsClient;
  public readonly reports: ReportsClient;
  public readonly config: ReturnType<typeof resolveConfig>;

  constructor(config: HojaiConfig) {
    const resolved = resolveConfig(config);
    this.config = resolved;
    this.dashboards = new DashboardsClient(resolved);
    this.widgets = new WidgetsClient(resolved);
    this.reports = new ReportsClient(resolved);
  }
}

export default Bizora;
