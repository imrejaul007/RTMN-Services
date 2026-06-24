/**
 * Bizora Widgets client.
 */

import type { HojaiConfig } from './foundation-config.js';
import { request, buildQueryString } from './utils.js';
import type { Widget, WidgetData, WidgetKind } from './types.js';

export interface CreateWidgetRequest {
  dashboardId: string;
  kind: WidgetKind;
  title: string;
  source?: string;
  position: { x: number; y: number; w: number; h: number };
  config?: Record<string, unknown>;
}

export class WidgetsClient {
  public readonly config: HojaiConfig;
  constructor(config: HojaiConfig) { this.config = { ...config, baseUrl: `http://localhost:4874` }; }

  async list(input: { dashboardId?: string; kind?: WidgetKind } = {}): Promise<Widget[]> {
    return request<Widget[]>(this.config, 'GET', `/api/widgets${buildQueryString(input as unknown as Record<string, unknown>)}`);
  }

  async get(id: string): Promise<Widget> {
    return request<Widget>(this.config, 'GET', `/api/widgets/${encodeURIComponent(id)}`);
  }

  async create(input: CreateWidgetRequest): Promise<Widget> {
    return request<Widget>(this.config, 'POST', '/api/widgets', input);
  }

  async update(id: string, patch: Partial<Widget>): Promise<Widget> {
    return request<Widget>(this.config, 'PUT', `/api/widgets/${encodeURIComponent(id)}`, patch);
  }

  async remove(id: string): Promise<{ deleted: boolean; id: string }> {
    return request<{ deleted: boolean; id: string }>(this.config, 'DELETE', `/api/widgets/${encodeURIComponent(id)}`);
  }

  /** Fetch computed data for a widget (time series, aggregates, etc.). */
  async getData(id: string, input: { from?: string; to?: string; granularity?: 'hour' | 'day' | 'week' | 'month' } = {}): Promise<WidgetData> {
    return request<WidgetData>(this.config, 'GET', `/api/widgets/${encodeURIComponent(id)}/data${buildQueryString(input as unknown as Record<string, unknown>)}`);
  }
}
